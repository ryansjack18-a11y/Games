// Plays floor 1 on Normal inside the artifact-like frame, then looks for a way to floor 2.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const logs = [];
  p.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
  p.on('pageerror', e => logs.push('[pageerror] ' + e.message));
  await p.goto('http://localhost:8101/'); await p.waitForTimeout(800);
  const f = p.frames().find(x => x.url().startsWith('http://127.0.0.1:8102'));
  await f.evaluate(() => { window.addEventListener('unhandledrejection', e => console.error('UNHANDLED REJECTION: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason))); });
  await f.click('[data-diff="normal"]'); await f.click('#playBtn');
  for (let i = 0; i < 5; i++) await f.click('#draftCards .card.pickable');
  await f.click('.map-node.avail');
  let guard = 0;
  while (guard++ < 400) {
    const st = await f.evaluate(() => ({ screen: window.__TOD.UI.screen, phase: window.__TOD.battle && window.__TOD.battle.phase, hp: window.__TOD.state && window.__TOD.state.hp }));
    if (st.screen !== 'battle') { console.log('left battle ->', st.screen, 'hp', st.hp); break; }
    if (st.phase === 'pick') await f.click('#hand .card.pickable');
    else if (st.phase === 'timing') {
      await f.evaluate(() => new Promise(res => { const B = window.__TOD.battle; const loop = () => { const t = B.timing; if (B.phase !== 'timing') return res(); const x = (t.phase0 + (performance.now() - t.start) / 1000 * t.p.speed) % 2, pos = x > 1 ? 2 - x : x; if (Math.abs(pos - t.center) < t.p.zone * 0.3) { document.getElementById('stopBtn').click(); return res(); } requestAnimationFrame(loop); }; loop(); }));
    } else if (st.phase === 'stat') {
      const best = await f.evaluate(() => { const T = window.__TOD, B = T.battle, S = T.state, c = S.deck.find(x => x.uid === B.chosen); return ['s','c','w'].reduce((a, k) => (T.core.effStat(S, c, k) - B.enemyCard[k] > T.core.effStat(S, c, a) - B.enemyCard[a] ? k : a), 's'); });
      await f.click(`[data-stat="${best}"]`);
    } else await p.waitForTimeout(100);
  }
  await p.waitForTimeout(500);
  const scr = await f.evaluate(() => window.__TOD.UI.screen);
  await p.screenshot({ path: 'after-battle.png' });
  console.log('screen after battle:', scr);
  if (scr === 'reward') {
    const info = await f.evaluate(() => ({ cards: document.querySelectorAll('#rewardCards .card.pickable').length, skip: !!document.getElementById('skipReward'), html: document.getElementById('reward').innerHTML.length }));
    console.log('reward screen:', JSON.stringify(info));
    await f.click('#rewardCards .card.pickable');
    await p.waitForTimeout(500);
    const m = await f.evaluate(() => ({ screen: window.__TOD.UI.screen, avail: [...document.querySelectorAll('.map-node.avail')].map(n => { const r = n.getBoundingClientRect(); return { id: n.dataset.node, top: Math.round(r.top), vis: r.top >= 0 && r.bottom <= innerHeight }; }), scrollY: Math.round(scrollY), innerH: innerHeight, docH: document.documentElement.scrollHeight }));
    console.log('map after reward:', JSON.stringify(m));
    await p.screenshot({ path: 'map-floor2.png' });
  }
  console.log(logs.length ? logs.join('\n') : 'no console messages');
  await b.close();
})();
