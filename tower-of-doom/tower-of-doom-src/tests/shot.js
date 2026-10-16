const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); } })();
(async () => {
  const [,, file, out, width='1000', height='900'] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: +width, height: +height } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + require('path').resolve(file));
  await p.waitForTimeout(400);
  await p.screenshot({ path: out, fullPage: true });
  console.log(errs.length ? 'ERRORS: ' + errs.join(' | ') : 'no console errors');
  await b.close();
})();
