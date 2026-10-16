/* ===================== UI: BATTLE ===================== */
function setHp(sel, hp, max) {
  const el = $(sel);
  el.querySelector('i').style.width = (100 * hp / max) + '%';
  el.querySelector('span').textContent = `${hp} / ${max}`;
}
function bMsg(text, cls = '') { const el = $('#bMsg'); el.className = 'battle-msg ' + cls; el.textContent = text; }
function floatText(sel, text, cls = '') {
  const host = $(sel); if (!host) return;
  const d = document.createElement('div');
  d.className = 'dmg-float ' + cls; d.textContent = text;
  host.appendChild(d);
  setTimeout(() => d.remove(), 1200);
}
function bump(sel, cls) { const el = $(sel); if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
const deckCard = uid => S.deck.find(x => x.uid === uid);

async function startBattle(kind) {
  B = newBattle(S, kind, floorOf(S));
  B.kind = kind; B.phase = 'intro';
  const myB = B, e = B.enemy;
  show('battle');
  $('#battleSky').className = 'battle-sky spr-' + levelInfo(S.level).sky;
  $('#eName').textContent = e.name;
  const tag = kind === 'boss' ? '💀 BOSS' : kind === 'elite' ? '⚠️ Strong Enemy' : `Floor ${floorOf(S)}`;
  $('#eTag').className = 'enemy-tag ' + (kind === 'normal' ? '' : kind);
  $('#eTag').textContent = `${tag} · Favors ${STAT_INFO[e.fav].icon} ${STAT_INFO[e.fav].short}`;
  $('#eTag').title = `This enemy's cards get +1 ${STAT_INFO[e.fav].name}`;
  $('#eBlob').innerHTML = spriteHTML(e.key, e.kind === 'boss' ? 'evil boss' : 'evil');
  $('#eBlob').style.opacity = '';
  $('#pBlob').innerHTML = spriteHTML(cardData(S.deck[0]).id);
  $('#eFighter').classList.remove('enraged');
  setHp('#pHp', S.hp, S.maxHp); setHp('#eHp', e.hp, e.maxHp);
  $('#roundTag').textContent = '';
  $('#pSlot').innerHTML = '<div class="empty-slot">Get ready...</div>';
  $('#eSlot').innerHTML = '<div class="card-back spr-cardback"></div>';
  $('#hand').innerHTML = ''; $('#actionBox').innerHTML = ''; $('#handLabel').textContent = '';
  bMsg(kind === 'boss' ? (S.level < LEVEL_COUNT ? `${e.name} blocks the way to Level ${S.level + 1}!` : `${e.name} blocks the way to the top!`) : kind === 'elite' ? `A strong enemy! ${e.name} attacks!` : `${e.name} appears!`, kind === 'normal' ? '' : 'lose');
  await sleep(1000);
  if (B !== myB) return;
  newRoundUI();
}
function newRoundUI() {
  nextRound(S, B);
  B.phase = 'pick'; B.chosen = null; B.init = false; B.perfect = false;
  $('#roundTag').textContent = `Round ${B.round}`;
  $('#pSlot').innerHTML = '<div class="empty-slot">Pick a card from your hand</div>';
  $('#eSlot').innerHTML = '<div class="card-back spr-cardback"></div>';
  $('#actionBox').innerHTML = '';
  $('#handLabel').textContent = 'Your hand: choose a card to play';
  renderHand();
  bMsg('Choose your card!');
}
function renderHand() {
  $('#hand').innerHTML = B.hand.map((uid, i) => cardHTML(deckCard(uid), {
    pickable: B.phase === 'pick', uid, key: B.phase === 'pick' ? i + 1 : null,
    cls: B.chosen == null ? '' : uid === B.chosen ? 'selected' : 'faded',
  })).join('');
}
function pickCard(uid) {
  if (!B || B.phase !== 'pick' || !B.hand.includes(uid)) return;
  sfx('flip');
  B.chosen = uid; B.phase = 'timing';
  $('#pBlob').innerHTML = spriteHTML(deckCard(uid).id);
  renderHand();
  $('#handLabel').textContent = '';
  $('#pSlot').innerHTML = cardHTML(deckCard(uid), { cls: 'flip-in' });
  startTiming();
}

// ---- Initiative timing bar ----
function markerPos(t, now) { const x = (t.phase0 + (now - t.start) / 1000 * t.p.speed) % 2; return x > 1 ? 2 - x : x; }
function startTiming() {
  const p = initiativeParams(S, floorOf(S), B.kind === 'boss');
  const center = p.zone / 2 + rand() * (1 - p.zone);
  B.timing = { p, center, start: performance.now(), phase0: rand() * 2, raf: 0, pos: 0 };
  $('#actionBox').innerHTML = `<div class="action-box"><h3>⚡ Initiative!</h3>
    <p>Stop the marker in the green zone to pick the stat. Tap the bar or press Space.</p>
    <div class="timing" id="timing" role="button" tabindex="0" aria-label="Initiative bar. Press to stop the marker.">
      <div class="zone" style="left:${(center - p.zone / 2) * 100}%;width:${p.zone * 100}%"></div>
      <div class="perfect" style="left:${(center - p.perfect / 2) * 100}%;width:${p.perfect * 100}%"></div>
      <div class="marker" id="marker"></div>
    </div>
    <button class="btn gold" id="stopBtn">STOP! <span class="key-hint">[Space]</span></button></div>`;
  bMsg('Stop the marker in the green zone!');
  const tick = now => {
    if (!B || B.phase !== 'timing') return;
    const m = $('#marker');
    if (m) m.style.left = (markerPos(B.timing, now) * 100) + '%';
    B.timing.raf = requestAnimationFrame(tick);
  };
  B.timing.raf = requestAnimationFrame(tick);
}
async function stopTiming() {
  if (!B || B.phase !== 'timing') return;
  const myB = B, t = B.timing;
  cancelAnimationFrame(t.raf);
  t.pos = markerPos(t, performance.now());
  $('#marker').style.left = (t.pos * 100) + '%';
  $('#stopBtn').disabled = true;
  const result = judgeInitiative(t.pos, t.center, t.p);
  B.phase = 'judged'; B.init = result !== 'miss'; B.perfect = result === 'perfect';
  B.lastInitiative = result;
  if (B.init) { sfx(B.perfect ? 'perfect' : 'good'); bMsg(B.perfect ? '⭐ PERFECT! You choose the stat (+2 bonus)!' : '✅ Nice! You choose the stat!', 'win'); }
  else { sfx('miss'); bMsg('❌ Missed! The enemy chooses the stat...', 'lose'); }
  await sleep(700);
  if (B !== myB) return;
  sfx('flip');
  $('#eSlot').innerHTML = cardHTML(B.enemyCard, { raw: true, cls: 'flip-in' });
  if (B.init) { showStatChoice(); return; }
  $('#actionBox').innerHTML = '';
  await sleep(700);
  if (B !== myB) return;
  const st = enemyChooseStat(B);
  bMsg(`${B.enemy.name} chooses ${STAT_INFO[st].icon} ${STAT_INFO[st].name}!`, 'lose');
  $('#eSlot').innerHTML = cardHTML(B.enemyCard, { raw: true, hl: st });
  await sleep(900);
  if (B !== myB) return;
  resolveUI(st);
}
function showStatChoice() {
  B.phase = 'stat';
  const c = deckCard(B.chosen), ec = B.enemyCard;
  const bonus = (B.perfect ? 2 : 0) + (has(S, 'crown') ? 2 : 0);
  $('#actionBox').innerHTML = `<div class="action-box"><h3>Choose a Stat</h3>
    <p>The enemy card is revealed! Higher number wins and deals the difference as damage.${bonus ? ` Your bonus: +${bonus}` : ''}</p>
    <div class="stat-choices">${STATS.map((st, i) => {
      const pv = effStat(S, c, st) + bonus, ev = ec[st];
      return `<button class="btn stat-btn ${st}" data-stat="${st}">${statIconHTML(st)} ${STAT_INFO[st].short} <span class="key-hint">[${i + 1}]</span><small>You ${pv} vs ${ev}</small></button>`;
    }).join('')}</div></div>`;
  bMsg('Pick the stat to battle with!');
}
function chooseStat(st) {
  if (!B || B.phase !== 'stat' || !STATS.includes(st)) return;
  sfx('click');
  resolveUI(st);
}
async function resolveUI(stat) {
  const myB = B;
  B.phase = 'resolve';
  $('#actionBox').innerHTML = '';
  const res = resolveRound(S, B, B.chosen, stat, { initiative: B.init, perfect: B.perfect });
  B.lastResult = res;
  $('#pSlot').innerHTML = cardHTML(deckCard(B.chosen), { hl: stat, bonus: res.pBonus });
  $('#eSlot').innerHTML = cardHTML(B.enemyCard, { raw: true, hl: stat });
  const name = `${STAT_INFO[stat].icon} ${STAT_INFO[stat].name}`;
  await sleep(450);
  if (B !== myB) return;
  if (res.winner === 'player') {
    sfx('hit'); bump('#pSlot', 'lunge-up'); bump('#eBlob', 'shake');
    floatText('#eBlob', `-${res.dmgToEnemy}`);
    bMsg(`${name}: ${res.pVal} vs ${res.eVal}. You deal ${res.dmgToEnemy} damage!`, 'win');
  } else if (res.winner === 'enemy') {
    sfx('hurt'); bump('#eSlot', 'lunge-down'); bump('#pBlob', 'shake');
    floatText('#pBlob', res.dmgToPlayer ? `-${res.dmgToPlayer}` : '0');
    bMsg(`${name}: ${res.pVal} vs ${res.eVal}. ` + (res.dmgToPlayer ? `You take ${res.dmgToPlayer} damage!` : 'Your shield blocks it all!'), 'lose');
    if (res.blocked) setTimeout(() => floatText('#pFighter', `🛡️ Blocked ${res.blocked}`, 'info'), 300 * UI.speed);
    if (res.thorns) setTimeout(() => floatText('#eBlob', `🌵 -${res.thorns}`), 350 * UI.speed);
  } else {
    sfx('click');
    bMsg(`${name}: ${res.pVal} vs ${res.eVal}. It's a tie! No damage.`, 'tie');
  }
  setHp('#pHp', S.hp, S.maxHp); setHp('#eHp', B.enemy.hp, B.enemy.maxHp);
  renderHUD();
  if (res.totem) {
    await sleep(500); if (B !== myB) return;
    floatText('#pBlob', '🗿 +15', 'heal'); sfx('heal');
    toast('Your Lifeline Totem crumbles... but you survive with 15 HP!');
  }
  if (res.enraged) {
    $('#eFighter').classList.add('enraged');
    await sleep(600); if (B !== myB) return;
    bMsg(`😡 ${B.enemy.name} is ENRAGED! Its cards get +1 to every stat!`, 'lose');
  }
  await sleep(1400);
  if (B !== myB) return;
  if (B.over) { if (B.winner === 'player') battleWon(); else finishRun(false); }
  else newRoundUI();
}
async function battleWon() {
  const myB = B, e = B.enemy;
  B.phase = 'done';
  sfx('win');
  bMsg(`${e.name} is defeated!`, 'win');
  $('#eBlob').style.opacity = '.3';
  $('#hand').innerHTML = ''; $('#handLabel').textContent = '';
  await sleep(1100);
  if (B !== myB) return;
  if (B.kind === 'boss' && isFinalLevel(S)) { applyBattleWin(S, B, { coins: 0 }); finishRun(true); return; }
  const rw = battleRewards(S, B);
  applyBattleWin(S, B, rw);
  UI.levelUp = B.kind === 'boss';
  showReward(rw, e);
}

/* ===================== UI: REWARDS ===================== */
function showReward(rw, enemy) {
  UI.reward = rw;
  show('reward');
  $('#reward').innerHTML = `<h2 class="screen-title">${UI.levelUp ? `Level ${S.level} Complete!` : 'Victory!'}</h2>
    <p class="screen-sub">You defeated ${esc(enemy.name)}.${UI.levelUp ? ' Grab your reward, then climb on.' : ''}</p>
    <div class="reward-coins">${iconHTML('coin')} +${rw.coins} coins${rw.healed ? ` <span style="color:#7dff8e">+${rw.healed} HP</span>` : ''}</div>
    ${rw.trinket ? `<p class="screen-sub" style="margin-top:12px">You found a trinket!</p><div class="row-center">${trinketCardHTML(rw.trinket)}</div>` : ''}
    <h3 class="shop-section">Choose a card to add to your deck</h3>
    <div class="card-row" id="rewardCards">${rw.choices.map((id, i) => cardHTML(id, { pickable: true, idx: i, key: i + 1 })).join('')}</div>
    <div class="row-center" style="margin-top:18px"><button class="btn gray" id="skipReward">Skip</button></div>`;
  sfx('coin');
}
function takeReward(i) {
  if (UI.screen !== 'reward' || !UI.reward) return;
  const id = UI.reward.choices[i];
  if (!id) return;
  addCard(S, id);
  UI.reward = null;
  sfx('click');
  toast(`${CARD_BY_ID[id].name} joined your deck!`);
  afterReward();
}
function afterReward() {
  if (UI.levelUp) { UI.levelUp = false; showLevelIntro(); }
  else showMap();
}
// Between levels: what carries over, and who waits at the top of the next one
function showLevelIntro() {
  const next = S.level + 1, lvl = levelInfo(next), boss = ENEMIES[lvl.boss];
  show('level');
  const tr = S.trinkets.map(id => trinketIconHTML(TRINKET_BY_ID[id])).join(' ') || 'none yet';
  $('#level').innerHTML = `<div class="end-box">
    <p class="level-kicker">Level ${S.level} cleared!</p>
    <h1 class="end-title win">Level ${next}</h1>
    <h2 class="level-name">${esc(lvl.name)}</h2>
    <div class="level-boss"><div style="font-size:14px">${spriteHTML(lvl.boss, 'evil')}</div><p>Waiting at the top: <b>${esc(boss.name)}</b></p></div>
    <p class="tagline">Your whole team comes with you. Enemies here are tougher, so choose your cards wisely.</p>
    <div class="stat-grid">
      <div class="stat-tile"><b>${S.deck.length}</b><span>Cards</span></div>
      <div class="stat-tile"><b>${S.hp}/${S.maxHp}</b><span>Health</span></div>
      <div class="stat-tile"><b>${S.coins}</b><span>Coins</span></div>
      <div class="stat-tile wide"><b class="level-trinkets">${tr}</b><span>Trinkets</span></div>
    </div>
    <button class="btn big green" id="levelGo">Climb to Level ${next}</button>
  </div>`;
  sfx('win');
  const go = $('#levelGo'); if (go) go.focus({ preventScroll: true });
}
function startNextLevel() {
  if (UI.screen !== 'level' || !advanceLevel(S)) return;
  S.path = [];
  sfx('click');
  showMap();
  toast(`Welcome to ${levelInfo(S.level).name}!`);
}
function skipReward() {
  if (UI.screen !== 'reward' || !UI.reward) return;
  UI.reward = null;
  afterReward();
}

/* ===================== UI: SHOP ===================== */
function openShop() {
  UI.shop = genShop(S, depthOf(S));
  UI.shop.greet = pick(['Welcome, traveler! Take a look around!', 'Fresh Blooks, fair prices!', 'Coins for power. A fine deal, eh?']);
  show('shop');
  renderShop();
}
function renderShop() {
  const sh = UI.shop;
  const cards = sh.cards.map((it, i) => {
    const afford = S.coins >= it.price;
    return `<div class="card-wrap">${cardHTML(it.id, { pickable: !it.sold && afford, data: ` data-buy-card="${i}"`, sold: it.sold, cls: !it.sold && !afford ? 'faded' : '' })}<span class="price-tag">${iconHTML('coin')} ${it.price}</span></div>`;
  }).join('');
  const trinkets = sh.trinkets.length ? sh.trinkets.map((it, i) => trinketCardHTML(it.id,
    `<div style="margin-top:10px"><button class="btn small gold" data-buy-trinket="${i}" ${it.sold || S.coins < it.price ? 'disabled' : ''}>${it.sold ? 'Sold' : `${iconHTML('coin')} ${it.price}`}</button></div>`)).join('')
    : '<p class="muted">Sold out of trinkets!</p>';
  const p = sh.potion;
  const removeLabel = sh.removeUsed ? 'Used' : sh.removePrice ? `${iconHTML('coin')} ${sh.removePrice}` : 'FREE';
  const canRemove = !sh.removeUsed && S.coins >= sh.removePrice && S.deck.length > MIN_DECK;
  $('#shop').innerHTML = `<h2 class="screen-title">Shop</h2>
    <div class="shopkeeper"><div style="font-size:7px">${spriteHTML('rogue')}</div><div class="speech">${esc(sh.greet)}</div></div>
    <p class="screen-sub">You have ${iconHTML('coin')} <b>${S.coins}</b> coins</p>
    <h3 class="shop-section">Blook Cards</h3><div class="shop-grid">${cards}</div>
    <h3 class="shop-section">Trinkets</h3><div class="shop-grid">${trinkets}</div>
    <h3 class="shop-section">Services</h3>
    <div class="shop-grid">
      <div class="trinket-card service"><div class="t-ico">${iconHTML('potion')}</div><h4>Health Potion</h4><p>Heal ${p.heal} HP.</p>
        <div style="margin-top:10px"><button class="btn small gold" id="buyPotion" ${p.sold || S.coins < p.price || S.hp >= S.maxHp ? 'disabled' : ''}>${p.sold ? 'Sold' : `${iconHTML('coin')} ${p.price}`}</button></div></div>
      <div class="trinket-card service"><div class="t-ico">🗑️</div><h4>Remove a Card</h4><p>Thin your deck so your best cards show up more often. (Min ${MIN_DECK} cards)</p>
        <div style="margin-top:10px"><button class="btn small gold" id="removeBtn" ${canRemove ? '' : 'disabled'}>${removeLabel}</button></div></div>
    </div>
    <div class="row-center" style="margin-top:22px"><button class="btn green" id="leaveShop">Leave Shop</button></div>`;
}
function shopAction(fn, msg) {
  if (fn()) { sfx('coin'); if (msg) toast(msg); renderShop(); renderHUD(); }
  else sfx('miss');
}

/* ===================== UI: REST STOP ===================== */
function openRest() { UI.restDone = false; show('rest'); renderRest(); }
function renderRest(result) {
  const canTrain = S.deck.some(c => !isMaxed(c));
  $('#rest').innerHTML = `<h2 class="screen-title">Rest Stop</h2>
    <div class="campfire">🔥</div>
    <p class="screen-sub">${result ? esc(result) : 'Take a breather before you keep climbing. Choose one:'}</p>
    ${result ? '<div class="row-center"><button class="btn green" id="restContinue">Continue</button></div>' : `
    <div class="shop-grid">
      <div class="trinket-card service"><div class="t-ico">😴</div><h4>Rest</h4><p>Heal ${restHealAmount(S)} HP (30% of your max).</p>
        <div style="margin-top:10px"><button class="btn small green" id="restHeal" ${S.hp >= S.maxHp ? 'disabled' : ''}>Rest</button></div></div>
      <div class="trinket-card service"><div class="t-ico">💪</div><h4>Train</h4><p>Give one card +2 to every stat.</p>
        <div style="margin-top:10px"><button class="btn small blue" id="restTrain" ${canTrain ? '' : 'disabled'}>Train</button></div></div>
    </div>
    <div class="row-center" style="margin-top:16px"><button class="btn small gray" id="restSkip">Skip</button></div>`}`;
}

/* ===================== UI: MYSTERY EVENTS ===================== */
function openEvent() { UI.event = rollEvent(S, depthOf(S)); UI.eventDone = false; show('event'); renderEvent(); }
function renderEvent(out) {
  const { def, ctx } = UI.event;
  let body;
  if (!out) {
    body = `<p class="event-text">${esc(def.text)}</p>
      ${ctx.cardId ? `<div class="row-center" style="margin-bottom:14px">${cardHTML(ctx.cardId)}</div>` : ''}
      <div class="choices">${def.choices.map((ch, i) => `<button class="btn ${i === def.choices.length - 1 && def.choices.length > 1 ? 'gray' : 'blue'}" data-choice="${i}" ${ch.req && !ch.req(S) ? 'disabled' : ''}>${esc(ch.label)}</button>`).join('')}</div>`;
  } else {
    body = `<p class="event-text">${esc(out.text)}</p>
      ${out.cardId ? `<div class="row-center" style="margin-bottom:14px">${cardHTML(out.cardId)}</div>` : ''}
      ${out.trinket ? `<div class="row-center" style="margin-bottom:14px">${trinketCardHTML(out.trinket)}</div>` : ''}
      <div class="choices"><button class="btn green" id="eventContinue">Continue</button></div>`;
  }
  $('#event').innerHTML = `<div class="event-box"><div class="event-ico">${def.icon}</div><h2 class="screen-title">${esc(def.title)}</h2>${body}</div>`;
}
function eventChoose(i) {
  if (UI.screen !== 'event' || UI.eventDone) return;
  const { def, ctx } = UI.event;
  const ch = def.choices[i];
  if (!ch || (ch.req && !ch.req(S))) return;
  UI.eventDone = true;
  sfx('click');
  const out = ch.run(S, ctx);
  renderHUD();
  if (S.hp <= 0) { finishRun(false); return; }
  if (out.battle) { startBattle(out.battle); return; }
  renderEvent(out);
}

/* ===================== UI: END OF RUN ===================== */
function finishRun(won) {
  const floor = floorOf(S), level = S.level;
  const best = loadBest();
  if (won) best.wins = (best.wins || 0) + 1;
  const reach = Math.min(floor, FLOORS);
  if (level > (best.level || 1) || (level === (best.level || 1) && reach > (best.floor || 0))) { best.level = level; best.floor = reach; }
  saveBest(best);
  B = null;
  UI.levelUp = false;
  UI.lastRun = { won, floor, level };
  show('end');
  sfx(won ? 'win' : 'lose');
  const st = S.stats;
  const tiles = [
    [`L${level} · ${floor > FLOORS ? 'Boss' : 'F' + floor}`, 'Reached'], [st.kills, 'Enemies defeated'], [st.bosses, 'Bosses defeated'],
    [st.dmgDealt, 'Damage dealt'], [st.coinsEarned, 'Coins earned'], [S.deck.length, 'Cards in deck'],
  ].map(([v, l]) => `<div class="stat-tile"><b>${v}</b><span>${l}</span></div>`).join('');
  $('#end').innerHTML = `<div class="end-box">
    <div style="font-size:14px">${spriteHTML(won ? cardData(S.deck[0]).id : levelInfo(level).boss, won ? '' : 'evil')}</div>
    <h1 class="end-title ${won ? 'win' : 'lose'}">${won ? 'Victory!' : 'Defeated!'}</h1>
    <p class="tagline">${won ? `You conquered all ${LEVEL_COUNT} levels of the Tower of Doom and defeated the Evil King!` : `You fell on Level ${level}, ${floor > FLOORS ? 'fighting ' + ENEMIES[levelInfo(level).boss].name : 'floor ' + floor}. The tower claims another hero...`}</p>
    <div class="stat-grid">${tiles}</div>
    <div class="row-center"><button class="btn big green" id="againBtn">Play Again</button><button class="btn gray" id="titleBtn">Title Screen</button></div>
  </div>`;
  if (won) confetti();
}
function confetti() {
  const colors = ['#ffcb3d', '#ff4d5e', '#4bc22e', '#3d8bff', '#cc5de8', '#ffffff'];
  for (let i = 0; i < 70; i++) {
    const d = document.createElement('div');
    d.className = 'confetti';
    d.style.left = (Math.random() * 100) + 'vw';
    d.style.background = colors[i % colors.length];
    d.style.animationDuration = (2 + Math.random() * 2.5) + 's';
    d.style.animationDelay = (Math.random() * 0.8) + 's';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 5500);
  }
}
function quitRun() { B = null; S = null; UI.reward = null; UI.levelUp = false; show('title'); renderTitle(); }

