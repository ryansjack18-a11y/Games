// End-to-end test: plays full runs in headless Chromium by clicking the real UI.
// Usage: node e2e.js <html> [runsDesktop] [runsPhone]
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node22/lib/node_modules/playwright'); } })();
const path = require('path');
const fs = require('fs');
const FILE = (process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, '..', '..', 'tower-of-doom.html'));
const RUNS_D = +(process.argv[3] || 6), RUNS_P = +(process.argv[4] || 3);
const SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });

const problems = [];
const bad = (msg) => { problems.push(msg); console.log('  !! ' + msg); };

async function checkInvariants(page, tag) {
  const r = await page.evaluate(() => {
    const T = window.__TOD, S = T.state, out = [];
    const ow = document.documentElement.scrollWidth - window.innerWidth;
    if (ow > 1) out.push(`horizontal overflow ${ow}px on ${T.UI.screen}`);
    if (!S) return out;
    if (S.hp < 0 || S.hp > S.maxHp) out.push(`hp out of range ${S.hp}/${S.maxHp}`);
    if (S.coins < 0) out.push(`negative coins ${S.coins}`);
    if (S.deck.length < 3 && T.UI.screen !== 'draft') out.push(`deck too small ${S.deck.length}`);
    const hud = document.getElementById('hudHp');
    if (hud && document.getElementById('hud').classList.contains('show') && hud.textContent !== `${S.hp}/${S.maxHp}`) out.push(`HUD hp mismatch ${hud.textContent} vs ${S.hp}/${S.maxHp}`);
    const coins = document.getElementById('hudCoins');
    if (coins && document.getElementById('hud').classList.contains('show') && coins.textContent !== String(S.coins)) out.push(`HUD coins mismatch ${coins.textContent} vs ${S.coins}`);
    for (const c of S.deck) for (const k of ['s', 'c', 'w']) if (c[k] > 20 || c[k] < 0) out.push(`bad stat ${c.id}.${k}=${c[k]}`);
    const B = T.battle;
    if (B && T.UI.screen === 'battle') {
      if (B.enemy.hp < 0) out.push('enemy hp < 0');
      const bar = document.querySelector('#eHp span');
      if (bar && B.phase === 'pick' && bar.textContent !== `${B.enemy.hp} / ${B.enemy.maxHp}`) out.push(`enemy bar mismatch ${bar.textContent} vs ${B.enemy.hp}`);
    }
    return out;
  });
  r.forEach(m => bad(`[${tag}] ${m}`));
}

