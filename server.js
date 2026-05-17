const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

// 加载本地环境变量文件（不提交到git）
try {
    const envPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([A-Z_]+)=(.+)$/);
            if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
        });
    }
} catch(e) {}

const PORT = process.env.PORT || 8080;




// 管理员密钥
let ADMIN_KEY = process.env.ADMIN_KEY;
if (!ADMIN_KEY) { console.error('FATAL: ADMIN_KEY not set. Set it in .env.local'); process.exit(1); }
let SECRET_KEY = process.env.SECRET_KEY;

// CORS配置：支持环境变量配置，默认使用当前部署URL
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://cet-tutor-production.up.railway.app';
if (!SECRET_KEY) { console.error('FATAL: SECRET_KEY not set. Set it in .env.local'); process.exit(1); }

// API 限流：每个IP每分钟最多60次请求
const rateLimitMap = new Map();
function checkRateLimit(req) {
    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + 60000 };
    if (now > record.resetAt) {
        record.count = 0;
        record.resetAt = now + 60000;
    }
    record.count++;
    rateLimitMap.set(ip, record);
    // 每5分钟清理一次过期记录
    if (Math.random() < 0.01) {
        for (const [k, v] of rateLimitMap) {
            if (now > v.resetAt) rateLimitMap.delete(k);
        }
    }
    return record.count <= 60;
}


// PayJS 配置（从环境变量读取）- 不再使用，改为手动收款模式
const PAYJS_MCHID = process.env.PAYJS_MCHID || '';
const PAYJS_KEY = process.env.PAYJS_KEY || '';
const PAYJS_NOTIFY_URL = process.env.PAYJS_NOTIFY_URL || '';

// 微信收款码URL（改为本地图片）
const WECHAT_PAYMENT_QR = process.env.WECHAT_PAYMENT_QR || '/wechat-qr.jpg';

// 面包多 Developer Key（用于验证订单真实性）
const MBD_DEVELOPER_KEY = process.env.MBD_DEVELOPER_KEY || '';  // 需在Railway环境变量中配置

// Bot ID 配置（2个Bot）
const BOT_ID_DIAGNOSIS = '7636289658620215331';
const BOT_ID_COMPANION = '7637702903679631395';

// 套餐配置（3层定价）
const PLANS = {
    free: { name: '免费版', price: 0, uidPrefix: 'CET4D', needPay: false },
    sprint: { name: '冲刺营', price: 38, uidPrefix: 'CET4S', needPay: true },
    flagship: { name: '全程营', price: 148, uidPrefix: 'CET4F', needPay: true }
};

// 内存订单存储

// ===== 限流持久化：chatLimitMap 改为基于文件存储 =====
// 修复问题1和问题3：限流持久化到文件，启动时加载，每次更新后写入
const RATE_LIMITS_FILE = path.join(__dirname, 'rate-limits.json');

// 加载限流数据（启动时）
function loadRateLimits() {
    try {
        if (fs.existsSync(RATE_LIMITS_FILE)) {
            const data = fs.readFileSync(RATE_LIMITS_FILE, 'utf8');
            const parsed = JSON.parse(data);
            // 转换为Map
            const map = new Map();
            for (const [key, value] of Object.entries(parsed)) {
                map.set(key, value);
            }
            console.log(`[限流] 已加载 ${map.size} 条限流记录`);
            return map;
        }
    } catch (e) {
        console.error('[限流] 加载限流数据失败:', e.message);
    }
    return new Map();
}

// 保存限流数据到文件
function saveRateLimits(map) {
    try {
        // 转换为普通对象以便JSON序列化
        const obj = Object.fromEntries(map);
        fs.writeFileSync(RATE_LIMITS_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch (e) {
        console.error('[限流] 保存限流数据失败:', e.message);
    }
}

// 初始化限流Map（从文件加载）
const chatLimitMap = loadRateLimits();

// 清理过期限流记录（3天前）
function cleanupExpiredLimits() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key] of chatLimitMap) {
        const parts = key.split(':');
        if (parts.length >= 2) {
            const recordDate = parts[1];
            const threeDaysAgo = new Date(now - 3 * 86400000).toISOString().slice(0, 10);
            if (recordDate < threeDaysAgo) {
                chatLimitMap.delete(key);
                cleaned++;
            }
        }
    }
    if (cleaned > 0) {
        console.log(`[限流] 清理了 ${cleaned} 条过期记录`);
        saveRateLimits(chatLimitMap);
    }
}


// ===== 订单持久化：orders Map 改为基于文件存储 =====
const ORDERS_FILE = path.join(__dirname, 'orders.json');

// 加载订单数据（启动时）
function loadOrders() {
    try {
        if (fs.existsSync(ORDERS_FILE)) {
            const data = fs.readFileSync(ORDERS_FILE, 'utf8');
            const parsed = JSON.parse(data);
            const map = new Map();
            for (const [key, value] of Object.entries(parsed)) {
                map.set(key, value);
            }
            console.log(`[订单] 已加载 ${map.size} 条订单记录`);
            return map;
        }
    } catch (e) {
        console.error('[订单] 加载订单数据失败:', e.message);
    }
    return new Map();
}

