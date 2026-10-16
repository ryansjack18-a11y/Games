// Every glowing room must be clickable (not hidden under anything) at many sizes, on every floor shown.
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); } })();
const path = require('path');
(async () => {
  const b = await chromium.launch(); let fails = 0, checks = 0;
  for (const [w, h] of [[320, 568], [360, 640], [375, 667], [390, 844], [430, 932], [568, 320], [768, 1024], [1024, 600], [1280, 800], [1920, 1080]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, isMobile: w < 800, hasTouch: w < 800 });
    await p.goto('file://' + path.join(__dirname, '..', '..', 'tower-of-doom.html'));
    for (const seed of [1, 2, 3]) {
      await p.evaluate(s => { window.__TOD.UI.speed = 0.02; window.__TOD.UI.sound = false; window.__TOD.startRun(s); }, seed);
      await p.waitForTimeout(550); for (let i = 0; i < 5; i++) await p.click('#draftCards .card.pickable');
      const r = await p.evaluate(() => {
        const bar = { height: 0 };
        const out = [];
        document.querySelectorAll('.map-node.avail').forEach(n => {
          n.scrollIntoView({ block: 'end' }); // like a browser/Playwright scrolling a room into view
          const r = n.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          const hit = document.elementFromPoint(cx, cy);
          out.push({ id: n.dataset.node, ok: hit === n || n.contains(hit), barTop: 0, nodeBottom: Math.round(r.bottom) });
        });
        return { out, barH: Math.round(bar.height) };
      });
      for (const o of r.out) { checks++; if (!o.ok) { fails++; console.log(`FAIL ${w}x${h} seed ${seed} node ${o.id}: nodeBottom ${o.nodeBottom} barTop ${o.barTop} (bar ${r.barH}px)`); } }
    }
    await p.close();
  }
  console.log(fails ? `${fails}/${checks} glowing rooms hidden` : `All ${checks} glowing rooms clickable at 10 screen sizes.`);
  await b.close(); process.exit(fails ? 1 : 0);
})();
