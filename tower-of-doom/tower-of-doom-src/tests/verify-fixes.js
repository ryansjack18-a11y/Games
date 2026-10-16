// Regression checks for every defect the diagnosis agents reported.
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); } })();
const fs = require('fs'), path = require('path');
const FILE = (process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, '..', '..', 'tower-of-doom.html'));
const URL = 'file://' + FILE;
const results = [];
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`); };
(async () => {
  const html = fs.readFileSync(FILE, 'utf8');
  const css = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
  check('no CSS `inset:` property (Safari < 14.1)', !/(^|[;{\s])inset\s*:/m.test(css));
  check('no Object.fromEntries (Safari < 12.1)', !html.includes('Object.fromEntries'));
  const b = await chromium.launch();
  const newPage = async (opts = {}, init) => {
    const ctx = await b.newContext({ viewport: { width: 375, height: 760 }, ...opts });
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    if (init) await p.addInitScript(init);
    return p;
  };
  // Object.fromEntries missing -> game still starts
  let p = await newPage({}, () => { delete Object.fromEntries; });
  await p.goto(URL); await p.click('#playBtn');
  check('starts without Object.fromEntries', await p.isVisible('#draft'), p.errs.join('|'));
  // title row fits narrow phones
  for (const w of [320, 375, 414]) {
    p = await newPage({ viewport: { width: w, height: 700 }, isMobile: true, hasTouch: true });
    await p.goto(URL); await p.waitForTimeout(150);
    const m = await p.evaluate(() => { const r = document.getElementById('titleBlobs'); const rr = r.getBoundingClientRect(); return { sw: r.scrollWidth, cw: r.clientWidth, right: Math.round(rr.right), vw: innerWidth, docW: document.documentElement.scrollWidth, kids: [...r.children].map(k => Math.round(k.getBoundingClientRect().right)) }; });
    check(`title row fits at ${w}px`, m.sw <= m.cw + 1 && Math.max(...m.kids) <= m.vw && m.docW <= m.vw, JSON.stringify(m));
  }
  // toast never intercepts taps
  p = await newPage();
  await p.goto(URL);
  await p.evaluate(() => { const t = document.getElementById('toast'); t.textContent = 'A very long message that wraps onto several lines on a narrow phone screen so it is tall'; t.classList.add('show'); });
  await p.waitForTimeout(450);
  const tb = await p.$eval('#toast', el => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const hit = await p.evaluate(({ x, y }) => { const e = document.elementFromPoint(x, y); return e ? (e.id || e.tagName) : 'null'; }, tb);
  check('visible toast does not block taps', hit !== 'toast', 'elementFromPoint=' + hit);
  await p.evaluate(() => document.getElementById('toast').classList.remove('show')); await p.waitForTimeout(400);
  const off = await p.$eval('#toast', el => el.getBoundingClientRect().top >= innerHeight);
  check('hidden toast is fully off screen', off);
  // clicks on the top edge of a button are not lost
  p = await newPage({ viewport: { width: 900, height: 800 } });
  await p.goto(URL); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  const bb = await p.$eval('#playBtn', el => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y }; });
  let okEdge = true;
  for (const dy of [0.5, 1, 2, 3]) {
    await p.evaluate(() => window.__TOD.quitRun());
    await p.mouse.move(bb.x, bb.y + dy); await p.mouse.down(); await p.waitForTimeout(60); await p.mouse.up(); await p.waitForTimeout(80);
    if (!(await p.isVisible('#draft'))) { okEdge = false; console.log('   lost click at dy=' + dy); }
  }
  check('mouse click on top edge of Play starts game', okEdge);
  // tapping outside an open window closes it instead of trapping the game
  p = await newPage({ isMobile: true, hasTouch: true });
  await p.goto(URL); await p.tap('#howBtn');
  await p.evaluate(() => document.body.click());
  check('tap outside window closes it', !(await p.evaluate(() => window.__TOD.UI.modalOpen)));
  await p.tap('#playBtn');
  check('Play works after closing window', await p.isVisible('#draft'));
  // screen change closes an open window
  await p.evaluate(() => { window.__TOD.UI.speed = 0.05; });
  await p.waitForTimeout(550); for (let i = 0; i < 5; i++) await p.tap('#draftCards .card.pickable');
  await p.tap('#hudDeck');
  await p.evaluate(() => window.__TOD.quitRun());
  check('changing screen closes the window', !(await p.evaluate(() => window.__TOD.UI.modalOpen)) && !(await p.isVisible('#modalBg')));
  // keyboard focus kept on chosen difficulty
  p = await newPage({ viewport: { width: 900, height: 800 } });
  await p.goto(URL); await p.focus('[data-diff="hard"]'); await p.keyboard.press('Enter');
  check('focus stays on chosen difficulty', await p.evaluate(() => document.activeElement && document.activeElement.dataset.diff === 'hard'));
  // focus returns to opener after closing a window
  await p.focus('#howBtn'); await p.keyboard.press('Enter'); await p.keyboard.press('Escape');
  check('focus returns to How to Play after Esc', await p.evaluate(() => document.activeElement && document.activeElement.id === 'howBtn'));
  // stalled font server does not blank the page
  p = await newPage();
  await p.route('**/fonts.googleapis.com/**', () => { /* never answer */ });
  const t0 = Date.now();
  await p.goto(URL, { waitUntil: 'commit' });
  await p.waitForSelector('#playBtn', { state: 'visible', timeout: 3000 }).catch(() => {});
  const vis = await p.isVisible('#playBtn');
  check('page renders while fonts stall', vis, `${Date.now() - t0}ms`);
  // landscape phone: Play on screen
  for (const [w, h] of [[568, 320], [667, 375], [844, 390]]) {
    p = await newPage({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
    await p.goto(URL); await p.waitForTimeout(100);
    const bot = await p.$eval('#playBtn', el => el.getBoundingClientRect().bottom);
    check(`Play visible in landscape ${w}x${h}`, bot <= h, `bottom=${Math.round(bot)}`);
  }
  // no-JS preview explains itself
  p = await newPage({ javaScriptEnabled: false });
  await p.goto(URL);
  check('no-JS: notice shown, dead buttons hidden', (await p.isVisible('.nojs-msg')) && !(await p.isVisible('#playBtn')) && !(await p.isVisible('#howBtn')));
  // normal JS: no notice
  p = await newPage();
  await p.goto(URL); await p.waitForTimeout(150);
  check('JS on: no notice, no error banner', !(await p.isVisible('.nojs-msg')) && !(await p.isVisible('#bootError')), p.errs.join('|'));
  await b.close();
  const fails = results.filter(r => !r).length;
  console.log(fails ? `\n${fails} FAILED` : `\nAll ${results.length} checks passed.`);
  process.exit(fails ? 1 : 0);
})();