// 保存订单数据到文件
function saveOrders() {
    try {
        const obj = Object.fromEntries(orders);
        fs.writeFileSync(ORDERS_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch (e) {
        console.error('[订单] 保存订单数据失败:', e.message);
    }
}

// 初始化订单Map（从文件加载）
const orders = loadOrders();

// 检查聊天限流（后端唯一数据源）
// 修复问题2：统一为 >=10 次拦截
function checkChatLimitBackend(userId) {
    const today = new Date().toISOString().slice(0, 10);
    const key = userId + ':' + today;
    const record = chatLimitMap.get(key) || { count: 0 };
    record.count++;
    chatLimitMap.set(key, record);
    
    // 随机清理过期记录
    if (Math.random() < 0.05) {
        cleanupExpiredLimits();
    } else {
        // 每10次更新保存一次
        if (record.count % 10 === 0) {
            saveRateLimits(chatLimitMap);
        }
    }
    
    return record.count;
}

// 获取剩余次数
function getRemainingChats(userId) {
    const today = new Date().toISOString().slice(0, 10);
    const key = userId + ':' + today;
    const record = chatLimitMap.get(key);
    const count = record ? record.count : 0;
    return Math.max(0, 25 - count);
}

// ===== 问题4修复：从后端订单验证用户身份，不信任前端传入的userPlan =====
// 获取客户端IP
function getClientIp(req) {
    return req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress || 'unknown';
}

// 根据IP从订单数据验证用户套餐（后端唯一数据源）
function getVerifiedUserPlan(req, userId, requestBody) {
    // 优先用 token 验证（前端激活后存储的 planToken + planOrderId）
    const body = requestBody || {};
    const planToken = body.plan_token || '';
    const planOrderId = body.plan_order_id || '';
    
    if (planOrderId && planToken) {
        const order = orders.get(planOrderId);
        if (order && order.status === 'activated' && order.token === planToken) {
            return order.plan; // sprint 或 flagship
        }
    }
    
    // 降级：遍历所有订单，通过 userId 或 IP 匹配
    const ip = getClientIp(req);
    for (const order of orders.values()) {
        if (order.status === 'activated' && (order.plan === 'sprint' || order.plan === 'flagship')) {
            if (order.userId === userId || order.ip === ip) {
                return order.plan;
            }
        }
    }
    
    return 'free';
}

// 生成订单号
function generateOrderId() {
    return 'CET' + Date.now() + Math.random().toString(36).substr(2, 6).toUpperCase();
}

// 生成用户UID
function generateUid(plan) {
    const prefix = PLANS[plan]?.uidPrefix || 'CET4X';
    return `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
}

// MD5签名
function sign(params, key) {
    const sortedKeys = Object.keys(params).sort();
    const signStr = sortedKeys.map(k => `${k}=${params[k]}`).join('&') + `&key=${key}`;
    return crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();
}

// 验证PayJS签名
function verifySign(params) {
    const { sign: receivedSign, ...rest } = params;
    const calculatedSign = sign(rest, PAYJS_KEY);
    return receivedSign === calculatedSign;
}

// 解析POST body
function parseBody(req) {
    // 检查Content-Length头，超过1MB返回413
    const contentLength = req.headers['content-length'];
    if (contentLength && parseInt(contentLength) > 1048576) {
        return Promise.reject(new Error('PAYLOAD_TOO_LARGE'));
    }
    
    return new Promise((resolve, reject) => {
        let body = '';
        let bodyLength = 0;
        req.on('data', chunk => {
            bodyLength += Buffer.byteLength(chunk, 'utf8');
            // 同时检查chunk拼接后累计长度
            if (bodyLength > 1048576) {
                req.destroy();
                reject(new Error('PAYLOAD_TOO_LARGE'));
                return;
            }
            body += chunk;
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', reject);
    });
}

// 发送JSON响应
function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': CORS_ORIGIN,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
}

// 处理API请求
// ===== 真题RAG检索引擎 =====
let quizQuestions = [];
try {
    const quizPath = path.join(__dirname, 'data', 'quiz_questions.json');
    if (fs.existsSync(quizPath)) {
        quizQuestions = JSON.parse(fs.readFileSync(quizPath, 'utf-8'));
        console.log(`[RAG] 已加载 ${quizQuestions.length} 道真题`);
    }
} catch(e) { console.error('[RAG] 加载题库失败:', e.message); }

function searchQuiz(keyword, type, limit) {
    limit = limit || 5;
    var pool = quizQuestions;
    if (type) pool = pool.filter(q => q.type === type);
    if (keyword && keyword.length > 0) {
        var kw = keyword.toLowerCase();
        pool = pool.filter(q => 
            (q.question || '').toLowerCase().includes(kw) ||
            (q.explanation || '').toLowerCase().includes(kw) ||
            (q.optionA || '').toLowerCase().includes(kw) ||
            (q.ability || '').toLowerCase().includes(kw)
        );
    }
    return pool.slice(0, limit);
}

function buildRagContext(userMessage, personality, weakDims, dimScores, wrongSummary, studyDays) {
    var context = '';
    var searchType = '';
    var weakDimsList = weakDims || [];
    if (weakDimsList.length > 0) {
        var firstWeak = weakDimsList[0].replace(/\(.*?\)/, '').trim();
        var dimTypeMap = {
            '细节定位': '阅读理解-仔细阅读',
            '推理判断': '阅读理解-仔细阅读',
            '同义替换': '阅读理解-仔细阅读',
            '主旨归纳': '阅读理解-仔细阅读',
            '态度判断': '听力理解-篇章',
            '听力': '听力理解-篇章',
            '听力理解': '听力理解-篇章',
            '长对话': '听力理解-长对话',
            '新闻报道': '听力理解-新闻报道',
            '阅读理解': '阅读理解-仔细阅读',
            '信息匹配': '阅读理解-信息匹配',
            '翻译': '翻译'
        };
        searchType = dimTypeMap[firstWeak] || '';
    }
    var keyword = '';
    var keywords = userMessage.match(/[\u4e00-\u9fa5a-zA-Z]{2,}/g);
    if (keywords) keyword = keywords.slice(0, 3).join(' ');
    var results = searchQuiz(keyword, searchType, 2);
    if (results.length > 0) {
        context += '\n\n[真题参考-请基于这些出题或讲解]\n';
        results.forEach(function(q, i) {
            context += (i+1) + '. (' + q.type + ') ' + q.question + '\n';
            context += '   A.' + q.optionA + ' B.' + q.optionB + ' C.' + q.optionC + ' D.' + q.optionD + '\n';
            context += '   答案:' + q.answer + ' 解析:' + (q.explanation || '').substring(0,50) + '\n';
        });
    }
    context += '\n\n[用户画像]';
    if (personality) context += '\n- 备考人格: ' + personality;
    if (dimScores) {
        try {
            var scores = JSON.parse(dimScores);
            context += '\n- 五维能力: ';
            for (var k in scores) context += k + '=' + scores[k] + ' ';
        } catch(e) {}
    }
    if (weakDimsList.length > 0) {
        context += '\n- 薄弱维度(按严重程度排序): ' + weakDimsList.join(', ');
        context += '\n→ 出题要求: 优先出最弱维度的题';
    }
    if (wrongSummary) {
        context += '\n- 近期错题: ' + wrongSummary;
    }
    if (studyDays > 0) {
        context += '\n- 已学习: ' + studyDays + '天';
    }
    return context;
}

// ===== 陪练系统提示词 =====
const COMPANION_SYSTEM_PROMPT = `你是"小过学长"的AI陪练模式，一个温暖又专业的四级备考私教。

## 铁律：真题优先，绝不编题
- 如果系统给你[真题参考]，你必须直接使用这些真题出题
- 绝不自己编造题目
- 可以用不同角度讲解同一道真题，但题干和选项必须与[真题参考]一致
- 解析时引用原文线索，让用户知道答案出处

## 出题策略
- 系统会给你[用户画像]和[真题参考]，严格按画像选最合适的真题
- 分数规则：<60分=严重薄弱必须重点练，60-80分=一般需巩固，>80分=已掌握偶尔练
- 出题优先级：最弱维度 > 次弱维度 > 近期错题类型 > 已掌握维度（不主动出）
- 开场第一句话必须出一道最薄弱维度的真题，不要闲聊
- 用户连续答对2题同一维度 → 切换到次弱维度
- 用户答错 → 同维度再出1题巩固，解析要讲透
- **每出够5道题后，给一个简短小结**：`📊 小结：5题对X题，[鼓励语/提醒语]。继续练[最弱维度]？`

## 【核心机制】轻度苏格拉底引导

**核心原则：给答案要快，给方法要深**

**答错时的处理（只等1轮）**：
1. 答错 → 给1个线索提示："❌不是这个。线索：[关键词在原文哪段/哪句话]。再试试？"
2. 用户再错 → 直接给完整解析，不要继续追问

**解析格式**：
```
❌错误，正确答案是X。
解析：[定位技巧+考点]
下次遇到这类题，你会先找什么？
```

**答对但犹豫时**：简短肯定+"这类题的技巧是：[一句话方法]"

**连续答错2题以上**：加一句"没关系，这类题确实容易错，继续加油"

**连续答对3题**：升级夸奖"这类题你已经掌握了！"

## 【核心机制】错因分类与针对性反馈

答错后判断错因类型，给出对应反馈：
- **定位错误**："你的定位偏了。[关键词]在原文第X段"
- **理解错误**："定位对了，但[原文]的同义表达是[选项关键词]"
- **词汇障碍**："关键词是[单词]，意思是XXX，记住它"
- **干扰项陷阱**："[选项]是偷换概念的干扰项，正确做法是[技巧]"

## 听力陪练格式（当用户要求听力练习或出题时使用）
【听力题】以下是听力原文：
"听力原文内容..."
问题：题目内容
A. 选项A
B. 选项B
C. 选项C
D. 选项D
请回答A/B/C/D

## 写作陪练格式（当用户说"批改作文"时使用）
**第一步**：让用户发送作文内容和题目要求
**第二步**：收到后按四级评分标准批改，返回格式：
\`\`\`
📝 作文批改结果：
总分：X/15（换算：X×7.1≈四级标准分）
- 内容：X/5 - 简评
- 结构：X/5 - 简评  
- 语言：X/5 - 简评

🔧 修改建议：
1. 原句："xxx" → 建议："yyy"（原因）
2. ...

💡 总评：一句话
\`\`\`

## 翻译陪练格式（当用户说"翻译练习"或发送翻译内容时使用）
**用户发送**："翻译原文 + 自己的译文"
**AI批改格式**：
\`\`\`
📝 翻译批改：
预估分数：X/15
✅ 命中关键词：xxx, xxx
❌ 遗漏关键词：xxx, xxx
🔧 语法修正：xxx → yyy
💡 建议：一句话
\`\`\`

## 错题分析指引
当用户说"分析错题"、"分析我的薄弱点"时：
- 从[用户画像]中的近期错题数据出发
- 分析错因模式（如"细节题经常选干扰项"、"长对话开头信息容易漏听"）
- 给出针对性训练建议（必须具体，如"每天早上花15分钟做1篇仔细阅读"）

## 对话节奏
- 出题 → 等用户回答 → 判断对错 → 渐进引导（错）或肯定+下题（对）→ 继续
- 用户主动提问 → 先回答问题，然后自然引回出题
- 每次回复控制在200字内，简洁有力

## 出题格式（阅读理解，严格）
【题目】题干内容
A. 选项A
B. 选项B
C. 选项C
D. 选项D
请回答A/B/C/D

## 解析格式（渐进式）
答对：`✅对了！`
答错第一步：`❌不是这个。线索：[提示]` → 等用户再试
答错第二步：`❌正确答案是X。解析：[定位+技巧]`

## 约束：回答必须具体
- **备考技巧**：必须给具体操作（如"每天早上花15分钟做1篇仔细阅读，限时10分钟，做完不要看答案先查生词"而非"多练阅读"）
- **高频词汇**：必须给5个以上具体词汇+简短例句，不能只说"背高频词"
- **学习计划**：给出具体的时间安排和任务量

## 其他规则
- 用中文回复，题目可以用英文
- 鼓励为主但不说废话，答对简洁夸，答错重点讲
- 非四级问题温和引导回备考
- 你是陪练不是老师，像学长一样聊天

## Few-shot示例

**示例1：答错-轻度引导（只等1轮）**
用户：C
AI：❌不是C。线索：题干关键词在原文第2段。再试试？
用户：A
AI：❌正确答案是B。解析：第2段第3行的"primarily"是因果词，后接的就是原因。下次遇到原因题，你会先找什么因果词？`;

async function handleApi(req, res, pathname) {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    // 统一设置CSP

    // 处理CORS预检
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    try {
        // ===== 健康检查 =====
        if (pathname === '/api/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ status: 'ok', uptime: Math.floor(process.uptime()), timestamp: Date.now() }));
        }

        // ===== 手动收款模式 API =====


        // POST /api/create-order - 创建订单（手动收款模式）
        if (pathname === '/api/create-order' && req.method === 'POST') {
            const body = await parseBody(req);
            const { plan } = body;

            if (!plan || !PLANS[plan]) {
                return sendJson(res, 400, { error: '无效的套餐类型' });
            }

            const planConfig = PLANS[plan];
            const orderId = `${planConfig.uidPrefix}${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

            // 免费套餐不需要支付，直接激活
            if (!planConfig.needPay) {
                const token = crypto.createHash('md5').update(orderId + plan + SECRET_KEY).digest('hex');
                return sendJson(res, 200, {
                    orderId,
                    plan,
                    amount: 0,
                    status: 'activated',
                    token,
                    createdAt: Date.now()
                });
            }

            // 创建待支付订单
            orders.set(orderId, {
                orderId,
                plan,
                amount: planConfig.price,
                status: 'pending',
                createdAt: Date.now(),
                activatedAt: null,
                token: null,
                ip: getClientIp(req)
            });

            console.log(`[订单创建] ${orderId} - ${planConfig.name} - ¥${planConfig.price}`);
            saveOrders();

            return sendJson(res, 200, {
                orderId,
                plan,
                amount: planConfig.price,
                status: 'pending',
                wechatQrUrl: WECHAT_PAYMENT_QR,
                createdAt: Date.now()
            });
        }

        // GET /api/check-order - 检查订单状态（用户轮询）
        if (pathname === '/api/check-order' && req.method === 'GET') {
            const url = new URL(req.url, `http://localhost:${PORT}`);
            const orderId = url.searchParams.get('order_id') || url.searchParams.get('orderId');

            if (!orderId) {
                return sendJson(res, 400, { error: '缺少order_id参数' });
            }

            const order = orders.get(orderId);
            if (!order) {
                return sendJson(res, 200, { status: 'not_found' });
            }

            return sendJson(res, 200, {
                status: order.status,
                plan: order.plan,
                token: order.token,
                orderId: order.orderId
            });
        }

        // POST /api/activate-with-mbd-order - 面包多订单号激活（全自动）
        if (pathname === '/api/activate-with-mbd-order' && req.method === 'POST') {
            const body = await parseBody(req);
            const { order_id, plan: reqPlan, user_id } = body;

            if (!order_id) {
                return sendJson(res, 400, { error: '请输入面包多订单号' });
            }

            const orderIdTrimmed = order_id.trim();

            // 确定套餐类型
            let plan = reqPlan || 'sprint';
            if (!PLANS[plan]) plan = 'sprint';

            // 检查此订单号是否已激活过
            const existingActivation = orders.get('mbd_' + orderIdTrimmed);
            if (existingActivation && existingActivation.status === 'activated') {
                return sendJson(res, 200, {
                    success: true,
                    plan: existingActivation.plan,
                    token: existingActivation.token,
                    orderId: existingActivation.orderId,
                    alreadyActivated: true
                });
            }

            // 验证面包多订单（调用面包多API）
            try {
                const mbdResp = await fetch('https://x.mianbaoduo.com/api/order-detail?order_id=' + encodeURIComponent(orderIdTrimmed), {
                    headers: { 'x-token': MBD_DEVELOPER_KEY }
                });
                const mbdData = await mbdResp.json();

                if (mbdData.code !== 200 || !mbdData.result || mbdData.result.length === 0) {
                    return sendJson(res, 200, { success: false, error: '订单号不存在或验证失败' });
                }

                const orderInfo = mbdData.result[0];
                const amount = parseFloat(orderInfo.amount || 0);

                // 根据金额判断套餐
                if (amount >= 100) plan = 'flagship';
                else if (amount >= 30) plan = 'sprint';
                else plan = 'sprint';

                const activationId = 'mbd_' + orderIdTrimmed;
                const token = crypto.createHash('md5').update(activationId + plan + SECRET_KEY).digest('hex');
                orders.set(activationId, {
                    orderId: activationId,
                    mbdOrderId: orderIdTrimmed,
                    plan,
                    amount,
                    status: 'activated',
                    activatedAt: Date.now(),
                    token,
                    ip: getClientIp(req),
                    userId: user_id || null
                });

                saveOrders();
                console.log(`[面包多订单激活] ${orderIdTrimmed} - ${PLANS[plan].name} - ¥${amount}`);

                return sendJson(res, 200, {
                    success: true,
                    plan,
                    token,
                    orderId: activationId,
                    amount
                });
            } catch (e) {
                console.error('[面包多验证失败]', e);
                return sendJson(res, 200, { success: false, error: '验证服务暂时不可用，请稍后重试' });
            }
        }

        // POST /api/mbd-webhook - 面包多支付回调（自动激活）
        if (pathname === '/api/mbd-webhook' && req.method === 'POST') {
            const body = await parseBody(req);
            const { order_id, status, amount, product_id } = body;

            if (!order_id) {
                return sendJson(res, 400, { error: '缺少order_id' });
            }

            // 只有支付成功才激活
            if (status !== 'paid' && status !== 'completed') {
                return sendJson(res, 200, { success: false, error: '订单未支付' });
            }

            const orderIdTrimmed = order_id.trim();
            const activationId = 'mbd_' + orderIdTrimmed;

            // 如果已经激活过，直接返回成功
            if (orders.has(activationId) && orders.get(activationId).status === 'activated') {
                return sendJson(res, 200, { success: true, already_activated: true });
            }

            // 根据金额判断套餐
            let plan = 'sprint';
            const amt = parseFloat(amount || 0);
            if (amt >= 100) plan = 'flagship';
            else if (amt >= 30) plan = 'sprint';

            // 自动创建并激活订单
            const token = crypto.createHash('md5').update(activationId + plan + SECRET_KEY).digest('hex');
            orders.set(activationId, {
                orderId: activationId,
                mbdOrderId: orderIdTrimmed,
                plan,
                amount: amt,
                status: 'activated',
                activatedAt: Date.now(),
                token,
                ip: getClientIp(req),
                autoActivated: true  // 标记为自动激活
            });

            saveOrders();
            console.log(`[面包多Webhook自动激活] ${orderIdTrimmed} - ${PLANS[plan].name} - ¥${amt}`);

            return sendJson(res, 200, { 
                success: true, 
                plan,
                token,
                orderId: activationId 
            });
        }

        // POST /api/activate-with-code - 激活码激活
        if (pathname === '/api/activate-with-code' && req.method === 'POST') {
            const body = await parseBody(req);
            const { code } = body;

            if (!code) {
                return sendJson(res, 400, { error: '请输入激活码' });
            }
            const codeTrimmed = code.trim().toUpperCase();

            // 查找匹配的订单（激活码 = orderId）
            const order = Array.from(orders.values()).find(o => o.orderId === codeTrimmed && o.status === 'activated');

            if (order) {
                // 订单已被管理员激活，返回激活信息
                return sendJson(res, 200, {
                    success: true,
                    plan: order.plan,
                    token: order.token,
                    orderId: order.orderId
                });
            }

            // 检查是否是预生成的激活码（带签名验证）
            // 激活码格式: CET4S-XXXXX-YYYY（前缀-随机码-16位签名）
            // 签名 = HMAC-SHA256(前缀-随机码, SECRET_KEY) 的前16位
            // 也兼容无签名格式 CET4S-XXXXX（用于管理员手动创建的订单）
            const planMatch = codeTrimmed.match(/^(CET4T|CET4S|CET4F|CET4R|CET4P)-([A-Z0-9]+)(?:-([A-Z0-9]{6}))?$/);
            if (planMatch) {
                let plan = 'sprint';
                if (planMatch[1] === 'CET4F') plan = 'flagship';
                else if (planMatch[1] === 'CET4P') plan = 'flagship';
                // CET4T, CET4R, CET4S 都是 sprint

                const prefix = planMatch[1];
                const randomPart = planMatch[2];
                const signature = planMatch[3]; // 可能为undefined（旧格式无签名）

                // 验证签名（如果有签名的话）
                if (signature) {
                    const expectedSig = crypto.createHmac('sha256', SECRET_KEY)
                        .update(prefix + '-' + randomPart)
                        .digest('hex')
                        .substring(0, 16)
                        .toUpperCase();
                    if (signature !== expectedSig) {
                        return sendJson(res, 400, { error: '激活码无效，请检查后重试' });
                    }
                }
                // 无签名的旧格式码：只允许已经存在于orders中的码（管理员预创建的）

                // 检查是否已存在此激活码的订单
                const existingOrder = orders.get(codeTrimmed);
                if (existingOrder) {
                    if (existingOrder.status === 'activated') {
                        return sendJson(res, 200, {
                            success: true,
                            plan: existingOrder.plan,
                            token: existingOrder.token,
                            orderId: existingOrder.orderId
                        });
                    }
                    // 订单存在但未激活，激活它
                    const token = crypto.createHash('md5').update(codeTrimmed + plan + SECRET_KEY).digest('hex');
                    existingOrder.status = 'activated';
                    existingOrder.activatedAt = Date.now();
                    existingOrder.token = token;

                    console.log(`[激活码激活] ${codeTrimmed} - ${PLANS[plan].name}`);

                    return sendJson(res, 200, {
                        success: true,
                        plan,
                        token,
                        orderId: existingOrder.orderId
                    });
                }

                // 无签名码且不存在于orders中，拒绝（防止猜测格式白嫖）
                if (!signature) {
                    return sendJson(res, 400, { error: '激活码无效，请联系客服获取' });
                }

                // 有签名验证通过，创建并激活订单
                const orderId = codeTrimmed;
                const token = crypto.createHash('md5').update(orderId + plan + SECRET_KEY).digest('hex');
                orders.set(orderId, {
                    orderId,
                    plan,
                    amount: PLANS[plan].price,
                    status: 'activated',
                    createdAt: Date.now(),
                    activatedAt: Date.now(),
                    token,
                    source: 'activation_code'
                });

                saveOrders();
                console.log(`[激活码激活] ${orderId} - ${PLANS[plan].name}`);

                return sendJson(res, 200, {
                    success: true,
                    plan,
                    token,
                    orderId
                });
            }

            // 尝试直接作为订单ID查找未激活的订单（用户可能在管理员激活后使用）
            const pendingOrder = orders.get(codeTrimmed);
            if (pendingOrder && pendingOrder.status === 'pending') {
                pendingOrder.status = 'activated';
                pendingOrder.activatedAt = Date.now();
                if (!pendingOrder.token) {
                    pendingOrder.token = crypto.createHash('md5').update(codeTrimmed + pendingOrder.plan + SECRET_KEY).digest('hex');
                }
                console.log(`[订单激活] ${codeTrimmed} - ${PLANS[pendingOrder.plan].name}`);
                return sendJson(res, 200, {
                    success: true,
                    plan: pendingOrder.plan,
                    token: pendingOrder.token,
                    orderId: pendingOrder.orderId
                });
            }

            return sendJson(res, 400, { error: '激活码无效，请检查后重试' });
        }

        // POST /api/activate - 管理员激活订单（需密钥）
        if (pathname === '/api/activate' && req.method === 'POST') {
            const body = await parseBody(req);
            const { orderId, key } = body;

            if (key !== ADMIN_KEY) {
                return sendJson(res, 403, { error: '密钥错误' });
            }

            if (!orderId) {
                return sendJson(res, 400, { error: '缺少orderId' });
            }

            const order = orders.get(orderId);
            if (!order) {
                return sendJson(res, 404, { error: '订单不存在' });
            }

            if (order.status === 'activated') {
                return sendJson(res, 200, { success: true, plan: order.plan, token: order.token, orderId: order.orderId, alreadyActivated: true });
            }

            order.status = 'activated';
            order.activatedAt = Date.now();
            order.token = crypto.createHash('md5').update(orderId + order.plan + SECRET_KEY).digest('hex');

            console.log(`[管理员激活] ${orderId} - ${PLANS[order.plan].name}`);

            return sendJson(res, 200, {
                success: true,
                plan: order.plan,
                token: order.token,
                orderId: order.orderId
            });
        }

        // POST /api/create-order-admin - 管理员创建订单
        if (pathname === '/api/create-order-admin' && req.method === 'POST') {
            const body = await parseBody(req);
            const { plan, key, customAmount } = body;

            if (key !== ADMIN_KEY) {
                return sendJson(res, 403, { error: '密钥错误' });
            }

            if (!plan || !PLANS[plan]) {
                return sendJson(res, 400, { error: '无效的套餐' });
            }

            const planConfig = PLANS[plan];
            const orderId = `${planConfig.uidPrefix}${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
            const amount = customAmount || planConfig.price;

            orders.set(orderId, {
                orderId,
                plan,
                amount,
                status: 'pending',
                createdAt: Date.now(),
                activatedAt: null,
                token: null
            });

            return sendJson(res, 200, {
                orderId,
                plan,
                amount,
                status: 'pending'
            });
        }
            saveOrders();

        // GET /api/verify-token - 验证token（用户打开页面时调用）
        if (pathname === '/api/verify-token' && req.method === 'GET') {
            const url = new URL(req.url, `http://localhost:${PORT}`);
            const token = url.searchParams.get('token');

            if (!token) {
                return sendJson(res, 200, { valid: false, plan: 'free' });
            }

            // 查找此token对应的订单
            const order = Array.from(orders.values()).find(o => o.token === token);
            if (order && order.status === 'activated') {
                return sendJson(res, 200, {
                    valid: true,
                    plan: order.plan,
                    uid: order.uid || generateUid(order.plan),
                    orderId: order.orderId,
                    paid: true
                });
            }

            return sendJson(res, 200, { valid: false, plan: 'free' });
        }

        // GET /api/plans - 获取套餐信息
        if (pathname === '/api/plans' && req.method === 'GET') {
            return sendJson(res, 200, {
                plans: Object.entries(PLANS).map(([key, config]) => ({
                    id: key,
                    name: config.name,
                    price: config.price,
                    uidPrefix: config.uidPrefix
                }))
            });
        }

        // GET /api/diagnosis/questions - 获取诊断题库（真题版v2）
        if (pathname === '/api/diagnosis/questions' && req.method === 'GET') {
            const diagnosisFile = path.join(process.cwd(), 'public/diagnosis_questions.json');
            try {
                if (fs.existsSync(diagnosisFile)) { console.log('[DIAG] Found at:', diagnosisFile);
                    const data = fs.readFileSync(diagnosisFile, 'utf8');
                    return sendJson(res, 200, JSON.parse(data));
                }
            } catch (e) {
                console.error('读取诊断题库失败:', e.message);
            }
            return sendJson(res, 404, { error: '诊断题库未找到' });
        }

        // POST /api/diagnosis/writing-grade - 写作AI评分
        if (pathname === '/api/diagnosis/writing-grade' && req.method === 'POST') {
            const body = await parseBody(req);
            const { title, description, user_input } = body;

            if (!user_input || user_input.length < 10) {
                return sendJson(res, 400, { error: '作文内容过短' });
            }

            const dsApiKey = DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
            if (!dsApiKey) {
                return sendJson(res, 500, { error: 'DeepSeek API未配置' });
            }

            try {
                // 构建评分prompt
                const prompt = `你是一位四级考试写作评分专家。请对以下作文进行评分。
题目：${title || 'CET-4写作'}
要求：${description || '请根据题目要求完成一篇120-180词的作文'}
学生作文：
${user_input}

请按以下格式返回JSON（不要加markdown代码块，不要有其他内容）：
{
  "vocabulary": 0-25之间的整数,
  "grammar": 0-25之间的整数,
  "logic": 0-25之间的整数,
  "coherence": 0-25之间的整数,
  "total": 0-100之间的整数,
  "comment": "1-2句简短评语（中文）"
}`;

                const dsPayload = {
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: '你是一位专业、严谨的四级写作评分专家。你必须严格按照格式返回JSON结果，不要包含任何markdown代码块标记。' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.3,
                    max_tokens: 500
                };

                const dsResp = await fetch(DEEPSEEK_API_BASE + '/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + dsApiKey, 'Content-Type': 'application/json' },
                    body: JSON.stringify(dsPayload)
                });

                if (!dsResp.ok) {
                    const errText = await dsResp.text();
                    console.error('[DeepSeek写作评分API错误]', dsResp.status, errText);
                    return sendJson(res, 500, { error: 'AI评分服务暂时不可用' });
                }

                const dsData = await dsResp.json();
                let responseText = dsData.choices && dsData.choices[0] && dsData.choices[0].message ? dsData.choices[0].message.content : '';

                // 清理可能的markdown代码块
                responseText = responseText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

                // 尝试解析JSON
                let scoreData;
                try {
                    scoreData = JSON.parse(responseText);
                } catch(e) {
                    // 尝试提取JSON
                    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        try {
                            scoreData = JSON.parse(jsonMatch[0]);
                        } catch(e2) {
                            // 返回默认分数
                            scoreData = {
                                vocabulary: 15,
                                grammar: 15,
                                logic: 15,
                                coherence: 15,
                                total: 60,
                                comment: '评分服务解析失败，使用默认评分'
                            };
                        }
                    } else {
                        scoreData = {
                            vocabulary: 15,
                            grammar: 15,
                            logic: 15,
                            coherence: 15,
                            total: 60,
                            comment: '评分服务解析失败，使用默认评分'
                        };
                    }
                }

                // 确保数值在有效范围内
                scoreData.vocabulary = Math.min(25, Math.max(0, parseInt(scoreData.vocabulary) || 15));
                scoreData.grammar = Math.min(25, Math.max(0, parseInt(scoreData.grammar) || 15));
                scoreData.logic = Math.min(25, Math.max(0, parseInt(scoreData.logic) || 15));
                scoreData.coherence = Math.min(25, Math.max(0, parseInt(scoreData.coherence) || 15));
                scoreData.total = Math.min(100, Math.max(0, parseInt(scoreData.total) || (scoreData.vocabulary + scoreData.grammar + scoreData.logic + scoreData.coherence)));
                scoreData.comment = scoreData.comment || '继续保持！';

                return sendJson(res, 200, { code: 0, data: scoreData });

            } catch(e) {
                console.error('[写作评分失败]', e);
                return sendJson(res, 500, { error: '写作评分失败: ' + e.message });
            }
        }

        // POST /api/diagnosis/translation-grade - 翻译AI评分
        if (pathname === '/api/diagnosis/translation-grade' && req.method === 'POST') {
            const body = await parseBody(req);
            const { chinese, reference, user_input } = body;

            if (!user_input || user_input.length < 5) {
                return sendJson(res, 400, { error: '翻译内容过短' });
            }

            const dsApiKey = DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
            if (!dsApiKey) {
                return sendJson(res, 500, { error: 'DeepSeek API未配置' });
            }

            try {
                // 构建评分prompt
                const prompt = `你是一位四级考试翻译评分专家。请对以下翻译进行评分。
中文原文：
${chinese || ''}
${reference ? '参考译文：\n' + reference : ''}
学生翻译：
${user_input}

请按以下格式返回JSON（不要加markdown代码块，不要有其他内容）：
{
  "keywords": 0-35之间的整数（关键词覆盖程度）,
  "grammar": 0-35之间的整数（语法正确性）,
  "expression": 0-30之间的整数（表达地道程度）,
  "total": 0-100之间的整数,
  "comment": "1-2句简短评语（中文）"
}`;

                const dsPayload = {
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: '你是一位专业、严谨的四级翻译评分专家。你必须严格按照格式返回JSON结果，不要包含任何markdown代码块标记。' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.3,
                    max_tokens: 500
                };

                const dsResp = await fetch(DEEPSEEK_API_BASE + '/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + dsApiKey, 'Content-Type': 'application/json' },
                    body: JSON.stringify(dsPayload)
                });

                if (!dsResp.ok) {
                    const errText = await dsResp.text();
                    console.error('[DeepSeek翻译评分API错误]', dsResp.status, errText);
                    return sendJson(res, 500, { error: 'AI评分服务暂时不可用' });
                }

                const dsData = await dsResp.json();
                let responseText = dsData.choices && dsData.choices[0] && dsData.choices[0].message ? dsData.choices[0].message.content : '';

                // 清理可能的markdown代码块
                responseText = responseText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

                // 尝试解析JSON
                let scoreData;
                try {
                    scoreData = JSON.parse(responseText);
                } catch(e) {
                    // 尝试提取JSON
                    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        try {
                            scoreData = JSON.parse(jsonMatch[0]);
                        } catch(e2) {
                            // 返回默认分数
                            scoreData = {
                                keywords: 20,
                                grammar: 20,
                                expression: 15,
                                total: 55,
                                comment: '评分服务解析失败，使用默认评分'
                            };
                        }
                    } else {
                        scoreData = {
                            keywords: 20,
                            grammar: 20,
                            expression: 15,
                            total: 55,
                            comment: '评分服务解析失败，使用默认评分'
                        };
                    }
                }

                // 确保数值在有效范围内
                scoreData.keywords = Math.min(35, Math.max(0, parseInt(scoreData.keywords) || 20));
                scoreData.grammar = Math.min(35, Math.max(0, parseInt(scoreData.grammar) || 20));
                scoreData.expression = Math.min(30, Math.max(0, parseInt(scoreData.expression) || 15));
                scoreData.total = Math.min(100, Math.max(0, parseInt(scoreData.total) || (scoreData.keywords + scoreData.grammar + scoreData.expression)));
                scoreData.comment = scoreData.comment || '继续保持！';

                return sendJson(res, 200, { code: 0, data: scoreData });

            } catch(e) {
                console.error('[翻译评分失败]', e);
                return sendJson(res, 500, { error: '翻译评分失败: ' + e.message });
            }
        }

        // POST /api/diagnosis/report - 生成诊断报告（使用DeepSeek）
        if (pathname === '/api/diagnosis/report' && req.method === 'POST') {
            const body = await parseBody(req);
            const { answers, selfAssessment, writingScore, translationScore } = body;

            if (!answers || !Array.isArray(answers) || answers.length === 0) {
                return sendJson(res, 400, { error: '缺少答题数据' });
            }

            // 确保DeepSeek API Key存在
            const dsApiKey = DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
            if (!dsApiKey) {
                return sendJson(res, 500, { error: 'DeepSeek API未配置' });
            }

            try {
                // 计算五维能力得分
                const abilityMap = {
                    '细节定位': { correct: 0, total: 0 },
                    '推理判断': { correct: 0, total: 0 },
                    '同义替换': { correct: 0, total: 0 },
                    '主旨归纳': { correct: 0, total: 0 },
                    '态度判断': { correct: 0, total: 0 }
                };

                answers.forEach(function(a) {
                    var ability = a.ability || '细节定位';
                    if (abilityMap[ability]) {
                        abilityMap[ability].total++;
                        if (a.userAnswer === a.correctAnswer) {
                            abilityMap[ability].correct++;
                        }
                    }
                });

                // 计算各维度百分比
                var dims = {};
                Object.keys(abilityMap).forEach(function(k) {
                    dims[k] = abilityMap[k].total > 0 ? Math.round((abilityMap[k].correct / abilityMap[k].total) * 100) : 0;
                });

                // 计算总正确率
                var totalCorrect = answers.filter(function(a) { return a.userAnswer === a.correctAnswer; }).length;
                var totalRate = Math.round((totalCorrect / answers.length) * 100);

                // 人格匹配逻辑（优先级从高到低）
                var personality = '佛系随缘选手';
                var roast = '';
                var dimsArray = Object.values(dims);
                var maxDim = Math.max.apply(null, dimsArray);
                var minDim = Math.min.apply(null, dimsArray);
                var dimRange = maxDim - minDim;

                // 1. 全知全能·学神 — 正确率≥80%
                if (totalRate >= 80) {
                    personality = '全知全能·学神';
                    roast = '太强了吧！这就是传说中的"天选之人"吗？四级对你来说就是洒洒水啦~';
                }
                // 2. 偏科大佬 — 有2个维度≥90%且2个维度≤40%
                else {
                    var highDims = Object.values(dims).filter(function(v) { return v >= 90; }).length;
                    var lowDims = Object.values(dims).filter(function(v) { return v <= 40; }).length;
                    if (highDims >= 2 && lowDims >= 2) {
                        personality = '偏科大佬';
                        roast = '你这是"特长生"体质啊！某些能力爆表，某些能力...emmm，需要雨露均沾一下~';
                    }
                    // 3. 脑补大师 — 推理判断正确率<50%且非偏科大佬
                    else if (dims['推理判断'] < 50) {
                        personality = '脑补大师';
                        roast = '你的脑洞比黑洞还大！推理题全靠蒙对吧？别慌，这是可以训练的~';
                    }
                    // 4. 临时抱佛脚选手 — 细节定位50%-70%且同义替换50%-70%且推理判断40%-60%
                    else if (dims['细节定位'] >= 50 && dims['细节定位'] <= 70 &&
                             dims['同义替换'] >= 50 && dims['同义替换'] <= 70 &&
                             dims['推理判断'] >= 40 && dims['推理判断'] <= 60) {
                        personality = '临时抱佛脚选手';
                        roast = '平时不烧香，临时抱佛脚说的就是你吧？不过能抱上，说明底子还行~';
                    }
                    // 5. 资料囤积狂 — 同义替换≥60%且态度判断≥50%且主旨归纳≥50%且非以上类型
                    else if (dims['同义替换'] >= 60 && dims['态度判断'] >= 50 && dims['主旨归纳'] >= 50) {
                        personality = '资料囤积狂';
                        roast = '收藏夹里躺着一百G资料对吧？但光囤不用可不行哦~';
                    }
                    // 6. 吗喽型选手 — 各维度均在30%-70%且均衡（最高最低差值≤30%）
                    else if (dimRange <= 30 && dimsArray.every(function(v) { return v >= 30 && v <= 70; })) {
                        personality = '吗喽型选手';
                        roast = '稳如老狗，说的就是你！不偏科但也没有特别突出的，均衡型选手~';
                    }
                    // 7. 摆烂冠军 — 正确率≤30%且非偏科大佬
                    else if (totalRate <= 30) {
                        personality = '摆烂冠军';
                        roast = '摆烂摆出新境界！不过没关系，从现在开始努力，一切都还来得及~';
                    }
                    // 8. 佛系随缘选手 — 默认
                    else {
                        personality = '佛系随缘选手';
                        roast = '缘分到了自然就会~四级这东西嘛，随缘随缘~（其实需要认真备考哦）';
                    }
                }

                // 自评数据处理
                var listeningLevel = '中等';
                var writingLevel = '中等';
                var translationLevel = '中等';
                if (selfAssessment) {
                    if (selfAssessment.listening) listeningLevel = selfAssessment.listening;
                    if (selfAssessment.writing) writingLevel = selfAssessment.writing;
                    if (selfAssessment.translation) translationLevel = selfAssessment.translation;
                }

                // AI实测评分处理（如果有的话）
                var writingAIScore = null;
                var translationAIScore = null;
                if (writingScore) {
                    writingAIScore = writingScore;
                    // 根据AI评分调整写作等级描述
                    if (writingScore.total >= 80) writingLevel = 'AI实测：较好';
                    else if (writingScore.total >= 60) writingLevel = 'AI实测：一般';
                    else if (writingScore.total >= 40) writingLevel = 'AI实测：较弱';
                    else writingLevel = 'AI实测：薄弱';
                }
                if (translationScore) {
                    translationAIScore = translationScore;
                    // 根据AI评分调整翻译等级描述
                    if (translationScore.total >= 80) translationLevel = 'AI实测：较好';
                    else if (translationScore.total >= 60) translationLevel = 'AI实测：一般';
                    else if (translationScore.total >= 40) translationLevel = 'AI实测：较弱';
                    else translationLevel = 'AI实测：薄弱';
                }

                // 构建DeepSeek prompt
                var prompt = '你是四级备考AI教练。用户刚刚完成了一套15道阅读诊断题以及写作和翻译实测，请生成一份个性化的诊断报告。\n\n';
                prompt += '【用户答题情况】\n';
                answers.forEach(function(a, idx) {
                    var isCorrect = a.userAnswer === a.correctAnswer ? '✓' : '✗';
                    prompt += (idx + 1) + '. [' + a.ability + '] 用户选' + a.userAnswer + '，正确答案' + a.correctAnswer + ' ' + isCorrect + '\n';
                });
                prompt += '\n【五维能力得分】(正确数/该维度总数×100)\n';
                Object.keys(dims).forEach(function(k) {
                    prompt += k + ': ' + dims[k] + '分\n';
                });
                prompt += '\n总正确率: ' + totalRate + '%（' + totalCorrect + '/15）\n';
                // 添加AI实测评分到prompt
                if (writingAIScore) {
                    prompt += '\n【写作实测AI评分】\n';
                    prompt += '词汇运用: ' + writingAIScore.vocabulary + '/25 | ';
                    prompt += '语法正确: ' + writingAIScore.grammar + '/25 | ';
                    prompt += '逻辑结构: ' + writingAIScore.logic + '/25 | ';
                    prompt += '连贯衔接: ' + writingAIScore.coherence + '/25\n';
                    prompt += '写作总分: ' + writingAIScore.total + '/100\n';
                }
                if (translationAIScore) {
                    prompt += '\n【翻译实测AI评分】\n';
                    prompt += '关键词覆盖: ' + translationAIScore.keywords + '/35 | ';
                    prompt += '语法正确性: ' + translationAIScore.grammar + '/35 | ';
                    prompt += '表达地道度: ' + translationAIScore.expression + '/30\n';
                    prompt += '翻译总分: ' + translationAIScore.total + '/100\n';
                }
                prompt += '\n【自评结果】\n';
                prompt += '听力: ' + listeningLevel + ' | 写作: ' + writingLevel + ' | 翻译: ' + translationLevel + '\n';
                prompt += '\n【匹配人格】' + personality + '\n';
                prompt += roast + '\n';
                prompt += '\n请生成一份完整的诊断报告，包含：\n';
                prompt += '1. 对用户整体表现的评价（结合阅读实测和写译AI评分）\n';
                prompt += '2. 五维能力的详细分析\n';
                prompt += '3. 写作和翻译的AI评分分析（如果有）\n';
                prompt += '4. 针对薄弱项的提升建议\n';
                prompt += '5. 备考策略推荐\n\n';
                prompt += '报告最后请用以下格式输出结果标签（方便前端解析）：\n';
                prompt += '[RESULT:type=' + personality + '|score=' + totalRate;
                Object.keys(dims).forEach(function(k) {
                    prompt += '|' + k + '=' + dims[k];
                });
                prompt += ']';

                // 调用DeepSeek API
                var dsPayload = {
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: '你是一位专业、幽默、温暖的四级备考AI教练。你的任务是根据用户的答题数据生成个性化的诊断报告。报告要既有专业性，又有趣味性，像朋友聊天一样自然。' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 1500
                };

                var dsResp = await fetch(DEEPSEEK_API_BASE + '/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + dsApiKey, 'Content-Type': 'application/json' },
                    body: JSON.stringify(dsPayload)
                });

                if (!dsResp.ok) {
                    var errText = await dsResp.text();
                    console.error('[DeepSeek API错误]', dsResp.status, errText);
                    return sendJson(res, 500, { error: 'AI服务暂时不可用' });
                }

                var dsData = await dsResp.json();
                var reportText = dsData.choices && dsData.choices[0] && dsData.choices[0].message ? dsData.choices[0].message.content : '';

                // 提取RESULT标签
                var resultTag = '';
                var resultMatch = reportText.match(/\[RESULT:[^\]]+\]/);
                if (resultMatch) {
                    resultTag = resultMatch[0];
                    reportText = reportText.replace(resultMatch[0], '').trim();
                }

                // 解析resultTag
                var resultData = { type: personality, score: totalRate, dims: dims };
                if (resultTag) {
                    var tagContent = resultTag.match(/\[RESULT:(.+)\]/)[1];
                    var pairs = tagContent.split('|');
                    pairs.forEach(function(pair) {
                        var kv = pair.split('=');
                        if (kv.length === 2) {
                            var key = kv[0].trim();
                            var val = kv[1].trim();
                            if (key === 'type') resultData.type = val;
                            else if (key === 'score') resultData.score = parseInt(val) || 0;
                            else if (['细节定位', '推理判断', '同义替换', '主旨归纳', '态度判断'].indexOf(key) !== -1) {
                                resultData.dims[key] = parseInt(val) || 0;
                            }
                        }
                    });
                }

                return sendJson(res, 200, {
                    code: 0,
                    data: {
                        report: reportText,
                        result_tag: resultTag,
                        result: resultData,
                        personality: personality,
                        roast: roast,
                        dimension_scores: dims,
                        total_correct: totalCorrect,
                        total_rate: totalRate,
                        self_assessment: {
                            listening: listeningLevel,
                            writing: writingLevel,
                            translation: translationLevel
                        },
                        // 新增：AI实测评分
                        ai_writing_score: writingAIScore,
                        ai_translation_score: translationAIScore
                    }
                });

            } catch(e) {
                console.error('[诊断报告生成失败]', e);
                return sendJson(res, 500, { error: '生成诊断报告失败: ' + e.message });
            }
        }

        // GET /api/admin/orders - 管理员查看所有订单
        if (pathname === '/api/admin/orders' && req.method === 'GET') {
            const url = new URL(req.url, `http://localhost:${PORT}`);
            const key = url.searchParams.get('key');

            if (key !== ADMIN_KEY) {
                return sendJson(res, 403, { error: '密钥错误' });
            }

            const orderList = Array.from(orders.values()).map(o => ({
                orderId: o.orderId,
                plan: o.plan,
                amount: o.amount,
                status: o.status,
                createdAt: o.createdAt,
                activatedAt: o.activatedAt,
                ip: o.ip || ''
            })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            return sendJson(res, 200, { orders: orderList });
        }

        // POST /api/admin-generate-code - 管理员生成激活码（admin.html前端调用）
        if (pathname === '/api/admin-generate-code' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    if (data.adminKey !== ADMIN_KEY) {
                        return sendJson(res, 403, { success: false, error: '密钥错误' });
                    }
                    const plan = data.plan || 'sprint';
                    const count = parseInt(data.count) || 1;
                    if (!PLANS[plan]) {
                        return sendJson(res, 400, { success: false, error: '无效的套餐' });
                    }
                    const codes = [];
                    const prefixMap = { sprint: 'CET4S', flagship: 'CET4F' };
                    const prefix = prefixMap[plan] || 'CET4S';
                    for (let i = 0; i < count; i++) {
                        const randomPart = Math.random().toString(36).substr(2, 5).toUpperCase();
                        const signature = crypto.createHmac('sha256', SECRET_KEY)
                            .update(prefix + '-' + randomPart)
                            .digest('hex')
                            .substring(0, 16)
                            .toUpperCase();
                        const code = `${prefix}-${randomPart}-${signature}`;
                        codes.push(code);
                    }
                    return sendJson(res, 200, { success: true, codes, plan });
                } catch (e) {
                    return sendJson(res, 400, { success: false, error: '请求格式错误' });
                }
            });
            return;
        }

        // GET /api/admin/generate-codes - 管理员生成激活码
        if (pathname === '/api/admin/generate-codes' && req.method === 'GET') {
            const url = new URL(req.url, `http://localhost:${PORT}`);
            const key = url.searchParams.get('key');
            const plan = url.searchParams.get('plan') || 'sprint';
            const count = parseInt(url.searchParams.get('count') || '1');

            if (key !== ADMIN_KEY) {
                return sendJson(res, 403, { error: '密钥错误' });
            }

            if (!PLANS[plan]) {
                return sendJson(res, 400, { error: '无效的套餐' });
            }

            const codes = [];
            const prefixMap = { sprint: 'CET4S', flagship: 'CET4F' };
            const prefix = prefixMap[plan] || 'CET4S';

            for (let i = 0; i < count; i++) {
                const randomPart = Math.random().toString(36).substr(2, 5).toUpperCase();
                const signature = crypto.createHmac('sha256', SECRET_KEY)
                    .update(prefix + '-' + randomPart)
                    .digest('hex')
                    .substring(0, 16)
                    .toUpperCase();
                const code = `${prefix}-${randomPart}-${signature}`;
                codes.push(code);
            }

            return sendJson(res, 200, { codes, plan });
        }

        // GET /api/paid-check - 检查是否已付款（简化版）
        if (pathname === '/api/paid-check' && req.method === 'GET') {
            const url = new URL(req.url, `http://localhost:${PORT}`);
            const orderId = url.searchParams.get('order_id') || url.searchParams.get('orderId');

            if (!orderId) {
                return sendJson(res, 400, { error: '缺少order_id' });
            }

            const order = orders.get(orderId);
            if (!order) {
                // 修复：order不存在时返回paid=false，避免漏洞
                return sendJson(res, 200, { paid: false });
            }

            return sendJson(res, 200, {
                paid: order.paid,
                uid: order.uid,
                plan: order.plan,
                bot_id: PLANS[order.plan]?.botId
            });
        }

        // ===== Coze Chat API 代理 =====
        if (pathname === '/api/chat/conversation' && req.method === 'POST') {
            return handleCreateConversation(req, res);
        }
        if (pathname === '/api/chat/send' && req.method === 'POST') {
            return handleChatSend(req, res);
        }
        if (pathname === '/api/chat/messages' && req.method === 'GET') {
            return handleChatMessages(req, res);
        }
        if (pathname === '/api/chat/retrieve' && req.method === 'GET') {
            return handleChatRetrieve(req, res);
        }
        
        // 修复问题1：新增API - 获取剩余对话次数
        // 改为POST，前端带plan_token验证付费身份
        if (pathname === '/api/chat/remaining' && req.method === 'POST') {
            const body = await parseBody(req);
            const userId = body.user_id;
            
            if (!userId) {
                return sendJson(res, 400, { error: '缺少user_id' });
            }
            
            // 从后端订单验证真实套餐（用token验证，不信任前端）
            const verifiedPlan = getVerifiedUserPlan(req, userId, body);
            const remaining = verifiedPlan === 'free' ? getRemainingChats(userId) : -1; // -1表示无限
            
            return sendJson(res, 200, {
                remaining,
                plan: verifiedPlan,
                limit: verifiedPlan === 'free' ? 25 : -1
            });
        }


        // ===== 用户数据上云 API =====
        // POST /api/progress - 保存用户数据
        if (pathname === '/api/progress' && req.method === 'POST') {
            const body = await parseBody(req);
            const { user_id, data } = body;
            
            if (!user_id) {
                return sendJson(res, 400, { error: '缺少user_id' });
            }
            
            try {
                const result = await saveUserProgress(user_id, data || {});
                return sendJson(res, 200, { success: true, updated_at: result.updated_at });
            } catch(e) {
                console.error('[Progress Save Error]', e.message);
                return sendJson(res, 500, { error: '保存失败' });
            }
        }
        
        // GET /api/progress - 获取用户数据
        if (pathname === '/api/progress' && req.method === 'GET') {
            const url = new URL(req.url, 'http://localhost');
            const userId = url.searchParams.get('user_id');
            
            if (!userId) {
                return sendJson(res, 400, { error: '缺少user_id' });
            }
            
            try {
                const progress = await getUserProgress(userId);
                return sendJson(res, 200, { success: true, data: progress });
            } catch(e) {
                console.error('[Progress Load Error]', e.message);
                return sendJson(res, 500, { error: '读取失败' });
            }
        }

        // POST /api/deepseek/chat - DeepSeek陪练对话
        if (pathname === '/api/deepseek/chat' && req.method === 'POST') {
            try {
                const body = await parseBody(req);
                const { messages, stream } = body;
                if (!messages || !messages.length) {
                    return sendJson(res, 400, { error: '参数缺失' });
                }
                // 构建RAG上下文
                const userPersonality = body.personality || '';
                const weakDims = body.weak_dims || [];
                const userId = body.user_id || 'anonymous';
                let ragCtx = '';
                try { ragCtx = buildRagContext(messages[messages.length-1].content || '', userPersonality, weakDims, body.dim_scores, body.wrong_summary, body.study_days || 0); } catch(e) {}
                const systemContent = COMPANION_SYSTEM_PROMPT + (ragCtx || '');
                const payload = {
                    model: 'deepseek-chat',
                    messages: [{ role: 'system', content: systemContent }, ...messages.slice(-10)],
                    stream: stream !== false,
                    temperature: 0.7,
                    max_tokens: 800
                };
                if (payload.stream) {
                    const resp = await fetch(DEEPSEEK_API_BASE + '/chat/completions', {
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + DEEPSEEK_API_KEY, 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const contentType = resp.headers.get('content-type') || '';
                    if (contentType.includes('text/event-stream')) {
                        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
                        const reader = resp.body.getReader();
                        async function pump() {
                            try { while (true) { const { done, value } = await reader.read(); if (done) { res.end(); break; } res.write(value); } }
                            catch (err) { console.error('[DS pump]', err.message); res.end(); }
                        }
                        pump();
                    } else {
                        const data = await resp.json();
                        const content = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
                        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
                        if (content) { res.write('data: ' + JSON.stringify({ choices: [{ delta: { content: content } }] }) + '\n\n'); }
                        res.write('data: [DONE]\n\n');
                        res.end();
                    }
                } else {
                    const resp = await fetch(DEEPSEEK_API_BASE + '/chat/completions', {
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + DEEPSEEK_API_KEY, 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const data = await resp.json();
                    const reply = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
                    sendJson(res, 200, { code: 0, data: { content: reply, usage: data.usage || {} } });
                }
            } catch(e) {
                console.error('[DS Chat Error]', e.message, e.stack);
                if (!res.headersSent) sendJson(res, 500, { error: 'AI服务暂时不可用: ' + e.message });
            }
            return;
        }

        // GET /api/deepseek/quiz-topics - 获取写作题目列表
        if (pathname === '/api/deepseek/quiz-topics' && req.method === 'GET') {
            // 从quiz_questions.json筛选写作相关题目
            const quizFile = path.join(__dirname, 'data', 'quiz_questions.json');
            let topics = []; // 从题库文件读取
            if (fs.existsSync(quizFile)) {
                try {
                    const quizData = JSON.parse(fs.readFileSync(quizFile, 'utf8'));
                    const quizTopics = quizData.filter(function(q) {
                        var type = q.type || '';
                        return type.includes('写作') || type.includes('作文');
                    }).map(function(q) {
                        return {
                            id: q.id,
                            title: q.type || '写作题',
                            desc: (q.question || '').substring(0, 50),
                            difficulty: q.difficulty || '中等'
                        };
                    });
                    topics = topics.concat(quizTopics.slice(0, 10));
                } catch(e) {}
            }
            return sendJson(res, 200, { code: 0, data: topics });
        }

        // POST /api/deepseek/essay-grade - 作文批改
        if (pathname === '/api/deepseek/essay-grade' && req.method === 'POST') {
            const body = await parseBody(req);
            const { essay_text, topic } = body;
            
            if (!essay_text || essay_text.length < 20) {
                return sendJson(res, 400, { error: '作文内容太少' });
            }
            
            var topicPrefix = topic ? '【题目类型】' + topic + '\n' : '';
            var systemPrompt = '你是四级作文批改专家。请对以下作文进行批改，返回JSON格式：{"total_score": 数字(15分制), "content_score": 数字(5分制), "organization_score": 数字(5分制), "language_score": 数字(5分制), "sentences": [{"original": "原句", "issue": "问题说明", "suggestion": "修改建议"}], "overall_comment": "总评"} 只返回JSON，不要其他文字。';
            
            try {
                const resp = await fetch(DEEPSEEK_API_BASE + '/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + DEEPSEEK_API_KEY, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: topicPrefix + '【我的作文】\n' + essay_text }
                        ],
                        temperature: 0.3,
                        max_tokens: 1000
                    })
                });
                
                const data = await resp.json();
                const reply = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
                
                // 尝试解析JSON
                try {
                    var jsonMatch = reply.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        var result = JSON.parse(jsonMatch[0]);
                        return sendJson(res, 200, { code: 0, data: result });
                    } else {
                        return sendJson(res, 200, { code: 0, data: { raw: reply, parse_error: true } });
                    }
                } catch(e) {
                    return sendJson(res, 200, { code: 0, data: { raw: reply, parse_error: true } });
                }
            } catch(e) {
                console.error('[Essay Grade Error]', e.message);
                return sendJson(res, 500, { error: '批改服务暂时不可用' });
            }
        }

        // ===== GitHub Webhook Auto-Deploy =====
    if (req.url === '/webhook/deploy' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const WEBHOOK_SECRET = 'cet_deploy_2026_secret';
            try {
                const payload = JSON.parse(body);
                // 只处理 main 分支的 push
                if (payload.ref === 'refs/heads/main') {
                    console.log('[Webhook] 收到push事件，开始自动部署...');
                    const { execSync } = require('child_process');
                    try {
                        execSync('cd /opt/cet-tutor && git fetch --all && git reset --hard origin/main && pm2 restart all', { timeout: 30000 });
                        console.log('[Webhook] 部署完成');
                    } catch (e) {
                        console.error('[Webhook] 部署失败:', e.message);
                    }
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, message: payload.ref ? 'processed' : 'ping' }));
            } catch (e) {
                res.writeHead(400);
                res.end('Bad Request');
            }
        });
        return;
    }

    // 404
        // GET /api/quiz/random - 随机获取真题（每日一练用，支持自适应推题）
        if (pathname === '/api/quiz/random' && req.method === 'GET') {
            try {
                const csvPath = path.join(__dirname, 'data', 'quiz_questions.json');
                if (!fs.existsSync(csvPath)) {
                    return sendJson(res, 200, { code: 0, data: null, msg: '题库文件不存在' });
                }
                const questions = JSON.parse(fs.readFileSync(csvPath, 'utf-8'));
                const type = url.searchParams.get('type'); // 可选：按题型筛选
                // 自适应推题：接收用户五维分数
                const dimsParam = url.searchParams.get('dims'); // 格式: 细节定位:60,推理判断:50,同义替换:70,主旨归纳:55,态度判断:45
                
                let pool = questions;
                
                // 如果指定了type，优先按type筛选
                if (type) {
                    pool = questions.filter(q => q.type === type);
                }
                
                // 自适应推题逻辑：根据薄弱维度优先抽题
                if (dimsParam && !type) {
                    try {
                        const dimPairs = dimsParam.split(',');
                        const dimScores = {};
                        dimPairs.forEach(pair => {
                            const [key, val] = pair.split(':');
                            if (key && val) dimScores[key.trim()] = parseInt(val) || 50;
                        });
                        
                        // 排序找出薄弱维度
                        const sortedDims = Object.entries(dimScores)
                            .sort((a, b) => a[1] - b[1])
                            .map(([key]) => key);
                        
                        // 按薄弱程度尝试匹配题目
                        let matchedPool = [];
                        for (const weakDim of sortedDims) {
                            // 根据薄弱维度映射到题目type
                            const dimTypeMap = {
                                '细节定位': ['阅读理解-仔细阅读'],
                                '推理判断': ['阅读理解-仔细阅读'],
                                '同义替换': ['阅读理解-仔细阅读'],
                                '主旨归纳': ['阅读理解-仔细阅读'],
                                '态度判断': ['听力理解-篇章', '阅读理解-仔细阅读']
                            };
                            const targetTypes = dimTypeMap[weakDim] || [];
                            
                            for (const t of targetTypes) {
                                const found = questions.filter(q => q.type === t);
                                if (found.length > 0) {
                                    matchedPool = found;
                                    break;
                                }
                            }
                            if (matchedPool.length > 0) break;
                        }
                        
                        if (matchedPool.length > 0) {
                            pool = matchedPool;
                        }
                    } catch(e) {
                        console.error('[自适应推题解析失败]', e);
                    }
                }
                
                if (pool.length === 0) pool = questions;
                const idx = Math.floor(Math.random() * pool.length);
                sendJson(res, 200, { code: 0, data: pool[idx] });
            } catch(e) {
                sendJson(res, 500, { code: 1, msg: '获取题目失败', error: e.message });
            }
            return;
        }

        // ===== GitHub Webhook Auto-Deploy =====
    if (req.url === '/webhook/deploy' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const WEBHOOK_SECRET = 'cet_deploy_2026_secret';
            try {
                const payload = JSON.parse(body);
                // 只处理 main 分支的 push
                if (payload.ref === 'refs/heads/main') {
                    console.log('[Webhook] 收到push事件，开始自动部署...');
                    const { execSync } = require('child_process');
                    try {
                        execSync('cd /opt/cet-tutor && git fetch --all && git reset --hard origin/main && pm2 restart all', { timeout: 30000 });
                        console.log('[Webhook] 部署完成');
                    } catch (e) {
                        console.error('[Webhook] 部署失败:', e.message);
                    }
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, message: payload.ref ? 'processed' : 'ping' }));
            } catch (e) {
                res.writeHead(400);
                res.end('Bad Request');
            }
        });
        return;
    }

    // 404
        sendJson(res, 404, { error: 'API不存在' });

    } catch (error) {
        console.error('[API错误]', error);
        sendJson(res, 500, { error: '服务器错误' });
    }
}

