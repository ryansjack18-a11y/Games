/* ===================== CORE: GAME LOGIC (no DOM) ===================== */
const FLOORS = 10;          // floors 1..10 on every level, then that level's boss
const LEVEL_COUNT = LEVELS.length;
// Balance knobs, tuned with tests/sim.js. Index = level - 1 (the first level stays gentle).
const ENEMY_HP_SCALE = [1.15, 1.5, 1.85];
const BOSS_HP_SCALE = [1.05, 1.35, 1.55];
const MAP_COLS = 5;
const START_HP = 50;
const HAND_SIZE = 3;
const DRAFT_PICKS = 5;
const MIN_DECK = 3;
const REMOVE_COST = 50;
const INITIATIVE_ZONE_SCALE = 1.15; // target zone 15% wider than the original tuning
const DIFFICULTY = {
  easy:   { name: 'Easy',   hp: 60, zone: 1.4, speed: 0.8,  enemyBonus: 0 },
  normal: { name: 'Normal', hp: 50, zone: 1,   speed: 1,    enemyBonus: 0 },
  hard:   { name: 'Hard',   hp: 45, zone: 0.8, speed: 1.15, enemyBonus: 1 },
};

let uidCounter = 1;
function makeCard(id) {
  const d = CARD_BY_ID[id];
  return { uid: uidCounter++, id, s: d.s, c: d.c, w: d.w, up: 0 };
}
function has(state, tid) { return state.trinkets.includes(tid); }
function effStat(state, card, stat) {
  return Math.min(MAX_STAT, card[stat] + (state && has(state, 'hippo') ? 2 : 0));
}
function isMaxed(card) { return STATS.every(s => card[s] >= MAX_STAT); }
function upgradeCard(card, amt = 2) {
  for (const s of STATS) card[s] = Math.min(MAX_STAT, card[s] + amt);
  card.up++;
}
function addCard(state, id) { const c = makeCard(id); state.deck.push(c); return c; }
function removeCard(state, uid) { state.deck = state.deck.filter(c => c.uid !== uid); }
function heal(state, amt) { const before = state.hp; state.hp = Math.min(state.maxHp, state.hp + amt); return state.hp - before; }
function hurt(state, amt) { state.hp = Math.max(0, state.hp - amt); state.stats.dmgTaken += amt; }
function gainCoins(state, amt) { state.coins += amt; state.stats.coinsEarned += amt; }
function gainTrinket(state, id) {
  if (!id || has(state, id)) return;
  state.trinkets.push(id);
  if (id === 'heart') { state.maxHp += 15; state.hp += 15; }
}
function trinketsLeft(state) { return TRINKETS.filter(t => !has(state, t.id) && !(t.id === 'totem' && state.totemUsed)); }
function randomTrinket(state) { const left = trinketsLeft(state); return left.length ? pick(left).id : null; }

// ---- Card rolls ----
function cardsOfRarity(r) { return CARDS.filter(c => c.rarity === r); }
// `depth` counts floors across all levels (level 2 floor 1 = depth 11), so cards keep improving
function rarityWeights(context, depth) {
  const f = depth;
  switch (context) {
    case 'draft': return { common: 60, uncommon: 32, rare: 8 };
    case 'elite': return { uncommon: Math.max(0, 22 - f), rare: 46, epic: 24 + f * 0.6, legendary: 8 + f * 0.4 };
    case 'shop':  return { common: Math.max(0, 18 - f), uncommon: 34, rare: 31 + f, epic: 13 + f * 0.8, legendary: 4 + f * 0.4 };
    default:      return { common: Math.max(4, 50 - 6 * f), uncommon: 32, rare: 14 + 3 * f, epic: f >= 2 ? 2 + f : 0, legendary: f >= 5 ? f - 3 : 0 };
  }
}
function rollCardId(context, floor, exclude = []) {
  // Only roll rarities that still have an unseen card, so one choice never repeats a card
  const weights = rarityWeights(context, floor), usable = {};
  for (const r in weights) if (cardsOfRarity(r).some(c => exclude.indexOf(c.id) < 0)) usable[r] = weights[r];
  const pool = Object.keys(usable).length ? cardsOfRarity(weightedPick(usable)).filter(c => exclude.indexOf(c.id) < 0) : CARDS;
  return pick(pool).id;
}
function cardChoices(context, floor, n) {
  const ids = [];
  for (let i = 0; i < n; i++) ids.push(rollCardId(context, floor, ids));
  return ids;
}

