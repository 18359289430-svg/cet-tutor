const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

const oldStr = "        // GET /api/admin/generate-codes - 管理员生成激活码\n        if (pathname === '/api/admin/generate-codes' && req.method === 'GET') {";

const newStr = `        // POST /api/admin-generate-code - 管理员生成激活码（admin.html前端调用）
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
                        const code = \`\${prefix}-\${randomPart}-\${signature}\`;
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
        if (pathname === '/api/admin/generate-codes' && req.method === 'GET') {`;

if (content.includes(oldStr)) {
    content = content.replace(oldStr, newStr);
    fs.writeFileSync('server.js', content);
    console.log('Patch applied successfully');
} else {
    console.log('Target string not found');
}