// ===== DeepSeek API 代理 =====
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_API_BASE = 'https://api.deepseek.com/v1';

// 主服务器
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');

// 判断是否应该压缩（文件大于1KB且客户端支持gzip）
function shouldCompress(req, contentLength) {
    const acceptEncoding = req.headers['accept-encoding'] || '';
    return acceptEncoding.includes('gzip') && contentLength > 1024;
}

// 发送HTML响应（支持gzip压缩）
function sendHtml(res, htmlContent, req) {
    const contentLength = Buffer.byteLength(htmlContent, 'utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-cache'); // HTML不缓存，确保更新即时生效
    // CSP安全头
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.clarity.ms https://us.umami.is https://cloud.umami.is https://scripts.clarity.ms; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.deepseek.com https://api.coze.cn https://us.umami.is https://api-gateway.umami.dev https://cloud.umami.is; font-src 'self'; frame-src 'none'; object-src 'none'");
    
    if (shouldCompress(req, contentLength)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Encoding', 'gzip');
        zlib.gzip(htmlContent, (err, compressed) => {
            if (err) {
                res.end(htmlContent);
            } else {
                res.end(compressed);
            }
        });
    } else {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(htmlContent);
    }
}

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = decodeURIComponent(url.pathname);

    // API路由 - 先检查限流
    if (pathname.startsWith('/api/')) {
        if (!checkRateLimit(req)) {
            res.writeHead(429, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '请求过于频繁，请稍后再试' }));
            return;
        }
        handleApi(req, res, pathname);
        return;
    }







