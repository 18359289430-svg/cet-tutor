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
    free: { name: '免费版', price: 0, uidPrefix: 'CET4D', botId: BOT_ID_DIAGNOSIS, needPay: false },
    sprint: { name: '冲刺营', price: 38, uidPrefix: 'CET4S', botId: BOT_ID_COMPANION, needPay: true },
    flagship: { name: '全程营', price: 148, uidPrefix: 'CET4F', botId: BOT_ID_COMPANION, needPay: true }
};

// 内存订单存储
const orders = new Map();

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
    res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https: http:; font-src 'self' data:; connect-src 'self' https://api.coze.cn https://x.mianbaoduo.com https://cet-tutor-production.up.railway.app; frame-src 'none'");

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
                token: null
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
            const { order_id, plan: reqPlan } = body;

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

                if (mbdData.code !== 200 || !mbdData.result || mbdData.result.state !== 'success') {
                    return sendJson(res, 400, { error: '订单验证失败，请确认订单号是否正确且已付款' });
                }

                const orderInfo = mbdData.result;
                const amount = orderInfo.orderamount;

                // 根据金额判断套餐
                if (amount >= 128) {
                    plan = 'flagship';
                } else if (amount >= 35) {
                    plan = 'sprint';
                } else {
                    return sendJson(res, 400, { error: '订单金额与套餐不匹配' });
                }

                // 创建并激活
                const activationId = 'mbd_' + orderIdTrimmed;
                const token = crypto.createHash('md5').update(activationId + plan + SECRET_KEY).digest('hex');
                orders.set(activationId, {
                    orderId: activationId,
                    mbdOrderId: orderIdTrimmed,
                    plan,
                    amount: PLANS[plan].price,
                    status: 'activated',
                    createdAt: Date.now(),
                    activatedAt: Date.now(),
                    token,
                    source: 'mbd_order'
                });

                console.log(`[面包多订单激活] ${orderIdTrimmed} - ${PLANS[plan].name} - ¥${amount}`);

                return sendJson(res, 200, {
                    success: true,
                    plan,
                    token,
                    orderId: activationId
                });
            } catch (e) {
                console.error('MBD order verify error:', e);
                return sendJson(res, 500, { error: '订单验证服务暂时不可用，请稍后重试' });
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
            if (pendingOrder) {
                if (pendingOrder.status === 'activated') {
                    return sendJson(res, 200, {
                        success: true,
                        plan: pendingOrder.plan,
                        token: pendingOrder.token,
                        orderId: pendingOrder.orderId
                    });
                }
                return sendJson(res, 400, { error: '此订单尚未激活，请完成支付后联系管理员' });
            }

            return sendJson(res, 400, { error: '无效的激活码，请检查后重试' });
        }

        // POST /api/admin-activate - 管理员激活订单
        if (pathname === '/api/admin-activate' && req.method === 'POST') {
            const body = await parseBody(req);
            const { orderId, adminKey } = body;

            if (!orderId || !adminKey) {
                return sendJson(res, 400, { error: '缺少必要参数' });
            }

            if (adminKey !== ADMIN_KEY) {
                return sendJson(res, 401, { error: '管理员密钥错误' });
            }

            const order = orders.get(orderId);
            if (!order) {
                return sendJson(res, 404, { error: '订单不存在' });
            }

            if (order.status === 'activated') {
                return sendJson(res, 200, { success: true, message: '订单已激活', token: order.token });
            }

            // 生成激活token
            const token = crypto.createHash('md5').update(orderId + order.plan + SECRET_KEY).digest('hex');
            order.status = 'activated';
            order.activatedAt = Date.now();
            order.token = token;

            console.log(`[订单激活] ${orderId} - ${order.plan} - ¥${order.amount}`);

            return sendJson(res, 200, { success: true, token });
        }

        // GET /api/admin-orders - 获取订单列表（管理员）
        if (pathname === '/api/admin-orders' && req.method === 'GET') {
            const url = new URL(req.url, `http://localhost:${PORT}`);
            const adminKey = url.searchParams.get('adminKey');

            if (adminKey !== ADMIN_KEY) {
                return sendJson(res, 401, { error: '管理员密钥错误' });
            }

            const orderList = Array.from(orders.values())
                .sort((a, b) => {
                    // 待激活的排前面，然后按创建时间倒序
                    if (a.status === 'pending' && b.status !== 'pending') return -1;
                    if (a.status !== 'pending' && b.status === 'pending') return 1;
                    return b.createdAt - a.createdAt;
                });

            return sendJson(res, 200, { orders: orderList });
        }

        // POST /api/admin-delete-order - 删除订单（管理员）
        if (pathname === '/api/admin-delete-order' && req.method === 'POST') {
            const body = await parseBody(req);
            const { orderId, adminKey } = body;

            if (!orderId || !adminKey) {
                return sendJson(res, 400, { error: '缺少必要参数' });
            }

            if (adminKey !== ADMIN_KEY) {
                return sendJson(res, 401, { error: '管理员密钥错误' });
            }

            if (!orders.has(orderId)) {
                return sendJson(res, 404, { error: '订单不存在' });
            }

            orders.delete(orderId); saveOrders();
            console.log(`[订单删除] ${orderId}`);

            return sendJson(res, 200, { success: true });
        }

        // POST /api/admin-generate-code - 管理员批量生成激活码
        if (pathname === '/api/admin-generate-code' && req.method === 'POST') {
            const body = await parseBody(req);
            const { plan, count, adminKey } = body;

            if (!plan || !adminKey || !PLANS[plan]) {
                return sendJson(res, 400, { error: '缺少必要参数' });
            }

            if (adminKey !== ADMIN_KEY) {
                return sendJson(res, 401, { error: '管理员密钥错误' });
            }

            const num = Math.min(parseInt(count) || 1, 50); // 最多一次生成50个
            const codes = [];

            for (let i = 0; i < num; i++) {
                const prefix = PLANS[plan].uidPrefix.replace('CET4', '').replace('D', 'S'); // CET4D→S, CET4S→S, CET4F→F
                const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase().substring(0, 5);
                const signature = crypto.createHmac('sha256', SECRET_KEY)
                    .update('CET4' + prefix + '-' + randomPart)
                    .digest('hex')
                    .substring(0, 6)
                    .toUpperCase();
                const code = 'CET4' + prefix + '-' + randomPart + '-' + signature;
                codes.push(code);
            }

            console.log(`[生成激活码] ${PLANS[plan].name} × ${num}`);

            return sendJson(res, 200, { success: true, plan, codes });
        }

        // ===== 旧版PayJS API（保留但不再使用）=====

        // POST /api/payjs-notify - PayJS支付回调
        if (pathname === '/api/payjs-notify' && req.method === 'POST') {
            const body = await parseBody(req);
            console.log('[PayJS回调]', body);

            // 验证签名
            if (!verifySign(body)) {
                console.error('[签名验证失败]');
                return sendJson(res, 400, { return_code: 0, return_msg: '签名验证失败' });
            }

            const { out_trade_no, payjs_order_id } = body;

            // 更新订单状态
            const order = orders.get(out_trade_no);
            if (order) {
                order.paid = true;
                order.paidAt = Date.now();
                order.payjsOrderId = payjs_order_id;
                console.log(`[订单支付成功] ${out_trade_no} - UID: ${order.uid} - ref: ${order.ref}`);
            }

            // 返回success给PayJS
            return sendJson(res, 200, { return_code: 1, return_msg: 'OK' });
        }

        // GET /api/check-order-legacy - 查询订单状态（旧版）
        if (pathname === '/api/check-order' && req.method === 'GET') {
            const url = new URL(req.url, `http://localhost:${PORT}`);
            const orderId = url.searchParams.get('order_id');

            if (!orderId) {
                return sendJson(res, 400, { error: '缺少order_id参数' });
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
                bot_id: order.planConfig?.botId
            });
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
    res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https: http:; font-src 'self' data:; connect-src 'self' https://api.coze.cn https://x.mianbaoduo.com https://cet-tutor-production.up.railway.app; frame-src 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=300'); // HTML短缓存5分钟
    
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
        res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https: http:; font-src 'self' data:; connect-src 'self' https://api.coze.cn https://x.mianbaoduo.com https://cet-tutor-production.up.railway.app; frame-src 'none'");
        res.setHeader('Cache-Control', 'public, max-age=300');
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