// ---- Map generation (branching paths, no crossing edges) ----
function edgesCross(a, b, c, d) { return (a < c && b > d) || (a > c && b < d); }
function genMap() {
  const rows = [];
  for (let r = 0; r < FLOORS; r++) rows.push(new Array(MAP_COLS).fill(null));
  const edges = []; // {r, from, to}
  const ensure = (r, c) => {
    if (!rows[r][c]) rows[r][c] = { r, c, id: r + '-' + c, type: null, next: [], jx: (rand() - 0.5) * 0.5, jy: (rand() - 0.5) * 0.35 };
    return rows[r][c];
  };
  const firstCols = shuffle([0, 1, 2, 3, 4]);
  for (let p = 0; p < 6; p++) {
    let c = p < 3 ? firstCols[p] : randInt(0, MAP_COLS - 1);
    for (let r = 0; r < FLOORS; r++) {
      const node = ensure(r, c);
      if (r === FLOORS - 1) break;
      const opts = shuffle([c - 1, c, c + 1].filter(x => x >= 0 && x < MAP_COLS))
        .filter(nc => !edges.some(e => e.r === r && edgesCross(c, nc, e.from, e.to)));
      const nc = opts.length ? opts[0] : c; // straight up never crosses
      if (!node.next.includes(nc)) { node.next.push(nc); edges.push({ r, from: c, to: nc }); }
      c = nc;
    }
  }
  const boss = { r: FLOORS, c: 2, id: 'boss', type: 'boss', next: [], jx: 0, jy: 0 };
  rows.forEach(row => row.forEach(n => { if (n) n.next.sort((a, b) => a - b); }));
  rows[FLOORS - 1].forEach(n => { if (n) n.next = ['boss']; });
  const map = { rows, boss };
  assignTypes(map);
  return map;
}
const SPECIAL = ['elite', 'shop', 'rest'];
function typeWeights(r) {
  return { enemy: 46, mystery: 22, elite: r >= 3 ? 14 : 0, shop: r >= 2 ? 10 : 0, rest: r >= 4 && r <= 7 ? 10 : 0 };
}
function assignTypes(map) {
  const all = [];
  map.rows.forEach((row, r) => row.forEach(n => {
    if (!n) return;
    all.push(n);
    n.type = r === 0 ? 'enemy' : r === FLOORS - 1 ? 'rest' : weightedPick(typeWeights(r));
  }));
  // No two of the same special room back-to-back on a path
  for (const n of all) {
    if (n.r >= FLOORS - 1) continue;
    for (const nc of n.next) {
      const child = map.rows[n.r + 1][nc];
      if (child.r < FLOORS - 1 && SPECIAL.includes(child.type) && child.type === n.type) child.type = rand() < 0.6 ? 'enemy' : 'mystery';
    }
  }
  // Guarantee at least one shop and one elite somewhere in the middle floors
  const mid = all.filter(n => n.r >= 2 && n.r <= 7);
  if (!mid.some(n => n.type === 'shop')) {
    const cand = mid.filter(n => n.type === 'enemy' || n.type === 'mystery');
    pick(cand.length ? cand : mid).type = 'shop';
  }
  const late = all.filter(n => n.r >= 3 && n.r <= 8 && n.type !== 'shop');
  if (!late.some(n => n.type === 'elite') && late.length) pick(late).type = 'elite';
}
function getNode(map, r, c) { return r === FLOORS ? map.boss : map.rows[r][c]; }
function availableNodes(state) {
  const m = state.map;
  if (!state.pos) return m.rows[0].filter(Boolean);
  if (state.pos.r === FLOORS) return [];
  const cur = getNode(m, state.pos.r, state.pos.c);
  if (cur.r === FLOORS - 1) return [m.boss];
  return cur.next.map(nc => m.rows[cur.r + 1][nc]);
}