function buildRagContext(userMessage, personality, weakDims, dimScores, wrongSummary, studyDays) {
    var context = '';
    // 根据最薄弱维度搜题（精准匹配题型）
    var searchType = '';
    var weakDimsList = weakDims || [];
    if (weakDimsList.length > 0) {
        // 提取维度名（去掉分数）
        var firstWeak = weakDimsList[0].replace(/\(.*?\)/, '').trim();
        var dimTypeMap = {
            '细节定位': '阅读理解-仔细阅读',
            '推理判断': '阅读理解-仔细阅读',
            '同义替换': '阅读理解-仔细阅读',
            '主旨归纳': '阅读理解-仔细阅读',
            '态度判断': '听力理解-篇章',
            '听力理解': '听力理解-篇章',
            '长对话': '听力理解-长对话',
            '新闻报道': '听力理解-新闻报道',
            '阅读理解': '阅读理解-仔细阅读',
            '信息匹配': '阅读理解-仔细阅读'
        };
        searchType = dimTypeMap[firstWeak] || '';
    }
    // 按关键词搜
    var keyword = '';
    var keywords = userMessage.match(/[\u4e00-\u9fa5a-zA-Z]{2,}/g);
    if (keywords) keyword = keywords.slice(0, 3).join(' ');
    
    var results = searchQuiz(keyword, searchType, 2);
    if (results.length > 0) {
        context += '\n\n[真题参考-请基于这些出题或讲解]\n';
        results.forEach(function(q, i) {
            context += (i+1) + '. (' + q.type + ') ' + q.question + '\n';
            context += '   A.' + q.optionA + ' B.' + q.optionB + ' C.' + q.optionC + ' D.' + q.optionD + '\n';
            context += '   答案:' + q.answer + ' 解析:' + (q.explanation || '').substring(0,50) + '\n';
        });
    }
    
    // 完整用户画像
    context += '\n\n[用户画像]';
    if (personality) context += '\n- 备考人格: ' + personality;
    if (dimScores) {
        try {
            var scores = JSON.parse(dimScores);
            context += '\n- 五维能力: ';
            for (var k in scores) context += k + '=' + scores[k] + '分  ';
        } catch(e) {}
    }
    if (weakDimsList.length > 0) {
        context += '\n- 薄弱维度(按严重程度排序): ' + weakDimsList.join(', ');
        context += '\n→ 出题要求: 优先出最弱维度的题，答对2题后切换次弱维度，答错同维度继续巩固';
    }
    if (wrongSummary) {
        context += '\n- 近期错题: ' + wrongSummary + ' → 多出这些类型的题';
    }
    if (studyDays > 0) {
        context += '\n- 已学习: ' + studyDays + '天';
    }
    
    return context;
}

