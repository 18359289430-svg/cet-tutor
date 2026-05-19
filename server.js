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

// 套餐配置（2层定价）- 支持CET4和CET6
const PLANS = {
    free: { name: '免费版', price: 0, uidPrefix: 'CET4D', needPay: false },
    sprint: { name: '冲刺营', price: 29.9, uidPrefix: 'CET4S', needPay: true }
};
const PLANS_CET6 = {
    free: { name: '免费版', price: 0, uidPrefix: 'CET6D', needPay: false },
    sprint: { name: '冲刺营', price: 29.9, uidPrefix: 'CET6S', needPay: true }
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


// ===== 考试类型检测辅助函数 =====
function detectExamType(message, contextPrefix) {
    contextPrefix = contextPrefix || '';
    // 优先检测消息中的[当前模式：六级备考]标记
    if (message.includes('[当前模式：六级备考]') || contextPrefix.includes('[当前模式：六级备考]')) {
        return 'cet6';
    }
    // 其次检测消息中是否包含"六级"关键词
    if (message.includes('六级') || contextPrefix.includes('六级')) {
        return 'cet6';
    }
    // 默认四级
    return 'cet4';
}

function getExamContext(isCet6) {
    var examLabel = isCet6 ? '六级' : '四级';
    var wordCountReq = isCet6 ? '150-200词' : '120-180词';
    var vocabLevel = isCet6 ? '6000' : '4500';
    return {
        examLabel: examLabel,
        wordCountReq: wordCountReq,
        vocabLevel: vocabLevel,
        systemPrompt: isCet6 
            ? '\n\n【重要】当前用户正在备考六级，所有出题必须按六级标准：词汇量6000、推理深度2-3步、选项更隐蔽、逻辑结构更完整。'
            : ''
    };
}

function buildRagContext(userMessage, personality, weakDims, dimScores, wrongSummary, studyDays) {
    var context = '';
    // 检测考试类型
    var isCet6 = detectExamType(userMessage, personality);
    var examCtx = getExamContext(isCet6);
    var examLabel = examCtx.examLabel;
    
    // 考试类型提示
    context += '\n\n[考试类型]' + examLabel + '备考';
    
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
const COMPANION_SYSTEM_PROMPT = `你是"小过学长"的AI陪练模式，一个温暖又专业的四六级备考私教。根据用户的题目和对话内容，自动判断是四级还是六级，并使用对应的难度和词汇。

## 核心原则：让用户觉得"AI懂我、我能进步、省时间"

## 【合规提醒-禁止措辞】
- 禁止说"帮你过四六级" → 改为"帮你备考"
- 禁止说"提分XX" → 不提数字
- 禁止说"押题""预测" → 绝对不出现
- 只说"帮你练习""帮你巩固""帮你提升能力"

## 铁律：真题优先，绝不编题
- 如果系统给你[真题参考]，你必须直接使用这些真题出题
- 绝不能自己编造题目，必须参考RAG检索到的同类真题

## 【RAG真题参考-必须遵循】
出题时必须：
1. 参考[真题参考]中的出题结构和考点分布
2. 选项设计风格对标真题（长度、干扰项类型、表述方式）
3. 不能照搬原题，但考点和解题逻辑必须对标真题
4. 如果RAG返回的真题不足3道，用变式补足到3道

## 【四六级差异化标准】
| 维度 | 四级 | 六级 |
|------|------|------|
| 词汇量 | 4500 | 6000 |
| 阅读篇幅 | 300-400词 | 400-500词 |
| 选项特点 | 更直接，与原文对应明显 | 更隐蔽，需深度推理 |
| 干扰项 | 部分正确/明显错误混合 | 多个"看似合理"选项 |
| 推理深度 | 1步推理为主 | 2-3步推理 |
| 侧重能力 | 细节定位、词汇理解 | 推理判断、主旨概括 |

## 【学习记录注入-个性化参考】
系统会注入[用户画像]，包含：
- 各题型正确率（如：词汇题40%，细节定位60%，推理题30%）
- 最近错题类型
- 薄弱维度排序
- 近5次练习数据

AI必须：
- 第一句话根据画像主动建议："你推理题正确率偏低，今天从推理题开始？"
- 错题本相关问题时，自动带上该题型的历史正确率
- 出题优先级：最弱维度 > 次弱维度 > 近期错题类型 > 已掌握维度（不主动出）

## 【开场回顾】让用户觉得"它懂我"
开场第一句要参考[用户画像]回顾历史表现：
- "你推理题正确率只有30%，今天来3道推理题强化一下？"（正确率数据可用时）
- "上次你练了X道推理题对了X道，今天继续攻推理？"（有练习历史时）
- "你细节定位最弱，今天来3道练练？"（无历史但有诊断数据时）
- 只有完全没有数据时，才直接出第一道题

## 出题策略
- 系统会给你[用户画像]和[真题参考]，严格按画像选最合适的真题
- 分数规则：<60分=严重薄弱必须重点练，60-80分=一般需巩固，>80分=已掌握偶尔练
- 用户连续答对2题同一维度 → 切换到次弱维度
- 用户答错 → 同维度再出1题巩固

## 【进步感知】让用户觉得"我在进步"
- 每出够5道题后小结：答对X题/答错X题，对比之前说出进步或需加强
  "📊 5题对3题！比上次细节题多对1道，定位能力在提升👍"
- 根据对话中的观察判断进步，连续答对某类题时说"这类题你掌握得越来越稳了"
- 不需要精确计算，关键是让用户感受到被关注

## 【Khanmigo风格-轻度苏格拉底引导】
**核心原则：给答案要快，给方法要深**

**答错时的处理（只等1轮）**：
1. 答错 → 给1个线索提示："❌不是。线索：[关键词在原文哪段]。再试试？"
2. 用户再错 → 直接给完整解析

**解析格式**（必须包含解题套路）：
\`\`\`
❌错误，正确答案是X。
解析：[定位技巧+考点]
💡解题套路：[可复用的方法]
下次遇到这类题，你会先找什么？
\`\`\`

**常用解题套路**：
- 细节题：定位关键词 → 比对同义替换 → 排除原词干扰项
- 推理题：答案在转折词(but/however)之后
- 态度题：去段尾找形容词/副词
- 原因题：找because/since/due to

**连续答错2题以上**：加一句"没关系，这类题确实容易错，继续加油"
**连续答对3题**：升级夸奖"这类题你已经掌握了！"

## 【防直接给答案护栏-中国版改良】
**核心原则：中国学生要快，1次提示就给答案，但给了之后要确认理解**

答错流程：
1. 答错第1次 → 给提示，不直接给答案："再看看，注意题干关键词在原文第X段"
2. 用户再错 → 给答案+解析+变式题
3. **给答案后必须追问**："这个考点你之前也错过类似的，要再练一道吗？"
4. 如果用户说"懂了"或"下一题"，才继续下一题
5. **不强制等待**：用户可以随时说"下一题"跳过

## 错因分类与针对性反馈
答错后判断错因类型：
- **定位错误**："你的定位偏了。[关键词]在原文第X段"
- **理解错误**："定位对了，但[原文]的同义表达是[选项关键词]"
- **词汇障碍**："关键词是[单词]，意思是XXX，记住它"
- **干扰项陷阱**："[选项]是偷换概念的干扰项"

## 【写作教练模式-Khanmigo风格】
当用户提交翻译或作文时使用：

**第一步：引导自改（不等不耐烦为止）**
- 不要直接给修改版
- 先问："你觉得这句话还能怎么表达更好？"
- 如果用户明显不耐烦或直接说"给我答案"，就跳过引导，直接给建议

**引导示例**：
- 用户翻译："显著提高" → 问："'显著'还有哪种表达更地道？"
- 用户写："I very like..." → 问："'very'可以修饰动词吗？想想其他表达方式？"
- 用户写："The important is..." → 问："这句话的主语是什么？形容词能当主语吗？"

**第二步：用户改完后，给具体建议**
- 肯定用户的改动的优点
- 指出可以更好的地方
- 提供改前vs改后对比

**写作批改格式（用户不耐烦时直接用这个）**：
\`\`\`
📝 批改结果：
预估分数：X/15
✅ 命中关键词：xxx
❌ 遗漏关键词：xxx
🔧 语法修正：xxx → yyy
💡 建议：xxx
\`\`\`

## 【出题质量标准-第三层升级】

### 1. 选项设计硬规则（必须遵守）
- 每道题必须有且仅有1个最佳答案
- 4个选项长度应相近（最长与最短不超过15字），不能正确答案明显长/短
- 干扰项必须来自原文但答非所问，绝不能瞎编
- 绝不能出现2个选项都合理的情况
- 禁止出现"all of the above""none of the above"类选项
- 必须使用至少2种干扰项策略：

| 策略 | 手法 | 示例 |
|------|------|------|
| 同义替换陷阱 | 用原文近义词但指向错误信息 | 原文"increase"→选项"decrease" |
| 偷换概念 | 部分信息正确但关键概念被替换 | 主语从"researchers"换成"students" |
| 过度推断 | 比原文多走一步 | 从"可能"推断为"确定" |
| 原词干扰 | 直接用原文词汇但答非所问 | 原文提到"anxiety"，选项讲anxiety的好处 |
| 以偏概全 | 局部信息正确但整体歪曲 | 说"部分学生"实际指"所有学生" |

### 2. 自检机制（出题后必做）

**生成选项后，执行以下自检**：

\`\`\`
自检步骤：
1. 答案是否唯一且无歧义？ → 如有多个合理答案，重新设计
2. 干扰项是否都有一定迷惑性但不正确？ → 太明显的错项要重写
3. 题目是否基于原文/考点，无需要外部知识？ → 如需常识判断，加入原文信息
4. 难度是否匹配当前级别（四级/六级）？ → ⭐基础 ⭐⭐中等 ⭐⭐⭐进阶
   - 四级：以⭐⭐为主
   - 六级：以⭐⭐⭐为主
5. 选项长度是否均衡？ → 调整至相近

如任何一项不通过，重新出题
\`\`\`

### 3. 答案校验层（防止歧义）

**出题后必须验证：每道题有且仅有一个最佳答案**

生成选项后自检：
- [ ] 是否有多个选项都能从原文合理推出？→ 如果有，替换歧义选项
- [ ] 4个选项是否都有人误选的可能？→ 太离谱的选项要重写
- [ ] 能否仅凭常识作答？→ 若是，必须加入原文关键信息
- [ ] 干扰项是否都有一定迷惑性？→ 不能一眼错

**特别注意**：阅读理解题的干扰度——不能太明显（一眼错）也不能有歧义

### 4. 难度标注（每题必标）

在题目后附加：
\`难度：⭐基础 / ⭐⭐中等 / ⭐⭐⭐进阶 | 考点：细节定位/推理判断/词汇理解/态度推断/主旨归纳\`

- ⭐基础：定位原文、同义替换、词汇辨认
- ⭐⭐中等：简单推理、理解作者态度
- ⭐⭐⭐进阶：复杂推理、主旨概括、多步骤判断

### 5. 真题Few-shot示例（出题模板）

**【真题示例1-四级细节题⭐⭐】**
题干：What does the passage say about regular reflection?
原文：Regular reflection, however, underlies all great professionals. It's a prerequisite for you to recharge your mental batteries...
答案：D
D. It helps professionals improve

干扰项分析：
- A. It makes people work continuously（原文强调的是反思而非持续工作）
- B. It requires high intelligence（偷换概念，reflection≠intelligence）
- C. It takes a lot of time（过度推断，未提及时间成本）
- D. It helps professionals improve ✓（同义替换：underlies≈helps improve）

出题套路：细节辨认=找定位词(reflection/professionals)→比对同义表达→排除无中生有

---

**【真题示例2-六级推理题⭐⭐⭐】**
题干：What can be inferred about the "Goldilocks principle"?
原文：...the principle that things need to be "just right" for optimal results. Too much or too little of anything can be harmful...
答案：A
A. Balance is essential for best outcomes

干扰项分析：
- A. Balance is essential for best outcomes ✓（抽象概括，符合推理逻辑）
- B. More is always better（与原文矛盾，too much can be harmful）
- C. The principle applies to all situations（过度推断，原文无"all"依据）
- D. The principle was named after a story（答非所问，故事来源≠核心含义）

出题套路：推理题=找核心定义→抽象概括→排除过度推断/答非所问
难度说明：六级推理需2-3步（原文→"just right"→平衡概念）

---

**【真题示例3-词汇题⭐】**
题干：The word "proliferate" in paragraph 3 is closest in meaning to:
原文：Social media platforms have started to proliferate in recent years.
答案：B
B. Spread rapidly and widely

干扰项分析：
- A. Disappear gradually（反义陷阱，proliferate≠disappear）
- B. Spread rapidly and widely ✓（词典级同义替换）
- C. Become more regulated（偷换概念，规范≠传播）
- D. Remain unchanged（反义，原词缀"pro-"表前进）

出题套路：词汇题=看语境→排除明显反义词→选择语境匹配词

---

**【真题示例4-态度题⭐⭐⭐】**
题干：What is the author's attitude toward remote work?
原文：...While remote work offers flexibility, it also raises concerns about team cohesion and mental health. Nevertheless, many companies are now adopting this model...
答案：C
C. Cautiously optimistic

干扰项分析：
- A. Strongly supportive（过度推断，"offers flexibility"≠强烈支持）
- B. Completely opposed（原文字首"While...raises concerns"≠反对）
- C. Cautiously optimistic ✓（综合两面：flexibility+concerns但companies adopt）
- D. Indifferent（原文有明确观点，不是中立）

出题套路：态度题=找段落首尾形容词/副词→综合全文→排除极端选项

---

**【真题示例5-主旨题⭐⭐⭐（六级）】**
题干：What is the main idea of the passage?
原文：The first paragraph introduces...The second paragraph discusses...Finally, the author concludes that...
答案：B
B. Education reform requires comprehensive approach

干扰项分析：
- A. Students should learn more technology（以偏概全，只是细节）
- B. Education reform requires comprehensive approach ✓（覆盖全文）
- C. Technology is important in education（原词干扰，文中未强调）
- D. Teachers need better training（局部信息，非主旨）

出题套路：主旨题=看首尾段→找重复出现的核心概念→排除细节/细节选项

## 听力陪练格式（严格分两步发送！）

### 【听力题型说明】
出听力题时必须按以下题型轮换：
- **四级听力**：新闻报道(3篇) + 长对话(2篇) + 篇章(3篇)
- **六级听力**：长对话(2篇) + 篇章(2篇) + 讲座/讲话(3篇)

### 【出题规则】
1. 模拟真题规则：听力只播放一遍（或两遍），播放前用户看不到原文
2. 第一遍：正常语速播放，用户不能看原文
3. 第二遍（可选）：用户可以要求重听，但最多2遍

### 【第一步-只发送题目】（发送给用户）
**绝对不要在这里发送原文！**

━━━━━━━━━━━━━━━━━━━━
Part I Listening Comprehension
━━━━━━━━━━━━━━━━━━━━

Section [A/B/C]

Directions: [听力要求说明]

[Q题号]. [题目内容]
A) [选项A]
B) [选项B]
C) [选项C]
D) [选项D]

━━━━━━━━━━━━━━━━━━━━
🎧 点击播放听力 | 请回答A/B/C/D

### 【第二步-用户答题后才发送原文】
用户回复答案后，再发送：

━━━━━━━━━━━━━━━━━━━━
📖 听力原文：
━━━━━━━━━━━━━━━━━━━━

[原文内容...]

━━━━━━━━━━━━━━━━━━━━

解析：...

**重要提醒**：
- 第一步绝对不能包含原文
- 只有用户回答后才能发送原文和解析
- 这模拟了真实考试场景，训练听力理解能力

## 写作批改格式（当用户说"批改作文"时使用）
**第一步**：让用户发送作文内容和题目要求
**第二步**：收到后按四级评分标准批改，返回格式：
\`\`\`
━━━━━━━━━━━━━━━━━━━━
📝 作文批改结果
━━━━━━━━━━━━━━━━━━━━

总分：X/15
┌─────────────────┐
│ 内容  X/5  简评  │
│ 结构  X/5  简评  │
│ 语言  X/5  简评  │
└─────────────────┘

🔧 逐句修改：
1. 原："I very like reading books."
   改："I really enjoy reading books."
   因：very不能修饰动词，用enjoy更地道
   
2. 原："The important is..."
   改："What matters is..."
   因：形容词作主语不对，需用名词形式

💡 总评：一句话
━━━━━━━━━━━━━━━━━━━━
\`\`\`

## 翻译批改格式
**用户发送**："翻译原文 + 自己的译文"
**AI批改格式**：
\`\`\`
━━━━━━━━━━━━━━━━━━━━
📝 翻译批改
━━━━━━━━━━━━━━━━━━━━

预估分数：X/15
✅ 命中关键词：xxx, xxx
❌ 遗漏关键词：xxx, xxx
🔧 语法修正：xxx → yyy
💡 建议：一句话
━━━━━━━━━━━━━━━━━━━━
\`\`\`

## 错题分析指引
当用户说"分析错题"时：
- 从[用户画像]中的近期错题数据出发
- 分析错因模式
- 给出针对性训练建议（必须具体）

## 【约束：不说废话，每句话都要有用】
- 禁止说"好的！让我们开始吧！"
- 禁止说"你真棒！"这种空洞夸奖
- 禁止说"帮你过四六级""提分""押题"等承诺性措辞
- 只说"连续2道细节题都对了，定位能力稳了"（具体事实）
- 每句话都要有信息增量，不是重复用户说的

## 对话节奏
- 出题 → 等用户回答 → 判断对错 → 渐进引导（错）或肯定+下题（对）→ 继续
- 用户主动提问 → 先回答问题，然后自然引回出题
- 用户说"下一题"或"懂了" → 立即继续，不强制等待
- 每次回复控制在200字内，简洁有力

## 出题格式（严格按四六级试卷格式）

**阅读理解题必须按以下格式输出，模拟真实试卷：**

\`\`\`
━━━━━━━━━━━━━━━━━━━━
Part II Reading Comprehension
━━━━━━━━━━━━━━━━━━━━

Passage [X]

[这里放阅读文章原文，150-300词，模拟真题长度]

[Q1题号]. [题干内容]
A) [选项A]
B) [选项B]  
C) [选项C]
D) [选项D]

━━━━━━━━━━━━━━━━━━━━
难度：⭐基础/⭐⭐中等/⭐⭐⭐进阶 | 考点：xxx
请回答A/B/C/D
\`\`\`

**词汇题/语法题格式：**
\`\`\`
━━━━━━━━━━━━━━━━━━━━
Part III Vocabulary & Structure
━━━━━━━━━━━━━━━━━━━━

[Q题号]. [题干内容]
A) [选项A]
B) [选项B]
C) [选项C]
D) [选项D]

━━━━━━━━━━━━━━━━━━━━
难度：⭐⭐ | 考点：词汇理解
请回答A/B/C/D
\`\`\`

**翻译题格式：**
\`\`\`
━━━━━━━━━━━━━━━━━━━━
Part IV Translation
━━━━━━━━━━━━━━━━━━━━

请将以下中文翻译成英语：

[中文原文]

━━━━━━━━━━━━━━━━━━━━
\`\`\`

**作文题格式：**
\`\`\`
━━━━━━━━━━━━━━━━━━━━
Part V Writing
━━━━━━━━━━━━━━━━━━━━

Directions: [作文要求]

[题目/话题]

━━━━━━━━━━━━━━━━━━━━
\`\`\`

**格式要求：**
1. 每道题必须有Part标题和分隔线，模拟真实试卷
2. 阅读题必须先给文章再给题目，文章长度对标真题
3. 选项用A) B) C) D)格式（真题格式，不是A. B.）
4. 每题之间用分隔线隔开
5. 题号连续编号（Q1, Q2, Q3...）
6. 难度标注放在分隔线内，不影响做题体验

## Few-shot示例

**示例1：有画像开场**
用户：（进入陪练）
AI：你推理题正确率只有30%，今天来3道推理题强化一下？

**示例2：答错-解题套路**
用户：B
AI：❌不是B。线索：题干关键词在原文第2段。再试试？
用户：A
AI：❌正确答案是C。解析：第2段的"primarily"是因果词。
💡解题套路：原因题=找because/since/due to→定位因果词后的内容
这个考点要再练一道吗？

**示例3：进步感知**
用户：（答完5题）
AI：📊 5题对3题！比上次多对1道推理题，进步明显👍 继续练推理还是换别的？

**示例4：写作引导**
用户：（提交翻译"学习英语很重要"）
AI：翻译得不错！你觉得"重要"还有别的表达方式吗？比如用形容词的名词形式？
用户：I think learning English is very significance.
AI：思路很好！但"significance"是名词，这里需要形容词。想想用哪个形容词更好？提示：常见的有important、vital、crucial

**示例5：六年级推理题出题**
用户：出一道推理题
AI：好的，来一道六级的推理题。
【题目】The study mentioned in the passage suggests that:
原文：Although the experiment showed promising initial results, researchers caution that the sample size was limited and further studies are needed before drawing definitive conclusions.
A. The experiment was completely successful
B. More research is required to confirm findings
C. The sample size was adequate
D. Researchers were satisfied with results
难度：⭐⭐⭐进阶 | 考点：推理判断
请回答A/B/C/D

**示例6：变式题-同考点递进**
用户：（答错推理题）
AI：❌正确答案是B。解析：这里考的是"further studies are needed"暗示需要更多研究...
💡解题套路：推理题=找暗示词(more/further/need)→推断作者意图→排除确定语气选项
再练一道同类型的，这道稍难一点：
【题目】Based on the passage, what can we infer about future research?
原文：The current findings challenge existing theories. According to Dr. Smith, "Our work opens up entirely new avenues for investigation."
A. Previous theories will be abandoned
B. New research directions will emerge
C. Current methods will remain unchanged
D. The study was the final word on the topic
难度：⭐⭐⭐进阶 | 考点：推理判断
请回答A/B/C/D

## 【变式题规则】答错自动出同类题巩固
当用户答错一道题时，在解析完错题后必须：
1. **先完整解析**：说明正确答案、错误原因、解题套路
2. **自然引出变式题**：说类似"这个考点换个考法你试试？"或"再练一道同类型的巩固一下？"
3. **出2-3道变式题，难度递进**：
   - 第一道：同考点同难度，换题干
   - 第二道：同考点稍难，或换角度考查
   - 第三道（如需要）：综合运用
4. **等用户回答后再出下一道**，不要一次出完
5. **自然融入对话**，不要生硬地出题
6. **不要强制**：如果用户明确想聊别的（问其他问题、想休息等），不要硬塞变式题，直接回应用户需求

**变式题示例**：
用户：答错了"原因是..."（解析完成后）
AI：❌正确答案是B。这道题考的是因果定位...
💡解题套路：原因题=找because/since/due to→定位因果词后的内容
这个考点换个考法你试试？
【题目】题干内容...
A. 选项A B. 选项B C. 选项C D. 选项D
难度：⭐⭐中等 | 考点：xxx
请回答A/B/C/D

**回复字数控制**：
- 普通回复：200字内
- 出变式题时：300字内
`;

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

                // 根据金额判断套餐（冲刺营¥29.9，阈值25元）
                if (amount >= 25) plan = 'sprint';
                else plan = 'free'; // 金额不足

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
            const planMatch = codeTrimmed.match(/^(CET4T|CET4S|CET4F|CET4R|CET4P|CET6D|CET6S|CET6F)-([A-Z0-9]+)(?:-([A-Z0-9]{6}))?$/);
            if (planMatch) {
                let plan = 'sprint';
                var isCet6Code = planMatch[1].startsWith('CET6');
                var plans = isCet6Code ? PLANS_CET6 : PLANS;
                if (planMatch[1] === 'CET4F' || planMatch[1] === 'CET6F') plan = 'flagship';
                else if (planMatch[1] === 'CET4P') plan = 'flagship';
                // CET4T, CET4R, CET4S, CET6D 都是 sprint

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

                    console.log(`[激活码激活] ${codeTrimmed} - ${plans[plan].name}`);

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
                    amount: plans[plan].price,
                    status: 'activated',
                    createdAt: Date.now(),
                    activatedAt: Date.now(),
                    token,
                    source: 'activation_code'
                });

                saveOrders();
                console.log(`[激活码激活] ${orderId} - ${plans[plan].name}`);

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

        // GET /api/diagnosis/questions - 获取诊断题库（真题版v2，支持CET4/CET6）
        if (pathname === '/api/diagnosis/questions' && req.method === 'GET') {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const examType = url.searchParams.get('type') || 'cet4';
            const diagnosisFile = examType === 'cet6' 
                ? path.join(process.cwd(), 'public/cet6_diagnosis_questions.json')
                : path.join(process.cwd(), 'public/diagnosis_questions.json');
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
                // 检测考试类型
            const lastMsg = messages && messages.length > 0 ? messages[messages.length - 1].content : '';
            const isCet6 = detectExamType(lastMsg, '');
            const examCtx = getExamContext(isCet6);
            
            const prompt = `你是一位${examCtx.examLabel}考试写作评分专家。请对以下作文进行评分。
题目：${title || 'CET-4写作'}
要求：${description || '请根据题目要求完成一篇' + examCtx.wordCountReq + '的作文'}
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
                        { role: 'system', content: '你是一位专业、严谨的' + examCtx.examLabel + '写作评分专家。你必须严格按照格式返回JSON结果，不要包含任何markdown代码块标记。' },
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
                // 检测考试类型
            const lastMsgT = messages && messages.length > 0 ? messages[messages.length - 1].content : '';
            const isCet6T = detectExamType(lastMsgT, '');
            const examCtxT = getExamContext(isCet6T);
            
            const prompt = `你是一位${examCtxT.examLabel}考试翻译评分专家。请对以下翻译进行评分。
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
                        { role: 'system', content: '你是一位专业、严谨的' + examCtxT.examLabel + '翻译评分专家。你必须严格按照格式返回JSON结果，不要包含任何markdown代码块标记。' },
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
                // 检测考试类型
            var lastMsgReport = answers && answers.length > 0 ? JSON.stringify(answers) : '';
            var isCet6Report = detectExamType(lastMsgReport, '');
            var examCtxReport = getExamContext(isCet6Report);
            var examLabelReport = examCtxReport.examLabel;
            var prompt = '你是' + examLabelReport + '备考AI教练。用户刚刚完成了一套15道阅读诊断题以及写作和翻译实测，请生成一份个性化的诊断报告。\n\n';
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
                        { role: 'system', content: '你是一位专业、幽默、温暖的' + examCtxReport.examLabel + '备考AI教练。你的任务是根据用户的答题数据生成个性化的诊断报告。报告要既有专业性，又有趣味性，像朋友聊天一样自然。' },
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
                // 检测考试类型并注入到system prompt
                var lastMsgChat = messages[messages.length-1] ? messages[messages.length-1].content : '';
                var isCet6Chat = detectExamType(lastMsgChat, userPersonality);
                var examCtxChat = getExamContext(isCet6Chat);
                
                // 追加薄弱项主动引导信息（注入到system prompt）
                var weakGuidePrompt = '';
                if (weakDims && weakDims.length > 0) {
                    // 解析薄弱项和强项
                    var dimScoresMap = {};
                    try {
                        var scoresObj = JSON.parse(body.dim_scores || '{}');
                        for (var k in scoresObj) dimScoresMap[k] = parseInt(scoresObj[k]) || 0;
                    } catch(e) {}
                    
                    // 提取薄弱项（<50%）和强项（>80%）
                    var weakItems = weakDims.filter(function(d) {
                        var name = d.replace(/\(.*?\)/, '').trim();
                        return (dimScoresMap[name] || 0) < 50;
                    });
                    var strongItems = Object.keys(dimScoresMap).filter(function(k) {
                        return dimScoresMap[k] >= 80;
                    });
                    
                    if (weakItems.length > 0 || strongItems.length > 0) {
                        weakGuidePrompt = '\n\n## 【薄弱项主动引导规则】\n';
                        if (weakItems.length > 0) {
                            weakGuidePrompt += '- 当前用户薄弱项：' + weakItems.join('、') + '\n';
                            weakGuidePrompt += '- 请在对话中适时（每3-5轮最多提1次）引导用户练习薄弱项，如推荐专项练习、讲解技巧。\n';
                        }
                        if (strongItems.length > 0) {
                            weakGuidePrompt += '- 当前用户强项：' + strongItems.join('、') + '（练习时可穿插巩固）\n';
                        }
                        weakGuidePrompt += '- 语气要自然，像朋友聊天，不是推销员。\n';
                        weakGuidePrompt += '- 不要每句话都提薄弱项，会让用户烦。\n';
                    }
                }
                
                // 新对话开场检测：如果用户刚发起对话（messages只有1-2条），且有薄弱项，主动提及
                var isNewConversation = messages.length <= 2;
                if (isNewConversation && weakDims && weakDims.length > 0) {
                    var firstWeak = weakDims[0].replace(/\(.*?\)/, '').trim();
                    weakGuidePrompt += '\n\n## 【新对话开场引导】\n';
                    weakGuidePrompt += '- 用户开启新对话，请根据薄弱项主动建议练习方向。\n';
                    weakGuidePrompt += '- 例如："你的' + firstWeak + '还有提升空间，要不要做几道专项题练练？"\n';
                    weakGuidePrompt += '- 语气亲切自然，像朋友间的学习交流。\n';
                }
                
                var systemContent = COMPANION_SYSTEM_PROMPT + (ragCtx || '') + weakGuidePrompt + examCtxChat.systemPrompt;
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
            
            // 检测考试类型
            var topicPrefix = topic ? '【题目类型】' + topic + '\n' : '';
            var essayLastMsg = essay_text || '';
            var isCet6Essay = detectExamType(essayLastMsg, topicPrefix);
            var examCtxEssay = getExamContext(isCet6Essay);
            var examLabelEssay = examCtxEssay.examLabel;
            var wordCountReqEssay = examCtxEssay.wordCountReq;
            var systemPrompt = '你是' + examLabelEssay + '作文批改专家。请对以下作文进行批改（' + wordCountReqEssay + '），返回JSON格式：{"total_score": 数字(15分制), "content_score": 数字(5分制), "organization_score": 数字(5分制), "language_score": 数字(5分制), "sentences": [{"original": "原句", "issue": "问题说明", "suggestion": "修改建议"}], "overall_comment": "总评"} 只返回JSON，不要其他文字。';
            
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
    if (false && req.url === '/webhook/deploy') {
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
                        execSync('cd /opt/cet-tutor && git fetch --all && echo AUTO_DEPLOY_DISABLED && pm2 restart all', { timeout: 30000 });
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
        // GET /api/quiz/batch - 批量获取题目（每日一练全套，根据五维能力智能分配）
        if (pathname === '/api/quiz/random' && req.method === 'GET') {
            try {
                // 检测考试类型参数
                const examTypeParam = url.searchParams.get('type') || '';
                const isCet6Quiz = examTypeParam === 'cet6' || examTypeParam.includes('六级');
                const quizFileName = isCet6Quiz ? 'cet6_quiz_questions.json' : 'quiz_questions.json';
                const csvPath = path.join(__dirname, 'data', quizFileName);
                var questions;
                if (!fs.existsSync(csvPath)) {
                    const fallbackPath = path.join(__dirname, 'data', 'quiz_questions.json');
                    if (!fs.existsSync(fallbackPath)) {
                        return sendJson(res, 200, { code: 0, data: null, msg: '题库文件不存在' });
                    }
                    questions = JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'));
                } else {
                    questions = JSON.parse(fs.readFileSync(csvPath, 'utf-8'));
                }
                
                // 支持按ability筛选（维度筛选）
                const ability = url.searchParams.get('ability');
                if (ability) {
                    const filtered = questions.filter(q => q.ability === ability);
                    if (filtered.length > 0) {
                        const idx = Math.floor(Math.random() * filtered.length);
                        return sendJson(res, 200, { code: 0, data: filtered[idx] });
                    }
                }
                
                // 默认随机返回一题
                const idx = Math.floor(Math.random() * questions.length);
                sendJson(res, 200, { code: 0, data: questions[idx] });
            } catch(e) {
                sendJson(res, 500, { code: 1, msg: '获取题目失败', error: e.message });
            }
            return;
        }
        
        // GET /api/quiz/batch - 批量获取题目（根据五维能力智能分配）
        if (pathname === '/api/quiz/batch' && req.method === 'GET') {
            try {
                // 检测考试类型
                const examTypeParam = url.searchParams.get('type') || '';
                const isCet6Quiz = examTypeParam === 'cet6' || examTypeParam.includes('六级');
                const quizFileName = isCet6Quiz ? 'cet6_quiz_questions.json' : 'quiz_questions.json';
                const csvPath = path.join(__dirname, 'data', quizFileName);
                var questions;
                if (!fs.existsSync(csvPath)) {
                    const fallbackPath = path.join(__dirname, 'data', 'quiz_questions.json');
                    if (!fs.existsSync(fallbackPath)) {
                        return sendJson(res, 200, { code: 0, data: [], msg: '题库文件不存在' });
                    }
                    questions = JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'));
                } else {
                    questions = JSON.parse(fs.readFileSync(csvPath, 'utf-8'));
                }
                
                // 解析用户五维分数
                const dimsParam = url.searchParams.get('dims'); // 格式: 细节定位:60,推理判断:50,同义替换:70,主旨归纳:55,态度判断:45
                
                // 五维能力映射（前端诊断字段 -> 题库ability字段）
                const dimToAbility = {
                    '细节定位': '细节理解',
                    '推理判断': '推理判断',
                    '同义替换': '同义替换',
                    '主旨归纳': '主旨归纳',
                    '态度判断': '态度判断'
                };
                
                // 计算每个维度的权重（分数越低，权重越高，弱项多出题）
                const dims = ['细节定位', '推理判断', '同义替换', '主旨归纳', '态度判断'];
                const dimScores = {};
                const inverseScores = {};
                let totalInverse = 0;
                
                if (dimsParam) {
                    try {
                        const dimPairs = dimsParam.split(',');
                        dimPairs.forEach(pair => {
                            const [key, val] = pair.split(':');
                            if (key && val) {
                                const score = parseInt(val) || 50;
                                dimScores[key.trim()] = score;
                                // 分数越低，inverse越高
                                inverseScores[key.trim()] = 101 - score;
                                totalInverse += inverseScores[key.trim()];
                            }
                        });
                    } catch(e) {
                        console.error('[五维分数解析失败]', e);
                    }
                }
                
                // 如果没有诊断数据（新用户），平均分配
                let dimWeights = {};
                if (Object.keys(dimScores).length === 0) {
                    dims.forEach(d => { dimWeights[d] = 1 / dims.length; });
                } else {
                    // 归一化权重
                    dims.forEach(d => {
                        if (inverseScores[d]) {
                            dimWeights[d] = inverseScores[d] / totalInverse;
                        } else {
                            // 没有分数的维度，默认中等权重
                            dimWeights[d] = 0.2;
                        }
                    });
                }
                
                // 计算每个维度应该出的题数（总共12题左右）
                const totalQuestions = 12;
                const questionsPerDim = {};
                let assignedCount = 0;
                
                // 按权重分配
                dims.forEach((dim, idx) => {
                    if (idx < dims.length - 1) {
                        questionsPerDim[dim] = Math.round(dimWeights[dim] * totalQuestions);
                        assignedCount += questionsPerDim[dim];
                    } else {
                        // 最后一个维度补足总数
                        questionsPerDim[dim] = totalQuestions - assignedCount;
                    }
                });
                
                // 确保每个维度至少1题
                dims.forEach(dim => {
                    if (questionsPerDim[dim] < 1) questionsPerDim[dim] = 1;
                });
                
                // 调整总数到合理范围（10-15题）
                let currentTotal = Object.values(questionsPerDim).reduce((a, b) => a + b, 0);
                if (currentTotal < 10) {
                    // 补足到10题
                    dims.forEach(dim => {
                        questionsPerDim[dim] += 1;
                        currentTotal++;
                        if (currentTotal >= 10) return;
                    });
                }
                
                // 按维度抽取题目
                const selectedQuestions = [];
                const usedIds = new Set();
                
                dims.forEach(dim => {
                    const ability = dimToAbility[dim];
                    if (!ability) return;
                    
                    const dimQuestions = questions.filter(q => q.ability === ability);
                    if (dimQuestions.length === 0) return;
                    
                    const count = Math.min(questionsPerDim[dim], dimQuestions.length);
                    
                    // 随机抽取不重复的题目
                    const shuffled = [...dimQuestions].sort(() => Math.random() - 0.5);
                    let added = 0;
                    for (const q of shuffled) {
                        if (added >= count) break;
                        if (!usedIds.has(q.id)) {
                            selectedQuestions.push(q);
                            usedIds.add(q.id);
                            added++;
                        }
                    }
                });
                
                // 打乱最终顺序
                selectedQuestions.sort(() => Math.random() - 0.5);
                
                // 返回结果（包含权重信息，方便前端显示）
                sendJson(res, 200, { 
                    code: 0, 
                    data: {
                        questions: selectedQuestions,
                        dimDistribution: questionsPerDim,
                        dimWeights: dimWeights,
                        totalCount: selectedQuestions.length
                    }
                });
            } catch(e) {
                console.error('[批量获取题目失败]', e);
                sendJson(res, 500, { code: 1, msg: '获取题目失败', error: e.message });
            }
            return;
        }
        // ===== GitHub Webhook Auto-Deploy =====
    if (false && req.url === '/webhook/deploy') {
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
                        execSync('cd /opt/cet-tutor && git fetch --all && echo AUTO_DEPLOY_DISABLED && pm2 restart all', { timeout: 30000 });
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

// ===== 出题答案校验配置 =====
const VALIDATION_CONFIG = {
    maxRetries: 1,           // 最多重试1次
    timeout: 5000,           // 校验超时5秒
    // 出题标记模式
    questionPatterns: [
        /【题目】/,
        /【听力题】/,
        /A\.\s*.{3,}/,
        /B\.\s*.{3,}/,
        /C\.\s*.{3,}/,
        /D\.\s*.{3,}/
    ]
};

// 校验 prompt（简短，控制token消耗）
const VALIDATION_PROMPT = `你是一个题目质量审核员。请审核以下选择题是否合理：

题目：{question}
A. {optionA}
B. {optionB}
C. {optionC}
D. {optionD}
正确答案：{answer}

请判断以下问题，回答"是"或"否"：
1. 是否有多个选项都能合理作为答案？
2. 干扰项是否都有迷惑性而非明显错误？
3. 正确答案是否明显比其他选项长或短很多？

如果任一答案为"是"，请给出修改建议。如果全部"否"，只回复"通过"。`;

// 校验统计（用于日志）
let validationStats = { passed: 0, failed: 0, skipped: 0, retries: 0 };

/**
 * 检测文本是否包含出题内容
 */
function isQuestionContent(text) {
    if (!text || typeof text !== 'string') return false;
    let matchCount = 0;
    for (const pattern of VALIDATION_CONFIG.questionPatterns) {
        if (pattern.test(text)) matchCount++;
    }
    // 至少匹配2个模式才认为是出题内容
    return matchCount >= 2;
}

/**
 * 从文本中提取题目和选项
 */
function extractQuestion(text) {
    const result = { question: '', options: {}, answer: '' };
    
    // 提取题目内容（匹配【题目】或【听力题】后的内容）
    const questionMatch = text.match(/(?:【题目】|【听力题】)\s*([^\n【】]+(?:(?:\n(?!【)[^\n]+)?)*?)(?=\n\s*[A-D]\.|$)/s);
    if (questionMatch) {
        result.question = questionMatch[1].trim().replace(/\n/g, ' ');
    }
    
    // 提取选项 A B C D
    const optionMatches = text.matchAll(/([A-D])\.\s*([^\n]{3,200})/g);
    for (const match of optionMatches) {
        result.options[match[1]] = match[2].trim();
    }
    
    // 尝试提取答案（匹配"请回答A"、"答案是C"等）
    const answerMatch = text.match(/(?:请(?:你)?回答|答案(?:是)?|正确(?:答案)?)\s*([A-D])/i);
    if (answerMatch) {
        result.answer = answerMatch[1].toUpperCase();
    } else {
        // 尝试从系统提示示例中推断答案（如果有的话）
        const exampleMatch = text.match(/正确答案[：:]\s*([A-D])/i);
        if (exampleMatch) {
            result.answer = exampleMatch[1].toUpperCase();
        }
    }
    
    return result;
}

/**
 * 校验题目质量
 * @param {string} originalReply - AI原始回复
 * @returns {object} - { valid: boolean, content: string, reason?: string }
 */
async function validateQuestion(originalReply) {
    try {
        const extracted = extractQuestion(originalReply);
        
        // 检查是否成功提取题目信息
        if (!extracted.question || !extracted.options.A || !extracted.options.B || 
            !extracted.options.C || !extracted.options.D || !extracted.answer) {
            console.log('[校验] 跳过：无法完整提取题目信息');
            validationStats.skipped++;
            return { valid: true, content: originalReply, reason: 'extract_failed' };
        }
        
        console.log('[校验] 检测到出题内容，开始校验...');
        console.log(`[校验] 题目: ${extracted.question.substring(0, 50)}...`);
        console.log(`[校验] 答案: ${extracted.answer}`);
        
        // 构建校验 prompt
        const validationContent = VALIDATION_PROMPT
            .replace('{question}', extracted.question)
            .replace('{optionA}', extracted.options.A)
            .replace('{optionB}', extracted.options.B)
            .replace('{optionC}', extracted.options.C)
            .replace('{optionD}', extracted.options.D)
            .replace('{answer}', extracted.answer);
        
        // 发起校验请求（带超时保护）
        const validatePayload = {
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: validationContent }],
            temperature: 0.1,
            max_tokens: 500
        };
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), VALIDATION_CONFIG.timeout);
        
        try {
            const resp = await fetch(DEEPSEEK_API_BASE + '/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + DEEPSEEK_API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify(validatePayload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!resp.ok) {
                console.error('[校验] API请求失败:', resp.status);
                validationStats.skipped++;
                return { valid: true, content: originalReply, reason: 'api_error' };
            }
            
            const data = await resp.json();
            const validationResult = data.choices && data.choices[0] && data.choices[0].message 
                ? data.choices[0].message.content.trim() : '';
            
            console.log('[校验] 校验结果:', validationResult.substring(0, 100));
            
            // 判断校验是否通过
            if (validationResult.includes('通过')) {
                validationStats.passed++;
                console.log(`[校验] ✓ 通过 (累计: 通过${validationStats.passed}, 失败${validationStats.failed}, 跳过${validationStats.skipped})`);
                return { valid: true, content: originalReply, reason: 'passed' };
            } else {
                validationStats.failed++;
                console.log(`[校验] ✗ 未通过，需要重试 (累计: 通过${validationStats.passed}, 失败${validationStats.failed}, 跳过${validationStats.skipped})`);
                return { valid: false, content: validationResult, reason: 'failed' };
            }
        } catch (fetchErr) {
            clearTimeout(timeoutId);
            if (fetchErr.name === 'AbortError') {
                console.log('[校验] 超时，跳过校验');
            } else {
                console.error('[校验] 请求异常:', fetchErr.message);
            }
            validationStats.skipped++;
            return { valid: true, content: originalReply, reason: 'timeout_or_error' };
        }
    } catch (err) {
        console.error('[校验] 校验过程异常:', err.message);
        validationStats.skipped++;
        return { valid: true, content: originalReply, reason: 'exception' };
    }
}

