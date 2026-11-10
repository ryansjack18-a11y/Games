
  // ===== OVERLAY: 2D marks drawn over the 3D scene (text, speech, alert meters, compass arrow) =====
  function heartPath(x, y, s) {
    ctx.beginPath(); ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.15, y + s * 0.1, x - s * 0.6, y - s * 0.75, x, y - s * 0.15);
    ctx.bezierCurveTo(x + s * 0.6, y - s * 0.75, x + s * 1.15, y + s * 0.1, x, y + s * 0.9);
  }
  function drawHeart(x, y, s, frac) {
    heartPath(x, y, s); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fill();
    if (frac > 0) { ctx.save(); heartPath(x, y, s); ctx.clip(); ctx.fillStyle = '#e0453a'; ctx.fillRect(x - s * 1.3, y - s, s * 2.6 * frac, s * 2.2); ctx.restore(); }
    heartPath(x, y, s); ctx.lineWidth = 1.5; ctx.strokeStyle = '#2a0d0a'; ctx.stroke();
  }
  function alertMeter(p, sus, hostile) { // "?" fills as someone grows suspicious, "!" once they turn on you
    ctx.textAlign = 'center';
    if (hostile) { ctx.font = 'bold 22px system-ui'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText('!', p.x, p.y); ctx.fillStyle = '#ff5a48'; ctx.fillText('!', p.x, p.y); return; }
    if (sus > 0.04) {
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(p.x - 16, p.y - 2, 32, 7);
      ctx.fillStyle = sus > 0.6 ? '#e0453a' : '#f1c232'; ctx.fillRect(p.x - 15, p.y - 1, 30 * sus, 5);
      ctx.font = 'bold 14px system-ui'; ctx.fillStyle = '#fff'; ctx.fillText('?', p.x, p.y - 6);
    }
  }
  function drawOverlay() {
    const s = S, land = s.type === 'land', tm = performance.now() / 1000;
    ctx.save(); ctx.textBaseline = 'alphabetic';
    if (land) {
      for (const e of s.en) {
        if (e.type === 'folk') { const p = proj(e.x, 62, e.y); if (p.ok) alertMeter(p, e.st === 'idle' ? e.sus : 0, e.st === 'hostile'); }
        else if (e.st === 'sleep') { const p = proj(e.x, 34, e.y); if (p.ok) { ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.5 * Math.sin(e.z * 3)) + ')'; ctx.fillText('Z z z', p.x + 10, p.y - (e.z * 8) % 12); } }
      }
      // compass arrow to the landing when it is out of view
      const ex = s.def.exit;
      if (!s.en.some((e) => e.boss && !e.dead)) {
        const p = proj(ex.x + ex.w / 2, 40, ex.y + ex.h / 2), off = !p.ok || p.x < 20 || p.x > W - 20 || p.y < 70 || p.y > H - 90;
        if (off) {
          let dx = p.x - W / 2, dy = p.y - H / 2; if (p.back) { dx = -dx; dy = -dy; }
          const a = Math.atan2(dy, dx), k = Math.min((W / 2 - 46) / Math.abs(Math.cos(a) || 1e-6), (H / 2 - 120) / Math.abs(Math.sin(a) || 1e-6));
          const x = W / 2 + Math.cos(a) * k, y = H / 2 + 16 + Math.sin(a) * k;
          ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = 0.75 + 0.25 * Math.sin(tm * 5);
          ctx.fillStyle = '#f1c232'; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-8, -11); ctx.lineTo(-3, 0); ctx.lineTo(-8, 11); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore();
          ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 3;
          const lab = s.def.id === 'stpete' ? 'CANOE' : 'RAFT'; ctx.strokeText(lab, clamp(x, 30, W - 30), y + 24); ctx.fillText(lab, clamp(x, 30, W - 30), y + 24);
        }
      }
    } else {
      for (const k of s.skiffs) {
        const p = proj(wx(k.x), 58, k.y); if (!p.ok) continue;
        if (k.stun > 0) { ctx.fillStyle = '#ffe9a0'; ctx.font = '15px system-ui'; ctx.textAlign = 'center'; ctx.fillText('★ ★', p.x, p.y + Math.sin(tm * 8) * 2); }
        else alertMeter(p, k.st === 'approach' ? k.sus : 0, k.st === 'hostile');
      }
    }
    for (const f of s.fx) { // floating numbers and notes
      if (f.k !== 't') continue;
      const p = proj(f.x, f.y, f.z); if (!p.ok) continue;
      ctx.globalAlpha = Math.max(0, Math.min(1, (1 - f.t / f.life) * 2.2));
      ctx.font = 'bold 16px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(0,0,0,.75)';
      ctx.strokeText(f.text, p.x, p.y); ctx.fillStyle = f.col; ctx.fillText(f.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
    for (const b of s.bub) { // speech bubbles
      const o = b.o, p = proj(wx(o.x), land ? 60 * ((o.look && o.look.scale) || 1) + 6 : 70, o.y); if (!p.ok) continue;
      ctx.font = '600 13px system-ui, sans-serif'; ctx.textAlign = 'center';
      const w = ctx.measureText(b.text).width + 16, x = clamp(p.x, w / 2 + 6, W - w / 2 - 6), y = clamp(p.y, 150, H - 100);
      ctx.fillStyle = 'rgba(255,250,235,.96)'; ctx.strokeStyle = '#3a2a16'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(x - w / 2, y - 18, w, 24, 8); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 5, y + 6); ctx.lineTo(x, y + 13); ctx.lineTo(x + 5, y + 6); ctx.fill();
      ctx.fillStyle = '#2a1c0c'; ctx.fillText(b.text, x, y - 1);
    }
    // screen effects: a red pulse when hurt, lightning, and gust warnings on the river
    if (s.inv > 0.72) {
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75); vg.addColorStop(0, 'rgba(200,30,20,0)'); vg.addColorStop(1, 'rgba(200,30,20,' + (s.inv - 0.72) * 1.9 + ')');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
    if (!land) {
      if (s.flash > 0 && !REDUCE_MOTION) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.5, s.flash * 1.3) + ')'; ctx.fillRect(0, 0, W, H); }
      const wd = s.wind;
      if (wd.warn > 0 || wd.left > 0) {
        const ch = wd.dir > 0 ? '▶' : '◀', x0 = W / 2 + wd.dir * 150;
        ctx.fillStyle = 'rgba(255,230,150,' + (wd.warn > 0 ? 0.55 + 0.45 * Math.sin(tm * 30) : 0.8) + ')'; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 3;
        ctx.font = 'bold 34px system-ui'; ctx.textAlign = 'center';
        for (let i = 0; i < 3; i++) { const x = x0 + wd.dir * (i * 34 + ((tm * 80) % 34) * 0.5); ctx.strokeText(ch, x, 150); ctx.fillText(ch, x, 150); }
        ctx.font = 'bold 13px system-ui'; ctx.fillText(wd.warn > 0 ? 'GUST COMING' : 'GUST!', W / 2, 146);
      }
    }
    ctx.restore();
  }

  // Dragging the view turns the camera on land.
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (state !== State.PLAYING || !S || S.type !== 'land') return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const k = W / (canvas.getBoundingClientRect().width || W);
    camCtl.yaw -= (e.clientX - drag.x) * 0.0055 * k; camCtl.pitch = clamp(camCtl.pitch + (e.clientY - drag.y) * 0.004 * k, 0.3, 1.2);
    drag.x = e.clientX; drag.y = e.clientY;
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(ev, () => { drag = null; });

  function update(dt) {
    if (!S) return;
    if (S.type === 'land') updateLand(dt); else updateRiver(dt);
  }
  let lastRender = performance.now();
  function render() {
    const now = performance.now(), fdt = Math.min(0.1, Math.max(0, (now - lastRender) / 1000)); lastRender = now;
    ctx.clearRect(0, 0, W, H);
    if (!game || !S || !view || (state !== State.PLAYING && state !== State.PAUSED)) { renderTitle(fdt); return; }
    const dt = state === State.PLAYING ? fdt : 0;
    if (S.type === 'land') syncLandView(view, S, dt); else syncRiverView(view, S, game, dt);
    R3.render(view.scene, cam);
    drawOverlay(); drawHud();
  }
