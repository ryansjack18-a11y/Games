  let game = null, S = null, snap = null, view = null;   // view = the 3D scene for the current stage
  const camCtl = { yaw: 0, pitch: 0.6 };                  // land camera, turned by dragging or Z / C
  //   // game = the run (party, supplies); S = the current stage
  const HUNGER = 0.27;                      // food lost per second
  const RX0 = 190;                          // river: screen x that world distance `dist` maps to

  // ----- data tables -----
  const CHARS = {
    huck: { name: 'Huck', spd: 150, cd: 7,   sp: 'Fib',    col: '#e9b44c', key: '1' },
    jim:  { name: 'Jim',  spd: 128, cd: 5.5, sp: 'Brace',  col: '#d2573a', key: '2' },
    tom:  { name: 'Tom',  spd: 170, cd: 9,   sp: 'Scheme', col: '#6fcf97', key: '3' },
  };
  const LOOKS = {
    huck: { skin: '#f0c39a', shirt: '#5d86c9', pants: '#7a5a33', hat: 'straw' },
    jim:  { skin: '#7b4b2e', shirt: '#c0503a', pants: '#33415c', hat: 'bandana' },
    tom:  { skin: '#f3cba6', shirt: '#3e9b72', pants: '#2e3550', hat: 'cap' },
    pap:  { skin: '#d9a878', shirt: '#6e6a58', pants: '#4a3a2a', hat: 'ragged', beard: '#9a9a90' },
    king: { skin: '#e8b894', shirt: '#6d2f8c', pants: '#3a2a1a', hat: 'crown', beard: '#e6e6e6', scale: 1.3, robe: true },
    duke: { skin: '#efc9a4', shirt: '#26262e', pants: '#554a40', hat: 'tophat', beard: '#222', cape: '#8b1d2c' },
  };
  const FOLK = [
    { skin: '#e9bd96', shirt: '#a05a5a', pants: '#554433', hat: 'bonnet' },
    { skin: '#d9ab82', shirt: '#6a8a5a', pants: '#403a30', hat: 'farmer' },
    { skin: '#f0c8a2', shirt: '#8f7a52', pants: '#2f3a50', hat: 'cap2' },
    { skin: '#c99872', shirt: '#586f9a', pants: '#3a3228', hat: 'none' },
  ];
  const WEAPONS = {
    branch: { name: 'Tree Branch', melee: true, dmg: 1, range: 52, arc: 2.0, cd: 0.34, kb: 150 },
    knife:  { name: 'Case-knife',  melee: true, dmg: 1, range: 38, arc: 1.3, cd: 0.17, kb: 40 },
    axe:    { name: 'Axe',         melee: true, dmg: 3, range: 58, arc: 2.3, cd: 0.8,  kb: 240, chop: true },
    gun:    { name: 'Gun',         melee: false, dmg: 3, cd: 0.65 },
  };
  const FIBS = ["It's my sick pa. Smallpox!", 'Nobody here but white folks!', 'Just fishin’, mister.',
    'Jim? Never heard of him!', 'Ain’t nothin’ to see here.', 'We’re only passin’ through!'];

  // Each stage: type 'land' or 'river'. Stories shown on the card before the stage.
  const STAGES = [
    { id: 'stpete', env: 'day', type: 'land', name: 'St. Petersburg, Missouri', seed: 11, WW: 1400, WH: 900, rain: false,
      title: 'St. Petersburg, Missouri',
      text: 'Pap Finn has locked Huck in the cabin again. Slip past him, scrape together what you can, and reach the canoe on the river. Cairo, Illinois is the way to freedom.',
      tip: 'Pap is sleeping off a jug. Grab the branch and the axe, stay out of the mud, and mind your food.',
      goal: 'Reach the canoe', start: [150, 790], exit: { x: 1190, y: 130, w: 110, h: 110 } },
    { id: 'river1', env: 'rain', type: 'river', name: 'Mississippi River', len: 3200, flow: 85, weather: 'rain', skiffs: [0.6], ph: 0.6,
      join: 'jim', title: 'Jackson’s Island',
      text: 'Jim is waiting on the island. He has run away, and anyone who spots him will try to turn him in. Raft down the river to the Grangerford landing.',
      tip: 'Steer left and right around logs, rocks and snags; up and down speed up or slow the raft. If a skiff comes close, let Huck fib. Jim steers better, but he is easy to see.',
      goal: 'Reach the Grangerford landing' },
    { id: 'grange', env: 'rain', type: 'land', name: 'Grangerford Estate', seed: 23, WW: 1500, WH: 900, rain: true,
      join: 'tom', title: 'The Grangerford Estate',
      text: 'Tom Sawyer turns up, eager to help. The Grangerfords are friendly until they notice Jim. Find the gun in the big house, load up on supplies, and get back to the raft.',
      tip: 'Folk grow suspicious when they see Jim or find him hiding close by. Huck’s Fib calms them. Tom’s Scheme drops a decoy.',
      goal: 'Get supplies, then reach the raft', start: [110, 450], exit: { x: 1290, y: 380, w: 110, h: 140 } },
    { id: 'river2', env: 'storm', type: 'river', name: 'Mississippi River', len: 4400, flow: 100, weather: 'storm', skiffs: [0.3, 0.7], whirl: true, ph: 2.1,
      title: 'A Storm on the River',
      text: 'Thunder rolls in. Wind will shove the raft sideways and lightning will light the snags, and the hunters are still out there.',
      tip: 'Arrows warn you which way each gust will push. Eat when you can: food is running low.',
      goal: 'Reach Bricksville' },
    { id: 'bricks', env: 'dusk', type: 'land', name: 'Bricksville, Arkansas', seed: 37, WW: 1500, WH: 900, rain: false, dusk: true,
      title: 'Bricksville, Arkansas',
      text: 'Two con men, the Duke and the King, are fleecing the town with the Royal Nonesuch, and they’d sell Jim for forty dollars. Stop them. Tom will head home afterward.',
      tip: 'Keep the two apart or they heal each other by passing the hat. Use Tom’s decoy to split them up.',
      goal: 'Defeat the Duke and the King, then reach the raft', start: [100, 450], exit: { x: 1290, y: 380, w: 110, h: 140 } },
    { id: 'river3', env: 'night', type: 'river', name: 'Mississippi River', len: 5600, flow: 108, weather: 'fog', skiffs: [0.25, 0.55, 0.8], whirl: true, ph: 4.0,
      leave: 'tom', title: 'Fog Below Bricksville',
      text: 'Tom has gone home. The fog is thick and Cairo must be close. The lantern, if you found it, helps. Watch for the lights of the town.',
      tip: 'You can only see a short way ahead of the raft. Keep the supplies up and the raft off the snags.',
      goal: 'Reach Cairo, Illinois' },
  ];

  // ----- tiny helpers -----
  function seeded(a) {
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function circRect(cx, cy, r, b) { const dx = cx - clamp(cx, b.x, b.x + b.w), dy = cy - clamp(cy, b.y, b.y + b.h); return dx * dx + dy * dy < r * r; }
  function curWeapon() { return WEAPONS[game.weapons[game.wi]]; }

  // ----- effects: particles, floating text, speech bubbles (3D world coordinates) -----
  function hsh(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function wx(x) { return S.type === 'river' ? x + S.dist - RX0 : x; }  // river logic runs in screen space
  function burst(x, y, col, n, spd, h) {
    spd = spd || 120;
    for (let i = 0; i < n && S.fx.length < 200; i++)
      S.fx.push({ k: 'p', x: wx(x), y: h === undefined ? 18 : h, z: y, vx: rand(-1, 1) * spd, vy: rand(0.4, 1.5) * spd, vz: rand(-1, 1) * spd, t: 0, life: rand(0.3, 0.7), col });
  }
  function floatText(x, y, text, col) {
    const X = wx(x), stack = S.fx.filter((f) => f.k === 't' && f.t < 0.4 && Math.abs(f.x - X) < 40 && Math.abs(f.z - y) < 40).length;
    S.fx.push({ k: 't', x: X, y: 54 + stack * 15, z: y, t: 0, life: 1.2, text, col: col || '#fff' });
  }
  function say(o, text, dur) { S.bub = S.bub.filter((b) => b.o !== o); S.bub.push({ o, text, t: dur || 2.3 }); }
  function updateFx(dt) {
    for (const f of S.fx) {
      f.t += dt;
      if (f.k === 'p') {
        f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; f.vy -= 520 * dt;
        if (f.y < 0.5) { f.y = 0.5; f.vy *= -0.3; f.vx *= 0.6; f.vz *= 0.6; }
      } else f.y += 24 * dt;
    }
    S.fx = S.fx.filter((f) => f.t < f.life);
    for (const b of S.bub) b.t -= dt;
    S.bub = S.bub.filter((b) => b.t > 0);
  }

  // ===== RUN FLOW: story cards, stage loading, checkpoints =====
  const RUN_KEYS = ['score', 'hp', 'food', 'ammo', 'weapons', 'wi', 'chars', 'active', 'lantern', 'stage', 'stats'];
  function newGame() {
    const g = { score: 0, hp: 12, food: 100, ammo: 0, weapons: ['knife'], wi: 0, chars: ['huck'], active: 'huck',
      lantern: false, stage: 0, stats: { fibs: 0, foes: 0 }, note: '' };
    const m = /stage=(\d)/.exec(location.hash || '');  // #stage=N jumps ahead (handy for testing)
    const at = /at=(-?\d+),?(-?\d+)?/.exec(location.hash || ''); if (at) g.dbgAt = [+at[1], +(at[2] || 0)];  // #stage=N&at=x,y starts there
    if (m && +m[1] > 0 && +m[1] < STAGES.length) {
      g.stage = +m[1];
      for (let i = 1; i <= g.stage; i++) enterEffects(g, i);
      g.weapons = ['knife', 'branch', 'axe']; g.wi = 2;
      if (g.stage >= 3) { g.weapons.push('gun'); g.ammo = 6; }
    }
    return g;
  }
  function enterEffects(g, i) {
    const d = STAGES[i];
    if (d.join && !g.chars.includes(d.join)) g.chars.push(d.join);
    if (d.leave) { g.chars = g.chars.filter((c) => c !== d.leave); if (g.active === d.leave) g.active = 'huck'; }
  }
  function openStory() {
    const d = STAGES[game.stage];
    $('#story-chapter').textContent = `Part ${game.stage + 1} of ${STAGES.length} · ${d.type === 'river' ? 'On the river' : 'On land'}`;
    $('#story-title').textContent = d.title;
    $('#story-text').textContent = (game.note ? game.note + ' ' : '') + d.text;
    const nw = d.join ? `${CHARS[d.join].name} joins the party! Press ${CHARS[d.join].key} to switch to ${CHARS[d.join].name}.`
      : d.leave ? `${CHARS[d.leave].name} leaves the party.` : '';
    $('#story-new').hidden = !nw; $('#story-new').textContent = nw;
    $('#story-tip').textContent = d.tip;
    setState(State.STORY);
  }
  function continueStory() {
    if (state !== State.STORY) return;
    audio.unlock(); input.clear();
    loadStage(game.stage); setState(State.PLAYING);
  }
  function loadStage(i) {
    game.stage = i;
    snap = JSON.stringify(RUN_KEYS.reduce((o, k) => { o[k] = game[k]; return o; }, {}));
    const d = STAGES[i];
    S = d.type === 'land' ? buildLand(d) : buildRiver(d);
    disposeView(view); camCtl.yaw = 0; camCtl.pitch = 0.6;
    view = S.type === 'land' ? buildLandView(S) : buildRiverView(S, d.env, false);
    hud.set('lives', d.name); hud.set('score', game.score);
  }
  function retryStage() {
    if (!snap) { startGame(); return; }
    audio.unlock(); input.clear();
    Object.assign(game, JSON.parse(snap));
    game.hp = Math.max(game.hp, 8); game.food = Math.max(game.food, 45); // a little mercy on a retry
    loadStage(game.stage); setState(State.PLAYING);
  }
  function finishStage() {
    const g = game;
    if (g.stage >= STAGES.length - 1) { endGame(true); return; }
    const bonus = 10 + Math.floor(g.food / 10);
    g.score += bonus; g.note = `Stage cleared! +$${bonus} for the supplies you saved.`;
    g.stage++; enterEffects(g, g.stage);
    sfx.clear(); openStory();
  }

  // ===== SHARED RULES: damage, pickups, specials, hunger =====
  function focusPos() { return S.type === 'land' ? S.party[game.active] : S.raft; }
  function hurtParty(n, sx, sy) {
    const s = S; if (s.inv > 0) return false;
    const fp = focusPos();
    if (s.brace > 0) { sfx.block(); floatText(fp.x, fp.y, 'Blocked!', '#cfe8ff'); s.inv = 0.35; return false; }
    game.hp = Math.max(0, game.hp - n); s.inv = 1; s.shake = 0.25; sfx.hurt();
    floatText(fp.x, fp.y, '-' + (n / 2) + '♥', '#ff8a7a'); burst(fp.x, fp.y, '#e0453a', 8);
    if (s.type === 'land' && sx !== undefined) {
      const m = s.party[game.active], a = Math.atan2(m.y - sy, m.x - sx);
      m.kx = Math.cos(a) * 260; m.ky = Math.sin(a) * 260;
    }
    return true;
  }
  function giveTool(id) {
    const g = game;
    if (id === 'lantern') { g.lantern = true; return 'Lantern! Fog hurts less.'; }
    if (!g.weapons.includes(id)) { g.weapons.push(id); g.wi = g.weapons.length - 1; }
    if (id === 'gun') g.ammo = Math.min(12, g.ammo + 6);
    return WEAPONS[id].name + '!';
  }
  function collect(p) {
    const g = game, fp = focusPos(), at = S.type === 'land' ? p : fp;
    switch (p.type) {
      case 'food': g.food = Math.min(100, g.food + p.v); sfx.eat(); floatText(at.x, at.y, '+Food', '#ffd27a'); break;
      case 'coin': g.score += 5; sfx.coin(); floatText(at.x, at.y, '+$5', '#f1c232'); break;
      case 'purse': g.score += 25; sfx.coin(); floatText(at.x, at.y, '+$25', '#f1c232'); break;
      case 'ammo': g.ammo = Math.min(12, g.ammo + 4); sfx.tool(); floatText(at.x, at.y, '+4 shots', '#fff'); break;
      case 'salve': g.hp = Math.min(12, g.hp + 4); sfx.tool(); floatText(at.x, at.y, '+Health', '#ff9aa0'); break;
      default: sfx.tool(); floatText(at.x, at.y, giveTool(p.type), '#9bd17a'); break;
    }
    burst(p.x !== undefined ? p.x : fp.x, p.y !== undefined ? p.y : fp.y, '#ffe9a0', 6, 80);
  }
  function setChar(id) {
    if (!game.chars.includes(id) || id === game.active) return;
    game.active = id; sfx.swap();
    const fp = focusPos(); floatText(fp.x, fp.y, CHARS[id].name, CHARS[id].col);
  }
  function special() {
    const g = game, s = S, id = g.active, fp = focusPos();
    if (s.spcd[id] > 0) { floatText(fp.x, fp.y, 'Not ready', '#c2b393'); return; }
    if (id === 'huck') doFib();
    else if (id === 'jim') { s.brace = 1.4; s.spcd.jim = CHARS.jim.cd; sfx.block(); floatText(fp.x, fp.y, 'Brace!', '#cfe8ff'); burst(fp.x, fp.y, '#cfe8ff', 10); }
    else doScheme();
  }
  function doFib() {
    const s = S; let n = 0, failed = 0; sfx.fib();
    if (s.type === 'land') {
      const hk = s.party.huck; say(hk, pick(FIBS), 2.2);
      for (const e of s.en) {
        if (e.type !== 'folk' || e.dead || e.st === 'flee' || dist(e, hk) > 210 || !(e.sus > 0.15 || e.st === 'hostile')) continue;
        if (e.st === 'hostile' && Math.random() < 0.45) { failed++; continue; }
        e.st = 'idle'; e.sus = 0; e.calm = 7; e.wind = 0; n++; floatText(e.x, e.y, 'Calmed', '#9bd17a');
      }
    } else {
      say(s.raft, pick(FIBS), 2.2);
      for (const k of s.skiffs) {
        if (k.dead || k.st === 'leave' || dist(k, s.raft) > 360 || !(k.sus > 0.1 || k.st === 'hostile')) continue;
        if (k.st === 'hostile' && Math.random() < 0.45) { failed++; continue; }
        k.st = 'leave'; k.sus = 0; n++; say(k, 'Sorry to bother ya!', 2);
      }
    }
    const fp = focusPos();
    if (failed) floatText(fp.x, fp.y, 'They didn’t buy it!', '#ff8a7a');
    if (n) { game.score += 10 * n; game.stats.fibs += n; floatText(fp.x, fp.y, '+$' + 10 * n, '#f1c232'); }
    s.spcd.huck = (n || failed) ? CHARS.huck.cd : 2.5;
  }
  function doScheme() {
    const s = S; s.spcd.tom = CHARS.tom.cd;
    if (s.type === 'land') {
      const m = s.party.tom, p = freeSpot(m.x + m.face.x * 110, m.y + m.face.y * 110, 12);
      s.decoys.push({ x: p.x, y: p.y, t: 4.5, r: 12 }); say(m, 'I’ve got a plan!', 1.8); burst(p.x, p.y, '#f1c232', 12);
    } else {
      say(s.raft, 'Smoke bomb!', 1.6); burst(s.raft.x, s.raft.y, '#cfcfcf', 14);
      for (const k of s.skiffs) if (!k.dead && dist(k, s.raft) < 340) { k.stun = 3.5; burst(k.x, k.y, '#cfcfcf', 8); }
    }
    sfx.tool();
  }
  function handleKey(k) {
    if (k === 'KeyQ') { const c = game.chars; setChar(c[(c.indexOf(game.active) + 1) % c.length]); }
    else if (k === 'Digit1' || k === 'Digit2' || k === 'Digit3') setChar(['huck', 'jim', 'tom'][+k.slice(5) - 1]);
    else if (k === 'KeyE') { game.wi = (game.wi + 1) % game.weapons.length; sfx.swap(); const fp = focusPos(); floatText(fp.x, fp.y, curWeapon().name, '#fff'); }
    else if (k === 'KeyF' || k === 'KeyK') special();
  }
  // Runs first in every stage update. Returns false when the run just ended.
  function commonUpdate(dt) {
    const g = game, s = S;
    s.time += dt; s.inv = Math.max(0, s.inv - dt); s.shake = Math.max(0, s.shake - dt); s.brace = Math.max(0, s.brace - dt);
    s.hintT -= dt; if (s.hintT <= 0) s.hint = '';
    for (const k of input.drain()) handleKey(k);
    for (const id in s.spcd) s.spcd[id] = Math.max(0, s.spcd[id] - dt);
    g.food = Math.max(0, g.food - HUNGER * dt * (s.def.weather === 'storm' ? 1.3 : 1));
    if (g.food <= 0) {
      s.starve += dt;
      if (s.starve >= 3) { s.starve = 0; g.hp = Math.max(0, g.hp - 1); sfx.hurt(); const fp = focusPos(); floatText(fp.x, fp.y, 'Starving!', '#ff8a7a'); s.shake = 0.15; }
    } else s.starve = 0;
    updateFx(dt);
    hud.set('score', g.score);
    if (g.hp <= 0) { endGame(false); return false; }
    return true;
  }

