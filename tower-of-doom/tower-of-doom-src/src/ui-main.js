/* ===================== UI: HELPERS, HUD, TITLE, DRAFT, MAP, MODALS ===================== */
const $ = sel => document.querySelector(sel);
const UI = { difficulty: 'normal', sound: true, speed: 1, draftLeft: 0, modalOpen: false, resizeT: 0 };
let S = null;  // current run state
let B = null;  // current battle
const sleep = ms => new Promise(res => setTimeout(res, ms * UI.speed));
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

// ---- Storage (best record) ----
function loadBest() { try { return JSON.parse(localStorage.getItem('tod-best') || 'null') || { floor: 0, wins: 0 }; } catch (e) { return { floor: 0, wins: 0 }; } }
function saveBest(b) { try { localStorage.setItem('tod-best', JSON.stringify(b)); } catch (e) { /* storage unavailable */ } }

// ---- Sound (tiny WebAudio synth) ----
let audioCtx = null;
function sfx(name) {
  if (!UI.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const T = {
      click: [[520, 0.05, 'square', 0.05]], flip: [[300, 0.06, 'triangle', 0.08], [600, 0.06, 'triangle', 0.08]],
      hit: [[220, 0.08, 'square', 0.12], [120, 0.12, 'sawtooth', 0.1]], hurt: [[160, 0.1, 'sawtooth', 0.12], [90, 0.18, 'sawtooth', 0.12]],
      coin: [[880, 0.06, 'square', 0.06], [1320, 0.1, 'square', 0.06]], perfect: [[660, 0.07, 'triangle', 0.1], [880, 0.07, 'triangle', 0.1], [1320, 0.12, 'triangle', 0.1]],
      good: [[520, 0.07, 'triangle', 0.1], [780, 0.1, 'triangle', 0.1]], miss: [[300, 0.1, 'square', 0.08], [200, 0.16, 'square', 0.08]],
      win: [[523, 0.12, 'triangle', 0.12], [659, 0.12, 'triangle', 0.12], [784, 0.12, 'triangle', 0.12], [1047, 0.3, 'triangle', 0.12]],
      lose: [[392, 0.2, 'sawtooth', 0.1], [330, 0.2, 'sawtooth', 0.1], [262, 0.4, 'sawtooth', 0.1]],
      heal: [[600, 0.08, 'sine', 0.12], [900, 0.16, 'sine', 0.12]],
    }[name];
    if (!T) return;
    let t = audioCtx.currentTime;
    for (const [f, d, type, vol] of T) {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g).connect(audioCtx.destination); o.start(t); o.stop(t + d + 0.02);
      t += d * 0.9;
    }
  } catch (e) { /* audio unavailable */ }
}

// ---- Toast ----
function toast(text) {
  const el = $('#toast');
  el.textContent = text; el.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2200 * Math.max(UI.speed, 0.3));
}

// ---- Screens ----
const HUD_SCREENS = ['map', 'battle', 'reward', 'shop', 'rest', 'event'];
function show(id) {
  if (UI.modalOpen) closeModal();
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  UI.screen = id;
  UI.shownAt = performance.now();
  document.body.classList.toggle('on-map', id === 'map');
  document.documentElement.classList.toggle('on-map', id === 'map');
  $('#hud').classList.toggle('show', HUD_SCREENS.includes(id));
  if (HUD_SCREENS.includes(id)) renderHUD();
  window.scrollTo(0, 0);
  // In a very tall embed the page around the game may be scrolled away from the new screen
  if (id !== 'map' && window.innerHeight > 1200) { const app = document.getElementById('app'); if (app && app.scrollIntoView) app.scrollIntoView({ block: 'start' }); }
}

