
  // ===================================================================
  // ===== 3D ENGINE: renderer, lighting, sky, water, weather, models =====
  // ===================================================================
  // World units are the same as the rules use: X = east, Z = south, Y = up. A person is about 46 tall.
  if (!window.THREE) throw new Error('The 3D engine (three.js) did not load. Check your connection and reload.');
  const T = window.THREE;
  const glCanvas = $('#gl');
  const MOBILE = matchMedia('(hover: none) and (pointer: coarse)').matches;
  let R3;
  try { R3 = new T.WebGLRenderer({ canvas: glCanvas, antialias: true, powerPreference: 'high-performance' }); }
  catch (err) { throw new Error('This game needs WebGL (3D graphics), which this browser or device has turned off.'); }
  R3.outputEncoding = T.sRGBEncoding; R3.toneMapping = T.ACESFilmicToneMapping; R3.toneMappingExposure = 1.1;
  R3.shadowMap.enabled = true; R3.shadowMap.type = T.PCFSoftShadowMap;
  const cam = new T.PerspectiveCamera(46, W / H, 8, 14000);
  function resize3d() {
    const r = glCanvas.getBoundingClientRect(); if (!r.width) return;
    R3.setPixelRatio(Math.min(window.devicePixelRatio || 1, MOBILE ? 1.5 : 2)); R3.setSize(r.width, r.height, false);
  }
  new ResizeObserver(resize3d).observe(glCanvas); resize3d();

  // Time of day and weather for each stage. Sky, fog and water colours are display colours.
  const ENVS = {
    day:   { top: '#2f73d0', hor: '#bfe4f6', fogN: 900, fogF: 3800, sun: '#fff1d0', sunI: 1.05, sky: '#c4dcff', gnd: '#7d8c58', hemiI: 0.6,
      dir: [-0.55, 0.72, 0.42], disc: '#fff6d8', cloud: '#ffffff', grass: '#5f8f45', deep: '#1f6f96', shallow: '#5cb8d2' },
    rain:  { top: '#55636e', hor: '#a6b3b9', fogN: 450, fogF: 2400, sun: '#e3e9f0', sunI: 0.6, sky: '#c0ccd6', gnd: '#5f6c4e', hemiI: 0.8,
      dir: [-0.4, 0.8, 0.45], disc: '#000000', cloud: '#87939b', grass: '#4f7040', deep: '#2b5b70', shallow: '#7199a6' },
    storm: { top: '#121924', hor: '#3c4753', fogN: 320, fogF: 1900, sun: '#aebbd2', sunI: 0.45, sky: '#7686a0', gnd: '#30382e', hemiI: 0.7,
      dir: [-0.4, 0.8, 0.45], disc: '#000000', cloud: '#262f3a', grass: '#405c37', deep: '#1a3a4e', shallow: '#40697b', lit: true },
    dusk:  { top: '#221d52', hor: '#f29a5a', fogN: 700, fogF: 3400, sun: '#ffb877', sunI: 1.35, sky: '#d0b4dc', gnd: '#8a6858', hemiI: 0.95,
      dir: [-0.8, 0.46, 0.3], disc: '#ffd9a0', cloud: '#f5a070', grass: '#5a6e4c', deep: '#27477a', shallow: '#5f8ab4', lit: true },
    night: { top: '#04071a', hor: '#162434', fogN: 200, fogF: 700, sun: '#9db4ff', sunI: 0.7, sky: '#4a5e9c', gnd: '#182030', hemiI: 0.75,
      dir: [0.3, 0.8, 0.35], disc: '#dfe8ff', cloud: null, grass: '#2f4b2d', deep: '#0f2436', shallow: '#25506a', lit: true, stars: true },
  };

  // ----- colours, materials and shared geometry -----
  const _cc = {};
  function C(hex) { return _cc[hex] || (_cc[hex] = new T.Color(hex).convertSRGBToLinear()); }
  const gradTex = (() => { // three-band cel shading ramp
    const t = new T.DataTexture(new Uint8Array([104, 104, 104, 255, 104, 104, 104, 255, 186, 186, 186, 255, 255, 255, 255, 255]), 4, 1, T.RGBAFormat);
    t.minFilter = t.magFilter = T.NearestFilter; t.needsUpdate = true; t._shared = true; return t;
  })();
  const _mats = {};
  function M(hex) { // shared cel-shaded material
    if (_mats[hex]) return _mats[hex];
    const m = new T.MeshToonMaterial({ color: C(hex), gradientMap: gradTex }); m._shared = true; return (_mats[hex] = m);
  }
  function toon(hex, extra) { return new T.MeshToonMaterial(Object.assign({ color: C(hex), gradientMap: gradTex }, extra)); }
  function basic(hex, extra) { return new T.MeshBasicMaterial(Object.assign({ color: C(hex), toneMapped: false }, extra)); }
  const MW = M('#ffffff');
  const share = (g) => { g._shared = true; return g; };
  const G = {
    box: share(new T.BoxGeometry(1, 1, 1)), sph: share(new T.SphereGeometry(1, 16, 12)), cyl: share(new T.CylinderGeometry(1, 1, 1, 14)),
    cyl6: share(new T.CylinderGeometry(1, 1, 1, 6)), cone: share(new T.ConeGeometry(1, 1, 12)), cone4: share(new T.ConeGeometry(1, 1, 4)),
    cone3: share(new T.ConeGeometry(1, 1, 3)), ico0: share(new T.IcosahedronGeometry(1, 0)),
    ico1: share((() => { const g = new T.IcosahedronGeometry(1, 1); g.computeVertexNormals(); return g; })()),
    hemi: share(new T.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)), torso: share(new T.CylinderGeometry(1, 0.8, 1, 14)),
    robe: share(new T.CylinderGeometry(0.62, 1, 1, 14)), plane: share(new T.PlaneGeometry(1, 1)), disc: share(new T.CircleGeometry(1, 40)),
    ring: share(new T.RingGeometry(0.8, 1, 48)), arc: share(new T.RingGeometry(0.62, 1, 20, 1, -Math.PI / 2 - 1.05, 2.1)), tube: share(new T.CylinderGeometry(1, 1, 1, 24, 1, true)),
    prism: share((() => { // gable roof: ridge along X, one unit wide, deep and high
      const A = [-.5, 0, -.5], B = [.5, 0, -.5], Cc = [.5, 0, .5], D = [-.5, 0, .5], E = [-.5, 1, 0], F = [.5, 1, 0];
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(new Float32Array([].concat(D, Cc, F, D, F, E, B, A, E, B, E, F, A, D, E, Cc, B, F)), 3));
      g.computeVertexNormals(); return g;
    })()),
    stripes: share((() => { // striped tent top
      const g = new T.ConeGeometry(1, 1, 10, 1, true).toNonIndexed(), n = g.attributes.position.count, col = new Float32Array(n * 3);
      const a = C('#f1ead8'), b = C('#c4352f');
      for (let i = 0; i < n; i++) { const c = Math.floor(i / 6) % 2 ? a : b; col.set([c.r, c.g, c.b], i * 3); }
      g.setAttribute('color', new T.BufferAttribute(col, 3)); return g;
    })()),
  };
  function mk(geo, mat, parent, x, y, z, sx, sy, sz, plain) {
    const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz);
    if (!plain) { m.castShadow = true; m.receiveShadow = true; }
    if (parent) parent.add(m); return m;
  }
  const _d = new T.Object3D();
  // One draw call for many copies. items: [x, y, z, sx, sy, sz, rotY, colour]
  function inst(geo, mat, items, parent, shadow) {
    if (!items.length) return null;
    const im = new T.InstancedMesh(geo, mat, items.length);
    items.forEach((it, i) => {
      _d.position.set(it[0], it[1], it[2]); _d.scale.set(it[3], it[4], it[5]); _d.rotation.set(it[8] || 0, it[6] || 0, it[9] || 0); _d.updateMatrix();
      im.setMatrixAt(i, _d.matrix); if (it[7]) im.setColorAt(i, C(it[7]));
    });
    im.frustumCulled = false; if (shadow !== false) { im.castShadow = true; im.receiveShadow = true; }
    parent.add(im); return im;
  }
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t;
  }
  const glowTex = share(canvasTex(128, 128, (g) => {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  }));
  const plankTex = share(canvasTex(16, 64, (g) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, 16, 64);
    for (let y = 0; y < 64; y += 16) { g.fillStyle = 'rgba(0,0,0,.30)'; g.fillRect(0, y, 16, 2); g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(0, y + 9, 16, 3); }
  }));
  plankTex.wrapS = plankTex.wrapT = T.RepeatWrapping;
  const spiralTex = share(canvasTex(256, 256, (g) => {
    g.translate(128, 128); g.lineCap = 'round';
    for (let arm = 0; arm < 3; arm++) {
      g.beginPath();
      for (let a = 0; a < 9; a += 0.1) { const r = 8 + a * 12.5, x = Math.cos(a + arm * 2.1) * r, y = Math.sin(a + arm * 2.1) * r; a ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.strokeStyle = 'rgba(235,248,255,.75)'; g.lineWidth = 7; g.stroke();
    }
    const r = g.createRadialGradient(0, 0, 0, 0, 0, 40); r.addColorStop(0, 'rgba(5,20,35,.85)'); r.addColorStop(1, 'rgba(5,20,35,0)'); g.fillStyle = r; g.fillRect(-60, -60, 120, 120);
  }));
  function glowMat(hex, opacity) { return new T.MeshBasicMaterial({ map: glowTex, color: new T.Color(hex), transparent: true, opacity: opacity === undefined ? 1 : opacity, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }); }
  function glowSprite(hex, size, opacity) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: new T.Color(hex), transparent: true, opacity: opacity === undefined ? 1 : opacity, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
    s.scale.set(size, size, 1); return s;
  }
  function textPlane(text, w, h, fg, bg) { // a painted sign
    const tex = canvasTex(512, Math.round(512 * h / w), (g, cw, ch) => {
      g.fillStyle = bg; g.fillRect(0, 0, cw, ch); g.strokeStyle = fg; g.lineWidth = 8; g.strokeRect(8, 8, cw - 16, ch - 16);
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; let fs = ch * 0.56; g.font = `bold ${fs}px Georgia, serif`;
      const tw = g.measureText(text).width; if (tw > cw - 56) { fs *= (cw - 56) / tw; g.font = `bold ${fs}px Georgia, serif`; }
      g.fillText(text, cw / 2, ch / 2 + 2);
    });
    const m = new T.Mesh(G.plane, new T.MeshBasicMaterial({ map: tex, toneMapped: false })); m.scale.set(w, h, 1); return m;
  }
  function disposeView(v) {
    if (!v) return;
    v.scene.traverse((o) => {
      if (o.geometry && !o.geometry._shared) o.geometry.dispose();
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of ms) { if (m._shared) continue; if (m.map && !m.map._shared) m.map.dispose(); m.dispose(); }
      if (o.isInstancedMesh) o.dispose();
    });
  }

  // ----- sky, lights, clouds, stars -----
  function makeWorld(envName) {
    const env = ENVS[envName], scene = new T.Scene(), dir = new T.Vector3(env.dir[0], env.dir[1], env.dir[2]).normalize();
    scene.fog = new T.Fog(new T.Color(env.hor), env.fogN, env.fogF);
    const hemi = new T.HemisphereLight(C(env.sky), C(env.gnd), env.hemiI); scene.add(hemi);
    const sun = new T.DirectionalLight(C(env.sun), env.sunI); sun.castShadow = true;
    const SH = MOBILE ? 1024 : 2048, sc = sun.shadow.camera; sun.shadow.mapSize.set(SH, SH);
    sc.left = -640; sc.right = 640; sc.top = 640; sc.bottom = -640; sc.near = 100; sc.far = 3000; sun.shadow.bias = -0.0008; sun.shadow.normalBias = 2.2;
    scene.add(sun, sun.target);
    const skyMat = new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new T.Color(env.top) }, hor: { value: new T.Color(env.hor) }, sunCol: { value: new T.Color(env.disc) }, sunDir: { value: dir.clone() }, flash: { value: 0 } },
      vertexShader: 'varying vec3 vd;\nvoid main() { vd = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 top, hor, sunCol, sunDir; uniform float flash; varying vec3 vd;
        void main() {
          vec3 n = normalize(vd); float h = max(n.y, 0.0);
          vec3 c = mix(hor, top, pow(h, 0.5));
          if (n.y < 0.0) c = mix(hor, hor * 0.55, min(1.0, -n.y * 5.0));
          float s = max(dot(n, normalize(sunDir)), 0.0);
          c += sunCol * (smoothstep(0.9993, 0.9997, s) * 1.2 + pow(s, 40.0) * 0.4 + pow(s, 5.0) * 0.14);
          gl_FragColor = vec4(c + flash, 1.0);
        }` });
    const sky = new T.Mesh(new T.SphereGeometry(7000, 24, 16), skyMat); sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);
    const clouds = new T.Group(); scene.add(clouds);
    if (env.cloud) {
      const cm = new T.MeshBasicMaterial({ color: C(env.cloud), fog: false, toneMapped: false, transparent: true, opacity: 0.92, depthWrite: false });
      for (let i = 0; i < 16; i++) {
        const a = hsh(i * 3.1) * 6.283, r = 2200 + hsh(i * 7.7) * 2600, c = new T.Group();
        c.position.set(Math.cos(a) * r, 900 + hsh(i) * 700, Math.sin(a) * r);
        for (let j = 0; j < 5; j++) mk(G.sph, cm, c, (j - 2) * 170 + hsh(i + j) * 60, hsh(i * j + 4) * 50, hsh(j + i * 9) * 160, 190 + hsh(i + j * 5) * 150, 60 + hsh(j) * 40, 150 + hsh(i * 2 + j) * 80, true);
        clouds.add(c);
      }
    }
    if (env.stars) {
      const n = 500, p = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const a = hsh(i) * 6.283, e = 0.08 + hsh(i + 900) * 1.4; p.set([Math.cos(a) * Math.cos(e) * 6500, Math.sin(e) * 6500, Math.sin(a) * Math.cos(e) * 6500], i * 3); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(p, 3));
      const st = new T.Points(g, new T.PointsMaterial({ color: 0xffffff, size: 3, sizeAttenuation: false, fog: false, toneMapped: false, transparent: true, opacity: 0.9, depthWrite: false }));
      st.frustumCulled = false; clouds.add(st);
    }
    const sparks = makeSparks(); scene.add(sparks.obj);
    return { scene, env, hemi, sun, dir, sky, skyMat, clouds, sparks, waters: [], t: 0, rain: null };
  }
  // Called every frame: keeps the sun's shadow box, sky and weather centred on the action.
  function worldTick(v, focus, dt, flash, wind) {
    v.t += dt;
    v.sun.target.position.copy(focus); v.sun.position.copy(focus).addScaledVector(v.dir, 1500);
    v.sky.position.copy(cam.position); v.clouds.position.set(cam.position.x, 0, cam.position.z); v.clouds.rotation.y = v.t * 0.004;
    v.skyMat.uniforms.flash.value = flash * 0.9; v.hemi.intensity = v.env.hemiI + flash * 3;
    for (const w of v.waters) { w.uniforms.t.value = v.t; w.uniforms.flash.value = flash * 0.5; }
    if (v.rain) { v.rain.obj.position.set(focus.x, 0, focus.z); v.rain.update(dt, wind || 0); }
  }
  function makeWater(env, mode, pa) {
    return new T.ShaderMaterial({ transparent: true, fog: true,
      uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, { t: { value: 0 }, flash: { value: 0 }, mode: { value: mode }, pa: { value: pa },
        deep: { value: new T.Color(env.deep) }, shallow: { value: new T.Color(env.shallow) }, skyc: { value: new T.Color(env.hor) },
        sunCol: { value: new T.Color(env.disc) }, sunDir: { value: new T.Vector3(env.dir[0], env.dir[1], env.dir[2]).normalize() } }]),
      vertexShader: `varying vec3 wp;
        #include <fog_pars_vertex>
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0); wp = w.xyz;
          vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `uniform float t, flash, mode, pa; uniform vec3 deep, shallow, skyc, sunCol, sunDir; varying vec3 wp;
        #include <fog_pars_fragment>
        float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
        float wv(vec2 p) { return vn(p * 0.018 + vec2(t * 0.25, t * 0.1)) * 0.55 + vn(p * 0.045 + vec2(-t * 0.2, t * 0.3)) * 0.3 + vn(p * 0.11 + vec2(t * 0.5, 0.0)) * 0.15; }
        void main() {
          vec2 p = wp.xz; float c = wv(p);
          vec3 n = normalize(vec3((c - wv(p + vec2(6.0, 0.0))) * 2.4, 1.0, (c - wv(p + vec2(0.0, 6.0))) * 2.4));
          vec3 V = normalize(cameraPosition - wp);
          float fr = pow(1.0 - max(dot(n, V), 0.0), 3.0);
          vec3 col = mix(deep, shallow, smoothstep(0.25, 0.8, c));
          float edge = 10000.0;                       // distance to the nearest bank
          if (mode > 1.5) edge = wp.x - pa;
          else if (mode > 0.5) {
            float cl = 270.0 + 78.0 * sin(wp.x * 0.0021 + pa) + 36.0 * sin(wp.x * 0.0063 + pa * 2.3);
            float hw = 112.0 + 20.0 * sin(wp.x * 0.0034 + pa * 1.7);
            edge = hw - abs(wp.z - cl);
          }
          col = mix(col, shallow, smoothstep(46.0, 0.0, edge) * 0.65);
          col = mix(col, skyc, fr * 0.5);
          vec3 hv = normalize(normalize(sunDir) + V);
          col += sunCol * pow(max(dot(n, hv), 0.0), 160.0) * 0.9;
          float foam = smoothstep(15.0, 3.0, edge + vn(p * 0.09 + t * 0.6) * 11.0);
          float streak = smoothstep(0.78, 0.9, vn(vec2(p.x * 0.012 - t * 0.2, p.y * 0.07))) * 0.22;
          col = mix(col, vec3(0.93), clamp(foam * 0.7 + streak, 0.0, 0.8));
          gl_FragColor = vec4(col + flash, 0.95);
          #include <fog_fragment>
        }` });
  }
  function makeRain(n, heavy) {
    const pos = new Float32Array(n * 6), drops = [];
    for (let i = 0; i < n; i++) drops.push([rand(-800, 800), rand(0, 720), rand(-800, 800), rand(0.8, 1.3)]);
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
    const obj = new T.LineSegments(g, new T.LineBasicMaterial({ color: 0xd4e4f4, transparent: true, opacity: heavy ? 0.5 : 0.36, fog: false, toneMapped: false, depthWrite: false }));
    obj.frustumCulled = false;
    return { obj, update(dt, wind) {
      const sl = (heavy ? 0.1 : 0.04), wz = wind * 0.09;
      for (let i = 0; i < n; i++) {
        const d = drops[i]; d[1] -= (heavy ? 1150 : 900) * d[3] * dt; if (d[1] < 0) d[1] += 720;
        pos[i * 6] = d[0]; pos[i * 6 + 1] = d[1]; pos[i * 6 + 2] = d[2];
        pos[i * 6 + 3] = d[0] - 26 * sl * 10; pos[i * 6 + 4] = d[1] + 26; pos[i * 6 + 5] = d[2] - 26 * wz;
      }
      g.attributes.position.needsUpdate = true;
    } };
  }
  function makeSparks() {
    const N = 200, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3));
    const obj = new T.Points(g, new T.PointsMaterial({ size: 6.5, vertexColors: true, transparent: true, depthWrite: false }));
    obj.frustumCulled = false; g.setDrawRange(0, 0);
    return { obj, update(fx) {
      let i = 0;
      for (const f of fx) { if (f.k !== 'p' || i >= N) continue; const c = C(f.col); pos.set([f.x, f.y, f.z], i * 3); col.set([c.r, c.g, c.b], i * 3); i++; }
      g.setDrawRange(0, i); g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
    } };
  }
  const _v = new T.Vector3();
  function proj(x, y, z) { // world point -> HUD canvas coordinates
    _v.set(x, y, z).project(cam);
    return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H, ok: _v.z > -1 && _v.z < 1, back: _v.z > 1 };
  }

  // ----- people -----
  // Built from simple shapes and animated by hand: legs and arms swing from pivots. The model faces +Z.
  function makePerson(look) {
    const g = new T.Group(), body = new T.Group(); g.add(body);
    const skin = M(look.skin), shirt = M(look.shirt), pants = M(look.pants);
    const leg = (sx) => { const pv = new T.Group(); pv.position.set(sx * 3.7, 15, 0); mk(G.box, pants, pv, 0, -6.4, 0, 5.4, 12.8, 6.2); mk(G.box, M('#3a2a1a'), pv, 0, -13.4, 1.2, 5.8, 3.2, 8.6); body.add(pv); return pv; };
    const arm = (sx) => {
      const pv = new T.Group(); pv.position.set(sx * 10.4, 30, 0); pv.rotation.z = sx * 0.1;
      mk(G.box, shirt, pv, 0, -4, 0, 4.6, 9, 5.2); mk(G.box, skin, pv, 0, -11, 0, 3.7, 6, 4.2);
      const hand = new T.Group(); hand.position.set(0, -13.5, 1); pv.add(hand); pv.hand = hand; body.add(pv); return pv;
    };
    const P = { g, body, legL: leg(-1), legR: leg(1), armL: arm(-1), armR: arm(1), h: 0, hSet: false, px: 0, pz: 0, tools: {} };
    if (look.robe) {
      mk(G.robe, shirt, body, 0, 14.5, 0, 12.5, 27, 9.5); mk(G.cyl, M('#e7e1d2'), body, 0, 3, 0, 12.9, 3.4, 9.9);
      mk(G.cyl, M('#f1c232'), body, 0, 16.5, 0, 9.6, 2.2, 7.4);
    } else mk(G.torso, shirt, body, 0, 23, 0, 8.8, 16.5, 6.2);
    if (look.cape) { const c = mk(G.box, M(look.cape), body, 0, 19, -7, 18, 25, 1.3); c.rotation.x = 0.13; }
    const head = new T.Group(); head.position.set(0, 38.6, 0); body.add(head); P.head = head;
    mk(G.sph, skin, head, 0, 0, 0, 7.6);
    const eye = M('#1a1208'); mk(G.sph, eye, head, -2.7, 0.9, 6.9, 1.15); mk(G.sph, eye, head, 2.7, 0.9, 6.9, 1.15);
    mk(G.sph, skin, head, 0, -1.2, 7.4, 1.3);
    if (look.beard) mk(G.sph, M(look.beard), head, 0, -3.6, 1.8, 7.3, 5.8, 6.6);
    const H = (hex) => M(hex), cyl = (hex, y, r, h) => mk(G.cyl, H(hex), head, 0, y, 0, r, h, r);
    switch (look.hat) {
      case 'straw': cyl('#e3c264', 4.6, 12, 1.1); cyl('#e3c264', 8.2, 6.4, 6.4); cyl('#8a6a2a', 6, 6.6, 1.7); break;
      case 'bandana': mk(G.hemi, H('#c23b2b'), head, 0, 0.6, 0, 7.95); mk(G.box, H('#c23b2b'), head, 0, 0.6, -8.4, 3.4, 3, 3); break;
      case 'cap': case 'cap2': { const c = look.hat === 'cap' ? '#2f7a5a' : '#555a68'; mk(G.hemi, H(c), head, 0, 0.8, 0, 7.95); mk(G.box, H(c), head, 0, 1.6, 9.2, 9.5, 1.1, 6); break; }
      case 'ragged': { const b = cyl('#555048', 4.4, 12.4, 1.1); b.rotation.z = 0.12; mk(G.torso, H('#555048'), head, 0, 8.6, 0, 5.6, 8.5, 5.6); cyl('#3a342c', 6, 6.4, 1.6); break; }
      case 'tophat': cyl('#15151a', 5, 10.8, 1.1); cyl('#15151a', 12.8, 6.4, 15); cyl('#b0252f', 6.8, 6.6, 2.5); break;
      case 'crown': cyl('#f1c232', 7.2, 6.7, 4.4);
        for (let i = 0; i < 6; i++) mk(G.cone, H('#f1c232'), head, Math.cos(i * 1.047) * 5.6, 11.2, Math.sin(i * 1.047) * 5.6, 1.7, 4.4, 1.7);
        mk(G.sph, H('#c4352f'), head, 0, 7.4, 6.7, 1.3); break;
      case 'bonnet': mk(G.sph, H('#f1ead8'), head, 0, 0.8, -2.4, 8.5); mk(G.box, H('#c46a8a'), head, 0, -5.4, 3.4, 9, 1.4, 6); break;
      case 'farmer': cyl('#b8a46a', 4.4, 13.4, 1.1); mk(G.hemi, H('#b8a46a'), head, 0, 4.6, 0, 6.7); break;
      default: mk(G.hemi, H('#4a3320'), head, 0, 0.8, -0.4, 7.9); break;
    }
    g.scale.setScalar(look.scale || 1);
    return P;
  }
  // Hand-held tools. Each points along +Z out of the hand.
  function makeTool(id) {
    const g = new T.Group(), wood = M('#7a4f26'), steel = M('#c4ccd4'), dark = M('#33343a');
    const rod = (mat, r, len, z, y) => { const m = mk(G.cyl6, mat, g, 0, y || 0, z, r, len, r); m.rotation.x = Math.PI / 2; return m; };
    if (id === 'knife') { mk(G.box, wood, g, 0, 0, 1, 1.6, 1.6, 4.4); mk(G.box, steel, g, 0, 0.3, 7, 0.8, 2.3, 8.5); }
    else if (id === 'branch') { rod(wood, 1.5, 24, 9); const f = mk(G.cyl6, wood, g, 1.8, 2.6, 15, 1, 8, 1); f.rotation.set(0.9, 0, -0.5); }
    else if (id === 'axe') { rod(wood, 1.15, 24, 9); mk(G.box, steel, g, 0, -2.6, 19, 1.7, 8.5, 6.4); mk(G.box, dark, g, 0, 0.6, 19, 2, 2.2, 6); }
    else if (id === 'gun') { rod(dark, 0.95, 24, 13, 0.6); mk(G.box, wood, g, 0, -0.9, 1, 2.2, 3.6, 9.5); mk(G.box, wood, g, 0, 0.2, 8, 1.9, 2, 9); }
    else if (id === 'jug') { mk(G.sph, M('#8a8272'), g, 0, -3.4, 2, 4.2, 4.6, 4.2); mk(G.cyl, M('#6a6456'), g, 0, 1.6, 2, 1.5, 2.6, 1.5); }
    else if (id === 'scepter') { rod(M('#f1c232'), 0.9, 22, 8); mk(G.sph, M('#c4352f'), g, 0, 0, 20, 2.8); }
    else if (id === 'bottle') { rod(M('#4c9a6a'), 1.6, 8, 4); rod(M('#9ad0b0'), 0.8, 4, 9.5); }
    return g;
  }
  function holdTool(P, id) { // show one tool in the right hand, building it the first time
    for (const k in P.tools) P.tools[k].visible = k === id;
    if (id && !P.tools[id]) { P.tools[id] = makeTool(id); P.armR.hand.add(P.tools[id]); }
  }
  // o: { walk, moving, swing (1 -> 0 while swinging), aim, crouch, lie, pop }
  function posePerson(P, o) {
    const sw = o.moving ? Math.sin(o.walk) : 0;
    P.legL.rotation.x = sw * 0.7; P.legR.rotation.x = -sw * 0.7; P.armL.rotation.x = -sw * 0.65;
    P.armR.rotation.x = o.swing > 0 ? -2.5 + 3.3 * (1 - o.swing) : o.aim ? -1.5 : o.raise ? -2.7 : sw * 0.65;
    P.body.position.y = (o.moving ? Math.abs(Math.cos(o.walk)) * 1.8 : 0) - (o.crouch ? 6 : 0);
    P.body.rotation.x = o.lie ? -Math.PI / 2 : o.crouch ? 0.28 : o.moving ? 0.07 : 0;
    if (o.lie) P.body.position.set(0, 5, 23); else { P.body.position.x = 0; P.body.position.z = 0; }
    const pop = o.pop > 0 ? 1 + o.pop * 1.6 : 1; P.body.scale.set(pop, 2 - pop, pop);
  }
  // Turn a model smoothly: toward (fx, fz) if given, otherwise toward the way it is walking.
  function turnTo(P, x, z, dt, fx, fz, moving) {
    let want = P.h;
    if (fx || fz) want = Math.atan2(fx, fz);
    else if (moving && P.hSet) { const dx = x - P.px, dz = z - P.pz; if (dx * dx + dz * dz > 0.01) want = Math.atan2(dx, dz); }
    if (!P.hSet) { P.h = want; P.hSet = true; }
    let d = want - P.h; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    P.h += d * Math.min(1, dt * 12); P.px = x; P.pz = z; P.g.rotation.y = P.h;
  }

  // ----- things to pick up -----
  function makePickup(type, icon) {
    const g = new T.Group(), sp = new T.Group(); sp.position.y = 14; g.add(sp); g.spin = sp;
    const gl = mk(G.plane, glowMat('#ffe9a0', 0.55), g, 0, 0.8, 0, 46, 46, 1, true); gl.rotation.x = -Math.PI / 2; g.glow = gl;
    const gold = M('#f1c232');
    switch (type) {
      case 'coin': { const c = mk(G.cyl, gold, sp, 0, 0, 0, 6.5, 1.6, 6.5); c.rotation.x = Math.PI / 2; mk(G.cyl, M('#c9961a'), sp, 0, 0, 0, 4.4, 1.9, 4.4).rotation.x = Math.PI / 2; break; }
      case 'purse': mk(G.sph, M('#8a5a2a'), sp, 0, -1, 0, 8, 8.5, 8); mk(G.cyl, M('#6e4520'), sp, 0, 7.4, 0, 3, 3.4, 3); mk(G.sph, gold, sp, 0, 10, 0, 3.4, 1.6, 3.4); break;
      case 'food':
        if (icon === 'fish') { mk(G.sph, M('#8fb3c9'), sp, 0, 0, 0, 10.5, 5, 2.8); mk(G.cone, M('#6f97b0'), sp, -12.5, 0, 0, 5, 7, 1.6).rotation.z = -Math.PI / 2; mk(G.sph, M('#102030'), sp, 6.4, 1.2, 2.2, 1); }
        else if (icon === 'melon') { mk(G.sph, M('#3f8a34'), sp, 0, 0, 0, 9.5); for (let i = 0; i < 5; i++) { const s = mk(G.sph, M('#2a6426'), sp, 0, 0, 0, 9.7, 9.7, 1.3); s.rotation.y = i * 0.63; } }
        else { mk(G.sph, M('#e2b25c'), sp, 0, 0, 0, 10.5, 6, 6.4); for (let i = -1; i <= 1; i++) mk(G.box, M('#a8742c'), sp, i * 5, 4.4, 0, 1.2, 2.6, 7.5); }
        break;
      case 'ammo': mk(G.box, M('#6a5a3a'), sp, 0, -2, 0, 14, 8, 9); for (let i = -1; i <= 1; i++) mk(G.cyl, M('#d6b45a'), sp, i * 4, 4.5, 0, 1.5, 6, 1.5); break;
      case 'salve': mk(G.cyl, M('#4d9a62'), sp, 0, -1, 0, 6, 11, 6); mk(G.cyl, M('#d8ecd2'), sp, 0, 6.6, 0, 3, 4, 3); mk(G.box, M('#f4f4f0'), sp, 0, -1, 6, 6.4, 2, 0.8); mk(G.box, M('#f4f4f0'), sp, 0, -1, 6, 2, 6.4, 0.8); break;
      case 'lantern': mk(G.cyl, M('#33343a'), sp, 0, -6, 0, 5.5, 2.4, 5.5); mk(G.cyl, basic('#ffd36a'), sp, 0, 0, 0, 4.4, 9.6, 4.4, true); mk(G.cone, M('#33343a'), sp, 0, 7, 0, 6, 4.4, 6); sp.add(glowSprite('#ffc860', 60, 0.8)); break;
      default: { const t = makeTool(type); t.scale.setScalar(1.5); t.position.set(0, 0, -14); t.rotation.x = -0.5; sp.add(t); t.traverse((o) => { o.castShadow = true; }); }
    }
    return g;
  }

  // ----- trees (drawn as instances; the canopy of a tree that hides the player shrinks out of the way) -----
  const BLOBS = [[0, 50, 0, 27], [-14, 38, 6, 18], [14, 40, -5, 19], [-4, 61, -4, 14]], PINE = [[0, 30, 17, 32], [0, 47, 13, 27], [0, 62, 9, 22]];
  const GREENS = [['#2f6a2a', '#3b7d33', '#44893a', '#5aa24a'], ['#35702c', '#468a36', '#52983e', '#6cb052'], ['#2a5f2a', '#356f30', '#3f7c36', '#4f9244']];
  const PINES = ['#1f4d2c', '#27583a', '#2f6a3a'];
  function buildTrees(list, parent, low) {
    if (!list.length) return [];
    const nr = list.filter((t) => !t.pine).length, np = list.length - nr, trunks = new T.InstancedMesh(G.cyl6, MW, list.length);
    list.forEach((t, i) => trunks.setColorAt(i, C('#5b3d22')));
    const blobs = nr ? new T.InstancedMesh(low ? G.ico0 : G.ico1, MW, nr * 4) : null, cones = np ? new T.InstancedMesh(G.cone, MW, np * 3) : null;
    let bi = 0, ci = 0, ti = 0;
    for (const t of list) {
      t.k = 1; t.parts = [{ im: trunks, i: ti++, x: 0, y: t.pine ? 9 : 14, z: 0, sx: 4.4, sy: t.pine ? 20 : 30, trunk: true }];
      const tint = GREENS[Math.floor(hsh(t.x * 0.37 + t.z) * 3)];
      if (t.pine) PINE.forEach((p, j) => { cones.setColorAt(ci, C(PINES[j])); t.parts.push({ im: cones, i: ci++, x: p[0], y: p[1], z: 0, sx: p[2], sy: p[3] }); });
      else BLOBS.forEach((p, j) => { blobs.setColorAt(bi, C(tint[j])); t.parts.push({ im: blobs, i: bi++, x: p[0], y: p[1], z: p[2], sx: p[3], sy: p[3] * 0.92 }); });
      setTree(t);
    }
    for (const im of [trunks, blobs, cones]) if (im) { im.frustumCulled = false; im.castShadow = true; im.receiveShadow = true; parent.add(im); }
    return list;
  }
  function setTree(t) {
    const k = t.k, s = t.s, ry = hsh(t.x + t.z * 1.7) * 6.283, cs = Math.cos(ry), sn = Math.sin(ry);
    for (const p of t.parts) {
      if (p.trunk) { _d.position.set(t.x, (t.y || 0) + p.y * s * k, t.z); _d.scale.set(p.sx * s * Math.min(1, k * 3), p.sy * s * k, p.sx * s * Math.min(1, k * 3)); }
      else { _d.position.set(t.x + (p.x * cs + p.z * sn) * s * k, (t.y || 0) + p.y * s * k, t.z + (-p.x * sn + p.z * cs) * s * k); _d.scale.set(p.sx * s * k, p.sy * s * k, p.sx * s * k); }
      _d.rotation.set(0, ry, 0); _d.updateMatrix();
      p.im.setMatrixAt(p.i, _d.matrix); p.im.instanceMatrix.needsUpdate = true;
    }
  }
  // Trees in the foreground (between the lens and the player) sink away; one that still hides the player shrinks.
  function treeOcclude(trees, cp, tp, dt) {
    const ax = tp.x - cp.x, ay = tp.y - cp.y, az = tp.z - cp.z, L2 = ax * ax + ay * ay + az * az, G2 = ax * ax + az * az, GL = Math.sqrt(G2) || 1;
    for (const t of trees) {
      const cx = t.x - cp.x, cy = 46 * t.s - cp.y, cz = t.z - cp.z, u = (cx * ax + cy * ay + cz * az) / L2;
      const gu = (cx * ax + cz * az) / G2, lat = Math.abs(cx * az - cz * ax) / GL;
      let want = 1;
      if (gu > -0.2 && gu < 0.74 && lat < 60 + 250 * Math.max(gu, 0)) want = 0.02;
      else if (u > 0.05 && u < 0.99) { const dx = cx - ax * u, dy = cy - ay * u, dz = cz - az * u, r = 44 * t.s; if (dx * dx + dy * dy + dz * dz < r * r) want = 0.22; }
      if (Math.abs(want - t.k) > 0.01) { t.k += (want - t.k) * Math.min(1, dt * 9); setTree(t); }
    }
  }

  // ----- buildings -----
  // b: { x, y, w, h, kind } in ground coordinates. Each building owns its materials so it can fade when it hides the player.
  function makeBuilding(b, lit, baseY) {
    const g = new T.Group(), mats = {}, w = b.w, d = b.h, k = b.kind; g.position.set(b.x + w / 2, baseY || 0, b.y + d / 2);
    const m = (hex) => mats[hex] || (mats[hex] = toon(hex));
    const box = (hex, x, y, z, sx, sy, sz) => mk(G.box, m(hex), g, x, y, z, sx, sy, sz);
    const pane = lit ? (mats.pane = basic('#ffd98a')) : m('#b9d6e6');
    const win = (x, y, z, ww, wh, side) => {
      const f = box('#f1ead8', x, y, z, side ? 1.6 : ww + 4, wh + 4, side ? ww + 4 : 1.6);
      const p = mk(G.box, pane, g, x + (side ? side * 0.6 : 0), y, z + (side ? 0 : 0.6), side ? 1.6 : ww, wh, side ? ww : 1.6, true); p.castShadow = false;
      box('#f1ead8', x + (side ? side * 0.9 : 0), y, z + (side ? 0 : 0.9), side ? 1 : 1.4, wh, side ? 1.4 : 1); return f;
    };
    if (k === 'crate') {
      box('#8a6a3a', 0, 20, 0, w, 40, d);
      for (const s of [-1, 1]) { box('#5a4220', s * (w / 2 - 2), 20, d / 2 + 0.4, 4, 40, 1.2); box('#5a4220', 0, 20 + s * 18, d / 2 + 0.4, w, 4, 1.2); box('#5a4220', s * (w / 2 - 2), 20, -d / 2 - 0.4, 4, 40, 1.2); }
      const x1 = box('#5a4220', 0, 20, d / 2 + 0.5, 4, 50, 1); x1.rotation.z = 0.78;
      return { g, mats: Object.values(mats), top: 40 };
    }
    if (k === 'tent') { // the Royal Nonesuch stage
      box('#6b4a2a', 0, 6, 0, w, 12, d); box('#8a6038', 0, 12.4, 0, w - 8, 1, d - 8);
      box('#7b1f2a', 0, 34, -d / 2 + 4, w - 16, 44, 3);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) mk(G.cyl6, m('#e4dcc4'), g, sx * (w / 2 - 8), 34, sz * (d / 2 - 8), 2.2, 46, 2.2);
      mats.stripe = new T.MeshToonMaterial({ vertexColors: true, gradientMap: gradTex, side: T.DoubleSide });
      mk(G.stripes, mats.stripe, g, 0, 76, 0, w * 0.6, 40, d * 0.72);
      mk(G.cyl6, m('#e4dcc4'), g, 0, 104, 0, 1.4, 18, 1.4); box('#f1c232', 9, 108, 0, 18, 9, 0.8);
      const sign = textPlane('ROYAL NONESUCH', w - 40, 15, '#f1c232', '#4a1018'); sign.position.set(0, 21, d / 2 + 0.8); g.add(sign); mats.sign = sign.material;
      return { g, mats: Object.values(mats), top: 110 };
    }
    const spec = { cabin: [48, '#96693c', '#5a3a2a'], shed: [40, '#84603c', '#4a3a30'], store: [58, '#b08d60', '#6a3d3a'], mansion: [86, '#f2ebd8', '#6e4a46'] }[k] || [48, '#96693c', '#5a3a2a'];
    const wh = spec[0], rh = Math.min(d * 0.34, 50), porch = k === 'mansion' ? 26 : 0;
    const tx = plankTex.clone(); tx.needsUpdate = true; tx.repeat.set(1, wh / 30);
    mats.wall = new T.MeshToonMaterial({ color: C(spec[1]), gradientMap: gradTex, map: tx });
    mk(G.box, mats.wall, g, 0, wh / 2, 0, w, wh, d);
    mk(G.prism, m(spec[2]), g, 0, wh, porch / 2, w + 16, rh, d + 16 + porch);
    const fz = d / 2;
    if (k === 'mansion') {
      box('#d9d0b8', 0, 2, fz + porch / 2, w + 6, 4, porch + 4);
      for (let i = 0; i < 6; i++) mk(G.cyl, m('#fbf7ea'), g, -w / 2 + 8 + i * (w - 16) / 5, wh / 2 + 2, fz + porch - 4, 4.2, wh - 4, 4.2);
      box('#4a2f20', 0, 24, fz + 0.8, 30, 44, 1.6); box('#f1ead8', 0, 48, fz + 0.9, 36, 4, 2);
      for (const x of [-w * 0.36, -w * 0.18, w * 0.18, w * 0.36]) { win(x, 26, fz, 17, 24); win(x, 62, fz, 17, 20); }
      win(0, 62, fz, 17, 20);
      for (const s of [-1, 1]) { win(s * (w / 2), 30, 0, 18, 24, s); win(s * (w / 2), 62, -d * 0.25, 16, 20, s); box('#6a4a3a', s * w * 0.3, wh + rh * 0.75, -d * 0.12, 14, rh * 1.3, 14); }
    } else {
      box('#4a2f20', 0, 20, fz + 0.8, 22, 40, 1.6); mk(G.sph, m('#f1c232'), g, 7, 19, fz + 2, 1.2);
      if (w > 120) { win(-w * 0.3, wh * 0.56, fz, 18, 17); win(w * 0.3, wh * 0.56, fz, 18, 17); }
      win(-w / 2, wh * 0.56, 0, 18, 17, -1); win(w / 2, wh * 0.56, 0, 18, 17, 1);
      if (k === 'cabin') { box('#6a5a4c', w * 0.3, wh + rh * 0.6, -d * 0.14, 13, rh * 1.5, 13); box('#7a6858', 0, 1.5, fz + 8, 34, 3, 14); }
      if (k === 'store') {
        box(spec[1], 0, wh + 12, fz - 1, w, 26, 4);
        const aw = box('#c4352f', 0, 43, fz + 12, w - 6, 2, 26); aw.rotation.x = 0.3;
        for (const s of [-1, 1]) mk(G.cyl6, m('#e4dcc4'), g, s * (w / 2 - 8), 19, fz + 22, 1.5, 38, 1.5);
        const sign = textPlane(b.w > 200 ? 'DRY GOODS' : 'GENERAL STORE', w * 0.7, 15, '#3a2412', '#f1e3bc'); sign.position.set(0, wh + 12, fz + 1.2); g.add(sign); mats.sign = sign.material;
      }
    }
    if (lit) { const gs = glowSprite('#ffb85a', 150, 0.3); gs.position.set(0, wh * 0.5, fz + 10); g.add(gs); }
    return { g, mats: Object.values(mats), top: wh + rh };
  }

  // ----- boats and river things -----
  function makeRaft(lit) {
    const g = new T.Group();
    for (let i = 0; i < 7; i++) { const l = mk(G.cyl, M(i % 2 ? '#8a5a2a' : '#a06b35'), g, hsh(i) * 4 - 2, 2, -27 + i * 9, 4.7, 84, 4.7); l.rotation.z = Math.PI / 2; }
    for (const x of [-30, 30]) mk(G.box, M('#6e4520'), g, x, 6.6, 0, 5, 2.4, 62);
    const wig = mk(G.cone4, M('#d8c79a'), g, -22, 24, -6, 21, 34, 21); wig.rotation.y = Math.PI / 4;
    mk(G.box, M('#4a3a22'), g, -12.5, 14, -6, 0.8, 15, 9);
    mk(G.cyl6, M('#4a3720'), g, 34, 22, -22, 1.2, 32, 1.2); mk(G.box, M('#4a3720'), g, 34, 37, -17, 1.4, 1.4, 11);
    const lamp = new T.Group(); lamp.position.set(34, 30, -12); g.add(lamp); g.lamp = lamp;
    mk(G.cyl6, M('#33343a'), lamp, 0, 4.4, 0, 3, 1.4, 3); mk(G.cyl6, lit ? basic('#ffd36a') : M('#5a5a50'), lamp, 0, 0, 0, 2.6, 7.4, 2.6, true); mk(G.cyl6, M('#33343a'), lamp, 0, -4.4, 0, 3, 1.4, 3);
    return g;
  }
  function makeCanoe() {
    const g = new T.Group(), hull = toon('#8a5a2a', { side: T.DoubleSide });
    const h = mk(G.hemi, hull, g, 0, 9, 0, 40, 11, 13); h.rotation.x = Math.PI;
    mk(G.box, M('#5c3a1a'), g, -10, 6, 0, 4, 1.4, 20); mk(G.box, M('#5c3a1a'), g, 14, 6, 0, 4, 1.4, 17);
    return g;
  }
  function makeSkiff() {
    const g = new T.Group(), hull = toon('#6b4526', { side: T.DoubleSide });
    const h = mk(G.hemi, hull, g, 0, 10, 0, 36, 12, 13); h.rotation.x = Math.PI;
    mk(G.box, M('#8a5d34'), g, 6, 7, 0, 5, 1.5, 21); mk(G.box, M('#8a5d34'), g, -14, 7, 0, 5, 1.5, 17);
    const P = makePerson(FOLK[1]); P.g.position.set(4, -3, 0); P.g.rotation.y = -Math.PI / 2; g.add(P.g); g.P = P; P.legL.visible = P.legR.visible = false;
    for (const s of [-1, 1]) { const o = new T.Group(); o.position.set(2, 10, s * 13); const oar = mk(G.cyl6, M('#d8c79a'), o, 0, 0, s * 12, 0.9, 36, 0.9); oar.rotation.x = Math.PI / 2; mk(G.box, M('#d8c79a'), o, 0, 0, s * 30, 1, 5, 9); g.add(o); (g.oars = g.oars || []).push(o); }
    return g;
  }
  function makeObstacle(o) {
    const g = new T.Group();
    if (o.k === 'log') {
      const l = mk(G.cyl, M('#6b4526'), g, 0, 1, 0, 9.5, o.w, 9.5); l.rotation.z = Math.PI / 2; g.rotation.y = -o.rot;
      mk(G.cyl, M('#c9a36a'), g, o.w / 2 + 0.3, 1, 0, 7.6, 0.8, 7.6).rotation.z = Math.PI / 2; mk(G.cyl, M('#c9a36a'), g, -o.w / 2 - 0.3, 1, 0, 7.6, 0.8, 7.6).rotation.z = Math.PI / 2;
      const st = mk(G.cyl6, M('#5a3a20'), g, o.w * 0.2, 9, 0, 2.6, 9, 2.6); st.rotation.x = 0.5;
    } else if (o.k === 'rock') {
      const a = mk(G.ico0, M('#7b8086'), g, 0, 4, 0, o.r * 1.15, o.r * 1.05, o.r); a.rotation.set(hsh(o.d) * 3, hsh(o.d + 1) * 3, 0);
      const b = mk(G.ico0, M('#666b72'), g, o.r * 0.8, 0, o.r * 0.5, o.r * 0.6); b.rotation.set(hsh(o.d + 2) * 3, 0, 1);
      const fm = mk(G.ring, basic('#ffffff', { transparent: true, opacity: 0.45, depthWrite: false }), g, 0, 0.7, 0, o.r * 1.75, o.r * 1.75, 1, true); fm.rotation.x = -Math.PI / 2;
    } else if (o.k === 'snag') {
      const wood = M('#4a3320'), t = mk(G.cyl6, wood, g, 0, 16, 0, 4, 46, 4); t.rotation.set(0.3, 0, 0.25);
      [[10, 28, -4, 1.1, 0.9, 26], [-12, 20, 5, -1.0, 0.5, 24], [3, 34, 9, 0.3, -0.9, 20]].forEach((b) => { const m = mk(G.cyl6, wood, g, b[0], b[1], b[2], 1.9, b[5], 1.9); m.rotation.set(b[4], 0, -b[3]); });
    } else { // whirlpool
      const m = mk(G.plane, new T.MeshBasicMaterial({ map: spiralTex, transparent: true, depthWrite: false, toneMapped: false }), g, 0, 0.9, 0, o.r * 2.3, o.r * 2.3, 1, true);
      m.rotation.x = -Math.PI / 2; g.swirl = m;
    }
    return g;
  }
  // Generic "keep one model per live game object" helper.
  function syncSet(map, list, parent, make, upd) {
    for (const e of list) {
      let m = map.get(e);
      if (!m) { m = make(e); map.set(e, m); parent.add(m.g || m); }
      m.seen = true; upd(e, m);
    }
    for (const [e, m] of map) { if (!m.seen) { parent.remove(m.g || m); map.delete(e); } else m.seen = false; }
  }