// POST /api/deepseek/chat - DeepSeek陪练对话
async function handleDeepseekChat(req, res) {
    if (!DEEPSEEK_API_KEY) {
        return sendJson(res, 500, { error: 'DeepSeek API未配置' });
    }
    try {
        const body = await parseBody(req);
        const { messages, stream } = body;
        if (!messages || !messages.length) {
            return sendJson(res, 400, { error: '参数缺失' });
        }

        // 限流检查
        const userId = body.user_id || 'anonymous';
        const verifiedPlan = getVerifiedUserPlan(req, userId, body);
        if (verifiedPlan === 'free') {
            const chatCount = checkChatLimitBackend(userId);
            if (chatCount > 24) {
                return sendJson(res, 429, { error: '今日免费陪练额度已用完，明天恢复。升级冲刺营即可无限对话～' });
            }
        }

        // 简化：只用system prompt，不做RAG
        const systemContent = COMPANION_SYSTEM_PROMPT;
        
        const payload = {
            model: 'deepseek-chat',
            messages: [{ role: 'system', content: systemContent }, ...messages.slice(-10)],
            stream: stream !== false,
            temperature: 0.7,
            max_tokens: 800
        };

        if (payload.stream) {
            const resp = await fetch(DEEPSEEK_API_BASE + '/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + DEEPSEEK_API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const contentType = resp.headers.get('content-type') || '';
            
            if (contentType.includes('text/event-stream')) {
                // DeepSeek返回了SSE流，用reader转发（Web ReadableStream无pipe方法）
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'X-Accel-Buffering': 'no'
                });
                const reader = resp.body.getReader();
                async function pump() {
                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) { res.end(); break; }
                            res.write(value);
                        }
                    } catch (err) {
                        console.error('[DeepSeek Stream pump error]', err.message);
                        res.end();
                    }
                }
                pump();
            } else {
                // DeepSeek返回非流式JSON，手动转SSE格式
                const data = await resp.json();
                const content = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
                
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'X-Accel-Buffering': 'no'
                });
                
                // 发送content作为单个delta
                if (content) {
                    res.write('data: ' + JSON.stringify({
                        choices: [{ delta: { content: content } }]
                    }) + '\n\n');
                }
                res.write('data: [DONE]\n\n');
                res.end();
            }
        } else {
            const resp = await fetch(DEEPSEEK_API_BASE + '/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + DEEPSEEK_API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await resp.json();
            const reply = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
            sendJson(res, 200, { code: 0, data: { content: reply, usage: data.usage || {} } });
        }
    } catch(e) {
        console.error('[DeepSeek Error]', e.message, e.stack);
        if (!res.headersSent) {
            sendJson(res, 500, { error: 'AI服务暂时不可用: ' + e.message });
        }
    }
}