async function playRun(page, opts) {
  const seen = new Set();
  const counts = { battles: 0, rounds: 0, shops: 0, rests: 0, events: 0, rewards: 0, keyboard: 0 };
  let guard = 0, lastScreen = '', result = null;
  while (guard++ < 15000) {
    const st = await page.evaluate(() => ({ screen: window.__TOD.UI.screen, phase: window.__TOD.battle && window.__TOD.battle.phase, modal: window.__TOD.UI.modalOpen }));
    if (st.screen !== lastScreen) {
      lastScreen = st.screen;
      const key = `${opts.tag}-${st.screen}`;
      if (!seen.has(key) && opts.shots) { seen.add(key); await page.waitForTimeout(150); await page.screenshot({ path: path.join(SHOTS, key + '.png'), fullPage: st.screen !== 'map' }); }
      await checkInvariants(page, opts.tag + ':' + st.screen);
    }
    if (st.modal) { // a deck picker is open (remove/upgrade) — pick a card or cancel
      const pickable = await page.$$('#modal .card.pickable');
      if (pickable.length) await pickable[Math.floor(Math.random() * pickable.length)].click();
      else await page.click('#modal [data-close]');
      continue;
    }
    switch (st.screen) {
      case 'title':
        if (result) return { result, counts };
        await page.click(`[data-diff="${opts.diff}"]`);
        await page.click('#playBtn');
        break;
      case 'draft': {
        const cards = await page.$$('#draftCards .card.pickable');
        if (opts.keys) { await page.keyboard.press(String(1 + Math.floor(Math.random() * 3))); counts.keyboard++; }
        else await cards[Math.floor(Math.random() * cards.length)].click();
        if (opts.trinkets) {
          const done = await page.evaluate(() => window.__TOD.UI.screen === 'map');
          if (done) await page.evaluate(list => { const T = window.__TOD; list.forEach(t => T.core.gainTrinket(T.state, t)); }, opts.trinkets);
        }
        break;
      }
      case 'map': {
        const nodes = await page.$$('.map-node.avail');
        if (!nodes.length) { bad('map: no glowing rooms to enter'); return { result: 'stuck', counts }; }
        await nodes[Math.floor(Math.random() * nodes.length)].click();
        break;
      }
      case 'level': {
        counts.levels = (counts.levels || 0) + 1; counts.rounds = 0;
        await page.click('#levelGo');
        break;
      }
      case 'battle':
        if (st.phase === 'pick') {
          counts.rounds++;
          if (counts.rounds === 1) counts.battles++;
          if (opts.keys) { await page.keyboard.press(String(1 + Math.floor(Math.random() * 3))); counts.keyboard++; }
          else { const h = await page.$$('#hand .card.pickable'); await h[Math.floor(Math.random() * h.length)].click(); }
        } else if (st.phase === 'timing') {
          if (opts.skill > Math.random()) {
            // wait until the marker is inside the zone, then stop (in-page so it's frame-accurate)
            await page.evaluate(() => new Promise(res => {
              const B = window.__TOD.battle;
              const loop = () => {
                const t = B.timing; if (B.phase !== 'timing') return res();
                const x = (t.phase0 + (performance.now() - t.start) / 1000 * t.p.speed) % 2, pos = x > 1 ? 2 - x : x;
                if (Math.abs(pos - t.center) < t.p.zone * 0.3) { document.getElementById('stopBtn').click(); return res(); }
                requestAnimationFrame(loop);
              };
              loop();
            }));
          } else {
            await page.waitForTimeout(Math.random() * 400);
            if (opts.keys) { await page.keyboard.press('Space'); counts.keyboard++; } else await page.click('#timing', { force: true });
          }
        } else if (st.phase === 'stat') {
          // choose the stat with the best margin
          const best = await page.evaluate(() => {
            const T = window.__TOD, B = T.battle, S = T.state, c = S.deck.find(x => x.uid === B.chosen);
            return ['s', 'c', 'w'].reduce((a, k) => (T.core.effStat(S, c, k) - B.enemyCard[k] > T.core.effStat(S, c, a) - B.enemyCard[a] ? k : a), 's');
          });
          if (opts.keys) { await page.keyboard.press(String(1 + ['s', 'c', 'w'].indexOf(best))); counts.keyboard++; }
          else await page.click(`[data-stat="${best}"]`);
        } else await page.waitForTimeout(25);
        break;
      case 'reward': {
        counts.rewards++; counts.rounds = 0;
        const cards = await page.$$('#rewardCards .card.pickable');
        if (Math.random() < 0.8 && cards.length) await cards[Math.floor(Math.random() * cards.length)].click();
        else await page.click('#skipReward');
        break;
      }
      case 'shop': {
        counts.shops++; counts.rounds = 0;
        for (const sel of ['#buyPotion', '[data-buy-trinket]:not([disabled])', '.card.pickable[data-buy-card]']) {
          const el = await page.$(sel);
          if (el && !(await el.isDisabled().catch(() => false)) && Math.random() < 0.7) await el.click();
        }
        const rm = await page.$('#removeBtn:not([disabled])');
        if (rm && Math.random() < 0.5) { await rm.click(); break; } // modal handled at loop top, then we return here
        await page.click('#leaveShop');
        break;
      }
      case 'rest': {
        counts.rounds = 0;
        if (await page.$('#restContinue')) { counts.rests++; await page.click('#restContinue'); break; }
        const heal = await page.$('#restHeal:not([disabled])');
        if (heal && Math.random() < 0.5) await heal.click();
        else if (await page.$('#restTrain:not([disabled])')) await page.click('#restTrain');
        else await page.click('#restSkip');
        break;
      }
      case 'event': {
        counts.rounds = 0;
        if (await page.$('#eventContinue')) { counts.events++; await page.click('#eventContinue'); break; }
        const ch = await page.$$('[data-choice]:not([disabled])');
        await ch[Math.floor(Math.random() * ch.length)].click();
        break;
      }
      case 'end': {
        result = await page.evaluate(() => ({ won: window.__TOD.UI.lastRun.won, level: window.__TOD.UI.lastRun.level, floor: window.__TOD.UI.lastRun.floor, kills: window.__TOD.state.stats.kills, bosses: window.__TOD.state.stats.bosses }));
        await page.click('#titleBtn');
        break;
      }
      default: await page.waitForTimeout(20);
    }
  }
  bad(`[${opts.tag}] run did not finish (guard), last screen ${lastScreen}`);
  return { result: 'timeout', counts };
}

(async () => {
  const browser = await chromium.launch();
  const configs = [
    { name: 'desktop', viewport: { width: 1180, height: 900 }, runs: RUNS_D },
    { name: 'phone', viewport: { width: 375, height: 812 }, runs: RUNS_P, isMobile: true, hasTouch: true },
  ];
  const summary = [];
  for (const cfg of configs) {
    const ctx = await browser.newContext({ viewport: cfg.viewport, isMobile: !!cfg.isMobile, hasTouch: !!cfg.hasTouch });
    const page = await ctx.newPage();
    page.on('pageerror', e => bad(`[${cfg.name}] pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text()) && !/ERR_(NAME|CONNECTION|TUNNEL|PROXY)|net::/.test(m.text())) bad(`[${cfg.name}] console.error: ${m.text()}`); });
    await page.goto('file://' + FILE);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SHOTS, `${cfg.name}-title-initial.png`) });
    // how-to modal
    await page.click('#howBtn'); await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(SHOTS, `${cfg.name}-howto.png`) });
    await page.keyboard.press('Escape');
    await page.evaluate(() => { window.__TOD.UI.speed = 0.03; window.__TOD.UI.sound = false; });
    for (let i = 0; i < cfg.runs; i++) {
      const diff = ['easy', 'normal', 'hard'][i % 3];
      const opts = { tag: `${cfg.name}${i}`, diff, shots: i === 0, keys: i % 4 === 1, skill: i % 2 === 0 ? 0.95 : 0.5,
        trinkets: i === 2 ? ['shield', 'anchor', 'totem', 'cactus', 'crown', 'hippo', 'clover', 'herb', 'piggy', 'coupon'] : null };
      const t0 = Date.now();
      const out = await playRun(page, opts);
      const line = `${cfg.name} run ${i} (${diff}, skill ${opts.skill}${opts.keys ? ', keyboard' : ''}${opts.trinkets ? ', all trinkets' : ''}): ${JSON.stringify(out.result)} counts=${JSON.stringify(out.counts)} ${((Date.now() - t0) / 1000).toFixed(1)}s`;
      console.log(line); summary.push(line);
    }
    await ctx.close();
  }
  await browser.close();
  console.log('\n' + (problems.length ? `PROBLEMS (${problems.length}):\n` + [...new Set(problems)].slice(0, 40).join('\n') : 'E2E: no problems found.'));
  process.exit(problems.length ? 1 : 0);
})();
