  // ===== RIVER STAGES: the raft drifts downstream (rules run in a 720x540 window that scrolls with it) =====
  function cl(d, def) { return H / 2 + 78 * Math.sin(d * 0.0021 + def.ph) + 36 * Math.sin(d * 0.0063 + def.ph * 2.3); }
  function hw(d, def) { return 112 + 20 * Math.sin(d * 0.0034 + def.ph * 1.7); }
  function buildRiver(def) {
    const s = { type: 'river', def, dist: 0, len: def.len, raft: { x: 200, y: cl(RX0, def), vx: 0 }, objs: [], skiffs: [], proj: [], fx: [], bub: [],
      time: 0, hint: def.goal, hintT: 5, shake: 0, inv: 0, brace: 0, starve: 0, spcd: { huck: 0, jim: 0, tom: 0 }, next: 420, nextP: 220,
      sk: def.skiffs.map(() => false), wind: { t: 5, warn: 0, left: 0, dir: 1 }, lt: rand(4, 7), flash: 0, cd: 0, swing: 0, swingA: 0, pull: false, bank: false };
    if (game.dbgAt) { s.dist = game.dbgAt[0]; s.next = s.dist + 200; s.nextP = s.dist + 100; }
    return s;
  }
  function spawnObstacle(s, dd) {
    const def = s.def, r = Math.random(), prog = s.dist / s.len, h = hw(dd, def) - 34, off = rand(-h, h);
    let k = r < 0.4 ? 'log' : r < 0.65 ? 'rock' : r < 0.85 ? 'snag' : (def.whirl ? 'whirl' : 'log');
    const o = { k, d: dd, off, hit: false, rot: rand(-0.5, 0.5) };
    if (k === 'log') { o.w = 78; o.h = 18; } else if (k === 'rock') o.r = 19; else if (k === 'snag') o.r = 20; else o.r = 52;
    s.objs.push(o);
    if (prog > 0.5 && Math.random() < 0.35) { const o2 = { k: 'log', d: dd + rand(60, 120), off: clamp(-off + rand(-30, 30), -h, h), hit: false, rot: rand(-0.5, 0.5), w: 78, h: 18 }; s.objs.push(o2); }
  }
  function spawnPickups(s, dd) {
    const g = game, def = s.def, h = hw(dd, def) - 34, r = Math.random();
    const need = g.food < 35 ? 0.6 : g.food < 60 ? 0.35 : 0.2;
    if (r < need) s.objs.push({ k: 'food', d: dd, off: rand(-h, h), icon: pick(['corn', 'fish', 'melon']), v: 26, r: 14 });
    else if (r < need + 0.08 && g.weapons.includes('gun') && g.ammo < 6) s.objs.push({ k: 'ammo', d: dd, off: rand(-h, h), r: 14 });
    else if (r < need + 0.14 && g.hp < 9) s.objs.push({ k: 'salve', d: dd, off: rand(-h, h), r: 14 });
    else { const base = rand(-h, h); for (let i = 0; i < 4; i++) s.objs.push({ k: i === 3 && Math.random() < 0.3 ? 'purse' : 'coin', d: dd + i * 46, off: clamp(base + Math.sin(i) * 26, -h, h), r: 13 }); }
  }
  function spawnSkiff(s) {
    const dd = s.dist + (W + 60 - RX0), y = cl(dd, s.def) + rand(-40, 40);
    s.skiffs.push({ x: W + 60, y, r: 22, hp: 4, st: 'approach', sus: 0, cd: 1.5, shot: 2, stun: 0, flash: 0, dead: false, bob: rand(0, 6), ring: 0 });
    s.hint = 'A skiff! Keep Jim out of sight, and be ready to fib.'; s.hintT = 4;
  }
  function raftAim(s) {
    let best = null, bd = 320;
    for (const k of s.skiffs) if (!k.dead && k.x > s.raft.x - 40) { const d = dist(k, s.raft); if (d < bd && (k.st === 'hostile' || d < 150)) { bd = d; best = k; } }
    if (!best) return { x: 1, y: 0, t: null };
    return { x: (best.x - s.raft.x) / bd, y: (best.y - s.raft.y) / bd, t: best, d: bd };
  }
  function updateRiver(dt) {
    const g = game, s = S, def = s.def, R = s.raft;
    if (!commonUpdate(dt)) return;
    const act = g.active, boost = act === 'jim' ? 1.25 : 1;
    // the camera sits behind the raft: left/right steer across the river, up/down speed up or hold back
    const dy = (input.isDown('ArrowRight') ? 1 : 0) - (input.isDown('ArrowLeft') ? 1 : 0);
    const dx = (input.isDown('ArrowUp') ? 1 : 0) - (input.isDown('ArrowDown') ? 1 : 0);
    R.steer = dy;
    R.x = clamp(R.x + dx * 95 * boost * dt, 110, 340);
    R.y += dy * 135 * boost * dt;
    // weather: gusts shove the raft sideways, storms add lightning
    const wd = s.wind;
    if (def.weather === 'rain' || def.weather === 'storm') {
      const strong = def.weather === 'storm';
      wd.t -= dt;
      if (wd.t <= 0 && wd.left <= 0 && wd.warn <= 0) { wd.warn = 0.9; wd.dir = Math.random() < 0.5 ? -1 : 1; }
      if (wd.warn > 0) { wd.warn -= dt; if (wd.warn <= 0) { wd.left = 1.5; wd.t = strong ? rand(4, 6) : rand(8, 11); } }
      if (wd.left > 0) { wd.left -= dt; R.y += wd.dir * (strong ? 95 : 55) * dt; }
    }
    s.flash = Math.max(0, s.flash - dt);
    if (def.weather === 'storm') { s.lt -= dt; if (s.lt <= 0) { s.lt = rand(5, 9); s.flash = 0.35; sfx.thunder(); } }
    // river banks are soft: you scrape along them and slow down
    const dAt = s.dist + (R.x - RX0), c = cl(dAt, def), h = hw(dAt, def);
    s.bank = false;
    if (R.y < c - h + 24) { R.y = c - h + 24; s.bank = true; } else if (R.y > c + h - 24) { R.y = c + h - 24; s.bank = true; }
    // whirlpools drag the raft back
    s.pull = false;
    for (const o of s.objs) {
      if (o.k !== 'whirl') continue;
      const ox = RX0 + o.d - s.dist, oy = cl(o.d, def) + o.off, dd = Math.hypot(ox - R.x, oy - R.y);
      if (dd < o.r + 22) { s.pull = true; R.y += (oy - R.y) * 0.8 * dt; R.x += (ox - R.x) * 0.5 * dt; }
    }
    s.dist += def.flow * (s.bank ? 0.6 : 1) * (s.pull ? 0.5 : 1) * dt;
    // spawning
    const ahead = s.dist + (W + 70 - RX0), prog = s.dist / s.len;
    if (s.dist >= s.next && s.dist < s.len - 800) { spawnObstacle(s, ahead); s.next += rand(230, 360) * (1.15 - 0.35 * prog); }
    if (s.dist >= s.nextP && s.dist < s.len - 500) { spawnPickups(s, ahead); s.nextP += rand(380, 560); }
    def.skiffs.forEach((f, i) => { if (!s.sk[i] && prog >= f) { s.sk[i] = true; spawnSkiff(s); } });
    // raft collisions and pickups
    for (const o of s.objs) {
      const ox = RX0 + o.d - s.dist, oy = cl(o.d, def) + o.off;
      o.sx = ox; o.sy = oy;
      if (ox < -140 || o.gone) continue;
      if (o.k === 'log') {
        if (!o.hit && circRect(R.x, R.y, 22, { x: ox - o.w / 2, y: oy - o.h / 2, w: o.w, h: o.h })) { o.hit = true; if (hurtParty(2)) { sfx.splash(); burst(ox, oy, '#8a6038', 10); } }
      } else if (o.k === 'rock' || o.k === 'snag') {
        if (!o.hit && Math.hypot(ox - R.x, oy - R.y) < o.r + 20) { o.hit = true; if (hurtParty(2)) { sfx.splash(); burst(ox, oy, '#9a9a9a', 10); } }
      } else if (o.k !== 'whirl' && Math.hypot(ox - R.x, oy - R.y) < o.r + 26) {
        o.gone = true; collect({ type: o.k, v: o.v, x: ox, y: oy });
      }
    }
    s.objs = s.objs.filter((o) => !o.gone && o.sx > -150 || o.sx === undefined);
    // attacks from the raft
    s.cd -= dt; s.swing -= dt;
    if (input.isDown('Space', 'KeyJ') && s.cd <= 0) raftAttack(s);
    // skiffs
    for (const k of s.skiffs) if (!k.dead) updateSkiff(k, dt, s);
    s.skiffs = s.skiffs.filter((k) => !k.dead && k.x > -120);
    for (const p of s.proj) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.from === 'p') {
        for (const k of s.skiffs) if (!k.dead && dist(p, k) < k.r + 8) { hitSkiff(k, p.dmg); p.life = 0; break; }
      } else if (dist(p, R) < 26) { if (hurtParty(1)) burst(R.x, R.y, '#e0453a', 6); p.life = 0; }
    }
    s.proj = s.proj.filter((p) => p.life > 0);
    if (s.dist >= s.len) finishStage();
  }
  function raftAttack(s) {
    const g = game, w = curWeapon(), wid = g.weapons[g.wi], aim = raftAim(s), R = s.raft;
    s.cd = w.cd * (g.active === 'tom' && wid === 'knife' ? 0.6 : 1);
    if (w.melee) {
      s.swing = 0.16; s.swingA = Math.atan2(aim.y, aim.x); sfx.swing();
      const bonus = g.active === 'jim' ? 1 : 0;
      for (const k of s.skiffs) if (!k.dead && dist(k, R) < w.range + k.r + 26) { hitSkiff(k, w.dmg + bonus); k.x += aim.x * 30; k.y += aim.y * 30; }
    } else {
      if (g.ammo <= 0) { floatText(R.x, R.y, 'No ammo!', '#ffd27a'); s.cd = 0.3; sfx.block(); return; }
      g.ammo--; sfx.gun(); s.shake = Math.max(s.shake, 0.06);
      s.proj.push({ x: R.x + aim.x * 20, y: R.y + aim.y * 20 - 10, vx: aim.x * 540, vy: aim.y * 540, dmg: w.dmg, from: 'p', life: 1 });
    }
  }
  function hitSkiff(k, dmg) {
    k.hp -= dmg; k.flash = 0.12; sfx.hit(); burst(k.x, k.y, '#8a6038', 6); floatText(k.x, k.y, '-' + dmg, '#fff');
    if (k.st !== 'hostile' && k.hp > 0) { k.st = 'hostile'; say(k, 'He’s armed! Get ’im!', 1.8); }
    if (k.hp <= 0) {
      k.dead = true; game.stats.foes++; game.score += 15; burst(k.x, k.y, '#e8d5b0', 14, 150); floatText(k.x, k.y, '+$15', '#f1c232');
      const dd = S.dist + (k.x - RX0), o = { k: 'coin', d: dd, off: k.y - cl(dd, S.def), r: 13 };
      S.objs.push(o, { k: 'food', d: dd + 30, off: o.off, icon: 'corn', v: 20, r: 14 });
    }
  }
  function updateSkiff(k, dt, s) {
    const R = s.raft, g = game; k.flash -= dt; k.ring -= dt; k.bob += dt * 3;
    if (k.stun > 0) { k.stun -= dt; k.x -= 20 * dt; return; }
    const d = dist(k, R) || 1, ux = (R.x - k.x) / d, uy = (R.y - k.y) / d;
    if (k.st === 'approach') {
      k.x += ux * 62 * dt; k.y += uy * 62 * dt;
      let rate = -0.25;
      if (g.active === 'jim' && d < 230) rate = 0.7;
      else if (g.active !== 'jim' && d < 95) rate = 0.35;
      k.sus = clamp(k.sus + rate * dt, 0, 1);
      if (k.sus >= 1) { k.st = 'hostile'; say(k, 'That’s a runaway! Hand ’im over!', 2.2); }
      if (d < 70) { k.x -= ux * 62 * dt; k.y -= uy * 62 * dt; } // hold alongside and look
    } else if (k.st === 'hostile') {
      k.x += ux * 105 * dt; k.y += uy * 105 * dt; k.cd -= dt; k.shot -= dt;
      if (d < 46 && k.cd <= 0) { k.cd = 1.5; if (hurtParty(2)) { k.x -= ux * 50; k.y -= uy * 50; } k.ring = 0.2; }
      if (k.shot <= 0 && d < 300 && d > 80) { k.shot = 2.2; s.proj.push({ x: k.x, y: k.y - 8, vx: ux * 290, vy: uy * 290, dmg: 1, from: 'e', life: 1.6 }); sfx.gun(); }
    } else { // leaving
      k.x -= (s.def.flow * 1.4) * dt; k.y += (k.y > H / 2 ? 1 : -1) * 20 * dt;
    }
    const dAt = s.dist + (k.x - RX0), c = cl(dAt, s.def), h = hw(dAt, s.def);
    k.y = clamp(k.y, c - h + 20, c + h - 20);
  }
