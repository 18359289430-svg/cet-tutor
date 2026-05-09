const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;

// 管理员密钥
const ADMIN_KEY = process.env.ADMIN_KEY || 'cet4admin2026';
const SECRET_KEY = process.env.SECRET_KEY || 'cet4secret2026';

// PayJS 配置（从环境变量读取）- 不再使用，改为手动收款模式
const PAYJS_MCHID = process.env.PAYJS_MCHID || '';
const PAYJS_KEY = process.env.PAYJS_KEY || '';
const PAYJS_NOTIFY_URL = process.env.PAYJS_NOTIFY_URL || '';

// 微信收款码URL（需要替换为真实收款码）
const WECHAT_PAYMENT_QR = process.env.WECHAT_PAYMENT_QR || 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=wechat-pay-placeholder';

// Bot ID 配置（3个Bot）
const BOT_ID_DIAGNOSIS = '7636289658620215331';
const BOT_ID_SPRINT = '7637702903679631395';
const BOT_ID_PRO = '7637815810610036774';

// 套餐配置（4层定价）
const PLANS = {
    free: { name: '免费诊断', price: 0, uidPrefix: 'CET4D', botId: BOT_ID_DIAGNOSIS, needPay: false },
    report: { name: '详细报告', price: 1, uidPrefix: 'CET4R', botId: BOT_ID_DIAGNOSIS, needPay: true },
    sprint: { name: '冲刺版', price: 49, uidPrefix: 'CET4S', botId: BOT_ID_SPRINT, needPay: true },
    pro: { name: '旗舰版', price: 149, uidPrefix: 'CET4P', botId: BOT_ID_PRO, needPay: true }
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

        // 404
        sendJson(res, 404, { error: 'API不存在' });

    } catch (error) {
        console.error('[API错误]', error);
        sendJson(res, 500, { error: '服务器错误' });
    }
}

// 主服务器
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;

    // API路由
    if (pathname.startsWith('/api/')) {
        handleApi(req, res, pathname);
        return;
    }

    // 静态文件
    if (pathname === '/' || pathname === '/index.html') {
        res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob: http: https: ws: wss:; script-src * 'unsafe-inline' 'unsafe-eval' data: blob: http: https:; style-src * 'unsafe-inline' data: blob:; img-src * data: blob: http: https:; connect-src * data: blob: http: https: ws: wss:; worker-src * blob: data: http: https:; media-src * blob: data: http: https:;");
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(html);
        return;
    }

    // 管理员页面
    if (pathname === '/admin-activate-cet4') {
        res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob: http: https: ws: wss:; script-src * 'unsafe-inline' 'unsafe-eval' data: blob: http: https:; style-src * 'unsafe-inline' data: blob:; img-src * data: blob: http: https:; connect-src * data: blob: http: https: ws: wss:; worker-src * blob: data: http: https:; media-src * blob: data: http: https:;");
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(fs.readFileSync(path.join(__dirname, 'admin.html'), 'utf-8'));
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
});
