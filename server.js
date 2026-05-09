const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;

// PayJS 配置（从环境变量读取）
const PAYJS_MCHID = process.env.PAYJS_MCHID || '';
const PAYJS_KEY = process.env.PAYJS_KEY || '';
const PAYJS_NOTIFY_URL = process.env.PAYJS_NOTIFY_URL || '';

// Bot ID 配置（3个Bot暂时共用，后续可按套餐分配不同Bot）
const BOT_ID_DIAGNOSIS = '7636289658620215331';
const BOT_ID_SPRINT = '7636289658620215331';
const BOT_ID_PRO = '7636289658620215331';

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
        // POST /api/create-order - 创建支付订单
        if (pathname === '/api/create-order' && req.method === 'POST') {
            const body = await parseBody(req);
            const { plan, ref } = body;

            if (!plan || !PLANS[plan]) {
                return sendJson(res, 400, { error: '无效的套餐类型' });
            }

            const planConfig = PLANS[plan];
            const orderId = generateOrderId();
            const uid = generateUid(plan);

            // 免费套餐不需要支付
            if (!planConfig.needPay) {
                return sendJson(res, 200, {
                    order_id: orderId,
                    uid,
                    paid: true,
                    mock: true
                });
            }

            const totalFee = Math.round(planConfig.price * 100); // 转换为分

            // PayJS API参数
            const payjsParams = {
                mchid: PAYJS_MCHID,
                total_fee: totalFee,
                out_trade_no: orderId,
                body: `四级备考搭子-${planConfig.name}`,
                notify_url: PAYJS_NOTIFY_URL,
                nonce: crypto.randomBytes(8).toString('hex')
            };

            // 添加签名
            payjsParams.sign = sign(payjsParams, PAYJS_KEY);

            // 存储订单信息
            orders.set(orderId, {
                plan,
                uid,
                paid: false,
                createdAt: Date.now(),
                planConfig,
                ref: ref || ''
            });

            console.log(`[订单创建] ${orderId} - ${planConfig.name} - ¥${planConfig.price} - ref: ${ref || 'none'}`);

            // 如果没有配置PayJS，返回模拟数据用于测试
            if (!PAYJS_MCHID || !PAYJS_KEY) {
                const mockQrCode = '/wechat-qr.jpg';
                return sendJson(res, 200, {
                    order_id: orderId,
                    uid,
                    qr_code_url: mockQrCode,
                    mock: true
                });
            }

            // 调用PayJS Native API
            const payjsUrl = 'https://payjs.cn/api/native';
            const postData = new URLSearchParams(payjsParams).toString();

            const response = await fetch(payjsUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: postData
            });

            const payjsResult = await response.json();

            if (payjsResult.return_code === 1 && payjsResult.qrcode) {
                return sendJson(res, 200, {
                    order_id: orderId,
                    uid,
                    qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payjsResult.qrcode)}`
                });
            } else {
                console.error('[PayJS错误]', payjsResult);
                return sendJson(res, 500, { error: '创建支付订单失败', detail: payjsResult });
            }
        }

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

        // GET /api/check-order - 查询订单状态
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
                bot_id: order.planConfig.botId
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

    // 微信收款码
    if (pathname === '/wechat-qr.jpg') {
        const qrPath = path.join(__dirname, 'wechat-qr.jpg');
        try {
            const qrData = fs.readFileSync(qrPath);
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.end(qrData);
        } catch (e) {
            res.writeHead(404);
            res.end('Not Found');
        }
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