// ---- Enemies ----
function enemyKeyFor(kind, floor, level = 1) {
  if (kind === 'boss') return LEVELS[level - 1].boss;
  if (kind === 'elite') return pick(Object.keys(ENEMIES).filter(k => ENEMIES[k].kind === 'elite' && ENEMIES[k].lv.indexOf(level) >= 0));
  const tier = floor <= 3 ? 1 : floor <= 6 ? 2 : 3;
  return pick(Object.keys(ENEMIES).filter(k => ENEMIES[k].kind === 'normal' && ENEMIES[k].tier <= tier));
}
// Each level past the first gives enemies +1 to every stat and +9 HP (bosses have fixed HP)
function makeEnemy(key, floor, level = 1) {
  const d = ENEMIES[key], lv = level - 1;
  const hp = d.kind === 'boss' ? Math.round(d.hp * BOSS_HP_SCALE[lv]) : Math.round(d.hp * ENEMY_HP_SCALE[lv] * (1 + (floor - 1) * 0.03)) + 9 * lv;
  const bonus = d.kind === 'boss' ? lv : Math.floor((floor - 1) / 4) + lv;
  return { key, name: d.name, kind: d.kind, sprite: key, fav: d.fav, pool: d.pool, hp, maxHp: hp, bonus, floor, level, depth: lv * FLOORS + floor, enraged: false };
}
function enemyDrawCard(enemy) {
  const base = pick(cardsOfRarity(pick(enemy.pool)));
  const extra = enemy.bonus + (enemy.enraged ? 1 : 0);
  const card = { id: base.id, s: 0, c: 0, w: 0 };
  for (const s of STATS) card[s] = Math.min(MAX_STAT, base[s] + extra + (s === enemy.fav ? 1 : 0));
  return card;
}

// ---- Battle ----
function newBattle(state, kind, floor) {
  const enemy = makeEnemy(enemyKeyFor(kind, floor, state.level || 1), floor, state.level || 1);
  enemy.bonus += DIFFICULTY[state.difficulty || 'normal'].enemyBonus;
  return { enemy, round: 0, hand: [], enemyCard: null, over: false, winner: null };
}
function nextRound(state, battle) {
  battle.round++;
  battle.hand = shuffle(state.deck).slice(0, Math.min(HAND_SIZE, state.deck.length)).map(c => c.uid);
  battle.enemyCard = enemyDrawCard(battle.enemy);
}
function enemyChooseStat(battle) {
  const ec = battle.enemyCard;
  const best = Math.max(ec.s, ec.c, ec.w);
  const opts = STATS.filter(s => ec[s] === best);
  return opts.includes(battle.enemy.fav) ? battle.enemy.fav : pick(opts);
}
function initiativeParams(state, floor, isBoss) {
  let zone = (isBoss ? 0.16 : clamp(0.26 - (floor - 1) * 0.01, 0.16, 0.26)) * INITIATIVE_ZONE_SCALE;
  if (has(state, 'clover')) zone *= 1.5;
  let speed = isBoss ? 1.5 : 1.0 + (floor - 1) * 0.05; // bar widths per second
  speed *= 1 + 0.05 * ((state.level || 1) - 1);
  if (has(state, 'hourglass')) speed *= 0.65;
  const d = DIFFICULTY[state.difficulty || 'normal'];
  zone = Math.min(0.5, zone * d.zone); speed *= d.speed;
  return { zone, perfect: zone * 0.3, speed };
}
// Returns 'perfect' | 'hit' | 'miss' for a marker position (0..1) against a zone centred on `center`
function judgeInitiative(pos, center, params) {
  const d = Math.abs(pos - center);
  if (d <= params.perfect / 2) return 'perfect';
  if (d <= params.zone / 2) return 'hit';
  return 'miss';
}
function resolveRound(state, battle, uid, stat, opts) {
  const card = state.deck.find(c => c.uid === uid);
  const ec = battle.enemyCard;
  const pBase = effStat(state, card, stat);
  let pBonus = 0;
  if (opts.perfect) pBonus += 2;
  if (opts.initiative && has(state, 'crown')) pBonus += 2;
  const pVal = pBase + pBonus;
  const eVal = ec[stat];
  const res = { stat, pBase, pBonus, pVal, eVal, winner: 'tie', dmgToEnemy: 0, dmgToPlayer: 0, blocked: 0, thorns: 0, totem: false, enraged: false };
  const diff = pVal - eVal;
  if (diff > 0) {
    res.winner = 'player';
    res.dmgToEnemy = diff + (has(state, 'anchor') ? 2 : 0);
    state.stats.roundsWon++;
  } else if (diff < 0) {
    res.winner = 'enemy';
    res.blocked = has(state, 'shield') ? Math.min(2, -diff) : 0;
    res.dmgToPlayer = -diff - res.blocked;
    if (has(state, 'cactus')) res.thorns = 2;
    state.stats.roundsLost++;
  }
  const e = battle.enemy;
  e.hp = Math.max(0, e.hp - res.dmgToEnemy - res.thorns);
  state.stats.dmgDealt += res.dmgToEnemy + res.thorns;
  hurt(state, res.dmgToPlayer);
  if (state.hp <= 0 && has(state, 'totem')) {
    state.hp = 15; state.totemUsed = true; res.totem = true;
    state.trinkets = state.trinkets.filter(t => t !== 'totem');
  }
  if (e.kind === 'boss' && !e.enraged && e.hp > 0 && e.hp <= e.maxHp / 2) { e.enraged = true; res.enraged = true; }
  if (state.hp <= 0) { battle.over = true; battle.winner = 'enemy'; }
  else if (e.hp <= 0) { battle.over = true; battle.winner = 'player'; }
  return res;
}
function battleRewards(state, battle) {
  const e = battle.enemy, f = e.depth || e.floor;
  let coins = e.kind === 'boss' ? randInt(60, 80) + f * 2 : e.kind === 'elite' ? randInt(30, 45) + f * 3 : randInt(12, 20) + f * 2;
  if (has(state, 'piggy')) coins = Math.round(coins * 1.5);
  const n = has(state, 'hippo') ? 2 : 3;
  return {
    coins,
    choices: cardChoices(e.kind === 'normal' ? 'normal' : 'elite', f, n),
    trinket: e.kind === 'normal' ? null : randomTrinket(state),
    healed: has(state, 'herb') ? 4 : 0,
  };
}
function applyBattleWin(state, battle, rewards) {
  state.stats.kills++;
  if (battle.enemy.kind === 'elite') state.stats.elites++;
  if (battle.enemy.kind === 'boss') state.stats.bosses++;
  gainCoins(state, rewards.coins);
  if (rewards.trinket) gainTrinket(state, rewards.trinket);
  if (rewards.healed) rewards.healed = heal(state, rewards.healed);
}

