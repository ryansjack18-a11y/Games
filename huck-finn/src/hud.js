  // ===== HUD (canvas part: hearts, food, party, weapon, special, objective) =====
  function goalText() {
    const d = S.def;
    if (d.id === 'bricks') return S.en.some((e) => e.boss && !e.dead) ? 'Defeat the Duke and the King' : 'Head for the raft';
    if (d.id === 'grange') return game.weapons.includes('gun') ? 'Grab supplies, then reach the raft' : 'Find the gun at the big house';
    return d.goal;
  }
  function pill(x, y, w, h, fill) { ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill(); }
  function drawHud() {
    const g = game, s = S, tm = performance.now() / 1000;
    ctx.save(); ctx.textBaseline = 'alphabetic';
    for (let i = 0; i < 6; i++) drawHeart(24 + i * 24, 86, 9, clamp((g.hp - i * 2) / 2, 0, 1));
    pill(12, 102, 150, 18, 'rgba(0,0,0,.55)');
    const low = g.food < 25;
    ctx.fillStyle = low ? (Math.floor(tm * 4) % 2 ? '#e0453a' : '#a8352a') : '#e2b25c';
    ctx.beginPath(); ctx.roundRect(14, 104, Math.max(0, 146 * g.food / 100), 14, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'left'; ctx.fillText(g.food <= 0 ? 'STARVING!' : low ? 'HUNGRY: find food' : 'FOOD', 20, 115);
    const n = g.chars.length;
    g.chars.forEach((id, i) => {
      const cx = W - 26 - (n - 1 - i) * 46, cy = 92, act = id === g.active, ch = CHARS[id];
      ctx.fillStyle = act ? ch.col : 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.arc(cx, cy, 17, 0, 7); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = act ? '#fff' : ch.col; ctx.stroke();
      ctx.fillStyle = act ? '#1a1208' : '#fff'; ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center'; ctx.fillText(ch.name[0], cx, cy + 6);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui'; ctx.fillText(ch.key, cx, cy + 32);
    });
    if (s.type === 'river') { // progress along the river
      const bw = 220, bx = W / 2 - bw / 2, p = clamp(s.dist / s.len, 0, 1);
      pill(bx - 4, 78, bw + 8, 16, 'rgba(0,0,0,.55)'); ctx.fillStyle = '#3f8fb0'; ctx.beginPath(); ctx.roundRect(bx, 81, bw * p, 10, 5); ctx.fill();
      ctx.fillStyle = '#f1c232'; ctx.beginPath(); ctx.moveTo(bx + bw * p, 76); ctx.lineTo(bx + bw * p - 5, 68); ctx.lineTo(bx + bw * p + 5, 68); ctx.fill();
    } else {
      const bosses = s.en.filter((e) => e.boss);
      bosses.forEach((b, i) => {
        const bw = 200, bx = W / 2 - bw / 2, y = 76 + i * 18;
        pill(bx - 4, y, bw + 8, 14, 'rgba(0,0,0,.6)'); ctx.fillStyle = b.type === 'king' ? '#8f3cb8' : '#b0252f';
        ctx.beginPath(); ctx.roundRect(bx, y + 2, Math.max(0, bw * b.hp / b.max), 10, 5); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center'; ctx.fillText(b.type === 'king' ? 'THE KING' : 'THE DUKE', W / 2, y + 11);
      });
    }
    const msg = s.hint || goalText();
    ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center';
    const mw = ctx.measureText(msg).width + 28; pill(W / 2 - mw / 2, H - 84, mw, 26, s.hint ? 'rgba(120,70,20,.85)' : 'rgba(0,0,0,.5)');
    ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H - 66);
    // weapon and special pills
    const wid = g.weapons[g.wi], wp = WEAPONS[wid];
    pill(W / 2 - 176, H - 48, 170, 32, 'rgba(0,0,0,.6)');
    ctx.fillStyle = '#f1c232'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'left'; ctx.fillText('E', W / 2 - 164, H - 28);
    ctx.fillStyle = '#fff'; ctx.fillText(wp.name + (wid === 'gun' ? ' x' + g.ammo : ''), W / 2 - 148, H - 28);
    const id = g.active, cd = s.spcd[id], full = CHARS[id].cd;
    pill(W / 2 + 6, H - 48, 170, 32, 'rgba(0,0,0,.6)');
    if (cd > 0) { ctx.fillStyle = 'rgba(210,87,58,.55)'; ctx.beginPath(); ctx.roundRect(W / 2 + 6, H - 48, 170 * (cd / full), 32, 10); ctx.fill(); }
    else { ctx.strokeStyle = CHARS[id].col; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(W / 2 + 6, H - 48, 170, 32, 10); ctx.stroke(); }
    ctx.fillStyle = '#f1c232'; ctx.fillText('F', W / 2 + 18, H - 28); ctx.fillStyle = '#fff'; ctx.fillText(CHARS[id].sp + (cd > 0 ? ' ' + cd.toFixed(1) + 's' : ' ready'), W / 2 + 34, H - 28);
    ctx.restore();
  }

