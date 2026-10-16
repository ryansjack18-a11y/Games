// Two origins: parent (8101) frames the game (8102) like the artifact viewer.
const http = require('http'), fs = require('fs'), path = require('path');
const body = fs.readFileSync(path.join(__dirname, 'body.html'), 'utf8');
// Artifact-style skeleton around the page body
const page = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>
${body}</body></html>`;
const CSP = "default-src 'none'; script-src 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data: blob:; connect-src 'self'";
http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html', 'content-security-policy': CSP });
  res.end(page);
}).listen(8102);
const mode = process.env.FRAME || 'fixed';
http.createServer((req, res) => {
  const h = mode === 'tall' ? 'height:2400px' : 'height:100vh';
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(`<!doctype html><body style="margin:0"><iframe id="f" src="http://127.0.0.1:8102/" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" style="width:100%;${h};border:0"></iframe></body>`);
}).listen(8101);
console.log('servers up', mode);
