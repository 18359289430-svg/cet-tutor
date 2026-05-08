const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');

const server = http.createServer((req, res) => {
  res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob: http: https: ws: wss:; script-src * 'unsafe-inline' 'unsafe-eval' data: blob: http: https:; style-src * 'unsafe-inline' data: blob:; img-src * data: blob: http: https:; connect-src * data: blob: http: https: ws: wss:; worker-src * blob: data: http: https:; media-src * blob: data: http: https:;");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