async function handleDeepseekEssayGrade(req, res) {
    try {
        const body = await parseBody(req);
        const { essay_text, topic } = body;
        
        if (!essay_text || essay_text.length < 20) {
            return sendJson(res, 400, { error: '作文内容太少' });
        }
        
        var topicPrefix = topic ? '【题目类型】' + topic + '\n' : '';
        var systemPrompt = '你是四级作文批改专家。请对以下作文进行批改，返回JSON格式：{"total_score": 数字(15分制), "content_score": 数字(5分制), "organization_score": 数字(5分制), "language_score": 数字(5分制), "sentences": [{"original": "原句", "issue": "问题说明", "suggestion": "修改建议"}], "overall_comment": "总评"} 只返回JSON，不要其他文字。';
        
        const payload = {
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: topicPrefix + '【我的作文】\n' + essay_text }
            ],
            temperature: 0.3,
            max_tokens: 1000
        };
        
        const resp = await fetch(DEEPSEEK_API_BASE + '/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + DEEPSEEK_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await resp.json();
        const reply = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
        
        // 尝试解析JSON
        try {
            // 提取JSON部分
            var jsonMatch = reply.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                var result = JSON.parse(jsonMatch[0]);
                sendJson(res, 200, { code: 0, data: result });
            } else {
                sendJson(res, 200, { code: 0, data: { raw: reply, parse_error: true } });
            }
        } catch(e) {
            sendJson(res, 200, { code: 0, data: { raw: reply, parse_error: true } });
        }
    } catch(e) {
        console.error('[Essay Grade Error]', e.message);
        sendJson(res, 500, { error: '批改服务暂时不可用' });
    }
}

    // 静态文件
    if (pathname === '/' || pathname === '/index.html') {
        sendHtml(res, html, req);
        return;
    }

    // 领取链接（面包多付费内容里放这个URL）
    // 格式：/claim?sprint&code=CET4S-XXXXX-YYYY
    // 用户付款后点这个链接，前端自动激活
    if (pathname === '/claim') {
        sendHtml(res, html, req);
        return;
    }

    // 管理员页面
    if (pathname === '/admin-activate-cet4') {
        const adminHtml = fs.readFileSync(path.join(__dirname, 'admin.html'), 'utf-8');
        const adminContentLength = Buffer.byteLength(adminHtml, 'utf-8');
        res.setHeader('Cache-Control', 'no-cache');  // API不缓存
        if (shouldCompress(req, adminContentLength)) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Content-Encoding', 'gzip');
            zlib.gzip(adminHtml, (err, compressed) => {
                if (err) {
                    res.end(adminHtml);
                } else {
                    res.end(compressed);
                }
            });
        } else {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(adminHtml);
        }
        return;
    }

    // CSS/JS静态文件服务（拆分后的模块化文件）+ gzip压缩
    const cssJsDir = path.join(__dirname, 'public');
    if ((pathname.startsWith('/css/') || pathname.startsWith('/js/'))) {
        const filePath = path.join(cssJsDir, pathname);
        if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath).toLowerCase();
            const contentTypes = {'.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8'};
            const fileContent = fs.readFileSync(filePath);
            const acceptEncoding = req.headers['accept-encoding'] || '';
            if (acceptEncoding.includes('gzip') && fileContent.length > 1024) {
                zlib.gzip(fileContent, (err, compressed) => {
                    if (!err) {
                        res.setHeader('Cache-Control', 'public, max-age=3600');
                        res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
                        res.setHeader('Content-Encoding', 'gzip');
                        res.setHeader('Vary', 'Accept-Encoding');
                        res.end(compressed);
                    } else {
                        res.setHeader('Cache-Control', 'public, max-age=3600');
                        res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
                        res.end(fileContent);
                    }
                });
            } else {
                res.setHeader('Cache-Control', 'public, max-age=3600');
                res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
                res.end(fileContent);
            }
            return;
        }
    }

    // /cards/ 路径映射到 public/cards/（兼容CloudBase路径）
    if (pathname.startsWith('/cards/')) {
        const filePath = path.join(__dirname, 'public', pathname.slice(1));
        if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath).toLowerCase();
            res.setHeader('Cache-Control', 'public, max-age=604800');
            res.setHeader('Content-Type', ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/' + ext.slice(1));
            res.end(fs.readFileSync(filePath));
            return;
        }
    }

    // public目录静态文件服务
    const publicDir = path.join(__dirname, 'public');
    if (fs.existsSync(publicDir) && pathname.startsWith('/public/')) {
        const filePath = path.join(publicDir, pathname.slice(8));
        if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath).toLowerCase();
            res.setHeader('Cache-Control', 'public, max-age=604800');
            res.setHeader('Content-Type', ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/' + ext.slice(1));
            res.end(fs.readFileSync(filePath));
            return;
        }
    }

    // 静态资源（图片等）- 长缓存7天
    const ext = path.extname(pathname).toLowerCase();
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.otf'];
    if (imageExts.includes(ext)) {
        const filePath = path.join(__dirname, pathname);
        if (fs.existsSync(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=604800'); // 7天缓存
            res.setHeader('Content-Type', ext === '.svg' ? 'image/svg+xml' : 
                          ext === '.woff' || ext === '.woff2' ? 'font/woff' :
                          ext === '.ttf' || ext === '.otf' ? 'font/truetype' :
                          ext === '.jpg' ? 'image/jpeg' : 'image/' + ext.slice(1));
            res.end(fs.readFileSync(filePath));
            return;
        }
    }

    // ===== GitHub Webhook Auto-Deploy =====
    if (req.url === '/webhook/deploy' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const WEBHOOK_SECRET = 'cet_deploy_2026_secret';
            try {
                const payload = JSON.parse(body);
                // 只处理 main 分支的 push
                if (payload.ref === 'refs/heads/main') {
                    console.log('[Webhook] 收到push事件，开始自动部署...');
                    const { execSync } = require('child_process');
                    try {
                        execSync('cd /opt/cet-tutor && git fetch --all && git reset --hard origin/main && pm2 restart all', { timeout: 30000 });
                        console.log('[Webhook] 部署完成');
                    } catch (e) {
                        console.error('[Webhook] 部署失败:', e.message);
                    }
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, message: payload.ref ? 'processed' : 'ping' }));
            } catch (e) {
                res.writeHead(400);
                res.end('Bad Request');
            }
        });
        return;
    }

    // 404
    res.writeHead(404);
    res.end('Not Found');
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`套餐配置:`);
    Object.entries(PLANS).forEach(([key, config]) => {
        console.log(`  - ${config.name}: ¥${config.price} (${config.uidPrefix})`);
    });
    console.log(`PayJS配置: ${PAYJS_MCHID ? '已配置' : '未配置 (使用模拟模式)'}`);
    // 启动时清理过期限流记录
    cleanupExpiredLimits();
});