// 每日聊天限流（内存存储，重启清零）
const chatLimitMap = new Map();
function checkChatLimitBackend(userId) {
    const today = new Date().toISOString().slice(0, 10);
    const key = userId + ':' + today;
    const record = chatLimitMap.get(key) || { count: 0 };
    record.count++;
    chatLimitMap.set(key, record);
    // 清理3天前的记录
    if (Math.random() < 0.05) {
        const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
        for (const [k] of chatLimitMap) {
            if (k.split(':')[1] < threeDaysAgo) chatLimitMap.delete(k);
        }
    }
    return record.count;
}

// POST /api/chat/send - 发送消息（流式）
async function handleChatSend(req, res) {
    try {
        const body = await parseBody(req);
        const { bot_id, user_id, conversation_id, messages, stream, parameters } = body;

        if (!bot_id || !user_id || !messages) {
            return sendJson(res, 400, { error: '参数缺失' });
        }

        // 后端聊天限流：免费用户10次/天，付费用户无限
        const chatCount = checkChatLimitBackend(user_id);
        // 通过custom_variables判断套餐
        const userPlan = (body.custom_variables && body.custom_variables.user_plan) || 
                         (parameters && parameters.user_plan) || 'free';
        if (userPlan === 'free' && chatCount > 10) {
            return sendJson(res, 429, { error: '今日免费对话次数已用完，升级套餐可无限对话' });
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
