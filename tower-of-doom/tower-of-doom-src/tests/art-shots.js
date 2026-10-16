// Screenshots of the artwork in the real game screens (desktop + phone) -> tests/shots/art-*.png
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); } })();
const path = require('path'), fs = require('fs');
const GAME = path.join(__dirname, '..', '..', 'tower-of-doom.html');
const SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
(async () => {
  const b = await chromium.launch();
  for (const [name, vp] of [['desktop', { width: 1180, height: 860 }], ['phone', { width: 390, height: 844 }]]) {
    const p = await b.newPage({ viewport: vp });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + GAME); await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(SHOTS, `art-${name}-title.png`) });
    await p.evaluate(() => { window.__TOD.UI.sound = false; window.__TOD.UI.speed = 0.3; window.__TOD.startRun(21); });
    await p.waitForTimeout(600);
    await p.screenshot({ path: path.join(SHOTS, `art-${name}-draft.png`) });
    for (let i = 0; i < 5; i++) await p.click('#draftCards .card.pickable');
    await p.evaluate(() => { const T = window.__TOD; ['shield', 'anchor', 'crown', 'heart', 'piggy', 'clover'].forEach(t => T.core.gainTrinket(T.state, t)); });
    await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(SHOTS, `art-${name}-map.png`) });
    await p.click('.map-node.avail'); await p.waitForFunction(() => window.__TOD.battle && window.__TOD.battle.phase === 'pick');
    await p.click('#hand .card.pickable'); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(SHOTS, `art-${name}-battle.png`) });
    // boss battle + level intro + shop
    await p.evaluate(() => { const T = window.__TOD; T.quitRun(); T.startRun(4); });
    await p.waitForTimeout(600);
    for (let i = 0; i < 5; i++) await p.click('#draftCards .card.pickable');
    await p.evaluate(() => { const T = window.__TOD, S = T.state; S.level = 2; S.pos = { r: 9, c: 0 }; S.path = ['x']; startBattle('boss'); });
    await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(SHOTS, `art-${name}-boss.png`) });
    await p.evaluate(() => { window.__TOD.state.level = 1; showLevelIntro(); });
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(SHOTS, `art-${name}-level.png`) });
    await p.evaluate(() => { window.__TOD.state.coins = 300; window.__TOD.state.pos = { r: 2, c: 0 }; openShop(); });
    await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(SHOTS, `art-${name}-shop.png`), fullPage: true });
    console.log(name, errs.length ? 'ERRORS ' + errs.join(' | ') : 'no errors');
    await p.close();
  }
  await b.close();
})();