// ===== Coze Chat API 代理 =====
const COZE_API_BASE = 'https://api.coze.cn';
let COZE_PAT = process.env.COZE_PAT;
if (!COZE_PAT) { console.warn('WARNING: COZE_PAT not set, using insecure default'); COZE_PAT = 'pat_hAOthvv429aDEqWspP4lITuL3DAU7VZJiGlVrnmA1zuoZ4IWW2kmxYzXUbGvZTYb'; }

// POST /api/chat/conversation - 创建对话
async function handleCreateConversation(req, res) {
    try {
        const resp = await fetch(COZE_API_BASE + '/v1/conversation/create', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + COZE_PAT,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
        const data = await resp.json();
        sendJson(res, 200, data);
    } catch (e) {
        console.error('Create conversation error:', e);
        sendJson(res, 500, { error: '创建对话失败' });
    }
}

// POST /api/chat/send - 发送消息（流式）
async function handleChatSend(req, res) {
    try {
        const body = await parseBody(req);
        const { bot_id, user_id, conversation_id, messages, stream, parameters } = body;

        if (!bot_id || !user_id || !messages) {
            return sendJson(res, 400, { error: '参数缺失' });
        }

        // 问题4修复：从后端订单验证真实套餐，不再信任前端传入的userPlan
        const verifiedPlan = getVerifiedUserPlan(req, user_id, body);
        
        // 后端聊天限流：免费用户10次/天，付费用户无限
        // 问题2修复：统一为 >=10 次拦截（即 >9 时拦截）
        const DIAGNOSIS_BOT_ID = '7636289658620215331';
        if (verifiedPlan === 'free' && bot_id !== DIAGNOSIS_BOT_ID) {
            const chatCount = checkChatLimitBackend(user_id);
            if (chatCount > 24) {
                return sendJson(res, 429, { error: '今日免费陪练额度已用完，明天恢复。升级冲刺营即可无限对话+逐句批改～' });
            }
        }

        const payload = {
            bot_id: bot_id,
            user_id: user_id,
            additional_messages: messages,
            stream: stream !== false,
            auto_save_history: true
        };
        if (conversation_id) payload.conversation_id = conversation_id;
        // Pass custom_variables from client (could be in parameters or custom_variables)
        if (body.custom_variables) payload.custom_variables = body.custom_variables;
        else if (parameters) payload.custom_variables = parameters;

        const resp = await fetch(COZE_API_BASE + '/v3/chat', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + COZE_PAT,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (payload.stream) {
            // 流式：透传SSE
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
                'Access-Control-Allow-Origin': CORS_ORIGIN
            });
            // Node.js 18+ fetch returns Web ReadableStream
            const reader = resp.body.getReader();
            async function pump() {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) { res.end(); break; }
                        res.write(value);
                    }
                } catch (err) {
                    console.error('Stream pump error:', err);
                    res.end();
                }
            }
            pump();
        } else {
            const data = await resp.json();
            sendJson(res, 200, data);
        }
    } catch (e) {
        console.error('Chat send error:', e);
        sendJson(res, 500, { error: '发送消息失败' });
    }
}