// ---- Shop ----
function genShop(state, floor) {
  const disc = has(state, 'coupon') ? 0.8 : 1;
  const tr = shuffle(trinketsLeft(state)).slice(0, 2);
  return {
    cards: cardChoices('shop', floor, 4).map(id => ({ id, price: Math.round(RARITIES[CARD_BY_ID[id].rarity].price * disc * (0.9 + rand() * 0.2)), sold: false })),
    trinkets: tr.map(t => ({ id: t.id, price: Math.round(t.price * disc), sold: false })),
    potion: { price: Math.round(35 * disc), heal: 20, sold: false },
    removePrice: has(state, 'coupon') ? 0 : REMOVE_COST,
    removeUsed: false,
  };
}
function buyCard(state, shop, i) {
  const it = shop.cards[i];
  if (!it || it.sold || state.coins < it.price) return false;
  state.coins -= it.price; it.sold = true; addCard(state, it.id); return true;
}
function buyTrinket(state, shop, i) {
  const it = shop.trinkets[i];
  if (!it || it.sold || state.coins < it.price || has(state, it.id)) return false;
  state.coins -= it.price; it.sold = true; gainTrinket(state, it.id); return true;
}
function buyPotion(state, shop) {
  const p = shop.potion;
  if (p.sold || state.coins < p.price || state.hp >= state.maxHp) return false;
  state.coins -= p.price; p.sold = true; heal(state, p.heal); return true;
}
function shopRemove(state, shop, uid) {
  if (shop.removeUsed || state.coins < shop.removePrice || state.deck.length <= MIN_DECK) return false;
  if (!state.deck.some(c => c.uid === uid)) return false;
  state.coins -= shop.removePrice; shop.removeUsed = true; removeCard(state, uid); return true;
}

