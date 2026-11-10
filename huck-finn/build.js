// Builds huck-finn.html: one standalone file with the game and the three.js engine inlined.
//   node build.js                 -> ../huck-finn.html (works offline, by double-click)
//   node build.js --artifact out  -> page body for a claude.ai Artifact (engine loaded from a CDN)
const fs = require('fs'), path = require('path');
const S = (f) => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const THREE_VERSION = '0.149.0';
const game = ['core.js', 'land.js', 'river.js', 'gfx.js', 'view-land.js', 'view-river.js', 'hud.js', 'main.js'].map(S).join('\n');
const args = process.argv.slice(2), artifact = args.includes('--artifact');
const dest = args.find((a) => !a.startsWith('--')) || path.join(__dirname, 'huck-finn.html');
const engine = artifact
  ? `<script src="https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/build/three.min.js"></script>`
  : '<script>\n' + S('vendor/three.min.js').replace(/<\/script/gi, '<\\/script') + '\n</script>';
let out = S('shell.html').replace('/*__THREE__*/', () => engine).replace('/*__GAME__*/', () => game);
if (artifact) {
  // The Artifact page supplies its own doctype/head/body; it wants the title, the styles and the body content.
  const title = /<title>[\s\S]*?<\/title>/.exec(out)[0], style = /<style>[\s\S]*?<\/style>/.exec(out)[0], body = /<body>([\s\S]*)<\/body>/.exec(out)[1];
  out = title + '\n' + style.replace('--bg: #140e07;', 'color-scheme: dark; --bg: #140e07;') + '\n' + body.trim() + '\n';
}
fs.writeFileSync(dest, out);
console.log('wrote', dest, (out.length / 1024).toFixed(1) + ' KB' + (artifact ? ' (artifact body)' : ''));
