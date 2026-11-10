  // ===== LAND STAGES =====
  function addSolid(s, x, y, w, h, kind) { const o = { x, y, w, h, kind }; s.solids.push(o); return o; }
  function bld(s, x, y, w, h, kind) { s.bld.push(addSolid(s, x, y, w, h, kind)); }
  function fence(s, x1, y1, x2, y2) { s.fences.push(addSolid(s, Math.min(x1, x2) - 4, Math.min(y1, y2) - 4, Math.abs(x2 - x1) + 8, Math.abs(y2 - y1) + 8, 'fence')); }
  function cornField(s, x, y, w, h) { s.corns.push(addSolid(s, x, y, w, h, 'corn')); }
  function tree(s, x, y) { s.trees.push({ x, y }); addSolid(s, x - 7, y - 8, 14, 10, 'trunk'); }
  function bramble(s, x, y, w, h) { s.brambles.push({ x, y, w, h, hp: 3, flash: 0 }); }
  function item(s, type, x, y, extra) { const p = freeSpot(x, y, 10); s.pick.push(Object.assign({ type, x: p.x, y: p.y, r: 10 }, extra)); }
  function foe(s, type, x, y, v) { const p = freeSpot(x, y, 18); s.en.push(mkEnemy(type, p.x, p.y, v)); }
  function blocked(x, y, r) {
    for (const b of S.solids) if (circRect(x, y, r, b)) return true;
    for (const b of S.brambles) if (b.hp > 0 && circRect(x, y, r, b)) return true;
    return false;
  }
  function moveEnt(e, dx, dy) {
    const nx = clamp(e.x + dx, e.r, S.WW - e.r); if (!blocked(nx, e.y, e.r)) e.x = nx;
    const ny = clamp(e.y + dy, e.r, S.WH - e.r); if (!blocked(e.x, ny, e.r)) e.y = ny;
  }
  function freeSpot(x, y, r) {
    if (!blocked(x, y, r)) return { x, y };
    for (let k = 1; k < 60; k++) {
      const a = k * 2.4, d = 6 + k * 5, nx = x + Math.cos(a) * d, ny = y + Math.sin(a) * d;
      if (nx > r && ny > r && nx < S.WW - r && ny < S.WH - r && !blocked(nx, ny, r)) return { x: nx, y: ny };
    }
    return { x, y };
  }
  function nearPath(s, x, y, pad) {
    for (const p of s.paths) for (let i = 0; i < p.pts.length - 1; i++) {
      const [ax, ay] = p.pts[i], [bx, by] = p.pts[i + 1], vx = bx - ax, vy = by - ay;
      const t = clamp(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy), 0, 1);
      if (Math.hypot(x - ax - vx * t, y - ay - vy * t) < p.w / 2 + pad) return true;
    }
    return false;
  }
  function scatterTrees(s, rng, n, avoid) {
    let placed = 0;
    for (let tries = 0; placed < n && tries < n * 40; tries++) {
      const x = 40 + rng() * (s.WW - 190), y = 50 + rng() * (s.WH - 70);
      if (avoid.some((a) => x > a.x - 30 && x < a.x + a.w + 30 && y > a.y - 30 && y < a.y + a.h + 56)) continue;
      if (nearPath(s, x, y, 34) || s.trees.some((t) => Math.abs(t.x - x) < 44 && Math.abs(t.y - y) < 44)) continue;
      tree(s, x, y); placed++;
    }
  }
  function mkEnemy(type, x, y, v) {
    const e = { type, x, y, hx: x, hy: y, kx: 0, ky: 0, flash: 0, fx: 1, walk: 0, moving: false, cd: 1, wind: 0, st: 'idle', sus: 0, calm: 0, tw: 0, tx: x, ty: y, dead: false };
    if (type === 'pap') Object.assign(e, { hp: 12, max: 12, r: 15, st: 'sleep', look: LOOKS.pap, spd: 74 });
    else if (type === 'folk') Object.assign(e, { hp: 3, max: 3, r: 11, look: FOLK[(v || 0) % FOLK.length], spd: 92 });
    else if (type === 'king') Object.assign(e, { hp: 24, max: 24, r: 19, look: LOOKS.king, spd: 66, boss: true, slam: 0 });
    else Object.assign(e, { hp: 14, max: 14, r: 13, look: LOOKS.duke, spd: 108, boss: true });
    return e;
  }

  // ----- the three land layouts (static scenery, pickups and foes) -----
  function layoutStPete(s) {
    bld(s, 60, 560, 200, 150, 'cabin'); bld(s, 620, 330, 130, 90, 'shed');
    bramble(s, 970, 580, 80, 16); bramble(s, 970, 660, 80, 16); bramble(s, 970, 580, 16, 96); bramble(s, 1034, 580, 16, 96);
    fence(s, 880, 240, 1090, 240); fence(s, 880, 240, 880, 340);
    s.mud = [{ x: 300, y: 640, w: 220, h: 100 }, { x: 820, y: 720, w: 260, h: 100 }, { x: 560, y: 190, w: 170, h: 80 }];
    s.paths.push({ w: 46, pts: [[160, 800], [300, 720], [520, 600], [760, 500], [960, 380], [1120, 240], [1245, 190]] });
    item(s, 'branch', 300, 545); item(s, 'axe', 690, 450); item(s, 'purse', 1010, 628);
    item(s, 'food', 450, 300, { v: 24, icon: 'corn' }); item(s, 'food', 880, 640, { v: 24, icon: 'corn' }); item(s, 'food', 1230, 420, { v: 30, icon: 'fish' });
    [[330, 430], [560, 640], [740, 260], [960, 480], [1150, 540], [250, 300], [420, 520]].forEach(([x, y]) => item(s, 'coin', x, y));
    foe(s, 'pap', 400, 770);
  }
  function layoutGrange(s) {
    bld(s, 560, 120, 380, 230, 'mansion'); bld(s, 1080, 600, 150, 110, 'shed'); bld(s, 240, 620, 150, 100, 'cabin');
    fence(s, 470, 440, 650, 440); fence(s, 870, 440, 1050, 440);
    cornField(s, 180, 90, 220, 250); cornField(s, 1100, 150, 230, 250);
    s.mud = [{ x: 420, y: 700, w: 260, h: 110 }, { x: 900, y: 760, w: 200, h: 90 }, { x: 300, y: 380, w: 180, h: 80 }];
    s.paths.push({ w: 50, pts: [[110, 450], [420, 500], [760, 500], [1000, 540], [1200, 470], [1290, 450]] });
    item(s, 'gun', 750, 395); item(s, 'ammo', 1155, 735); item(s, 'salve', 315, 735);
    item(s, 'food', 260, 520, { v: 24, icon: 'corn' }); item(s, 'food', 990, 405, { v: 26, icon: 'melon' });
    item(s, 'food', 700, 830, { v: 26, icon: 'melon' }); item(s, 'food', 1180, 800, { v: 30, icon: 'fish' });
    [[480, 300], [1060, 470], [900, 700], [130, 700], [520, 520], [600, 640], [1000, 330]].forEach(([x, y]) => item(s, 'coin', x, y));
    item(s, 'purse', 700, 60); item(s, 'purse', 1250, 780);
    [[590, 500, 0], [820, 530, 1], [700, 720, 2], [960, 740, 3], [430, 540, 0]].forEach(([x, y, v]) => foe(s, 'folk', x, y, v));
  }
  function layoutBricks(s) {
    bld(s, 300, 100, 200, 140, 'store'); bld(s, 620, 90, 220, 150, 'store'); bld(s, 960, 100, 180, 130, 'cabin');
    bld(s, 260, 640, 180, 130, 'cabin'); bld(s, 560, 650, 200, 130, 'store'); bld(s, 820, 360, 220, 120, 'tent');
    bld(s, 1100, 640, 40, 40, 'crate'); bld(s, 1150, 640, 40, 40, 'crate'); bld(s, 1100, 690, 40, 40, 'crate');
    s.plaza = { x: 520, y: 300, w: 700, h: 330 };
    s.paths.push({ w: 50, pts: [[100, 450], [400, 400], [520, 450]] }); s.paths.push({ w: 50, pts: [[1220, 450], [1290, 450]] });
    item(s, 'lantern', 400, 275); item(s, 'salve', 1050, 265); item(s, 'ammo', 640, 610);
    item(s, 'food', 200, 300, { v: 24, icon: 'corn' }); item(s, 'food', 1150, 580, { v: 26, icon: 'melon' }); item(s, 'food', 480, 540, { v: 30, icon: 'fish' });
    [[250, 500], [540, 260], [900, 300], [1200, 300], [700, 560], [1000, 700], [400, 420]].forEach(([x, y]) => item(s, 'coin', x, y));
    item(s, 'purse', 930, 505); item(s, 'purse', 1250, 200);
    foe(s, 'duke', 1010, 570); foe(s, 'king', 890, 585);
    [[700, 420, 0], [740, 520, 1], [640, 500, 2], [1120, 500, 3], [1120, 420, 0], [560, 430, 1], [780, 580, 2]].forEach(([x, y, v]) => foe(s, 'folk', x, y, v));
  }
  const LAYOUTS = { stpete: layoutStPete, grange: layoutGrange, bricks: layoutBricks };

  function buildLand(def) {
    const rng = seeded(def.seed);
    const s = { type: 'land', def, WW: def.WW, WH: def.WH, solids: [], bld: [], trees: [], fences: [], corns: [], brambles: [], pick: [], en: [],
      proj: [], decoys: [], fx: [], bub: [], party: {}, mud: [], paths: [], plaza: null, time: 0, hint: def.goal, hintT: 5, rng,
      bossOn: false, shake: 0, inv: 0, brace: 0, starve: 0, spcd: { huck: 0, jim: 0, tom: 0 } };
    S = s; // the helpers above read the global stage while we build
    addSolid(s, s.WW - 100, 0, 100, s.WH, 'water');
    LAYOUTS[def.id](s);
    if (game.dbgAt) def = Object.assign({}, def, { start: game.dbgAt });
    game.chars.forEach((id, i) => {
      const p = freeSpot(def.start[0] - i * 30, def.start[1] + (i ? 26 : 0) * (i % 2 ? 1 : -1), 12);
      s.party[id] = { id, x: p.x, y: p.y, r: 12, face: { x: 1, y: 0 }, fx: 1, walk: 0, moving: false, cd: 0, swing: 0, swingA: 0, swR: 40, swArc: 2, kx: 0, ky: 0, flash: 0 };
    });
    const ex = def.exit;
    const avoid = s.solids.filter((b) => b.kind !== 'trunk' && b.kind !== 'water')
      .concat([{ x: ex.x - 60, y: ex.y - 40, w: ex.w + 120, h: ex.h + 80 }, { x: def.start[0] - 90, y: def.start[1] - 90, w: 180, h: 180 }]);
    scatterTrees(s, rng, def.id === 'bricks' ? 14 : def.id === 'grange' ? 40 : 70, avoid);
    return s;
  }
  function inMud(m) { return S.mud.some((r) => { const nx = (m.x - r.x - r.w / 2) / (r.w / 2), ny = (m.y - r.y - r.h / 2) / (r.h / 2); return nx * nx + ny * ny < 1; }); }
  function targetOf(e) {
    let best = null, bd = 420;
    for (const d of S.decoys) { const q = dist(e, d); if (q < bd) { bd = q; best = d; } }
    if (best) return best;
    bd = 1e9;
    for (const id in S.party) { const m = S.party[id], q = dist(e, m); if (q < bd) { bd = q; best = m; } }
    return best;
  }
  function stepToward(e, tx, ty, spd, dt) {
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
    if (d < 1) return;
    moveEnt(e, dx / d * spd * dt, dy / d * spd * dt);
    if (Math.abs(dx) > 0.5) e.fx = dx > 0 ? 1 : -1;
    e.walk += dt * 10; e.moving = true;
  }
  function strike(e, rad, dmg) {
    e.ring = 0.22; e.ringR = rad;
    for (const id in S.party) { const m = S.party[id]; if (dist(e, m) < rad + m.r) hurtParty(dmg, e.x, e.y); }
    for (const d of S.decoys) if (dist(e, d) < rad + d.r) d.t -= 2;
    sfx.hit();
  }
  function makeHostile(e) {
    e.st = 'hostile'; e.sus = 1; e.wind = 0; say(e, pick(['Runaway! Get ’im!', 'That’s Jim! Stop him!', 'Fetch the sheriff!']), 2);
    for (const o of S.en) if (o.type === 'folk' && o.st === 'idle' && !o.dead && dist(o, e) < 240) o.sus = Math.max(o.sus, 0.65);
  }
  function hitEnemy(e, dmg, dir, kb) {
    const s = S; e.hp -= dmg; e.flash = 0.12; e.kx = dir.x * kb; e.ky = dir.y * kb;
    sfx.hit(); burst(e.x, e.y, '#f6e7c1', 6); floatText(e.x, e.y, '-' + dmg, '#fff');
    if (e.type === 'pap' && e.st === 'sleep') { e.st = 'chase'; say(e, 'Who’s there?!', 1.6); }
    if (e.type === 'folk' && e.st !== 'flee' && e.hp > 0) {
      if (e.hp <= 1) { e.st = 'flee'; e.fl = 5; say(e, 'Ow! I’m outta here!', 1.6); } else if (e.st === 'idle') makeHostile(e);
    }
    if (e.boss) s.bossOn = true;
    if (e.hp <= 0) killEnemy(e);
  }
  function killEnemy(e) {
    const s = S; e.dead = true; game.stats.foes++; burst(e.x, e.y, e.type === 'folk' ? '#e8d5b0' : '#f1c232', 14, 150);
    if (e.type === 'pap') { game.score += 20; item(s, 'food', e.x + 14, e.y, { v: 30, icon: 'corn' }); item(s, 'purse', e.x - 14, e.y + 6); floatText(e.x, e.y, 'Pap is down!', '#f1c232'); }
    if (e.boss) {
      game.score += 40; item(s, 'purse', e.x, e.y); item(s, 'coin', e.x + 18, e.y + 8);
      const other = s.en.find((o) => o.boss && !o.dead && o !== e);
      if (other) { other.rage = true; say(other, e.type === 'king' ? 'You’ll pay for that!' : 'Now it’s personal!', 2.2); }
      else { s.hint = 'The Duke and the King flee town! The raft is clear.'; s.hintT = 5; sfx.clear(); }
    }
  }
  function nearestFoe(A, dir, range) {
    let best = null, bd = range;
    for (const e of S.en) {
      if (e.dead || (e.type === 'folk' && e.st !== 'hostile')) continue;
      const d = dist(A, e); if (d > bd) continue;
      if (((e.x - A.x) * dir.x + (e.y - A.y) * dir.y) / (d || 1) < 0.55) continue;
      bd = d; best = e;
    }
    return best;
  }
  function attackLand(A) {
    const g = game, s = S, w = curWeapon(), wid = g.weapons[g.wi];
    let dir = A.face;
    const tg = nearestFoe(A, dir, w.melee ? 90 : 280);
    if (tg) { const d = dist(A, tg) || 1; dir = { x: (tg.x - A.x) / d, y: (tg.y - A.y) / d }; }
    A.face = dir; if (dir.x) A.fx = dir.x > 0 ? 1 : -1;
    A.cd = w.cd * (A.id === 'tom' && wid === 'knife' ? 0.6 : 1);
    if (w.melee) {
      A.swing = 0.16; A.swingA = Math.atan2(dir.y, dir.x); A.swR = w.range; A.swArc = w.arc; sfx.swing();
      const bonus = A.id === 'jim' ? 1 : 0;
      for (const e of s.en) {
        if (e.dead) continue;
        const d = dist(A, e); if (d > w.range + e.r) continue;
        let da = Math.abs(Math.atan2(e.y - A.y, e.x - A.x) - A.swingA); if (da > Math.PI) da = Math.PI * 2 - da;
        if (da <= w.arc / 2 || d < e.r + 14) hitEnemy(e, w.dmg + bonus, dir, w.kb);
      }
      for (const b of s.brambles) {
        if (b.hp <= 0 || !circRect(A.x + dir.x * 30, A.y + dir.y * 30, w.range * 0.6, b)) continue;
        if (w.chop) {
          b.hp -= w.dmg + bonus; b.flash = 0.15; burst(b.x + b.w / 2, b.y + b.h / 2, '#6a8a3a', 8); sfx.hit();
          if (b.hp <= 0) floatText(b.x + b.w / 2, b.y, 'Cleared!', '#9bd17a');
        } else if (s.time - (s.chopHint || -9) > 1.5) { s.chopHint = s.time; floatText(A.x, A.y, 'Needs an axe!', '#ffd27a'); }
      }
    } else {
      if (g.ammo <= 0) { floatText(A.x, A.y, 'No ammo!', '#ffd27a'); A.cd = 0.3; sfx.block(); return; }
      g.ammo--; sfx.gun(); s.shake = Math.max(s.shake, 0.06); A.swing = 0.08; A.swR = 0; A.swArc = 0;
      s.proj.push({ x: A.x + dir.x * 14, y: A.y + dir.y * 14, vx: dir.x * 540, vy: dir.y * 540, dmg: w.dmg, from: 'p', r: 5, life: 0.8, kb: 200 });
    }
  }
  function followAI(m, A, dt) {
    const s = S;
    m.moving = false;
    if (dist(m, A) > 520) { const p = freeSpot(A.x - 30, A.y + 20, 12); m.x = p.x; m.y = p.y; }
    if (m.id === 'tom') { // Tom jumps into any fight nearby
      let tg = null, bd = 170;
      for (const e of s.en) if (!e.dead && (e.st === 'hostile' || (e.boss && s.bossOn) || e.st === 'chase') && dist(m, e) < bd) { bd = dist(m, e); tg = e; }
      if (tg) {
        if (bd > 40) stepToward(m, tg.x, tg.y, CHARS.tom.spd, dt);
        else if (m.cd <= 0) { m.cd = 0.7; const d = bd || 1; hitEnemy(tg, 1, { x: (tg.x - m.x) / d, y: (tg.y - m.y) / d }, 60); m.swing = 0.12; m.swingA = Math.atan2(tg.y - m.y, tg.x - m.x); m.swR = 36; m.swArc = 1.3; }
        return;
      }
    }
    const slot = Object.keys(s.party).indexOf(m.id), side = slot % 2 ? 30 : -30;
    const tx = A.x - A.face.x * 46 - A.face.y * side, ty = A.y - A.face.y * 46 + A.face.x * side;
    const d = Math.hypot(tx - m.x, ty - m.y);
    if (d > 14) stepToward(m, tx, ty, Math.min(CHARS[m.id].spd * 1.12, d * 5), dt);
  }
  function updateEnemy(e, dt) {
    const s = S, members = Object.values(s.party);
    e.flash -= dt; e.cd -= dt; e.calm -= dt; e.ring -= dt; e.moving = false;
    if (Math.abs(e.kx) + Math.abs(e.ky) > 4) { moveEnt(e, e.kx * dt, e.ky * dt); const k = Math.max(0, 1 - 9 * dt); e.kx *= k; e.ky *= k; }
    const faceNearest = () => { const m = targetOf(e); if (m && Math.abs(m.x - e.x) > 4) e.fx = m.x > e.x ? 1 : -1; };
    if (e.type === 'pap') {
      if (e.st === 'sleep') { e.z = (e.z || 0) + dt; if (members.some((m) => dist(m, e) < 150)) { e.st = 'chase'; say(e, 'Where d’ya think yer goin’, boy?!', 2.4); } return; }
      const tg = targetOf(e), d = dist(e, tg);
      if (e.wind > 0) { e.wind -= dt; if (e.wind <= 0) { strike(e, 54, 2); e.cd = 1.5; } return; }
      if (d < 48 && e.cd <= 0) { e.wind = 0.55; return; }
      const wob = Math.sin(s.time * 3 + e.hx) * 0.6;
      stepToward(e, tg.x + wob * 60, tg.y - wob * 60, e.spd, dt);
    } else if (e.type === 'folk') {
      if (e.st === 'idle') {
        const jim = s.party.jim; let rate = -0.3;
        if (jim && e.calm <= 0) {
          if (game.active === 'jim' && dist(e, jim) < 190) rate = 0.9;
          else if (game.active !== 'jim' && dist(e, jim) < 54) rate = 0.5;
        }
        e.sus = clamp(e.sus + rate * dt, 0, 1);
        if (e.sus >= 1) { makeHostile(e); return; }
        e.tw -= dt;
        if (e.tw <= 0) { e.tw = rand(1.5, 3.5); const a = rand(0, 6.28), r = rand(0, 70); e.tx = e.hx + Math.cos(a) * r; e.ty = e.hy + Math.sin(a) * r; }
        if (Math.hypot(e.tx - e.x, e.ty - e.y) > 6) stepToward(e, e.tx, e.ty, 34, dt);
      } else if (e.st === 'hostile') {
        const tg = targetOf(e), d = dist(e, tg);
        if (e.wind > 0) { e.wind -= dt; if (e.wind <= 0) { strike(e, 30, 1); e.cd = 1.1; } return; }
        if (d < 30 && e.cd <= 0) { e.wind = 0.3; return; }
        stepToward(e, tg.x, tg.y, e.spd, dt);
      } else if (e.st === 'flee') {
        e.fl -= dt; const m = targetOf(e);
        stepToward(e, e.x + (e.x - m.x), e.y + (e.y - m.y), 118, dt);
        if (e.fl <= 0) { e.st = 'idle'; e.sus = 0; e.calm = 9; e.hx = e.x; e.hy = e.y; }
      }
    } else if (e.type === 'king') {
      if (!s.bossOn) { faceNearest(); return; }
      const tg = targetOf(e), d = dist(e, tg), rage = e.rage ? 1.3 : 1;
      if (e.slam > 0) {
        e.slam -= dt;
        if (e.slam <= 0) { strike(e, 70, 2); s.shake = Math.max(s.shake, 0.3); burst(e.x, e.y, '#d8c7a0', 14, 160); e.cd = 2.4 / rage; }
        return;
      }
      if (d < 94 && e.cd <= 0) { e.slam = 0.85 / (e.rage ? 1.2 : 1); return; }
      if (d > 56) stepToward(e, tg.x, tg.y, e.spd * rage, dt);
    } else if (e.type === 'duke') {
      if (!s.bossOn) { faceNearest(); return; }
      const tg = targetOf(e), d = dist(e, tg) || 1, rage = e.rage ? 1.3 : 1;
      e.str = e.str || 1; e.sw = (e.sw || 0) - dt; if (e.sw <= 0) { e.sw = rand(1.8, 3); e.str = -e.str; }
      if (e.wind > 0) {
        e.wind -= dt;
        if (e.wind <= 0) { const a = Math.atan2(tg.y - e.y, tg.x - e.x); s.proj.push({ x: e.x, y: e.y, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, dmg: 1, from: 'e', r: 6, life: 2.4, bottle: true }); e.cd = 1.9 / rage; sfx.swing(); }
        return;
      }
      if (e.cd <= 0 && d < 430) { e.wind = 0.35; faceNearest(); return; }
      const ax = (tg.x - e.x) / d, ay = (tg.y - e.y) / d;
      let mx = 0, my = 0;
      if (d < 170) { mx = -ax; my = -ay; } else if (d > 270) { mx = ax; my = ay; }
      mx += -ay * 0.7 * e.str; my += ax * 0.7 * e.str;
      stepToward(e, e.x + mx * 50, e.y + my * 50, e.spd * rage, dt);
    }
  }

  function updateLand(dt) {
    const g = game, s = S;
    if (!commonUpdate(dt)) return;
    const A = s.party[g.active];
    // movement of the character you control
    // the stick is relative to the camera, so rotate it by the camera's heading
    const ix = (input.isDown('ArrowRight') ? 1 : 0) - (input.isDown('ArrowLeft') ? 1 : 0);
    const iy = (input.isDown('ArrowDown') ? 1 : 0) - (input.isDown('ArrowUp') ? 1 : 0);
    const cyw = Math.cos(camCtl.yaw), syw = Math.sin(camCtl.yaw);
    let dx = ix * cyw + iy * syw, dy = -ix * syw + iy * cyw;
    const len = Math.hypot(dx, dy);
    A.moving = len > 0;
    let spd = CHARS[g.active].spd; if (inMud(A)) spd *= 0.55;
    if (len) { dx /= len; dy /= len; A.face = { x: dx, y: dy }; if (dx) A.fx = dx > 0 ? 1 : -1; A.walk += dt * 11; }
    moveEnt(A, dx * spd * dt + A.kx * dt, dy * spd * dt + A.ky * dt);
    for (const id in s.party) {
      const m = s.party[id], k = Math.max(0, 1 - 9 * dt);
      m.kx *= k; m.ky *= k; m.cd -= dt; m.swing -= dt; m.flash -= dt;
      if (id !== g.active) followAI(m, A, dt);
    }
    if (input.isDown('Space', 'KeyJ') && A.cd <= 0) attackLand(A);
    // Royal Nonesuch begins when you get close
    const members = Object.values(s.party);
    if (!s.bossOn) {
      const b = s.en.find((e) => e.boss && !e.dead);
      if (b && members.some((m) => dist(m, b) < 320)) {
        s.bossOn = true; s.hint = 'The Royal Nonesuch! Keep the Duke and King apart.'; s.hintT = 5;
        const k = s.en.find((e) => e.type === 'king'); if (k) say(k, 'Step right up, gentlemen!', 2.5);
      }
    }
    for (const e of s.en) if (!e.dead) updateEnemy(e, dt);
    const king = s.en.find((e) => e.type === 'king' && !e.dead), duke = s.en.find((e) => e.type === 'duke' && !e.dead);
    if (king && duke && s.bossOn && dist(king, duke) < 130) { // "pass the hat": they heal each other when together
      for (const b of [king, duke]) b.hp = Math.min(b.max, b.hp + 2 * dt);
      s.hatT = (s.hatT || 0) - dt; if (s.hatT <= 0) { s.hatT = 5; say(king, 'Pass the hat!', 1.5); floatText(king.x, king.y, '+HP', '#9bd17a'); }
    }
    s.en = s.en.filter((e) => !e.dead);
    // projectiles
    for (const p of s.proj) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (blocked(p.x, p.y, 2)) { p.life = 0; burst(p.x, p.y, '#ddd', 3); continue; }
      if (p.from === 'p') {
        for (const e of s.en) if (!e.dead && dist(p, e) < e.r + p.r + 4) { hitEnemy(e, p.dmg, { x: p.vx / 540, y: p.vy / 540 }, p.kb); p.life = 0; break; }
      } else {
        for (const m of members) if (dist(p, m) < m.r + p.r) { hurtParty(p.dmg, p.x - p.vx, p.y - p.vy); p.life = 0; break; }
      }
    }
    s.proj = s.proj.filter((p) => p.life > 0);
    for (const d of s.decoys) d.t -= dt;
    s.decoys = s.decoys.filter((d) => d.t > 0);
    s.en = s.en.filter((e) => !e.dead);
    for (const b of s.brambles) b.flash -= dt;
    // pickups
    for (let i = s.pick.length - 1; i >= 0; i--) {
      const p = s.pick[i];
      if (members.some((m) => dist(p, m) < p.r + m.r + 4)) { collect(p); s.pick.splice(i, 1); }
    }
    // the way out
    const ex = s.def.exit, bossAlive = s.en.some((e) => e.boss && !e.dead);
    if (circRect(A.x, A.y, A.r, ex)) {
      if (bossAlive) { if (s.hintT < 1) { s.hint = 'Deal with the Duke and the King first!'; s.hintT = 2; } }
      else { finishStage(); return; }
    }
  }
