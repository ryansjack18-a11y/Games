
  // ===== LAND VIEW: builds the 3D town for a land stage and keeps it in step with the rules =====
  // The flat ground detail (grass, paths, mud, cobbles) is painted once into a texture.
  function paintGround(s, g, SC, gw, env, rng) {
    const WH = s.WH; g.scale(SC, SC);
    g.fillStyle = env.grass; g.fillRect(0, 0, gw, WH);
    for (let i = 0; i < 60; i++) {
      g.fillStyle = rng() < 0.5 ? 'rgba(255,255,170,.06)' : 'rgba(0,40,0,.08)';
      g.beginPath(); g.ellipse(60 + rng() * (gw - 120), 60 + rng() * (WH - 120), 50 + rng() * 110, 30 + rng() * 60, rng() * 3, 0, 7); g.fill();
    }
    const bl = ['rgba(40,90,40,.5)', 'rgba(140,190,90,.45)', 'rgba(30,70,30,.45)', 'rgba(160,200,110,.4)'];
    for (let i = 0; i < gw * WH / 260; i++) { g.fillStyle = bl[i & 3]; g.fillRect(rng() * gw, rng() * WH, 1.3, 3 + rng() * 4); }
    const poly = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const p of s.paths) {
      g.strokeStyle = 'rgba(90,70,40,.35)'; g.lineWidth = p.w + 18; poly(p.pts);
      g.strokeStyle = '#8a6c46'; g.lineWidth = p.w + 6; poly(p.pts); g.strokeStyle = '#b8946a'; g.lineWidth = p.w - 2; poly(p.pts);
      g.fillStyle = 'rgba(90,70,40,.35)';
      for (let i = 0; i < p.pts.length - 1; i++) for (let k = 0; k < 26; k++) {
        const t = rng(), [ax, ay] = p.pts[i], [bx, by] = p.pts[i + 1];
        g.fillRect(ax + (bx - ax) * t + (rng() - 0.5) * p.w * 0.8, ay + (by - ay) * t + (rng() - 0.5) * p.w * 0.8, 2.5, 2);
      }
    }
    if (s.plaza) { // cobbled square
      const z = s.plaza; g.fillStyle = '#8c8576'; g.fillRect(z.x, z.y, z.w, z.h);
      for (let y = z.y; y < z.y + z.h; y += 9) for (let x = z.x + ((y / 9) & 1) * 6; x < z.x + z.w; x += 12) {
        const v = rng(); g.fillStyle = v < 0.33 ? '#a39b88' : v < 0.66 ? '#8f8878' : '#7a7466'; g.fillRect(x + 0.6, y + 0.6, 10.6, 7.6);
      }
      g.strokeStyle = '#5c574d'; g.lineWidth = 5; g.strokeRect(z.x, z.y, z.w, z.h);
    }
    for (const m of s.mud) { // churned mud from the rain
      const cx = m.x + m.w / 2, cy = m.y + m.h / 2;
      g.fillStyle = 'rgba(60,42,24,.5)'; g.beginPath(); g.ellipse(cx, cy, m.w / 2 + 12, m.h / 2 + 12, 0, 0, 7); g.fill();
      g.fillStyle = '#4a3420'; g.beginPath(); g.ellipse(cx, cy, m.w / 2 + 4, m.h / 2 + 4, 0, 0, 7); g.fill();
      g.fillStyle = '#6b4e2e'; g.beginPath(); g.ellipse(cx, cy, m.w / 2 - 3, m.h / 2 - 3, 0, 0, 7); g.fill();
      for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(150,180,200,.4)'; g.beginPath(); g.ellipse(m.x + m.w * (0.25 + rng() * 0.5), m.y + m.h * (0.3 + rng() * 0.4), m.w * (0.07 + rng() * 0.1), m.h * (0.06 + rng() * 0.08), 0, 0, 7); g.fill(); }
    }
    const sg = g.createLinearGradient(gw - 34, 0, gw, 0); sg.addColorStop(0, 'rgba(205,178,122,0)'); sg.addColorStop(0.55, '#cdb27a'); sg.addColorStop(1, '#cdb27a');
    g.fillStyle = sg; g.fillRect(gw - 34, 0, 34, WH);
  }
  function makeDecoy() {
    const g = new T.Group();
    mk(G.cyl6, M('#6b4a2a'), g, 0, 21, 0, 1.8, 42, 1.8); const arms = mk(G.cyl6, M('#6b4a2a'), g, 0, 30, 0, 1.4, 34, 1.4); arms.rotation.z = Math.PI / 2; g.arms = arms;
    mk(G.box, M('#c4352f'), g, 0, 26, 0, 16, 15, 7); mk(G.sph, M('#d8b46a'), g, 0, 42, 0, 7);
    mk(G.cyl, M('#e3c264'), g, 0, 47, 0, 12, 1.1, 12); mk(G.cyl, M('#e3c264'), g, 0, 50.5, 0, 6.2, 6, 6.2);
    return g;
  }
  function makeShot(p) {
    const g = new T.Group();
    if (p.bottle) { const b = new T.Group(); mk(G.cyl6, M('#4c9a6a'), b, 0, 0, 0, 2.6, 10, 2.6); mk(G.cyl6, M('#9ad0b0'), b, 0, 6.5, 0, 1.2, 4, 1.2); g.add(b); g.spin = b; }
    else { mk(G.sph, basic('#fff2c0'), g, 0, 0, 0, 2.2, 2.2, 9, true); g.add(glowSprite('#ffd070', 34, 0.9)); }
    return g;
  }

  function buildLandView(s) {
    const def = s.def, v = makeWorld(def.env), env = v.env, sc = v.scene, gw = s.WW - 100, WH = s.WH, rng = seeded(def.seed * 7 + 3);
    v.kind = 'land'; v.focus = null;
    // --- ground, river bank and the far shore ---
    const SC = MOBILE ? 1.5 : 2;
    const tex = canvasTex(Math.round(gw * SC), Math.round(WH * SC), (g) => paintGround(s, g, SC, gw, env, rng)); tex.anisotropy = R3.capabilities.getMaxAnisotropy();
    const ground = new T.Mesh(new T.PlaneGeometry(gw, WH), new T.MeshLambertMaterial({ map: tex }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(gw / 2, 0, WH / 2); ground.receiveShadow = true; sc.add(ground);
    const grassMat = new T.MeshLambertMaterial({ color: C(env.grass) });
    const outer = mk(G.plane, grassMat, sc, gw - 4500, -0.7, WH / 2, 9000, 10000, 1, true); outer.rotation.x = -Math.PI / 2; outer.receiveShadow = true;
    const bank = mk(G.box, M('#cdb27a'), sc, gw + 19, -11.7, WH / 2, 42, 12, 10000, true); bank.rotation.z = -0.27; bank.receiveShadow = true;
    const wm = makeWater(env, 2, gw + 6); v.waters.push(wm);
    mk(G.plane, wm, sc, gw + 1490, -2.4, WH / 2, 3000, 10000, 1, true).rotation.x = -Math.PI / 2;
    mk(G.box, grassMat, sc, gw + 640 + 1700, -9, WH / 2, 3400, 24, 10000, true);
    const hillMat = new T.MeshLambertMaterial({ color: C(env.grass).clone().multiplyScalar(0.62) });
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * 6.283 + rng() * 0.3, r = 2700 + rng() * 900, R = 600 + rng() * 600;
      mk(G.hemi, hillMat, sc, gw / 2 + Math.cos(a) * r, -30, WH / 2 + Math.sin(a) * r, R, R * (0.3 + rng() * 0.25), R, true);
    }
    // --- the way out: a landing with a boat, a glowing frame and a beam you can see from far off ---
    const ex = def.exit, ecx = ex.x + ex.w / 2, ez = ex.y + ex.h / 2;
    mk(G.box, M('#8a6a42'), sc, gw + 46, -0.4, ez, 110, 3, 54);
    inst(G.cyl6, MW, [0, 1, 2, 3, 4, 5].map((i) => [gw + 8 + Math.floor(i / 2) * 44, -4, ez + (i % 2 ? 26 : -26), 3.2, 20, 3.2, 0, '#5c4526']), sc);
    for (let i = 0; i < 8; i++) mk(G.box, M('#6e5232'), sc, gw - 6 + i * 14, 1.2, ez, 1.2, 0.4, 54, true);
    v.boat = def.id === 'stpete' ? makeCanoe() : makeRaft(!!env.lit);
    v.boat.position.set(gw + (def.id === 'stpete' ? 52 : 62), 0, ez + (def.id === 'stpete' ? 44 : 66)); sc.add(v.boat);
    v.exitMat = new T.MeshBasicMaterial({ color: new T.Color('#f1c232'), transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false, side: T.DoubleSide });
    v.beamMat = v.exitMat.clone();
    for (const [x, z, sx, sz] of [[ecx, ex.y, ex.w, 4], [ecx, ex.y + ex.h, ex.w, 4], [ex.x, ez, 4, ex.h], [ex.x + ex.w, ez, 4, ex.h]]) mk(G.box, v.exitMat, sc, x, 1.4, z, sx, 1.6, sz, true);
    mk(G.tube, v.beamMat, sc, ecx, 300, ez, 7, 600, 7, true);
    v.arrow = mk(G.cone, v.exitMat, sc, ecx, 80, ez, 11, 24, 11, true); v.arrow.rotation.x = Math.PI;
    // --- buildings ---
    v.blds = s.bld.map((b) => {
      const B = makeBuilding(b, !!env.lit); sc.add(B.g); B.k = 1;
      B.box = new T.Box3(new T.Vector3(b.x - 8, 0, b.y - 8), new T.Vector3(b.x + b.w + 8, B.top, b.y + b.h + 8)); return B;
    });
    // --- fences, corn, brambles ---
    const posts = [], rails = [];
    for (const f of s.fences) {
      const hz = f.w > f.h, len = (hz ? f.w : f.h) - 8, cx = f.x + f.w / 2, cz = f.y + f.h / 2;
      for (let t = 0; t <= len + 0.1; t += len / Math.round(len / 15)) posts.push([hz ? f.x + 4 + t : cx, 12, hz ? cz : f.y + 4 + t, 3.2, 24, 3.2, 0, '#ece4cc']);
      for (const y of [9, 19]) rails.push([cx, y, cz, hz ? len : 2, 2.6, hz ? 2 : len, 0, '#d9d0b4']);
    }
    inst(G.box, MW, posts, sc); inst(G.box, MW, rails, sc);
    const stalks = [], cobs = [];
    for (const f of s.corns) for (let x = f.x + 6; x < f.x + f.w - 4; x += 11) for (let z = f.y + 6; z < f.y + f.h - 4; z += 11) {
      const jx = x + rng() * 5 - 2.5, jz = z + rng() * 5 - 2.5, h = 36 + rng() * 16;
      stalks.push([jx, h / 2, jz, 3.2, h, 3.2, rng() * 6, rng() < 0.5 ? '#6f9a3a' : '#88b04a']);
      if (rng() < 0.4) cobs.push([jx + 1.5, h * 0.55, jz, 1.6, 6, 1.6, 0, '#e8cc5a', 0, 0.4]);
    }
    inst(G.cone3, MW, stalks, sc); inst(G.box, MW, cobs, sc, false);
    v.bram = new Map();
    for (const b of s.brambles) {
      const g = new T.Group(), hz = b.w > b.h, n = Math.max(2, Math.round(Math.max(b.w, b.h) / 15));
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, x = hz ? b.x + b.w * t : b.x + b.w / 2, z = hz ? b.y + b.h / 2 : b.y + b.h * t, r = 9 + rng() * 3;
        const ball = mk(G.ico0, M(rng() < 0.5 ? '#46602a' : '#3a5224'), g, x, r * 0.8, z, r, r * 1.05, r); ball.rotation.set(rng() * 3, rng() * 3, 0);
        for (let k = 0; k < 4; k++) { const a = rng() * 6.28, sp = mk(G.cone3, M('#8a4a2a'), g, x + Math.cos(a) * r * 0.8, r * (0.6 + rng()), z + Math.sin(a) * r * 0.8, 1.6, 9, 1.6); sp.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1); }
      }
      sc.add(g); v.bram.set(b, g);
    }
    // --- trees: the ones you can bump into, a forest wall around the stage, and the far shore ---
    const tl = s.trees.map((t) => ({ x: t.x, z: t.y, s: 0.9 + hsh(t.x + t.y) * 0.35, pine: hsh(t.x * 3 + t.y) < 0.2 }));
    for (let i = 0, n = 0; n < (MOBILE ? 200 : 320) && i < 6000; i++) {
      const x = -700 + rng() * (gw + 680), z = -700 + rng() * (WH + 1300);
      if (x > -34 && z > -34 && z < WH + 34) continue;
      tl.push({ x, z, s: 1.05 + rng() * 0.8, pine: rng() < 0.3 }); n++;
    }
    for (let i = 0; i < 70; i++) tl.push({ x: gw + 680 + rng() * 900, y: 3, z: -900 + rng() * (WH + 1800), s: 1.2 + rng() * 0.9, pine: rng() < 0.35 });
    v.trees = buildTrees(tl, sc, false);
    // --- small ground cover: grass tufts, flowers and stones (no collisions) ---
    const tufts = [], flowers = [], stones = [], gcol = ['#4f8a3a', '#6aa04a', '#7ab257', '#467c36'], fcol = ['#f6e27a', '#f4f4f4', '#e88fb0', '#c59af0'];
    const open = (x, z) => !nearPath(s, x, z, 5) && !(s.plaza && x > s.plaza.x - 4 && x < s.plaza.x + s.plaza.w + 4 && z > s.plaza.y - 4 && z < s.plaza.y + s.plaza.h + 4)
      && !s.mud.some((m) => x > m.x && x < m.x + m.w && z > m.y && z < m.y + m.h) && !blocked(x, z, 4) && x < gw - 30;
    for (let i = 0; i < 9000 && tufts.length < (MOBILE ? 1100 : 2400); i++) {
      const x = rng() * gw, z = rng() * WH; if (!open(x, z)) continue;
      const h = 6 + rng() * 8; tufts.push([x, h / 2 - 0.5, z, 1.5 + rng(), h, 1.5 + rng(), rng() * 6, gcol[i & 3], (rng() - 0.5) * 0.4, (rng() - 0.5) * 0.4]);
      if (rng() < 0.07) flowers.push([x + 3, h * 0.7, z + 2, 1.8, 1.8, 1.8, 0, fcol[i % 4]]);
      if (rng() < 0.012) stones.push([x - 4, 1.5, z + 5, 4 + rng() * 5, 3 + rng() * 3, 4 + rng() * 4, rng() * 6, rng() < 0.5 ? '#8a8d90' : '#74777c']);
    }
    inst(G.cone3, MW, tufts, sc, false); inst(G.ico0, MW, flowers, sc, false); inst(G.ico0, MW, stones, sc);
    // --- street lamps on the square at dusk ---
    if (env.lit && s.plaza) {
      const z = s.plaza;
      for (const [x, y] of [[z.x + 40, z.y + 40], [z.x + z.w - 40, z.y + 40], [z.x + 40, z.y + z.h - 40], [z.x + z.w - 40, z.y + z.h - 40]]) {
        mk(G.cyl6, M('#2a2a30'), sc, x, 32, y, 1.8, 64, 1.8); mk(G.box, basic('#ffd98a'), sc, x, 68, y, 7, 9, 7, true); mk(G.cone4, M('#2a2a30'), sc, x, 75, y, 7, 5, 7).rotation.y = 0.785;
        const gs = glowSprite('#ffb85a', 120, 0.55); gs.position.set(x, 68, y); sc.add(gs);
        const pl = new T.PointLight(C('#ffb060'), 1.5, 420, 1.5); pl.position.set(x, 70, y); sc.add(pl);
      }
    }
    if (def.rain) { v.rain = makeRain(MOBILE ? 500 : 1100, false); sc.add(v.rain.obj); }
    // --- the party and everything that moves ---
    v.party = {};
    for (const id in s.party) {
      const P = makePerson(LOOKS[id]); sc.add(P.g); v.party[id] = P;
      P.ring = mk(G.ring, basic(CHARS[id].col, { transparent: true, opacity: 0.9, depthWrite: false }), P.g, 0, 1, 0, 18, 18, 1, true); P.ring.rotation.x = -Math.PI / 2;
      P.shield = mk(G.sph, basic('#cfe8ff', { transparent: true, opacity: 0.28, depthWrite: false }), P.g, 0, 22, 0, 32, 32, 32, true);
      P.arc = mk(G.arc, basic('#ffffff', { transparent: true, opacity: 0.7, depthWrite: false, side: T.DoubleSide }), P.g, 0, 20, 0, 40, 40, 1, true); P.arc.rotation.x = -Math.PI / 2;
    }
    v.en = new Map(); v.pick = new Map(); v.dec = new Map(); v.shots = new Map();
    return v;
  }
  function makeFoe(e) {
    const P = makePerson(e.look), r = e.type === 'king' ? 70 : e.type === 'pap' ? 54 : 30;
    holdTool(P, e.type === 'pap' ? 'jug' : e.type === 'king' ? 'scepter' : e.type === 'duke' ? 'bottle' : null);
    // the wrapper also holds the two ground markers: the red "about to strike" disc and the impact ring
    const g = new T.Group(); g.add(P.g);
    const tele = mk(G.disc, basic('#e0453a', { transparent: true, opacity: 0.3, depthWrite: false }), g, 0, 1.2, 0, r, r, 1, true); tele.rotation.x = -Math.PI / 2;
    const hit = mk(G.ring, basic('#fff0c8', { transparent: true, opacity: 0.8, depthWrite: false }), g, 0, 1.6, 0, r, r, 1, true); hit.rotation.x = -Math.PI / 2;
    return { g, P, tele, hit };
  }
  const _ray = new T.Ray(), _cp = new T.Vector3(), _tp = new T.Vector3(), _hp = new T.Vector3();
  function syncLandView(v, s, dt) {
    const g = game, sc = v.scene, A = s.party[g.active];
    // camera: orbits the active character; drag or Z / C to turn it
    if (dt > 0) { if (input.isDown('KeyZ')) camCtl.yaw += 1.9 * dt; if (input.isDown('KeyC')) camCtl.yaw -= 1.9 * dt; }
    if (!v.focus) v.focus = new T.Vector3(A.x, 0, A.y);
    v.focus.x += (A.x - v.focus.x) * Math.min(1, dt * 7); v.focus.z += (A.y - v.focus.z) * Math.min(1, dt * 7);
    const D = 400, cp = Math.cos(camCtl.pitch), sp = Math.sin(camCtl.pitch), f = v.focus;
    cam.position.set(f.x + Math.sin(camCtl.yaw) * cp * D, 28 + sp * D, f.z + Math.cos(camCtl.yaw) * cp * D);
    if (s.shake > 0 && !REDUCE_MOTION && dt > 0) { cam.position.x += rand(-4, 4); cam.position.y += rand(-4, 4); }
    cam.lookAt(f.x, 30, f.z);
    // the party
    for (const id in s.party) {
      const m = s.party[id], P = v.party[id], act = id === g.active, hidden = id === 'jim' && !act;
      P.g.position.set(m.x, 0, m.y);
      if (act) turnTo(P, m.x, m.y, dt, m.face.x, m.face.y); else turnTo(P, m.x, m.y, dt, 0, 0, m.moving);
      const wid = act ? g.weapons[g.wi] : id === 'tom' ? 'knife' : null; holdTool(P, wid);
      posePerson(P, { walk: m.walk, moving: m.moving, swing: m.swing > 0 ? clamp(m.swing / 0.16, 0, 1) : 0, aim: act && wid === 'gun', crouch: hidden });
      P.ring.visible = act; P.shield.visible = act && s.brace > 0;
      P.arc.visible = m.swing > 0 && m.swR > 0;
      if (P.arc.visible) { P.arc.scale.set(m.swR, m.swR, 1); P.arc.material.opacity = Math.min(0.75, m.swing * 6); }
      P.body.visible = !(act && s.inv > 0 && Math.floor(s.inv * 14) % 2);
    }
    // foes and townsfolk
    syncSet(v.en, s.en, sc, makeFoe, (e, F) => {
      const P = F.P; P.g.position.set(e.x, 0, e.y);
      const winding = e.wind > 0 || e.slam > 0, tg = (winding || (!e.moving && (e.st === 'hostile' || e.st === 'chase' || (e.boss && s.bossOn)))) ? targetOf(e) : null;
      if (tg) turnTo(P, e.x, e.y, dt, tg.x - e.x, tg.y - e.y); else turnTo(P, e.x, e.y, dt, 0, 0, e.moving);
      posePerson(P, { walk: e.walk, moving: e.moving, lie: e.st === 'sleep', raise: winding, pop: Math.max(0, e.flash) });
      F.tele.visible = winding; F.tele.position.set(e.x, 1.2, e.y); if (winding) F.tele.material.opacity = 0.24 + 0.14 * Math.sin(v.t * 30);
      F.hit.visible = e.ring > 0; if (e.ring > 0) { const r = e.ringR * (1.25 - e.ring * 2); F.hit.position.set(e.x, 1.6, e.y); F.hit.scale.set(r, r, 1); F.hit.material.opacity = Math.min(1, e.ring * 4); }
    });
    syncSet(v.pick, s.pick, sc, (p) => makePickup(p.type, p.icon), (p, m) => {
      m.position.set(p.x, 0, p.y); m.spin.rotation.y = v.t * 2 + p.x; m.spin.position.y = 15 + Math.sin(v.t * 3 + p.x) * 3; m.glow.material.opacity = 0.45 + 0.2 * Math.sin(v.t * 4 + p.y);
    });
    syncSet(v.dec, s.decoys, sc, makeDecoy, (d, m) => { m.position.set(d.x, 0, d.y); m.arms.rotation.x = Math.sin(v.t * 9) * 0.35; m.visible = d.t > 1 || Math.floor(v.t * 14) % 2 === 0; });
    syncSet(v.shots, s.proj, sc, makeShot, (p, m) => { m.position.set(p.x, 24, p.y); if (m.spin) m.spin.rotation.x = v.t * 14; m.rotation.y = Math.atan2(p.vx, p.vy); });
    for (const [b, m] of v.bram) { m.visible = b.hp > 0; m.position.x = b.flash > 0 ? rand(-2, 2) : 0; }
    // the exit: gold when open, red while the Duke and the King still stand
    const locked = s.en.some((e) => e.boss && !e.dead);
    v.exitMat.color.set(locked ? '#d2573a' : '#f1c232'); v.exitMat.opacity = 0.55 + 0.3 * Math.sin(v.t * 4);
    v.beamMat.color.set(locked ? '#d2573a' : '#f1c232'); v.beamMat.opacity = locked ? 0.07 : 0.15 + 0.05 * Math.sin(v.t * 3);
    v.arrow.visible = !locked; v.arrow.position.y = 80 + Math.sin(v.t * 4) * 8; v.arrow.rotation.y = v.t * 2;
    v.boat.position.y = Math.sin(v.t * 1.6) * 1.2 - 1; v.boat.rotation.x = Math.sin(v.t * 1.3) * 0.03;
    // anything between the camera and the player gets out of the way
    _cp.copy(cam.position); _tp.set(A.x, 30, A.y);
    const dist = _cp.distanceTo(_tp); _ray.origin.copy(_cp); _ray.direction.copy(_tp).sub(_cp).normalize();
    const gx = _tp.x - _cp.x, gz = _tp.z - _cp.z, G2 = gx * gx + gz * gz, GL = Math.sqrt(G2) || 1;
    for (const B of v.blds) {
      // fade a building that hides the player, or that stands in the foreground between the lens and the player
      const bx = (B.box.min.x + B.box.max.x) / 2 - _cp.x, bz = (B.box.min.z + B.box.max.z) / 2 - _cp.z, gu = (bx * gx + bz * gz) / G2, lat = Math.abs(bx * gz - bz * gx) / GL;
      const fore = gu > -0.2 && gu < 0.72 && lat < 60 + 250 * Math.max(gu, 0) + (B.box.max.x - B.box.min.x) / 2;
      const hit = _ray.intersectBox(B.box, _hp), want = fore || (hit && _cp.distanceTo(_hp) < dist - 6) ? 0.2 : 1;
      if (Math.abs(want - B.k) < 0.005) continue;
      B.k += (want - B.k) * Math.min(1, dt * 9); if (Math.abs(want - B.k) < 0.01) B.k = want;
      for (const m of B.mats) { const tr = B.k < 0.99; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = B.k; }
    }
    treeOcclude(v.trees, _cp, _tp, dt);
    v.sparks.update(s.fx);
    worldTick(v, v.focus, dt, 0, 0);
  }