// ---- Cards ----
function cardData(card) { return CARD_BY_ID[card.id || card]; }
// card: deck instance {uid,id,s,c,w,up}, enemy card {id,s,c,w} or a catalogue id string
function cardHTML(card, o = {}) {
  const d = cardData(card);
  const inst = typeof card === 'object' ? card : d;
  const val = st => (o.raw || !inst.uid ? inst[st] : effStat(S, inst, st));
  const cls = ['card', 'r-' + d.rarity];
  if (o.pickable) cls.push('pickable');
  if (o.cls) cls.push(o.cls);
  const stats = STATS.map(st => {
    const sc = ['st', st];
    if (o.hl) sc.push(o.hl === st ? 'hl' : 'dim');
    const bonus = o.hl === st && o.bonus ? `<span style="font-size:12px"> +${o.bonus}</span>` : '';
    return `<div class="${sc.join(' ')}"><small>${statIconHTML(st)} ${STAT_INFO[st].short}</small><b>${val(st)}</b>${bonus}</div>`;
  }).join('');
  const attrs = (o.uid != null ? ` data-uid="${o.uid}"` : '') + (o.idx != null ? ` data-idx="${o.idx}"` : '') + (o.data || '') + (o.pickable ? ' tabindex="0" role="button"' : '');
  const label = `${d.name}, ${RARITIES[d.rarity].name}. Strength ${val('s')}, Charisma ${val('c')}, Wisdom ${val('w')}`;
  return `<div class="${cls.join(' ')}"${attrs} aria-label="${esc(label)}">
    <div class="card-name">${esc(d.name)}</div>
    ${inst.up ? `<div class="up-badge">+${inst.up}</div>` : ''}
    <div class="card-art">${spriteHTML(d.id)}</div>
    <div class="card-stats">${stats}</div>
    <div class="card-rarity">${RARITIES[d.rarity].name}${o.key ? ` <span class="key-hint">[${o.key}]</span>` : ''}</div>
    ${o.sold ? '<div class="sold-out">SOLD</div>' : ''}
  </div>`;
}
function miniCardHTML(id) {
  const d = CARD_BY_ID[id];
  return `<div class="mini-card" style="--rc:var(--r-${d.rarity})" title="${esc(d.name)}">${spriteHTML(d.id)}</div>`;
}
function trinketCardHTML(id, extra = '') {
  const t = TRINKET_BY_ID[id];
  return `<div class="trinket-card"><div class="t-ico">${trinketIconHTML(t)}</div><h4>${esc(t.name)}</h4><p>${esc(t.desc)}</p>${extra}</div>`;
}
function sortedDeck() {
  return S.deck.slice().sort((a, b) => RARITIES[cardData(b).rarity].order - RARITIES[cardData(a).rarity].order || cardData(a).name.localeCompare(cardData(b).name));
}

// ---- HUD ----
function renderHUD() {
  if (!S) return;
  const f = floorOf(S);
  const floorText = `L${S.level} · ` + (!S.pos ? 'Start' : S.pos.r === FLOORS ? 'Boss' : `${f}/${FLOORS}`);
  const tr = S.trinkets.map(id => { const t = TRINKET_BY_ID[id]; return `<button class="trinket-chip" data-trinket="${id}" title="${esc(t.name + ': ' + t.desc)}" aria-label="${esc(t.name + ': ' + t.desc)}">${trinketIconHTML(t)}</button>`; }).join('');
  $('#hud').innerHTML = `
    <div class="hud-pill" title="Health"><span class="ico-wrap">${iconHTML('heart')}</span><span id="hudHp">${S.hp}/${S.maxHp}</span><div class="hp-mini"><i style="width:${100 * S.hp / S.maxHp}%"></i></div></div>
    <div class="hud-pill" title="Coins"><span class="ico-wrap">${iconHTML('coin')}</span><span id="hudCoins">${S.coins}</span></div>
    <div class="hud-pill" title="Level and floor"><span class="ico-wrap">${iconHTML('tower-2')}</span>${floorText}</div>
    <div class="hud-trinkets">${tr}</div>
    <div class="hud-right">
      <button class="icon-btn" id="hudDeck" title="View deck" aria-label="View deck">🃏 ${S.deck.length}</button>
      <button class="icon-btn" id="hudSound" title="Sound" aria-label="Toggle sound">${UI.sound ? '🔊' : '🔇'}</button>
      <button class="icon-btn" id="hudHelp" title="Menu" aria-label="Menu and how to play">${iconHTML('gear-2')}</button>
    </div>`;
}

