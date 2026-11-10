
  // ===== RIVER VIEW: a winding valley built along the river, seen from behind the raft =====
  function vnoise(x, y) {
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), w = fy * fy * (3 - 2 * fy);
    const h = (a, b) => hsh(a * 12.9898 + b * 78.233);
    return (h(i, j) * (1 - u) + h(i + 1, j) * u) * (1 - w) + (h(i, j + 1) * (1 - u) + h(i + 1, j + 1) * u) * w;
  }
  // Height of the land at river distance d and cross-river position z. Zero is the waterline.
  function riverH(d, z, def) {
    const e = Math.abs(z - cl(d, def)) - hw(d, def);
    if (e < 0) return Math.max(-24, e * 0.8);
    let h = Math.min(e * 0.45, 13);
    if (e > 30) { const f = clamp((e - 30) / 380, 0, 1); h += f * f * (40 + 90 * vnoise(d * 0.004, z * 0.004)) + Math.max(0, e - 300) * 0.24; }
    return h;
  }
  const LANDINGS = { river1: 'GRANGERFORD LANDING', river2: 'BRICKSVILLE', river3: 'CAIRO, ILLINOIS' };
  function buildRiverView(s, envName, title) {
    const def = s.def, v = makeWorld(envName), env = v.env, sc = v.scene, L = s.len;
    v.kind = 'river'; v.title = title; v.lean = 0; v.camZ = null;
    const d0 = -900, d1 = L + 1700, z0 = -900, z1 = 1440, NX = Math.ceil((d1 - d0) / 30), NZ = 84;
    // --- terrain: a grid bent into banks and hills, coloured by how far it is from the water ---
    const pos = new Float32Array((NX + 1) * (NZ + 1) * 3), col = new Float32Array((NX + 1) * (NZ + 1) * 3), idx = new Uint32Array(NX * NZ * 6);
    const sand = C('#cdb27a'), bed = C('#7d7252'), g1 = C(env.grass), g2 = C(env.grass).clone().multiplyScalar(0.72), forest = C(env.grass).clone().multiplyScalar(0.5), tc = new T.Color();
    for (let i = 0, k = 0; i <= NX; i++) for (let j = 0; j <= NZ; j++, k += 3) {
      const d = d0 + (d1 - d0) * i / NX, z = z0 + (z1 - z0) * j / NZ, e = Math.abs(z - cl(d, def)) - hw(d, def);
      pos[k] = d; pos[k + 1] = riverH(d, z, def); pos[k + 2] = z;
      if (e < 0) tc.copy(bed).lerp(sand, clamp(1 + e / 26, 0, 1));
      else { tc.copy(g1).lerp(g2, vnoise(d * 0.012, z * 0.012)); if (e > 220) tc.lerp(forest, clamp((e - 220) / 320, 0, 1)); if (e < 26) tc.lerp(sand, 1 - clamp((e - 7) / 19, 0, 1)); }
      col[k] = tc.r; col[k + 1] = tc.g; col[k + 2] = tc.b;
    }
    for (let i = 0, k = 0; i < NX; i++) for (let j = 0; j < NZ; j++, k += 6) {
      const a = i * (NZ + 1) + j, b = a + NZ + 1; idx.set([a, a + 1, b, b, a + 1, b + 1], k);
    }
    const tg = new T.BufferGeometry(); tg.setAttribute('position', new T.BufferAttribute(pos, 3)); tg.setAttribute('color', new T.BufferAttribute(col, 3));
    tg.setIndex(new T.BufferAttribute(idx, 1)); tg.computeVertexNormals();
    const land = new T.Mesh(tg, new T.MeshLambertMaterial({ vertexColors: true })); land.receiveShadow = true; sc.add(land);
    const wm = makeWater(env, 1, def.ph); v.waters.push(wm);
    mk(G.plane, wm, sc, (d0 + d1) / 2, 0, 270, d1 - d0, 2600, 1, true).rotation.x = -Math.PI / 2;
    // --- trees, reeds and rocks along both banks, in chunks so only the stretch near the raft is drawn ---
    v.chunks = [];
    const inTown = (d, side, e) => !title && side > 0 && d > L - 300 && d < L + 760 && e < 280;
    for (let cx = d0; cx < d1; cx += 700) {
      const grp = new T.Group(), trees = [], reeds = [], rocks = [];
      for (let d = cx; d < Math.min(cx + 700, d1); d += 34) for (const side of [-1, 1]) {
        for (let n = 0; n < 2; n++) {
          const r = hsh(d * 0.7 + side * 3 + n * 11), dd = d + hsh(d + n * 5 + side) * 30, e = 24 + r * r * 480;
          if (inTown(dd, side, e)) continue;
          const z = cl(dd, def) + side * (hw(dd, def) + e);
          trees.push({ x: dd, y: riverH(dd, z, def) - 1, z, s: 0.9 + hsh(dd + z) * 0.8, pine: hsh(dd * 1.3 + side) < 0.22 + e / 1100 });
        }
        if (hsh(d * 3.3 + side) < 0.55) for (let n = 0; n < 4; n++) {
          const dd = d + hsh(d + n) * 26, z = cl(dd, def) + side * (hw(dd, def) - 3 + hsh(dd * 2 + n) * 9);
          reeds.push([dd, 6, z, 1.3, 14 + hsh(n + d) * 10, 1.3, 0, n % 2 ? '#6f9a3a' : '#88a84a', (hsh(n * 7 + d) - 0.5) * 0.3, (hsh(n * 3 + d) - 0.5) * 0.3]);
        }
        if (hsh(d * 5.1 + side * 2) < 0.2) { const z = cl(d, def) + side * (hw(d, def) + 2 + hsh(d) * 12), r = 6 + hsh(d * 9) * 9; rocks.push([d, 2, z, r, r * 0.8, r * 0.9, hsh(d) * 6, hsh(d * 2) < 0.5 ? '#8a8d90' : '#74777c', hsh(d * 4) * 3]); }
      }
      buildTrees(trees, grp, true); inst(G.cone3, MW, reeds, grp, false); inst(G.ico0, MW, rocks, grp);
      sc.add(grp); v.chunks.push({ x0: cx, x1: cx + 700, g: grp });
    }
    // --- the landing at the end of the stretch: a lit town, a pier and its name board ---
    if (!title) {
      const cz = (d) => cl(d, def) + hw(d, def);
      for (let i = 0; i < 8; i++) {
        const X = L - 190 + i * 104, w = 72 + hsh(i + 3) * 30, dp = 60 + hsh(i + 5) * 22, z = cz(X) + 64 + (i % 2) * 86 + hsh(i) * 16;
        const B = makeBuilding({ x: X - w / 2, y: z - dp / 2, w, h: dp, kind: i % 3 === 1 ? 'store' : 'cabin' }, true, riverH(X, z, def) - 2);
        B.g.rotation.y = Math.PI; sc.add(B.g);
      }
      const px = L + 200, zb = cz(px) + 20, zp = cl(px, def) + 20;
      mk(G.box, M('#8a6a42'), sc, px, 5, (zb + zp) / 2, 46, 3, zb - zp);
      const posts = []; for (let z = zp + 6; z < zb; z += 34) for (const sx of [-21, 21]) posts.push([px + sx, -2, z, 3.2, 22, 3.2, 0, '#5c4526']);
      inst(G.cyl6, MW, posts, sc);
      mk(G.cyl6, M('#2a2a30'), sc, px, 36, zp + 6, 1.8, 60, 1.8); mk(G.box, basic('#ffd98a'), sc, px, 68, zp + 6, 7, 9, 7, true);
      const gs = glowSprite('#ffb85a', 150, 0.6); gs.position.set(px, 68, zp + 6); sc.add(gs);
      const pl = new T.PointLight(C('#ffb060'), 1.6, 520, 1.4); pl.position.set(px, 72, zp + 6); sc.add(pl);
      const sign = textPlane(LANDINGS[def.id] || 'LANDING', 230, 46, '#3a2412', '#f1e3bc'); sign.position.set(px + 30, 78, cz(px) + 70); sign.rotation.y = -Math.PI / 2; sc.add(sign);
      for (const o of [-108, 108]) mk(G.cyl6, M('#5c4526'), sc, px + 31, 40, cz(px) + 70 + o, 3, 86, 3);
      const beam = v.beamMat = new T.MeshBasicMaterial({ color: new T.Color('#f1c232'), transparent: true, opacity: 0.2, blending: T.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false, side: T.DoubleSide });
      mk(G.tube, beam, sc, px, 400, zp + 6, 8, 800, 8, true);
    }
    // --- the raft and its crew ---
    v.raft = makeRaft(true); sc.add(v.raft);
    v.lampGlow = glowSprite('#ffc060', 90, 0.7); v.raft.lamp.add(v.lampGlow);
    v.lamp = new T.PointLight(C('#ffc070'), 1, 400, 1.3); v.lamp.position.set(0, 14, 0); v.raft.lamp.add(v.lamp);
    v.shield = mk(G.sph, basic('#cfe8ff', { transparent: true, opacity: 0.25, depthWrite: false }), v.raft, 0, 16, 0, 62, 40, 54, true);
    v.arc = mk(G.arc, basic('#ffffff', { transparent: true, opacity: 0.7, depthWrite: false, side: T.DoubleSide }), v.raft, 10, 24, 0, 70, 70, 1, true); v.arc.rotation.x = -Math.PI / 2;
    v.crew = {};
    for (const id of ['huck', 'jim', 'tom']) {
      const P = makePerson(LOOKS[id]); v.raft.add(P.g); v.crew[id] = P;
      P.ring = mk(G.ring, basic(CHARS[id].col, { transparent: true, opacity: 0.9, depthWrite: false }), P.g, 0, 0.8, 0, 15, 15, 1, true); P.ring.rotation.x = -Math.PI / 2;
    }
    if (def.weather === 'rain' || def.weather === 'storm') { v.rain = makeRain(def.weather === 'storm' ? (MOBILE ? 900 : 1900) : (MOBILE ? 500 : 1000), def.weather === 'storm'); sc.add(v.rain.obj); }
    v.sk = new Map(); v.objs = new Map(); v.shots = new Map(); v.focus = new T.Vector3();
    return v;
  }
  const RIVER_PICK = { food: 1, coin: 1, purse: 1, ammo: 1, salve: 1 };
  function syncRiverView(v, s, g, dt) {
    const def = s.def, R = s.raft, D0 = s.dist - RX0, X = R.x + D0, Z = R.y, sc = v.scene, env = v.env, night = def.weather === 'fog';
    // the raft: bobs, leans into the turn and blinks after a knock
    v.lean += ((R.steer || 0) - v.lean) * Math.min(1, dt * 4);
    v.raft.position.set(X, Math.sin(v.t * 2) * 0.9 - (s.pull ? 2.5 : 0), Z);
    v.raft.rotation.set(Math.sin(v.t * 1.7) * 0.025 + v.lean * 0.05, -v.lean * 0.2 + (s.pull ? Math.sin(v.t * 5) * 0.12 : 0), Math.cos(v.t * 1.3) * 0.022);
    v.raft.visible = !(s.inv > 0 && Math.floor(s.inv * 14) % 2);
    const slots = [[16, 9], [27, -7], [2, 20]]; let n = 1;
    const wid = g.weapons[g.wi];
    for (const id of ['huck', 'jim', 'tom']) {
      const P = v.crew[id], act = id === g.active, vis = g.chars.includes(id) && (act || id !== 'jim' || v.title);
      P.g.visible = vis; if (!vis) continue;
      const sl = act ? slots[0] : slots[n++ % 3]; P.g.position.set(sl[0], 6.8, sl[1]);
      const swinging = act && s.swing > 0;
      P.g.rotation.y = swinging ? Math.atan2(Math.cos(s.swingA), Math.sin(s.swingA)) : Math.PI / 2 + (act ? 0 : 0.5);
      holdTool(P, act ? wid : null);
      posePerson(P, { walk: 0, moving: false, swing: swinging ? clamp(s.swing / 0.16, 0, 1) : 0, aim: act && wid === 'gun' });
      P.ring.visible = act && !v.title;
    }
    v.shield.visible = s.brace > 0;
    v.arc.visible = s.swing > 0 && WEAPONS[wid].melee;
    if (v.arc.visible) { v.arc.rotation.z = Math.atan2(Math.cos(s.swingA), Math.sin(s.swingA)); v.arc.material.opacity = Math.min(0.75, s.swing * 6); }
    // lantern: always a little light on the raft; the real lantern throws it much further in the fog
    const lampOn = night || env.lit;
    v.lamp.intensity = lampOn ? (g.lantern ? 2.3 : 1.1) : 0; v.lamp.distance = g.lantern ? 680 : 340; v.lampGlow.visible = lampOn;
    if (night) { sc.fog.near = 230; sc.fog.far = g.lantern ? 1020 : 720; }
    // skiffs, drifting hazards, floating supplies and shots
    syncSet(v.sk, s.skiffs, sc, makeSkiff, (k, m) => {
      const kx = k.x + D0; m.position.set(kx, Math.sin(k.bob) * 1.3, k.y);
      m.rotation.y = k.st === 'leave' ? 0 : Math.atan2(Z - k.y, -(X - kx)); m.rotation.z = Math.sin(k.bob * 0.7) * 0.04;
      m.oars.forEach((o, i) => { o.rotation.y = Math.sin(k.bob * 1.4) * 0.5 * (i ? 1 : -1); });
      const pop = k.flash > 0 ? 1 + k.flash * 1.5 : 1; m.scale.set(pop, 2 - pop, pop);
    });
    syncSet(v.objs, s.objs.filter((o) => !o.gone), sc, (o) => (RIVER_PICK[o.k] ? makePickup(o.k, o.icon) : makeObstacle(o)), (o, m) => {
      const z = cl(o.d, def) + o.off;
      if (RIVER_PICK[o.k]) { m.position.set(o.d, 1, z); m.spin.rotation.y = v.t * 2 + o.d; m.spin.position.y = 15 + Math.sin(v.t * 3 + o.d) * 3; m.glow.material.opacity = 0.5 + 0.2 * Math.sin(v.t * 4 + o.d); }
      else if (o.k === 'whirl') { m.position.set(o.d, 0, z); m.swirl.rotation.z = -v.t * 2.6; }
      else if (o.k === 'log') { m.position.set(o.d, Math.sin(v.t * 1.6 + o.d) * 1.2 - (o.hit ? 5 : 0), z); m.rotation.x = Math.sin(v.t * 1.1 + o.d) * 0.05; }
      else m.position.set(o.d, 0, z);
    });
    syncSet(v.shots, s.proj, sc, makeShot, (p, m) => { m.position.set(p.x + D0, 18, p.y); m.rotation.y = Math.atan2(p.vx, p.vy); });
    // camera
    const ax = s.dist + 10;
    if (v.title) {
      const a = Math.sin(v.t * 0.09) * 0.5;
      cam.position.set(X + 300 * Math.cos(a), 84 + Math.sin(v.t * 0.13) * 14, cl(X + 280, def) + Math.sin(a) * 110); cam.lookAt(X - 40, 34, Z);
    } else {
      const wantZ = Z * 0.62 + cl(ax - 300, def) * 0.38, wantL = Z * 0.5 + cl(ax + 280, def) * 0.5;
      if (v.camZ === null) { v.camZ = wantZ; v.lookZ = wantL; }
      v.camZ += (wantZ - v.camZ) * Math.min(1, dt * 3); v.lookZ += (wantL - v.lookZ) * Math.min(1, dt * 3);
      cam.position.set(ax - 350, 205, v.camZ);
      if (s.shake > 0 && !REDUCE_MOTION && dt > 0) { cam.position.z += rand(-4, 4); cam.position.y += rand(-4, 4); }
      cam.lookAt(ax + 150, 0, v.lookZ);
    }
    const far = night ? 1500 : 5200;
    for (const c of v.chunks) c.g.visible = c.x1 > ax - 1300 && c.x0 < ax + far;
    v.sparks.update(s.fx);
    const wd = s.wind;
    worldTick(v, v.focus.set(X, 0, Z), dt, Math.min(1, (s.flash || 0) * 2.4), wd && wd.left > 0 ? wd.dir * 12 : 0);
  }

  // The scene behind the menu and story cards: Huck and Jim drifting toward the sunset.
  const titleS = { type: 'river', def: { ph: 0.6, id: 'title' }, dist: 700, len: 5200, raft: { x: 200, y: 0, steer: 0 }, objs: [], skiffs: [], proj: [], fx: [], inv: 0, brace: 0, swing: 0, swingA: 0 };
  const titleG = { chars: ['huck', 'jim'], active: 'huck', weapons: ['knife'], wi: 0, lantern: true };
  let titleV = null;
  function renderTitle(dt) {
    if (!titleV) titleV = buildRiverView(titleS, 'dusk', true);
    titleS.dist += 24 * dt; if (titleS.dist > 4300) titleS.dist = 700;
    const X = titleS.dist + 10;
    titleS.raft.y = cl(X, titleS.def) + Math.sin(titleV.t * 0.3) * 22; titleS.raft.steer = Math.cos(titleV.t * 0.3) * 0.5;
    syncRiverView(titleV, titleS, titleG, dt);
    R3.render(titleV.scene, cam);
  }