// GET /api/chat/messages - 获取对话消息列表
async function handleChatMessages(req, res) {
    try {
        const url = new URL(req.url, 'http://localhost');
        const conversationId = url.searchParams.get('conversation_id');
        const chatId = url.searchParams.get('chat_id');

        if (!conversationId) {
            return sendJson(res, 400, { error: '缺少conversation_id' });
        }

        // chat_id可选：有时需要获取整个会话的消息（如加载历史）
        let apiUrl = COZE_API_BASE + '/v1/conversation/message/list?conversation_id=' + conversationId;
        if (chatId) apiUrl += '&chat_id=' + chatId;

        const resp = await fetch(apiUrl, {
            headers: { 'Authorization': 'Bearer ' + COZE_PAT }
        });
        const data = await resp.json();
        sendJson(res, 200, data);
    } catch (e) {
        console.error('Get messages error:', e);
        sendJson(res, 500, { error: '获取消息失败' });
    }
}

// GET /api/chat/retrieve - 查询chat状态
async function handleChatRetrieve(req, res) {
    try {
        const url = new URL(req.url, 'http://localhost');
        const conversationId = url.searchParams.get('conversation_id');
        const chatId = url.searchParams.get('chat_id');

        if (!conversationId || !chatId) {
            return sendJson(res, 400, { error: '参数缺失' });
        }

        const resp = await fetch(
            COZE_API_BASE + '/v3/chat/retrieve?conversation_id=' + conversationId + '&chat_id=' + chatId,
            {
                headers: { 'Authorization': 'Bearer ' + COZE_PAT }
            }
        );
        const data = await resp.json();
        sendJson(res, 200, data);
    } catch (e) {
        console.error('Retrieve chat error:', e);
        sendJson(res, 500, { error: '查询失败' });
    }
}

// ===== 用户数据持久化 =====
const PROGRESS_FILE = path.join(__dirname, 'user-progress.json');

// 加载用户数据
function loadProgressData() {
    try {
        if (fs.existsSync(PROGRESS_FILE)) {
            const data = fs.readFileSync(PROGRESS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('[Progress] 加载用户数据失败:', e.message);
    }
    return {};
}

// 保存用户数据
function saveProgressData(data) {
    try {
        fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error('[Progress] 保存用户数据失败:', e.message);
    }
}

// 初始化用户数据存储
const progressStore = loadProgressData();
console.log(`[Progress] 已加载 ${Object.keys(progressStore).length} 条用户数据`);

// 获取用户进度
async function getUserProgress(userId) {
    return progressStore[userId] || null;
}

// 保存用户进度（合并更新）
async function saveUserProgress(userId, data) {
    const now = Date.now();
    const existing = progressStore[userId] || {};
    
    // 深度合并数据
    const merged = {
        ...existing,
        ...data,
        updated_at: now,
        created_at: existing.created_at || now
    };
    
    progressStore[userId] = merged;
    saveProgressData(progressStore);
    
    return { updated_at: now };
}