// ---- Title ----
function renderTitle() {
  { const d = SPRITE_SIZE.logo; $('#logoWrap').innerHTML = `<div class="logo-img spr-logo" role="img" aria-label="Tower of Doom" style="width:10em;height:${(10 * d[1] / d[0]).toFixed(2)}em"></div>`; }
  $('#titleBlobs').innerHTML = ['knight', 'archer', 'wizard', 'ninja', 'engineer'].map(id => `<div${id === 'wizard' ? ' class="big"' : ''}>${spriteHTML(id)}</div>`).join('');
  $('#diffRow').innerHTML = Object.entries(DIFFICULTY).map(([k, d]) =>
    `<button class="btn small ${k === 'easy' ? 'green' : k === 'hard' ? 'red' : 'blue'}${UI.difficulty === k ? ' sel' : ''}" data-diff="${k}" aria-pressed="${UI.difficulty === k}">${d.name}</button>`).join('');
  const b = loadBest();
  $('#bestLine').textContent = b.wins ? `🏆 Tower conquered ${b.wins} time${b.wins > 1 ? 's' : ''}!` : b.floor ? `Best: Level ${b.level || 1}, floor ${b.floor}` : '';
}

// ---- Draft ----
function startRun(seed) {
  S = newRun(seed == null ? null : seed, UI.difficulty);
  S.path = [];
  UI.levelUp = false;
  UI.reward = null;
  UI.draftLeft = DRAFT_PICKS;
  show('draft');
  renderDraft();
}
function renderDraft() {
  const n = DRAFT_PICKS - UI.draftLeft + 1;
  $('#draftTitle').textContent = 'Build Your Team';
  $('#draftSub').textContent = `Pick card ${n} of ${DRAFT_PICKS}. Each card has Strength, Charisma and Wisdom.`;
  UI.draftChoices = cardChoices('draft', 1, 3);
  $('#draftCards').innerHTML = UI.draftChoices.map((id, i) => cardHTML(id, { pickable: true, idx: i, key: i + 1 })).join('');
  const slots = [];
  for (let i = 0; i < DRAFT_PICKS; i++) slots.push(S.deck[i] ? miniCardHTML(S.deck[i].id) : '<div class="mini-card empty"></div>');
  $('#draftDeck').innerHTML = slots.join('');
}
function draftPick(i) {
  if (UI.screen !== 'draft' || UI.draftLeft <= 0 || !UI.draftChoices[i]) return;
  sfx('click');
  addCard(S, UI.draftChoices[i]);
  UI.draftLeft--;
  if (UI.draftLeft > 0) renderDraft();
  else { renderDraft(); toast('Your team is ready. Start climbing!'); showMap(); }
}