// 主服务器
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf-8");

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
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.clarity.ms https://us.umami.is https://cloud.umami.is https://scripts.clarity.ms; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.deepseek.com https://api.coze.cn https://us.umami.is https://api-gateway.umami.dev https://cloud.umami.is https://n.clarity.ms https://www.clarity.ms https://cdn.clarity.ms https://z.clarity.ms; font-src 'self'; frame-src 'none'; object-src 'none'");
    
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
    // 注意：前端会通过 pending_task 字段传递待复习错题信息
    if (studyDays > 0) {
        context += '\n- 已学习: ' + studyDays + '天';
    }
    
    return context;
}

// POST /api/deepseek/chat - DeepSeek陪练对话（带出题校验）
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
            stream: false,  // 统一使用非流式，便于校验
            temperature: 0.7,
            max_tokens: 800
        };

        // 第一次调用：获取AI回复
        const resp = await fetch(DEEPSEEK_API_BASE + '/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + DEEPSEEK_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await resp.json();
        let reply = data.choices && data.choices[0] && data.choices[0].message 
            ? data.choices[0].message.content : '';
        const usage = data.usage || {};

        // ===== 出题校验逻辑 =====
        if (isQuestionContent(reply)) {
            console.log('[校验] 检测到出题内容，准备校验...');
            validationStats.retries = 0;
            
            // 最多重试1次
            while (validationStats.retries <= VALIDATION_CONFIG.maxRetries) {
                const validation = await validateQuestion(reply);
                
                if (validation.valid) {
                    console.log('[校验] 校验通过或跳过，使用原始回复');
                    break;
                }
                
                validationStats.retries++;
                console.log(`[校验] 第${validationStats.retries}次校验未通过，尝试重新出题...`);
                
                // 构建重试提示
                const retryPrompt = `请重新出一道阅读理解选择题，替换以下有问题的题目。

原题目问题：${validation.content}

请出一道全新的、符合要求的阅读理解选择题：
【题目】题干内容
A. 选项A B. 选项B C. 选项C D. 选项D
请回答A/B/C/D

要求：
1. 只有一个正确答案，其他三个选项都是合理的干扰项
2. 四个选项长度相近，不能有明显差异
3. 严格按照格式出题，不要额外说明`;
                
                // 重新调用AI生成
                const retryPayload = {
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: systemContent },
                        ...messages.slice(-10),
                        { role: 'user', content: retryPrompt }
                    ],
                    temperature: 0.8,
                    max_tokens: 800
                };
                
                const retryResp = await fetch(DEEPSEEK_API_BASE + '/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + DEEPSEEK_API_KEY, 'Content-Type': 'application/json' },
                    body: JSON.stringify(retryPayload)
                });
                
                const retryData = await retryResp.json();
                reply = retryData.choices && retryData.choices[0] && retryData.choices[0].message 
                    ? retryData.choices[0].message.content : reply;
            }
            
            if (validationStats.retries > VALIDATION_CONFIG.maxRetries) {
                console.log('[校验] 达到最大重试次数，使用最近一次回复');
            }
        }

        // ===== 返回响应 =====
        if (stream !== false) {
            // 客户端要求流式响应，转为SSE格式
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no'
            });
            
            if (reply) {
                res.write('data: ' + JSON.stringify({
                    choices: [{ delta: { content: reply } }]
                }) + '\n\n');
            }
            res.write('data: [DONE]\n\n');
            res.end();
        } else {
            // 非流式响应
            sendJson(res, 200, { code: 0, data: { content: reply, usage: usage } });
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
            const acceptEncoding = req.headers['accept-encoding'] || '';
            // 优先使用预压缩文件
            const gzPath = filePath + '.gz';
            if (acceptEncoding.includes('gzip') && fs.existsSync(gzPath)) {
                res.setHeader('Cache-Control', 'public, max-age=3600');
                res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
                res.setHeader('Content-Encoding', 'gzip');
                res.setHeader('Vary', 'Accept-Encoding');
                res.end(fs.readFileSync(gzPath));
                return;
            }
            const fileContent = fs.readFileSync(filePath);
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
            const contentTypes = {
                '.json': 'application/json',
                '.js': 'application/javascript',
                '.css': 'text/css',
                '.html': 'text/html',
                '.svg': 'image/svg+xml',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.ico': 'image/x-icon',
                '.woff': 'font/woff',
                '.woff2': 'font/woff2',
                '.ttf': 'font/truetype',
                '.pdf': 'application/pdf'
            };
            res.setHeader('Cache-Control', ext === '.json' ? 'no-cache' : 'public, max-age=604800');
            res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
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
    if (false && req.url === '/webhook/deploy') {
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
                        execSync('cd /opt/cet-tutor && git fetch --all && echo AUTO_DEPLOY_DISABLED && pm2 restart all', { timeout: 30000 });
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


    // ===== 每日任务生成 API =====
    if (pathname === '/api/daily-tasks' && req.method === 'GET') {
        try {
            const dimsParam = url.searchParams.get('dims'); // 格式: 细节定位:60,推理判断:50
            const weakParam = url.searchParams.get('weak'); // 薄弱维度，逗号分隔
            
            // 解析维度分数
            const dimScores = {};
            if (dimsParam) {
                try {
                    const dimPairs = dimsParam.split(',');
                    dimPairs.forEach(pair => {
                        const [key, val] = pair.split(':');
                        if (key && val) {
                            dimScores[key.trim()] = parseInt(val) || 50;
                        }
                    });
                } catch(e) {
                    console.error('[维度分数解析失败]', e);
                }
            }
            
            // 解析薄弱维度
            const weakDims = weakParam ? weakParam.split(',').map(d => d.trim()).filter(d => d) : [];
            
            // 计算薄弱维度（分数低于60的）
            let priorityDims = weakDims.slice();
            if (priorityDims.length === 0) {
                for (const [key, val] of Object.entries(dimScores)) {
                    if (val < 60) {
                        priorityDims.push(key);
                    }
                }
            }
            
            // 如果没有薄弱维度，取最低的2个
            if (priorityDims.length === 0 && Object.keys(dimScores).length > 0) {
                const sorted = Object.entries(dimScores).sort((a, b) => a[1] - b[1]);
                priorityDims = sorted.slice(0, 2).map(([k]) => k);
            }
            
            // 任务类型映射
            const dimTaskTitles = {
                '细节定位': '做5道细节定位题',
                '推理判断': '做5道推理判断题',
                '同义替换': '做5道同义替换题',
                '主旨归纳': '做5道主旨归纳题',
                '态度判断': '做5道态度判断题'
            };
            
            // 生成3个任务
            const tasks = [];
            const usedDims = new Set();
            
            // 任务1: 优先从薄弱维度出题
            if (priorityDims.length > 0) {
                const targetDim = priorityDims[Math.floor(Math.random() * priorityDims.length)];
                tasks.push({
                    id: 1,
                    title: dimTaskTitles[targetDim] || '做5道阅读理解题',
                    type: 'quiz',
                    dim: targetDim,
                    estimated: '10分钟'
                });
                usedDims.add(targetDim);
            } else {
                tasks.push({
                    id: 1,
                    title: '做5道阅读理解题',
                    type: 'quiz',
                    dim: null,
                    estimated: '10分钟'
                });
            }
            
            // 任务2: 作文或翻译
            const task2Options = [
                { id: 2, title: '完成一篇作文批改', type: 'essay', dim: null, estimated: '15分钟' },
                { id: 2, title: '完成一段翻译练习', type: 'translation', dim: null, estimated: '10分钟' }
            ];
            tasks.push(task2Options[Math.floor(Math.random() * task2Options.length)]);
            
            // 任务3: 错题复习或AI对话
            if (Math.random() > 0.5) {
                tasks.push({
                    id: 3,
                    title: '复习3道错题',
                    type: 'review',
                    dim: usedDims.size > 0 ? Array.from(usedDims)[0] : null,
                    estimated: '8分钟'
                });
            } else {
                tasks.push({
                    id: 3,
                    title: '进行AI对话练习',
                    type: 'chat',
                    dim: null,
                    estimated: '8分钟'
                });
            }
            
            // 随机打乱任务顺序（保持id正确）
            const shuffledTasks = tasks.sort(() => Math.random() - 0.5).map((t, idx) => ({
                ...t,
                id: idx + 1
            }));
            
            console.log('[每日任务生成]', { dimScores, weakDims: priorityDims, taskCount: shuffledTasks.length });
            
            return sendJson(res, 200, {
                code: 0,
                data: {
                    tasks: shuffledTasks,
                    generatedAt: new Date().toISOString(),
                    priorityDims: priorityDims
                }
            });
        } catch(e) {
            console.error('[每日任务生成失败]', e);
            return sendJson(res, 500, { code: 1, error: '生成任务失败' });
        }
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
