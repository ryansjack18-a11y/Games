// Inlines all sources into one standalone HTML file.
const fs = require('fs'), path = require('path');
const S = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const css = S('style-base.css') + '\n' + S('sprites.css');
const js = "'use strict';\n" + ['sprites.js', 'core-data.js', 'core-logic.js', 'ui-sprite.js', 'ui-main.js', 'ui-battle.js'].map(S).join('\n');
const out = S('shell.html').replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => js);
const args = process.argv.slice(2);
const artifact = args.includes('--artifact');
const dest = args.find(a => !a.startsWith('--')) || path.join(__dirname, '..', 'tower-of-doom.html');
// --artifact: page body for a claude.ai Artifact, which supplies its own
// doctype/html/head/body skeleton (charset + viewport included).
const final = !artifact ? out : out
  .replace(/<!DOCTYPE html>\s*/i, '')
  .replace(/<html[^>]*>\s*<head>\s*/i, '')
  .replace(/<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*/i, '')
  .replace(/<\/head>\s*<body>\s*/i, '')
  .replace(/\s*<\/body>\s*<\/html>\s*$/i, '\n');
fs.writeFileSync(dest, final);
console.log('wrote', dest, (final.length / 1024).toFixed(1) + ' KB' + (artifact ? ' (artifact body)' : ''));
