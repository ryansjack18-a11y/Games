const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); } })();
const path = require('path'); const { spawn } = require('child_process');
const res = []; const t = (n, ok, d = '') => { res.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  (' + d + ')' : ''}`); };
(async () => {
  const b = await chromium.launch();
  for (const [mode, vps] of [['fixed', [[1280, 800], [390, 740]]], ['tall', [[1280, 800], [390, 740]]]]) {
    const srv = spawn('node', ['server.js'], { cwd: path.join(__dirname, 'artifact-harness'), env: { ...process.env, FRAME: mode }, stdio: 'ignore' });
    await new Promise(r => setTimeout(r, 900));
    for (const [w, h] of vps) {
      const p = await b.newPage({ viewport: { width: w, height: h } });
      const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.goto('http://localhost:8101/'); await p.waitForTimeout(700);
      const f = p.frames().find(x => x.url().startsWith('http://127.0.0.1:8102'));
      const tag = `${mode} ${w}x${h}`;
      await f.evaluate(() => { window.__TOD.UI.sound = false; window.__TOD.startRun(5); });
      await p.waitForTimeout(600);
      for (let i = 0; i < 5; i++) await f.click('#draftCards .card.pickable');
      await p.waitForTimeout(3800); // let the 'team is ready' toast finish hiding
      // 1. toast must not cover the bar
      const cov = await f.evaluate(() => { const tt = document.getElementById('toast'), r = tt.getBoundingClientRect(), cs = getComputedStyle(tt); return { vis: cs.visibility, op: cs.opacity }; });
      t(`${tag}: hidden toast is invisible`, cov.vis === 'hidden' || cov.op === '0', JSON.stringify(cov));
      // 2. a glowing room is visible in the window without scrolling the page around the game
      const roomVis = await f.evaluate(() => { const r = document.querySelector('.map-node.avail').getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), ih: innerHeight }; });
      const frameBox = await p.$eval('#f', el => { const r = el.getBoundingClientRect(); return { top: r.top, h: r.height }; });
      const roomTopInHost = frameBox.top + roomVis.top;
      t(`${tag}: a glowing room is visible in the window`, mode === 'tall' ? roomVis.top > 0 && roomVis.bottom <= roomVis.ih : roomTopInHost >= 0 && frameBox.top + roomVis.bottom <= h + 2, `roomTop ${Math.round(roomTopInHost)} h ${h}`);
      // 3. enter a room, then the battle must be on screen
      await f.click('.map-node.avail');
      await p.waitForTimeout(500);
      const bm = await f.evaluate(() => { const e = document.getElementById('eName').getBoundingClientRect(); return { top: e.top }; });
      const fb = await p.$eval('#f', el => el.getBoundingClientRect().top);
      t(`${tag}: battle screen starts in view`, fb + bm.top >= -2 && fb + bm.top < h, `enemy name at ${Math.round(fb + bm.top)}`);
      // 4. double-click Leave Shop / Skip does not enter a room
      await f.evaluate(() => { window.__TOD.UI.speed = 0.02; window.__TOD.quitRun(); window.__TOD.startRun(9); });
      await p.waitForTimeout(600);
      for (let i = 0; i < 5; i++) await f.click('#draftCards .card.pickable');
      // go to a shop directly: open one through the game's own path
      await f.evaluate(() => { const T = window.__TOD; T.state.pos = { r: 1, c: 0 }; T.state.path = ['0-0', '1-0']; T.state.coins = 0; });
      await f.evaluate(() => { openShop(); });
      await p.waitForTimeout(700);
      const lb = await f.$eval('#leaveShop', el => { el.scrollIntoView({ block: 'end' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
      const fbox = await p.$eval('#f', el => el.getBoundingClientRect());
      await p.mouse.dblclick(fbox.x + lb.x, fbox.y + lb.y);
      await p.waitForTimeout(700);
      const after = await f.evaluate(() => ({ s: window.__TOD.UI.screen, path: window.__TOD.state.path.length }));
      t(`${tag}: double-click Leave Shop only leaves the shop`, after.s === 'map' && after.path === 2, JSON.stringify(after));
      t(`${tag}: no errors`, errs.length === 0, errs.join('|'));
      await p.close();
    }
    srv.kill();
    await new Promise(r => setTimeout(r, 300));
  }
  await b.close();
  const f = res.filter(x => !x).length; console.log(f ? `\n${f} FAILED` : `\nAll ${res.length} checks passed.`); process.exit(f ? 1 : 0);
})();
