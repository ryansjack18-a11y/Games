// Regression: quitting on the boss reward screen must not leak the level-up flag into the next run.
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); } })();
const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(__dirname, '..', '..', 'tower-of-doom.html'));
  await p.evaluate(() => { window.__TOD.UI.speed = 0.02; window.__TOD.UI.sound = false; });
  // simulate: boss beaten, reward screen up with levelUp set, then quit via menu
  await p.evaluate(() => { const T = window.__TOD; T.startRun(3); });
  for (let i = 0; i < 5; i++) await p.click('#draftCards .card.pickable');
  await p.evaluate(() => { window.__TOD.UI.levelUp = true; });
  await p.click('#hudHelp'); await p.click('#quitRun');
  await p.click('#playBtn'); await p.waitForTimeout(550); for (let i = 0; i < 5; i++) await p.click('#draftCards .card.pickable');
  const flag = await p.evaluate(() => window.__TOD.UI.levelUp);
  console.log(flag ? 'FAIL levelUp leaked into new run' : 'PASS levelUp cleared on quit/new run', errs.length ? errs.join('|') : '');
  await b.close(); process.exit(flag ? 1 : 0);
})();