// ---- Rest stop ----
function restHealAmount(state) { return Math.round(state.maxHp * 0.3); }
function restHeal(state) { return heal(state, restHealAmount(state)); }
function restUpgrade(state, uid) {
  const c = state.deck.find(x => x.uid === uid);
  if (!c || isMaxed(c)) return false;
  upgradeCard(c, 2); return true;
}

// ---- Mystery events ----
function upgradeRandom(state, amt) {
  const pool = state.deck.filter(c => !isMaxed(c));
  if (!pool.length) return null;
  const c = pick(pool); upgradeCard(c, amt); return c;
}
const EVENTS = [
  { id: 'chest', title: 'Dusty Treasure Chest', icon: '🧰', text: 'A chest sits alone in the corridor. It could be full of coins... or teeth.',
    choices: [
      { label: 'Open it', run: s => {
        if (rand() < 0.7) { const g = randInt(40, 70); gainCoins(s, g); return { text: `It's packed with gold! +${g} coins.` }; }
        const d = Math.min(8, s.hp - 1); hurt(s, d); gainCoins(s, 20); return { text: `It was a Mimic! It bites you for ${d} damage before you pry 20 coins out of its teeth.` };
      } },
      { label: 'Leave it', run: () => ({ text: 'Better safe than sorry.' }) },
    ] },
  { id: 'fountain', title: 'Wishing Fountain', icon: '⛲', text: 'Glowing water bubbles up from an old stone fountain.',
    choices: [
      { label: 'Drink (+20 HP)', run: s => ({ text: `The water is warm and sweet. You heal ${heal(s, 20)} HP.` }) },
      { label: 'Toss in 25 coins (upgrade a random card)', req: s => s.coins >= 25, run: s => {
        s.coins -= 25; const c = upgradeRandom(s, 2);
        return { text: c ? `Your wish comes true! ${CARD_BY_ID[c.id].name} gets +2 to every stat.` : 'Nothing happens... your cards are already maxed out.' };
      } },
      { label: 'Leave', run: () => ({ text: 'You walk on.' }) },
    ] },
  { id: 'merchant', title: 'Shady Merchant', icon: '🕴️', text: '"Psst! I have a rare Blook for you. It only costs a little of your health..."',
    choices: [
      { label: 'Trade 12 HP for a Rare+ card', req: s => s.hp > 12, run: (s, ctx) => {
        hurt(s, 12); const c = addCard(s, rollCardId('elite', ctx.floor));
        return { text: `You feel weaker, but ${CARD_BY_ID[c.id].name} joins your deck!`, cardId: c.id };
      } },
      { label: 'No thanks', run: () => ({ text: 'The merchant shrugs and vanishes into the shadows.' }) },
    ] },
  { id: 'ambush', title: 'Ambush!', icon: '⚔️', text: 'An enemy leaps out of the shadows. There is no escape!',
    choices: [{ label: 'Fight!', run: () => ({ text: '', battle: 'normal' }) }] },
  { id: 'lost', title: 'Lost Blook', icon: '🥺', text: 'A lost little Blook is wandering the tower. It wants to join your team!',
    setup: ctx => ({ cardId: rollCardId('normal', ctx.floor + 1) }),
    choices: [
      { label: 'Welcome it!', run: (s, ctx) => { addCard(s, ctx.cardId); return { text: `${CARD_BY_ID[ctx.cardId].name} happily joins your deck.` }; } },
      { label: 'Send it home', run: () => ({ text: 'It waves goodbye and toddles off.' }) },
    ] },
  { id: 'goblin', title: 'Gambling Goblin', icon: '🎲', text: '"Double or nothing! Bet 30 coins on a coin flip?"',
    choices: [
      { label: 'Bet 30 coins', req: s => s.coins >= 30, run: s => {
        if (rand() < 0.5) { gainCoins(s, 30); return { text: 'Heads! You win 30 coins.' }; }
        s.coins -= 30; return { text: 'Tails... the goblin cackles and pockets your 30 coins.' };
      } },
      { label: 'Walk away', run: () => ({ text: '"Boring!" the goblin yells after you.' }) },
    ] },
  { id: 'shrine', title: 'Ancient Shrine', icon: '⛩️', text: 'An eerie shrine hums with power. It demands a sacrifice of life force.',
    choices: [
      { label: 'Offer 8 Max HP for a trinket', req: s => s.maxHp > 24 && trinketsLeft(s).length > 0, run: s => {
        s.maxHp -= 8; s.hp = Math.min(s.hp, s.maxHp); const t = randomTrinket(s); gainTrinket(s, t);
        return { text: `The shrine glows. You receive ${TRINKET_BY_ID[t].icon} ${TRINKET_BY_ID[t].name}!`, trinket: t };
      } },
      { label: 'Leave', run: () => ({ text: 'You back away slowly.' }) },
    ] },
  { id: 'dummy', title: 'Training Room', icon: '🥊', text: 'Training dummies line the walls. A hard workout could make one of your Blooks stronger.',
    choices: [
      { label: 'Train (-6 HP, upgrade a random card)', req: s => s.hp > 6, run: s => {
        hurt(s, 6); const c = upgradeRandom(s, 2);
        return { text: c ? `${CARD_BY_ID[c.id].name} trained hard and got +2 to every stat!` : 'Your cards are already maxed out.' };
      } },
      { label: 'Nap instead (+8 HP)', run: s => ({ text: `You take a quick nap and heal ${heal(s, 8)} HP.` }) },
    ] },
];
function rollEvent(state, floor) {
  let pool = EVENTS.filter(e => !state.seenEvents.includes(e.id));
  if (floor <= 2) pool = pool.filter(e => e.id !== 'ambush' && e.id !== 'shrine'); // `floor` is the overall depth
  if (!pool.length) { state.seenEvents = []; pool = EVENTS.filter(e => e.id !== 'ambush'); }
  const def = pick(pool);
  state.seenEvents.push(def.id);
  const ctx = { floor };
  if (def.setup) Object.assign(ctx, def.setup(ctx));
  return { def, ctx };
}

