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
const ADMIN_KEY = process.env.ADMIN_KEY || 'c4t_1aa6Nuh8qebPSgoVqQEQ';  // 生产环境请通过环境变量覆盖
const SECRET_KEY = process.env.SECRET_KEY || 's4t_XpXkq69UuvV2btndLnRmvqru';  // 生产环境请通过环境变量覆盖

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
const orders = new Map();

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
    return Math.max(0, 10 - count);
}

// ===== 问题4修复：从后端订单验证用户身份，不信任前端传入的userPlan =====
// 获取客户端IP
function getClientIp(req) {
    return req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress || 'unknown';
}

// 根据IP从订单数据验证用户套餐（后端唯一数据源）
function getVerifiedUserPlan(req, userId) {
    // 优先用 token 验证（前端激活后存储的 planToken + planOrderId）
    const body = req.body || {};
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
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
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
        'Access-Control-Allow-Origin': 'https://cet-tutor-production.up.railway.app',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
}

// 处理API请求
async function handleApi(req, res, pathname) {
    // 统一设置CSP

    // 处理CORS预检
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    try {
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
            // 激活码格式: CET4S-XXXXX-YYYY（前缀-随机码-6位签名）
            // 签名 = HMAC-SHA256(前缀-随机码, SECRET_KEY) 的前6位
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
                        .substring(0, 6)
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
                    .substring(0, 6)
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
                // 可能是免费订单或测试订单，直接返回paid
                return sendJson(res, 200, { paid: true });
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
            const userId = body.user_id;
            
            if (!userId) {
                return sendJson(res, 400, { error: '缺少user_id' });
            }
            
            // 从后端订单验证真实套餐（用token验证，不信任前端）
            const verifiedPlan = getVerifiedUserPlan(req, userId);
            const remaining = verifiedPlan === 'free' ? getRemainingChats(userId) : -1; // -1表示无限
            
            return sendJson(res, 200, {
                remaining,
                plan: verifiedPlan,
                limit: verifiedPlan === 'free' ? 10 : -1
            });
        }

        // 404
        sendJson(res, 404, { error: 'API不存在' });

    } catch (error) {
        console.error('[API错误]', error);
        sendJson(res, 500, { error: '服务器错误' });
    }
}

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
    res.setHeader('Cache-Control', 'public, max-age=600'); // HTML短缓存5分钟
    
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
        res.setHeader('Cache-Control', 'public, max-age=600');
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
const COZE_PAT = process.env.COZE_PAT || 'pat_hAOthvv429aDEqWspP4lITuL3DAU7VZJiGlVrnmA1zuoZ4IWW2kmxYzXUbGvZTYb';  // 生产环境请通过环境变量覆盖

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
        const verifiedPlan = getVerifiedUserPlan(req, user_id);
        
        // 后端聊天限流：免费用户10次/天，付费用户无限
        // 问题2修复：统一为 >=10 次拦截（即 >9 时拦截）
        if (verifiedPlan === 'free') {
            const chatCount = checkChatLimitBackend(user_id);
            if (chatCount > 9) {
                return sendJson(res, 429, { error: '今日免费对话次数已用完，升级套餐可无限对话' });
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
                'Access-Control-Allow-Origin': 'https://cet-tutor-production.up.railway.app'
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
