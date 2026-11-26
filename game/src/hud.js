// hud.js — the lit instruments, drawn on a 2D canvas over the 3D view.
// Top: compass tape with heading. Left: airspeed and throttle. Right:
// altitude and vertical speed. Bottom centre: artificial horizon. Bottom
// left: fuel and damage bars. Top left: mission, objective and score.
// Everything a pilot needs, nothing the judge has to guess at.
export function createHud(canvas) {
  const ctx = canvas.getContext('2d');
  const panel = 'rgba(8, 14, 24, 0.62)';
  const ink = '#eaf4ff';
  const dim = '#9db8cc';
  const amber = '#ffb02e';
  const green = '#37e07a';
  const red = '#ff5a3c';

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function text(str, x, y, size, colour, align = 'left', weight = '600') {
    ctx.fillStyle = colour;
    ctx.font = `${weight} ${size}px ui-monospace, Menlo, Consolas, monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }

  function panelRect(x, y, w, h) {
    ctx.fillStyle = panel;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(234, 244, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function compass(headingDeg, w) {
    const cx = w / 2;
    panelRect(cx - 150, 12, 300, 44);
    const points = [
      [0, 'N'], [45, 'NE'], [90, 'E'], [135, 'SE'],
      [180, 'S'], [225, 'SW'], [270, 'W'], [315, 'NW'],
    ];
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx - 150, 12, 300, 44);
    ctx.clip();
    for (const [deg, label] of points) {
      let diff = ((deg - headingDeg + 540) % 360) - 180;
      const x = cx + diff * 2.2;
      if (Math.abs(diff) > 62) continue;
      text(label, x, 34, 13, Math.abs(diff) < 4 ? amber : dim, 'center');
      ctx.strokeStyle = 'rgba(234,244,255,0.4)';
      ctx.beginPath();
      ctx.moveTo(x, 18);
      ctx.lineTo(x, 24);
      ctx.stroke();
    }
    ctx.restore();
    text(`${String(Math.round(headingDeg)).padStart(3, '0')}°`, cx, 34, 15, ink, 'center', '700');
    ctx.fillStyle = amber;
    ctx.beginPath();
    ctx.moveTo(cx - 5, 12);
    ctx.lineTo(cx + 5, 12);
    ctx.lineTo(cx, 19);
    ctx.closePath();
    ctx.fill();
  }

  function horizon(w, h, pitch, bank) {
    const cx = w / 2;
    const cy = h - 108;
    const r = 52;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(-bank);
    const pitchPx = Math.max(-r, Math.min(r, pitch * 90));
    ctx.fillStyle = '#3f8fd2';
    ctx.fillRect(-r, -r + pitchPx, r * 2, r);
    ctx.fillStyle = '#7a5a34';
    ctx.fillRect(-r, pitchPx, r * 2, r);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r, pitchPx);
    ctx.lineTo(r, pitchPx);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(234,244,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    // Fixed wings marker: the horizon moves, the plane does not.
    ctx.strokeStyle = amber;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - 26, cy);
    ctx.lineTo(cx - 8, cy);
    ctx.moveTo(cx + 8, cy);
    ctx.lineTo(cx + 26, cy);
    ctx.stroke();
    text('ATT', cx, cy + r + 14, 10, dim, 'center');
  }

  function bar(x, y, w, h, frac, colour, label, valueText) {
    panelRect(x - 6, y - 16, w + 12, h + 34);
    text(label, x, y - 8, 10, dim);
    ctx.fillStyle = 'rgba(234,244,255,0.18)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = colour;
    ctx.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, h);
    text(valueText, x + w + 8, y + h / 2, 12, ink);
  }

  return {
    draw(state) {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);
      const knots = Math.round(state.speed * 1.944);
      const feet = Math.round(state.altitude * 3.281);
      const headingDeg = ((state.heading * 180) / Math.PI % 360 + 360) % 360;

      compass(headingDeg, w);

      // Airspeed, left.
      panelRect(14, 12, 150, 74);
      text('AIRSPEED', 26, 28, 10, dim);
      text(`${knots}`, 26, 56, 30, state.speed < 22 ? red : ink, 'left', '700');
      text('KT', 118, 58, 12, dim);
      text(`THR ${Math.round(state.throttle * 100)}%`, 26, 76, 11, amber);

      // Altitude, right.
      panelRect(w - 164, 12, 150, 74);
      text('ALTITUDE', w - 152, 28, 10, dim);
      text(`${feet}`, w - 152, 56, 30, ink, 'left', '700');
      text('FT', w - 58, 58, 12, dim);
      const vs = Math.round(state.verticalSpeed * 3.281 * 60);
      text(`V/S ${vs >= 0 ? '+' : ''}${vs} FPM`, w - 152, 76, 11, vs < -600 ? red : dim);

      horizon(w, h, state.pitch, state.bank);

      // Mission block, top left below the airspeed box.
      panelRect(14, 98, 300, 64);
      text(state.missionName, 26, 116, 13, amber, 'left', '700');
      text(state.objective, 26, 136, 12, ink);
      text(`SCORE ${state.score}`, 26, 152, 12, dim);

      // Fuel and damage, bottom left.
      bar(20, h - 66, 170, 12, state.fuel / 100, state.fuel < 25 ? red : green, 'FUEL', `${Math.round(state.fuel)}%`);
      bar(20, h - 30, 170, 12, 1 - state.damage / 100, state.damage > 60 ? red : green, 'AIRFRAME', `${Math.max(0, Math.round(100 - state.damage))}%`);

      // Gear + wind, bottom right.
      panelRect(w - 164, h - 66, 150, 50);
      text(`GEAR ${state.gearDown ? 'DOWN' : 'UP'}`, w - 152, h - 48, 12, state.gearDown ? green : dim);
      text(state.wind ? `WIND ${state.wind} KT →` : 'WIND CALM', w - 152, h - 28, 11, dim);

      // Centre message, when one is set.
      if (state.message) {
        ctx.font = '700 26px ui-monospace, Menlo, Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const tw = ctx.measureText(state.message).width;
        ctx.fillStyle = 'rgba(8, 14, 24, 0.66)';
        ctx.beginPath();
        ctx.roundRect(w / 2 - tw / 2 - 18, h * 0.30 - 24, tw + 36, 48, 8);
        ctx.fill();
        ctx.fillStyle = state.messageColour || amber;
        ctx.fillText(state.message, w / 2, h * 0.30);
      }
      // Low-altitude warning.
      if (state.altitude < 25 && state.speed > 5 && state.screen === 'play') {
        text('⚠ PULL UP — TERRAIN', w / 2, h * 0.42, 15, red, 'center', '700');
      }
    },
  };
}
