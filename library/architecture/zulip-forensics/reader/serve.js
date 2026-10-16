// Simple, zero-dependency local static server for the Zulip Platform Study Reader.
// Port 3800 by default so it can run beside the Hermes reader (3000), the Paperclip reader (3100), the CrewAI reader (3200), the Multica reader (3300), the Gas Town reader (3400), the n8n reader (3500), the buzz reader (3600) and the OpenRig reader (3700).
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3800;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const readerSubdir = path.join(__dirname, 'reader');
const baseDir = (fs.existsSync(readerSubdir) && fs.statSync(readerSubdir).isDirectory()) ? readerSubdir : __dirname;

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0].split('#')[0]);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const filePath = path.join(baseDir, reqPath);
  const ext = path.extname(filePath).toLowerCase();

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + reqPath);
      return;
    }

    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Zulip Platform Study Reader is live at:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   http://127.0.0.1:${PORT}`);
  console.log(`======================================================\n`);
  console.log(`Press Ctrl+C to stop the server.`);
});