/* ===================== INPUT ===================== */
document.addEventListener('click', e => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  // The 2nd click of a double-click can land on a button the 1st click just revealed
  if (e.detail > 1 && performance.now() - (UI.shownAt || 0) < 500 && !UI.modalOpen) return;
  const q = sel => t.closest(sel);
  let el;
  if (q('[data-close]') || t.id === 'modalBg') { closeModal(); return; }
  if (UI.modalOpen) {
    if ((el = q('#modal .card.pickable[data-uid]')) && UI.deckPick) {
      const cb = UI.deckPick.onPick, uid = +el.dataset.uid;
      closeModal(); cb(uid);
    } else if (q('#quitRun')) { closeModal(); quitRun(); }
    else if (!q('#modal')) closeModal();
    return;
  }
  if ((el = q('[data-trinket]'))) { const tr = TRINKET_BY_ID[el.dataset.trinket]; toast(`${tr.icon} ${tr.name}: ${tr.desc}`); return; }
  if (q('#hudDeck')) { openDeck('view'); return; }
  if (q('#hudSound')) { UI.sound = !UI.sound; renderHUD(); return; }
  if (q('#hudHelp')) { openHowTo(true); return; }
  switch (UI.screen) {
    case 'title':
      if ((el = q('[data-diff]'))) { UI.difficulty = el.dataset.diff; sfx('click'); renderTitle(); $(`[data-diff="${UI.difficulty}"]`).focus(); }
      else if (q('#playBtn')) { sfx('click'); startRun(); }
      else if (q('#howBtn')) openHowTo(false);
      break;
    case 'draft': if ((el = q('#draftCards .card.pickable'))) draftPick(+el.dataset.idx); break;
    case 'map': if ((el = q('.map-node.avail'))) travel(el.dataset.node); break;
    case 'level': if (q('#levelGo')) startNextLevel(); break;
    case 'battle':
      if ((el = q('#hand .card.pickable'))) pickCard(+el.dataset.uid);
      else if (q('#stopBtn') || q('#timing')) stopTiming();
      else if ((el = q('[data-stat]'))) chooseStat(el.dataset.stat);
      break;
    case 'reward':
      if ((el = q('#rewardCards .card.pickable'))) takeReward(+el.dataset.idx);
      else if (q('#skipReward')) skipReward();
      break;
    case 'shop': {
      const sh = UI.shop;
      if ((el = q('.card.pickable[data-buy-card]'))) { const i = +el.dataset.buyCard; shopAction(() => buyCard(S, sh, i), `${CARD_BY_ID[sh.cards[i].id].name} added to your deck!`); }
      else if ((el = q('[data-buy-trinket]'))) { const i = +el.dataset.buyTrinket; shopAction(() => buyTrinket(S, sh, i), `Got ${TRINKET_BY_ID[sh.trinkets[i].id].name}!`); }
      else if (q('#buyPotion')) shopAction(() => buyPotion(S, sh), 'Glug glug! +20 HP');
      else if (q('#removeBtn')) openDeck('remove', uid => {
        const name = cardData(deckCard(uid)).name;
        shopAction(() => shopRemove(S, sh, uid), `${name} was removed from your deck.`);
      });
      else if (q('#leaveShop')) { sfx('click'); showMap(); }
      break;
    }
    case 'rest':
      if (UI.restDone) { if (q('#restContinue')) showMap(); break; }
      if (q('#restHeal')) { const h = restHeal(S); UI.restDone = true; sfx('heal'); renderHUD(); renderRest(`You rest by the fire and heal ${h} HP.`); }
      else if (q('#restTrain')) openDeck('upgrade', uid => {
        if (UI.restDone || !restUpgrade(S, uid)) return;
        UI.restDone = true; sfx('perfect'); renderHUD();
        renderRest(`${cardData(deckCard(uid)).name} trained hard and got +2 to every stat!`);
      });
      else if (q('#restSkip')) showMap();
      break;
    case 'event':
      if ((el = q('[data-choice]'))) eventChoose(+el.dataset.choice);
      else if (q('#eventContinue')) showMap();
      break;
    case 'end':
      if (q('#againBtn')) { sfx('click'); startRun(); }
      else if (q('#titleBtn')) quitRun();
      break;
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && UI.modalOpen) { closeModal(); return; }
  const active = document.activeElement;
  const activate = (e.key === 'Enter' || e.key === ' ') && active && active.matches && active.matches('.card.pickable, .timing');
  if (UI.modalOpen) { if (activate) { e.preventDefault(); active.click(); } return; }
  const n = ['1', '2', '3', '4'].indexOf(e.key);
  if (UI.screen === 'battle' && B) {
    if (B.phase === 'timing' && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); stopTiming(); return; }
    if (B.phase === 'pick' && n >= 0 && n < B.hand.length) { pickCard(B.hand[n]); return; }
    if (B.phase === 'stat') {
      const st = n >= 0 && n < 3 ? STATS[n] : { s: 's', c: 'c', w: 'w' }[e.key.toLowerCase()];
      if (st) { chooseStat(st); return; }
    }
  }
  if (UI.screen === 'draft' && n >= 0 && n < 3) { draftPick(n); return; }
  if (UI.screen === 'reward' && n >= 0) { takeReward(n); return; }
  if (activate) { e.preventDefault(); active.click(); }
});
window.addEventListener('resize', () => {
  clearTimeout(UI.resizeT);
  UI.resizeT = setTimeout(() => { if (UI.screen === 'map' && S) { renderMap(); centerOnRoom(); } }, 120);
});

/* ===================== INIT ===================== */
UI.screen = 'title';
renderTitle();
// Debug/test hooks (harmless for players)
window.__TOD = { core: TOD, UI, get state() { return S; }, get battle() { return B; }, startRun, quitRun };
