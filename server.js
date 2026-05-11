const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

const PORT = process.env.PORT || 8080;

// 管理员密钥
const ADMIN_KEY = process.env.ADMIN_KEY || 'cet4admin2026';
const SECRET_KEY = process.env.SECRET_KEY || 'cet4secret2026';

// PayJS 配置（从环境变量读取）- 不再使用，改为手动收款模式
const PAYJS_MCHID = process.env.PAYJS_MCHID || '';
const PAYJS_KEY = process.env.PAYJS_KEY || '';
const PAYJS_NOTIFY_URL = process.env.PAYJS_NOTIFY_URL || '';

// 微信收款码URL（改为本地图片）
const WECHAT_PAYMENT_QR = process.env.WECHAT_PAYMENT_QR || '/wechat-qr.jpg';

// Bot ID 配置（3个Bot）
const BOT_ID_DIAGNOSIS = '7636289658620215331';
const BOT_ID_SPRINT = '7637702903679631395';
const BOT_ID_PRO = '7637815810610036774';

// 套餐配置（4层定价）
const PLANS = {
    free: { name: '免费版', price: 0, uidPrefix: 'CET4D', botId: BOT_ID_DIAGNOSIS, needPay: false },
    trial: { name: '体验版', price: 4.9, uidPrefix: 'CET4T', botId: BOT_ID_SPRINT, needPay: true },
    sprint: { name: '冲刺版', price: 49, uidPrefix: 'CET4S', botId: BOT_ID_SPRINT, needPay: true },
    pro: { name: '旗舰版', price: 149, uidPrefix: 'CET4F', botId: BOT_ID_PRO, needPay: true }
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
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
}

// 处理API请求
async function handleApi(req, res, pathname) {
    // 统一设置CSP
    res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob: http: https: ws: wss:; script-src * 'unsafe-inline' 'unsafe-eval' data: blob: http: https:; style-src * 'unsafe-inline' data: blob:; img-src * data: blob: http: https:; connect-src * data: blob: http: https: ws: wss:; worker-src * blob: data: http: https:; media-src * blob: data: http: https:;");

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

            // 检查是否是预生成的激活码（面包多自动发货格式）
            // 激活码格式: CET4T-XXXXX（体验¥4.9）/ CET4S-XXXXX（冲刺¥49）/ CET4F-XXXXX（旗舰¥149）
            // 兼容旧格式: CET4R-XXXXX（报告¥1）→ 体验版 / CET4P-XXXXX（旗舰¥149）
            const planMatch = codeTrimmed.match(/^(CET4T|CET4S|CET4F|CET4R|CET4P)-([A-Z0-9]+)$/);
            if (planMatch) {
                let plan = 'trial';
                if (planMatch[1] === 'CET4S') plan = 'sprint';
                else if (planMatch[1] === 'CET4F') plan = 'pro';
                else if (planMatch[1] === 'CET4P') plan = 'pro';
                // CET4T 和 CET4R 都是 trial

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

                // 创建并激活订单
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

            orders.delete(orderId);
            console.log(`[订单删除] ${orderId}`);

            return sendJson(res, 200, { success: true });
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
    res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob: http: https: ws: wss:; script-src * 'unsafe-inline' 'unsafe-eval' data: blob: http: https:; style-src * 'unsafe-inline' data: blob:; img-src * data: blob: http: https:; connect-src * data: blob: http: https: ws: wss:; worker-src * blob: data: http: https:; media-src * blob: data: http: https:;");
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

    // API路由
    if (pathname.startsWith('/api/')) {
        handleApi(req, res, pathname);
        return;
    }

    // 静态文件
    if (pathname === '/' || pathname === '/index.html') {
        sendHtml(res, html, req);
        return;
    }

    // 管理员页面
    if (pathname === '/admin-activate-cet4') {
        const adminHtml = fs.readFileSync(path.join(__dirname, 'admin.html'), 'utf-8');
        const adminContentLength = Buffer.byteLength(adminHtml, 'utf-8');
        res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob: http: https: ws: wss:; script-src * 'unsafe-inline' 'unsafe-eval' data: blob: http: https:; style-src * 'unsafe-inline' data: blob:; img-src * data: blob: http: https:; connect-src * data: blob: http: https: ws: wss:; worker-src * blob: data: http: https:; media-src * blob: data: http: https:;");
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
const COZE_PAT = 'pat_hAOthvv429aDEqWspP4lITuL3DAU7VZJiGlVrnmA1zuoZ4IWW2kmxYzXUbGvZTYb';

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

        const payload = {
            bot_id: bot_id,
            user_id: user_id,
            additional_messages: messages,
            stream: stream !== false,
            auto_save_history: stream === false
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
                'Access-Control-Allow-Origin': '*'
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

        if (!conversationId || !chatId) {
            return sendJson(res, 400, { error: '参数缺失' });
        }

        const resp = await fetch(
            COZE_API_BASE + '/v1/conversation/message/list?conversation_id=' + conversationId + '&chat_id=' + chatId,
            {
                headers: { 'Authorization': 'Bearer ' + COZE_PAT }
            }
        );
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