// ---- Map ----
function levelInfo(level) { return LEVELS[(level || 1) - 1]; }
function showMap() {
  show('map');
  renderMap();
  const avail = availableNodes(S);
  const lvl = levelInfo(S.level);
  $('#mapTitle').textContent = `Level ${S.level}: ${lvl.name}`;
  $('#mapSub').textContent = avail.length && avail[0].type === 'boss'
    ? `${ENEMIES[lvl.boss].name} awaits at the top. Good luck!`
    : 'Pick a glowing room to climb to.';
  requestAnimationFrame(centerOnRoom);
}
// Scroll only this page (scrollIntoView could also scroll the page that embeds the game)
function centerOnRoom() {
  const target = document.querySelector('.map-node.avail') || document.querySelector('.map-node.current');
  if (!target) return;
  const r = target.getBoundingClientRect();
  window.scrollTo(0, Math.max(0, Math.round(r.top + window.pageYOffset - window.innerHeight / 2)));
}
function renderMap() {
  $('#mapLegend').innerHTML = Object.entries(NODE_TYPES).map(([, t]) => `<span><i style="background:${t.color}">${roomIconHTML(t)}</i>${t.name}</span>`).join('');
  const tower = $('#tower');
  const W = tower.clientWidth || 600;
  const small = W < 480;
  const rowH = small ? 64 : 76, top = small ? 60 : 70, padX = small ? 34 : 44;
  const H = top + FLOORS * rowH + 50;
  const pos = n => n.type === 'boss'
    ? { x: W / 2, y: top }
    : { x: padX + ((n.c + 0.5 + n.jx) / MAP_COLS) * (W - 2 * padX), y: top + (FLOORS - n.r) * rowH + n.jy * rowH * 0.5 };
  const visited = new Set(S.path);
  const curId = S.path[S.path.length - 1];
  const avail = new Set(availableNodes(S).map(n => n.id));
  const nodes = [];
  S.map.rows.forEach(row => row.forEach(n => { if (n) nodes.push(n); }));
  nodes.push(S.map.boss);
  let lines = '';
  for (const n of nodes) {
    if (n.type === 'boss') continue;
    const targets = n.next.map(nc => (nc === 'boss' ? S.map.boss : S.map.rows[n.r + 1][nc]));
    for (const t of targets) {
      const a = pos(n), b = pos(t);
      const walked = visited.has(n.id) && visited.has(t.id) && S.path.indexOf(t.id) === S.path.indexOf(n.id) + 1;
      const open = n.id === curId && avail.has(t.id);
      const style = walked ? 'stroke:#ffcb3d;stroke-width:5' : open ? 'stroke:#fff;stroke-width:4;stroke-dasharray:8 7' : 'stroke:rgba(255,255,255,.28);stroke-width:3;stroke-dasharray:6 8';
      lines += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" style="${style};stroke-linecap:round"/>`;
    }
  }
  let html = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${lines}</svg>`;
  for (let r = 0; r < FLOORS; r++) html += `<div class="floor-label" style="top:${top + (FLOORS - r) * rowH}px">F${r + 1}</div>`;
  for (const n of nodes) {
    const p = pos(n), t = NODE_TYPES[n.type];
    const state = n.id === curId ? 'current' : avail.has(n.id) ? 'avail' : visited.has(n.id) ? 'visited' : 'locked';
    const floorName = n.type === 'boss' ? `Top of the tower: ${ENEMIES[levelInfo(S.level).boss].name}` : `Floor ${n.r + 1}`;
    const face = n.type === 'boss' ? ` spr spr-${levelInfo(S.level).boss}` : '';
    html += `<button class="map-node ${state}${n.type === 'boss' ? ' boss' : ''}${face}" data-node="${n.id}" style="left:${p.x.toFixed(1)}px;top:${p.y.toFixed(1)}px;--nc:${t.color}" title="${t.name} (${floorName})" aria-label="${t.name}, ${floorName}${state === 'avail' ? ', available' : ''}"${state === 'avail' ? '' : ' tabindex="-1" aria-disabled="true"'}>${n.type === 'boss' ? '' : roomIconHTML(t)}</button>`;
  }
  tower.className = 'tower theme-' + levelInfo(S.level).theme;
  html = `<div class="tower-sky spr-${levelInfo(S.level).sky}"></div><div class="tower-walls spr-${levelInfo(S.level).tile}"></div>` + html;
  tower.style.height = H + 'px';
  tower.innerHTML = html;
}
function travel(id) {
  if (UI.screen !== 'map') return;
  const node = availableNodes(S).find(n => n.id === id);
  if (!node) return;
  sfx('click');
  S.pos = { r: node.r, c: node.c };
  S.path.push(node.id);
  switch (node.type) {
    case 'enemy': startBattle('normal'); break;
    case 'elite': startBattle('elite'); break;
    case 'boss': startBattle('boss'); break;
    case 'shop': openShop(); break;
    case 'rest': openRest(); break;
    case 'mystery': openEvent(); break;
  }
}

// ---- Modals ----
function openModal(html) {
  UI.modalReturnFocus = document.activeElement;
  $('#modal').innerHTML = html;
  $('#modalBg').classList.add('show');
  UI.modalOpen = true;
  const f = $('#modal').querySelector('button, [tabindex="0"]');
  if (f) f.focus({ preventScroll: true });
}
function closeModal() {
  $('#modalBg').classList.remove('show');
  UI.modalOpen = false;
  UI.deckPick = null;
  const back = UI.modalReturnFocus;
  UI.modalReturnFocus = null;
  if (back && back.focus && document.contains(back)) back.focus({ preventScroll: true });
}
// mode: 'view' | 'remove' | 'upgrade'
function openDeck(mode = 'view', onPick = null) {
  UI.deckPick = onPick ? { mode, onPick } : null;
  const title = mode === 'remove' ? 'Remove a Card' : mode === 'upgrade' ? 'Upgrade a Card' : `Your Deck (${S.deck.length})`;
  const sub = mode === 'remove' ? 'Tap a card to remove it from your deck forever.' : mode === 'upgrade' ? 'Tap a card to give it +2 to every stat (max 20).' : 'Each round of battle you draw 3 random cards from your deck.';
  const cards = sortedDeck().map(c => {
    const disabled = mode === 'upgrade' && isMaxed(c);
    return cardHTML(c, { pickable: !!onPick && !disabled, uid: c.uid, cls: disabled ? 'faded' : '' });
  }).join('');
  openModal(`<div class="modal-head"><h2>${title}</h2><button class="btn small gray" data-close>${onPick ? 'Cancel' : 'Close'}</button></div>
    <p class="muted" style="margin-top:0">${sub}</p><div class="card-row">${cards}</div>`);
}
function howToHTML() {
  const legend = Object.values(NODE_TYPES).map(t => `<div class="legend-row"><span class="map-node" style="position:static;margin:0;width:30px;height:30px;font-size:15px;--nc:${t.color}">${t.icon}</span>${t.name}</div>`).join('');
  return `<div class="howto">
    <h3>🏰 The Goal</h3>
    <p>Climb all ${LEVEL_COUNT} levels of the tower and defeat the <b>Evil King</b> at the very top. If your health hits 0, the run is over.</p>
    <h3>🪜 Levels</h3>
    <ul>
      ${LEVELS.map((l, i) => `<li><b>Level ${i + 1}: ${l.name}</b>: ${FLOORS} floors, then the <b>${ENEMIES[l.boss].name}</b>.</li>`).join('')}
      <li>Your cards, trinkets, coins and health carry over to the next level. Health only comes back at rest stops, potions and a few mystery rooms.</li>
      <li>Each new level has tougher enemies and better cards to find.</li>
    </ul>
    <h3>🃏 Your Cards</h3>
    <p>You start by picking ${DRAFT_PICKS} Blook cards. Every card has three stats: <b>💪 Strength</b>, <b>💬 Charisma</b> and <b>📘 Wisdom</b> (max 20). Rarer cards have bigger stats.</p>
    <h3>⚔️ Battles</h3>
    <ul>
      <li>Each round you draw 3 random cards from your deck. Pick one to play.</li>
      <li><b>Initiative:</b> stop the moving marker inside the green zone (tap the bar or press Space). Hit it and the enemy's card is revealed and <b>you choose the stat</b>. Land in the bright center for a <b>PERFECT</b> (+2 to your stat).</li>
      <li>Miss, and the <b>enemy chooses</b> the stat (usually its card's best one).</li>
      <li>Both cards compare that stat. The difference is the damage dealt to whoever had the lower number. Ties deal no damage.</li>
      <li>Enemies have a favorite stat that their cards are a little stronger in.</li>
    </ul>
    <h3>🗺️ The Map</h3>
    ${legend}
    <p>Win battles to earn coins and add new cards. Strong enemies give better cards and a trinket. Shops sell cards, trinkets and potions and can remove weak cards. Rest stops heal you or upgrade a card. Mystery rooms are a gamble!</p>
    <h3>⌨️ Keys</h3>
    <p>1 / 2 / 3 pick a card or stat, Space stops the Initiative marker, Esc closes windows.</p>
  </div>`;
}
function openHowTo(inRun) {
  openModal(`<div class="modal-head"><h2>How to Play</h2><button class="btn small gray" data-close>Close</button></div>${howToHTML()}
    ${inRun ? '<div class="row-center" style="margin-top:16px"><button class="btn small red" id="quitRun">Quit Run</button></div>' : ''}`);
}