// ---- Run ----
function newRun(seed, difficulty = 'normal') {
  if (seed != null) setSeed(seed);
  uidCounter = 1;
  const hp = DIFFICULTY[difficulty].hp;
  return {
    seed: seed == null ? null : seed, difficulty,
    hp, maxHp: hp, coins: 0, deck: [], trinkets: [], totemUsed: false,
    level: 1, map: genMap(), pos: null,
    stats: { kills: 0, elites: 0, bosses: 0, dmgDealt: 0, dmgTaken: 0, roundsWon: 0, roundsLost: 0, coinsEarned: 0 },
    seenEvents: [],
  };
}
function floorOf(state) { return state.pos ? state.pos.r + 1 : 0; }
function depthOf(state) { return ((state.level || 1) - 1) * FLOORS + floorOf(state); }
function isFinalLevel(state) { return (state.level || 1) >= LEVEL_COUNT; }
// Climb to the next level: a fresh tower map; deck, trinkets, coins and HP carry over (as in Blooket, only rest stops heal)
function advanceLevel(state) {
  if (isFinalLevel(state)) return false;
  state.level++;
  state.map = genMap();
  state.pos = null;
  return true;
}

Object.assign(TOD, {
  setSeed, rand, randInt, pick, shuffle, weightedPick, clamp,
  STATS, STAT_INFO, MAX_STAT, RARITIES, CARDS, CARD_BY_ID, TRINKETS, TRINKET_BY_ID, ENEMIES, NODE_TYPES, EVENTS,
  FLOORS, LEVEL_COUNT, LEVELS, MAP_COLS, START_HP, DIFFICULTY, HAND_SIZE, DRAFT_PICKS, MIN_DECK, REMOVE_COST,
  makeCard, has, effStat, isMaxed, upgradeCard, addCard, removeCard, heal, hurt, gainCoins, gainTrinket, trinketsLeft, randomTrinket,
  rarityWeights, rollCardId, cardChoices, genMap, edgesCross, getNode, availableNodes,
  enemyKeyFor, makeEnemy, enemyDrawCard, newBattle, nextRound, enemyChooseStat, initiativeParams, judgeInitiative, resolveRound,
  battleRewards, applyBattleWin, genShop, buyCard, buyTrinket, buyPotion, shopRemove,
  restHealAmount, restHeal, restUpgrade, upgradeRandom, rollEvent, newRun, floorOf, depthOf, isFinalLevel, advanceLevel,
});
