/* ===================== CORE: RNG + DATA ===================== */
const TOD = {};

// ---- Seeded RNG (mulberry32) so runs can be replayed while debugging ----
let _rngState = (Date.now() ^ 0x9e3779b9) >>> 0;
function setSeed(n) { _rngState = (n >>> 0) || 1; }
function rand() {
  _rngState = (_rngState + 0x6d2b79f5) >>> 0;
  let t = _rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function randInt(lo, hi) { return lo + Math.floor(rand() * (hi - lo + 1)); }
function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function weightedPick(weights) { // {key: weight}
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [k, w] of entries) { r -= w; if (r < 0) return k; }
  return entries[entries.length - 1][0];
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const STATS = ['s', 'c', 'w'];
const STAT_INFO = {
  s: { name: 'Strength', short: 'STR', icon: '💪', sprite: 'hammer-2' },
  c: { name: 'Charisma', short: 'CHA', icon: '💬', sprite: 'star' },
  w: { name: 'Wisdom',   short: 'WIS', icon: '📘', sprite: 'book-2' },
};
const MAX_STAT = 20;

const RARITIES = {
  common:    { name: 'Common',    price: 30,  order: 0 },
  uncommon:  { name: 'Uncommon',  price: 50,  order: 1 },
  rare:      { name: 'Rare',      price: 80,  order: 2 },
  epic:      { name: 'Epic',      price: 120, order: 3 },
  legendary: { name: 'Legendary', price: 180, order: 4 },
};

// ---- Card catalogue. Each id is also the id of its artwork (sprites.css) ----
const CARDS = [
  // Common
  { id: 'knight',    name: 'Knight',    rarity: 'common',    s: 7,  c: 4,  w: 3 },
  { id: 'archer',    name: 'Archer',    rarity: 'common',    s: 4,  c: 3,  w: 7 },
  // Uncommon
  { id: 'rogue',     name: 'Rogue',     rarity: 'uncommon',  s: 6,  c: 10, w: 4 },
  { id: 'cleric',    name: 'Cleric',    rarity: 'uncommon',  s: 5,  c: 7,  w: 9 },
  // Rare
  { id: 'barbarian', name: 'Barbarian', rarity: 'rare',      s: 13, c: 5,  w: 6 },
  { id: 'wizard',    name: 'Wizard',    rarity: 'rare',      s: 4,  c: 8,  w: 13 },
  { id: 'druid',     name: 'Druid',     rarity: 'rare',      s: 8,  c: 9,  w: 9 },
  // Epic
  { id: 'icemage',   name: 'Ice Mage',  rarity: 'epic',      s: 6,  c: 10, w: 14 },
  { id: 'ninja',     name: 'Ninja',     rarity: 'epic',      s: 14, c: 11, w: 5 },
  // Legendary
  { id: 'engineer',  name: 'Engineer',  rarity: 'legendary', s: 16, c: 17, w: 18 },
];
const CARD_BY_ID = {};
CARDS.forEach(c => { CARD_BY_ID[c.id] = c; });

// ---- Trinkets (passive items) ----
const TRINKETS = [
  { id: 'shield',    name: 'Mighty Shield',    icon: '🛡️', sprite: 'shield', price: 120, desc: 'Take 2 less damage whenever you lose a round.' },
  { id: 'anchor',    name: "Captain's Anchor", icon: '⚓', sprite: 'sword', price: 120, desc: 'Deal +2 damage whenever you win a round.' },
  { id: 'totem',     name: 'Lifeline Totem',   icon: '🗿', sprite: 'ring-2', price: 110, desc: 'Once per run, survive a lethal hit with 15 HP.' },
  { id: 'coupon',    name: 'Coupon',           icon: '🎟️', sprite: 'key-2', price: 70,  desc: 'Removing cards at shops is free and all shop prices are 20% off.' },
  { id: 'hippo',     name: 'Pink Hippo',       icon: '🦛', sprite: 'armor-2', price: 150, desc: 'All your cards get +2 to every stat, but you only see 2 card choices after battles.' },
  { id: 'clover',    name: 'Four-Leaf Clover', icon: '🍀', sprite: 'gem-green-2', price: 90,  desc: 'The Initiative target zone is 50% wider.' },
  { id: 'hourglass', name: 'Sand Timer',       icon: '⏳', sprite: 'potion-blue-2', price: 90,  desc: 'The Initiative marker moves 35% slower.' },
  { id: 'piggy',     name: 'Piggy Bank',       icon: '🐷', sprite: 'gem', price: 80,  desc: 'Earn 50% more coins from battles.' },
  { id: 'herb',      name: 'Healing Herb',     icon: '🌿', sprite: 'potion-green-2', price: 100, desc: 'Heal 4 HP after every battle you win.' },
  { id: 'cactus',    name: 'Cactus Armor',     icon: '🌵', sprite: 'helmet-2', price: 100, desc: 'Whenever you lose a round, the enemy takes 2 damage.' },
  { id: 'crown',     name: 'Golden Crown',     icon: '👑', sprite: 'crown', price: 110, desc: 'Your chosen stat gets +2 when you win Initiative.' },
  { id: 'heart',     name: 'Giant Heart',      icon: '💗', sprite: 'heart', price: 100, desc: '+15 Max HP (and heal 15 now).' },
];
const TRINKET_BY_ID = {};
TRINKETS.forEach(t => { TRINKET_BY_ID[t.id] = t; });

// ---- Enemies. Each key is also the id of its artwork. pool = rarities their cards are drawn from; fav = stat they get +1 in.
// Normal enemies appear on every level (tougher each level); tier sets how deep in a level they start to appear.
// Strong enemies (elites) list the levels they live on (lv). ----
const ENEMIES = {
  slime:      { name: 'Slime',      kind: 'normal', tier: 1, hp: 10, fav: 'c', pool: ['common'] },
  skeleton:   { name: 'Skeleton',   kind: 'normal', tier: 1, hp: 11, fav: 's', pool: ['common'] },
  goblin:     { name: 'Goblin',     kind: 'normal', tier: 2, hp: 15, fav: 'c', pool: ['common', 'uncommon'] },
  ghost:      { name: 'Ghost',      kind: 'normal', tier: 2, hp: 14, fav: 'w', pool: ['common', 'uncommon'] },
  spider:     { name: 'Spider',     kind: 'normal', tier: 3, hp: 18, fav: 'c', pool: ['uncommon', 'rare'] },
  orc:        { name: 'Orc',        kind: 'elite',  lv: [1, 2],    hp: 26, fav: 's', pool: ['uncommon', 'rare'] },
  troll:      { name: 'Troll',      kind: 'elite',  lv: [1, 2],    hp: 30, fav: 's', pool: ['uncommon', 'rare'] },
  darkmage:   { name: 'Dark Mage',  kind: 'elite',  lv: [2, 3],    hp: 30, fav: 'w', pool: ['rare', 'epic'] },
  vampire:    { name: 'Vampire',    kind: 'elite',  lv: [2, 3],    hp: 32, fav: 'c', pool: ['rare', 'epic'] },
  dragonling: { name: 'Dragonling', kind: 'elite',  lv: [3],       hp: 34, fav: 's', pool: ['epic', 'legendary'] },
  boneking:   { name: 'The Bone King',  kind: 'boss', hp: 46,  fav: 'w', pool: ['uncommon', 'rare', 'epic'] },
  lavatitan:  { name: 'The Lava Titan', kind: 'boss', hp: 80,  fav: 's', pool: ['rare', 'epic'] },
  evilking:   { name: 'The Evil King',  kind: 'boss', hp: 115, fav: 's', pool: ['epic', 'legendary'] },
};

// ---- Tower levels: each is 10 floors plus its boss; your deck, trinkets, coins and HP carry over ----
const LEVELS = [
  { name: 'The Haunted Crypt',  boss: 'boneking',  theme: 'crypt',  sky: 'bg-storm',  tile: 'tile-cobble' },
  { name: 'The Molten Depths',  boss: 'lavatitan', theme: 'lava',   sky: 'bg-lava',   tile: 'tile-brick' },
  { name: 'The Dark Castle',    boss: 'evilking',  theme: 'castle', sky: 'bg-castle', tile: 'tile-stone' },
];

const NODE_TYPES = {
  enemy:   { name: 'Enemy',       icon: '🤖', sprite: 'sword', color: '#2f7cf6' },
  elite:   { name: 'Strong Enemy', icon: '⚠️', sprite: 'skull-2', color: '#e03131' },
  shop:    { name: 'Shop',        icon: '🏪', sprite: 'chest-2', color: '#f59f00' },
  rest:    { name: 'Rest Stop',   icon: '🔥', sprite: 'fire-2', color: '#20c997' },
  mystery: { name: 'Mystery',     icon: '❓', sprite: 'question-2', color: '#ae3ec9' },
  boss:    { name: 'Boss',        icon: '💀', color: '#c92a2a' },
};
