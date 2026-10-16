const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); } })();
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 900, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/net::|fonts/.test(m.text())) errs.push(m.text()); });
  await p.goto('file://' + path.join(__dirname, '..', '..', 'tower-of-doom.html'));
  await p.evaluate(() => { window.__TOD.UI.speed = 0.2; });            // sound stays ON
  await p.click('[data-diff="hard"]'); await p.click('#playBtn');
  for (let i = 0; i < 5; i++) await p.keyboard.press('2');
  await p.click('.map-node.avail');
  await p.waitForFunction(() => window.__TOD.battle && window.__TOD.battle.phase === 'pick');
  await p.keyboard.press('1'); await p.waitForTimeout(200); await p.keyboard.press('Space');
  await p.waitForTimeout(100);
  // open menu mid-battle and quit
  await p.click('#hudHelp'); await p.waitForSelector('#quitRun'); await p.click('#quitRun');
  await p.waitForTimeout(1500); // let any pending battle timers fire
  const st = await p.evaluate(() => ({ screen: window.__TOD.UI.screen, S: window.__TOD.state, B: window.__TOD.battle, hud: document.getElementById('hud').classList.contains('show') }));
  console.log('after quit:', st.screen, 'state null:', st.S === null, 'battle null:', st.B === null, 'hud hidden:', !st.hud);
  // start again and toggle sound in HUD
  await p.click('#playBtn'); await p.waitForTimeout(550); for (let i = 0; i < 5; i++) await p.click('#draftCards .card.pickable');
  await p.click('#hudSound'); const snd = await p.evaluate(() => window.__TOD.UI.sound);
  await p.click('#hudSound'); const snd2 = await p.evaluate(() => window.__TOD.UI.sound);
  console.log('sound toggles:', snd, '->', snd2);
  // best record persisted?
  console.log('title best line after quit (expected empty or record):', JSON.stringify(await p.evaluate(() => localStorage.getItem('tod-best'))));
  console.log(errs.length ? 'ERRORS: ' + errs.join(' | ') : 'no errors');
  await b.close();
})();
