// Screenshots of mid-battle states + deck modal at desktop and phone sizes.
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); } })();
const path = require('path');
const fs = require('fs'); fs.mkdirSync(path.join(__dirname, 'shots'), { recursive: true });
(async () => {
  const b = await chromium.launch();
  for (const [name, vp] of [['desktop', { width: 1180, height: 900 }], ['phone', { width: 375, height: 812 }]]) {
    const p = await b.newPage({ viewport: vp });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.join(__dirname, '..', '..', 'tower-of-doom.html'));
    await p.evaluate(() => { window.__TOD.UI.sound = false; window.__TOD.UI.speed = 0.3; window.__TOD.startRun(42); });
    await p.waitForTimeout(550); for (let i = 0; i < 5; i++) await p.click('#draftCards .card.pickable');
    await p.evaluate(() => { const T = window.__TOD; T.core.gainTrinket(T.state, 'anchor'); T.core.gainTrinket(T.state, 'shield'); });
    await p.click('.map-node.avail');
    await p.waitForFunction(() => window.__TOD.battle && window.__TOD.battle.phase === 'pick');
    await p.click('#hand .card.pickable');
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(__dirname, 'shots', `${name}-s1-timing.png`) });
    // stop inside zone
    await p.evaluate(() => new Promise(res => { const B = window.__TOD.battle; const loop = () => { const t = B.timing; const x = (t.phase0 + (performance.now() - t.start) / 1000 * t.p.speed) % 2, pos = x > 1 ? 2 - x : x; if (Math.abs(pos - t.center) < t.p.zone * 0.25) { document.getElementById('stopBtn').click(); return res(); } requestAnimationFrame(loop); }; loop(); }));
    await p.waitForFunction(() => window.__TOD.battle.phase === 'stat');
    await p.screenshot({ path: path.join(__dirname, 'shots', `${name}-s2-stat.png`) });
    await p.click('[data-stat="s"]');
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(__dirname, 'shots', `${name}-s3-resolve.png`) });
    await p.click('#hudDeck'); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(__dirname, 'shots', `${name}-s4-deck.png`) });
    console.log(name, errs.length ? 'ERRORS ' + errs.join(' | ') : 'no errors');
    await p.close();
  }
  await b.close();
})();
