// Headless test + balance simulation of the core game logic.
// Usage: node sim.js [runs] [hitRate]
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const src = ['core-data.js', 'core-logic.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(src + '\nthis.TOD = TOD;', ctx);
const T = ctx.TOD;

const RUNS = +process.argv[2] || 2000;
const HIT = process.argv[3] != null ? +process.argv[3] : 0.65;
const DIFF = process.argv[4] || 'normal';
let failures = 0; const DIAG = {};
function assert(cond, msg) { if (!cond) { failures++; if (failures < 20) console.log('ASSERT FAIL:', msg); } }

// ---------- Map structure checks ----------
for (let i = 0; i < 3000; i++) {
  T.setSeed(i + 1);
  const m = T.genMap();
  // every edge valid, no crossings, every node reachable from row 0, every node leads to boss
  for (let r = 0; r < T.FLOORS; r++) {
    const row = m.rows[r];
    assert(row.some(Boolean), `map ${i}: empty row ${r}`);
    for (const n of row) {
      if (!n) continue;
      assert(n.type && T.NODE_TYPES[n.type], `map ${i}: node ${n.id} bad type ${n.type}`);
      assert(n.next.length > 0, `map ${i}: node ${n.id} dead end`);
      if (r < T.FLOORS - 1) for (const nc of n.next) {
        assert(m.rows[r + 1][nc], `map ${i}: edge to missing node ${r + 1}-${nc}`);
        assert(Math.abs(nc - n.c) <= 1, `map ${i}: long edge`);
      } else assert(n.next[0] === 'boss', `map ${i}: last row not to boss`);
    }
    if (r < T.FLOORS - 1) {
      const es = [];
      row.forEach(n => n && n.next.forEach(nc => es.push([n.c, nc])));
      for (const a of es) for (const b of es) assert(!T.edgesCross(a[0], a[1], b[0], b[1]), `map ${i}: crossing at row ${r}`);
    }
  }
  const reach = new Set(m.rows[0].filter(Boolean).map(n => n.id));
  for (let r = 0; r < T.FLOORS - 1; r++) m.rows[r].forEach(n => { if (n && reach.has(n.id)) n.next.forEach(nc => reach.add((r + 1) + '-' + nc)); });
  m.rows.forEach(row => row.forEach(n => n && assert(reach.has(n.id), `map ${i}: unreachable ${n.id}`)));
  assert(m.rows[0].every(n => !n || n.type === 'enemy'), `map ${i}: floor 1 not all enemies`);
  assert(m.rows[T.FLOORS - 1].every(n => !n || n.type === 'rest'), `map ${i}: floor 10 not all rest`);
  assert(m.rows.flat().some(n => n && n.type === 'shop'), `map ${i}: no shop`);
}

// ---------- Bot ----------
const total = (st, c) => T.STATS.reduce((s, k) => s + T.effStat(st, c, k), 0);
const best = (st, c) => Math.max(...T.STATS.map(k => T.effStat(st, c, k)));
const avgTotal = st => st.deck.reduce((s, c) => s + total(st, c), 0) / st.deck.length;

function playBattle(st, kind, floor, rec) {
  const b = T.newBattle(st, kind, floor);
  let rounds = 0;
  while (!b.over) {
    T.nextRound(st, b);
    rounds++;
    assert(b.hand.length === Math.min(3, st.deck.length), 'hand size');
    assert(new Set(b.hand).size === b.hand.length, 'hand dupes');
    const cards = b.hand.map(u => st.deck.find(c => c.uid === u));
    cards.sort((x, y) => best(st, y) - best(st, x) || total(st, y) - total(st, x));
    const card = cards[0];
    const hit = T.rand() < HIT;
    const perfect = hit && T.rand() < 0.25;
    let stat;
    if (hit) stat = T.STATS.reduce((a, k) => (T.effStat(st, card, k) - b.enemyCard[k] > T.effStat(st, card, a) - b.enemyCard[a] ? k : a), 's');
    else stat = T.enemyChooseStat(b);
    const hpBefore = st.hp, ehpBefore = b.enemy.hp;
    const res = T.resolveRound(st, b, card.uid, stat, { initiative: hit, perfect });
    const key = (hit ? 'hit_' : 'miss_') + res.winner; DIAG[key] = (DIAG[key] || 0) + 1; DIAG.dE = (DIAG.dE||0) + res.dmgToEnemy; DIAG.dP = (DIAG.dP||0) + res.dmgToPlayer;
    if (!res.totem) assert(st.hp === Math.max(0, hpBefore - res.dmgToPlayer), 'player hp math');
    assert(b.enemy.hp === Math.max(0, ehpBefore - res.dmgToEnemy - res.thorns), 'enemy hp math');
    assert(res.winner !== 'player' || res.dmgToEnemy > 0, 'win with no dmg');
    if (rounds > 300) { assert(false, 'battle too long'); break; }
  }
  rec.rounds.push(rounds);
  if (kind === 'boss') rec.bossRounds.push(rounds);
  return b;
}

function simRun(seed) {
  const st = T.newRun(seed, DIFF);
  for (let i = 0; i < T.DRAFT_PICKS; i++) {
    const ch = T.cardChoices('draft', 1, 3);
    assert(new Set(ch).size === 3, 'draft dupes');
    ch.sort((a, b) => { const A = T.CARD_BY_ID[a], B = T.CARD_BY_ID[b]; return (B.s + B.c + B.w) - (A.s + A.c + A.w); });
    T.addCard(st, ch[0]);
  }
  const rec = { rounds: [], bossRounds: [], died: null, bossHp: {}, levelsCleared: 0 };
  while (true) {
    const opts = T.availableNodes(st);
    if (!opts.length) break;
    let node;
    const low = st.hp < st.maxHp * 0.45;
    const pref = low ? ['rest', 'shop', 'mystery', 'enemy', 'elite'] : ['elite', 'enemy', 'mystery', 'shop', 'rest'];
    node = opts.slice().sort((a, b) => pref.indexOf(a.type) - pref.indexOf(b.type))[0];
    if (T.rand() < 0.3) node = T.pick(opts);
    st.pos = { r: node.r, c: node.c };
    const floor = T.floorOf(st);
    let type = node.type;
    if (type === 'mystery') {
      const ev = T.rollEvent(st, T.depthOf(st));
      const allowed = ev.def.choices.filter(c => !c.req || c.req(st));
      const out = T.pick(allowed).run(st, ev.ctx);
      if (st.hp <= 0) { rec.died = `L${st.level}F${floor}`; break; }
      if (out.battle) type = 'enemy'; else continue;
    }
    if (type === 'enemy' || type === 'elite' || type === 'boss') {
      if (type === 'boss') (rec.bossHp[st.level] = rec.bossHp[st.level] || []).push(st.hp);
      const b = playBattle(st, type === 'enemy' ? 'normal' : type, floor, rec);
      if (b.winner !== 'player') { rec.died = type === 'boss' ? `L${st.level}Boss` : `L${st.level}F${floor}`; break; }
      if (type === 'boss' && T.isFinalLevel(st)) { rec.won = true; break; }
      const rw = T.battleRewards(st, b);
      T.applyBattleWin(st, b, rw);
      const cand = rw.choices.map(id => T.CARD_BY_ID[id]).sort((a, b) => (b.s + b.c + b.w) - (a.s + a.c + a.w))[0];
      if (cand.s + cand.c + cand.w > avgTotal(st) - 1) T.addCard(st, cand.id);
      if (type === 'boss') { rec.levelsCleared = st.level; assert(T.advanceLevel(st), 'advance level'); assert(st.pos === null && st.map.rows[0].some(Boolean), 'new level map'); }
    } else if (type === 'shop') {
      const shop = T.genShop(st, T.depthOf(st));
      if (st.hp < st.maxHp * 0.6) T.buyPotion(st, shop);
      if (st.deck.length > 5) {
        const weakest = st.deck.slice().sort((a, b) => total(st, a) - total(st, b))[0];
        T.shopRemove(st, shop, weakest.uid);
      }
      shop.trinkets.forEach((t, i) => T.buyTrinket(st, shop, i));
      shop.cards.forEach((c, i) => { const d = T.CARD_BY_ID[c.id]; if (d.s + d.c + d.w > avgTotal(st) + 3) T.buyCard(st, shop, i); });
      assert(st.coins >= 0, 'negative coins');
    } else if (type === 'rest') {
      if (st.hp < st.maxHp * 0.6) T.restHeal(st);
      else { const c = st.deck.filter(x => !T.isMaxed(x)).sort((a, b) => best(st, b) - best(st, a))[0]; if (c) T.restUpgrade(st, c.uid); }
    }
    assert(st.hp <= st.maxHp, 'hp over max');
    st.deck.forEach(c => T.STATS.forEach(k => assert(c[k] <= T.MAX_STAT, 'stat over 20')));
  }
  return { st, rec };
}

let wins = 0; const deaths = {}; const allRounds = []; const bossRounds = []; const bossHp = {}; const cleared = [0, 0, 0, 0];
for (let i = 0; i < RUNS; i++) {
  const { rec } = simRun(1000 + i);
  if (rec.won) wins++; else deaths[rec.died] = (deaths[rec.died] || 0) + 1;
  allRounds.push(...rec.rounds); bossRounds.push(...rec.bossRounds);
  for (const L in rec.bossHp) (bossHp[L] = bossHp[L] || []).push(...rec.bossHp[L]);
  cleared[rec.won ? 3 : rec.levelsCleared]++;
}
const avg = a => a.length ? (a.reduce((s, x) => s + x, 0) / a.length).toFixed(1) : '-';
console.log(`Runs: ${RUNS}  initiative hit rate: ${HIT}  difficulty: ${DIFF}`);
console.log(`Win rate: ${(100 * wins / RUNS).toFixed(1)}%`);
const byLevel = {}; for (const k in deaths) { const L = k.slice(0, 2); byLevel[L] = (byLevel[L] || 0) + deaths[k]; }
console.log('Deaths by level:', JSON.stringify(byLevel), ' boss deaths:', JSON.stringify(Object.fromEntries(Object.entries(deaths).filter(([k]) => k.includes('Boss')))));
console.log('Levels cleared (0/1/2/3):', cleared.map(c => (100 * c / RUNS).toFixed(1) + '%').join(' / '));
console.log(`Avg rounds/battle: ${avg(allRounds)}  avg boss rounds: ${avg(bossRounds)}  HP entering bosses L1/L2/L3: ${[1, 2, 3].map(L => avg(bossHp[L] || [])).join(' / ')}`);
console.log('diag', JSON.stringify(DIAG));
console.log(failures ? `FAILURES: ${failures}` : 'All assertions passed.');
process.exit(failures ? 1 : 0);
