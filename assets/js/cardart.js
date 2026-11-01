/* =====================================================================
 * مُذكّر — cardart.js  (الإصدار ٢٤، معرض ١١: كل خلفية بنسختين داكنة وفاتحة + ١٠ خلفيات جديدة بلا مساجد)
 * محرّك «صنع بطاقة»: خلفيات مرسومة بالكود (بلا صور ولا نت) + كتابة الذكر أو الآية بمكان مريح حسب الجهاز.
 *   CardArt.draw(ctx, w, h, style, seed, mode, opts) ← mode: 'dark' | 'light'، opts.mosque === false بيشيل المسجد
 *   CardArt.text(ctx, w, h, item, opts)               ← بيكتب { text, ref, kind:'ayah'|'dhikr' } بالمنطقة الآمنة لـ opts.kind
 *   CardArt.ORDER                                     ← ترتيب الخلفيات بشاشة الصنع
 *   CardArt.photo(ctx, w, h, img, view) + photoStyle(canvas, kind) ← صورة المستخدم بالمقاس، ومكان الكتابة ولونها حسب الصورة
 * كل خلفية: modes.dark و modes.light (ألوان الرسم + لون الكتابة ink + accent + scrim)، و def النسخة الأصلية.
 * ===================================================================== */
const CardArt = (() => {
  const TAU = Math.PI * 2;
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const hex = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  const rgba = (c, a) => { if (c[0] !== '#') return c; const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };

  // ---------- أدوات الرسم ----------
  function vgrad(ctx, y, w, h, stops) { const g = ctx.createLinearGradient(0, y, 0, y + h); stops.forEach(([o, c]) => g.addColorStop(o, c)); ctx.fillStyle = g; ctx.fillRect(0, y, w, h); }
  function glow(ctx, x, y, r, c, a) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(c, a)); g.addColorStop(.35, rgba(c, a * .45)); g.addColorStop(1, rgba(c, 0)); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  function band(ctx, w, y, hh, c, a) { const g = ctx.createLinearGradient(0, y - hh, 0, y + hh); g.addColorStop(0, rgba(c, 0)); g.addColorStop(.5, rgba(c, a)); g.addColorStop(1, rgba(c, 0)); ctx.fillStyle = g; ctx.fillRect(0, y - hh, w, hh * 2); }
  function disc(ctx, x, y, R, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill(); }
  // خط جبال طبيعي (تقسيم متكرر مع إزاحة)
  function ridge(w, y0, amp, rough, r, depth = 8) {
    let pts = [[-w * .05, y0 + (r() - .5) * amp], [w * 1.05, y0 + (r() - .5) * amp]], a = amp;
    for (let d = 0; d < depth; d++) {
      const next = [];
      for (let i = 0; i < pts.length - 1; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[i + 1]; next.push(pts[i], [(x1 + x2) / 2, (y1 + y2) / 2 + (r() - .5) * a]); }
      next.push(pts[pts.length - 1]); pts = next; a *= rough;
    }
    return pts;
  }
  // موجة ناعمة (للورق المقصوص)
  function wave(w, y0, amp, r) {
    const f = [1 + r() * 1.5, 2.5 + r() * 2, 5 + r() * 3], p = [r() * TAU, r() * TAU, r() * TAU], pts = [];
    for (let i = 0; i <= 72; i++) { const x = -w * .05 + i / 72 * w * 1.1, t = x / w * TAU; pts.push([x, y0 + amp * (.58 * Math.sin(t * f[0] / 2 + p[0]) + .3 * Math.sin(t * f[1] / 2 + p[1]) + .12 * Math.sin(t * f[2] / 2 + p[2]))]); }
    return pts;
  }
  function fillRidge(ctx, pts, bottom, fill) { ctx.beginPath(); ctx.moveTo(pts[0][0], bottom); pts.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(pts[pts.length - 1][0], bottom); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
  const ridgeY = (pts, x) => { for (let i = 0; i < pts.length - 1; i++) if (x >= pts[i][0] && x <= pts[i + 1][0]) { const t = (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0]); return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t; } return pts[pts.length - 1][1]; };
  // شجرة صنوبر: طبقات مسنّنة
  function pine(ctx, x, base, h, w) {
    const tiers = 7; ctx.beginPath(); ctx.moveTo(x, base - h);
    for (let i = 1; i <= tiers; i++) { const t = i / tiers, y = base - h + h * .9 * t, hw = w / 2 * (.18 + .82 * t); ctx.lineTo(x + hw, y); if (i < tiers) ctx.lineTo(x + hw * .42, y - h * .015); }
    ctx.lineTo(x + w * .05, base - h * .1); ctx.lineTo(x + w * .05, base); ctx.lineTo(x - w * .05, base); ctx.lineTo(x - w * .05, base - h * .1);
    for (let i = tiers; i >= 1; i--) { const t = i / tiers, y = base - h + h * .9 * t, hw = w / 2 * (.18 + .82 * t); if (i < tiers) ctx.lineTo(x - hw * .42, y - h * .015); ctx.lineTo(x - hw, y); }
    ctx.closePath(); ctx.fill();
  }
  function forestRow(ctx, w, pts, lift, n, minH, maxH, r, fill) {
    ctx.fillStyle = fill;
    for (let i = 0; i < n; i++) { const x = (i + r()) / n * w * 1.1 - w * .05, h = minH + r() * (maxH - minH); pine(ctx, x, ridgeY(pts, x) + lift, h, h * (.3 + r() * .1)); }
  }
  // هلال: دائرة ناقصها دائرة (برسمة منفصلة حتى ما ينقص من الخلفية)
  function crescent(ctx, x, y, R, color, glowC) {
    if (glowC) glow(ctx, x, y, R * 5, glowC, .22);
    const s = Math.max(2, Math.ceil(R * 2.6)), cv = document.createElement('canvas'); cv.width = cv.height = s;
    const g = cv.getContext('2d'); g.fillStyle = color; g.beginPath(); g.arc(s / 2, s / 2, R, 0, TAU); g.fill();
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(s / 2 + R * .42, s / 2 - R * .28, R * .9, 0, TAU); g.fill();
    ctx.drawImage(cv, x - s / 2, y - s / 2);
  }
  function star5(ctx, x, y, r, color) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fillStyle = color; ctx.fill(); }
  function stars(ctx, w, h, n, r, u, color, maxA, milky) {
    for (let i = 0; i < n; i++) {
      let x = r() * w, y = r() * h;
      if (milky && r() < .6) { const t = r(); x = t * w; y = milky.y0 + (milky.y1 - milky.y0) * t + (r() - .5) * milky.spread; }
      const s = (r() ** 3 * 1.4 + .25) * u; ctx.fillStyle = rgba(color, (.25 + r() * .75) * maxA); ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
      if (s > 1.1 * u && r() < .5) glow(ctx, x, y, s * 6, color, .18 * maxA);
    }
  }
  // مسجد: قاعة وقبة كبيرة وقباب صغيرة ومآذن (رسم بلا أشخاص)
  function onion(ctx, cx, y, hw, hh) {
    ctx.moveTo(cx - hw, y);
    ctx.bezierCurveTo(cx - hw * 1.16, y - hh * .52, cx - hw * .42, y - hh * .76, cx, y - hh);
    ctx.bezierCurveTo(cx + hw * .42, y - hh * .76, cx + hw * 1.16, y - hh * .52, cx + hw, y);
    ctx.closePath();
  }
  function minaret(ctx, mx, base, s, mh) {
    const mw = s * .07;
    ctx.rect(mx - mw / 2, base - mh, mw, mh);
    ctx.rect(mx - mw * .95, base - mh * .64, mw * 1.9, s * .026);
    ctx.rect(mx - mw * .8, base - mh * .86, mw * 1.6, s * .024);
    ctx.moveTo(mx - mw * .62, base - mh); ctx.lineTo(mx, base - mh - s * .17); ctx.lineTo(mx + mw * .62, base - mh); ctx.closePath();
    ctx.rect(mx - s * .006, base - mh - s * .25, s * .012, s * .09);
  }
  function archHole(ctx, x, y, ww, wh) { ctx.moveTo(x - ww, y); ctx.lineTo(x - ww, y - wh); ctx.quadraticCurveTo(x - ww, y - wh - ww * 1.2, x, y - wh - ww * 1.7); ctx.quadraticCurveTo(x + ww, y - wh - ww * 1.2, x + ww, y - wh); ctx.lineTo(x + ww, y); ctx.closePath(); }
  // o.detail: لون الأقواس والشبابيك (أفتح أو مضوي)، o.four: أربع مآذن، o.tall: طول المئذنة نسبة للحجم
  function mosque(ctx, cx, base, s, fill, o = {}) {
    ctx.fillStyle = fill; ctx.beginPath();
    const bw = s * .98, bh = s * .32, dome = base - bh - s * .11, tall = o.tall || 1.22;
    ctx.rect(cx - bw, base - bh, bw * 2, bh);
    ctx.rect(cx - bw * 1.04, base - bh - s * .025, bw * 2.08, s * .03);
    ctx.rect(cx - s * .4, dome, s * .8, s * .11);
    onion(ctx, cx, dome, s * .4, s * .56);
    ctx.rect(cx - s * .007, dome - s * .56 - s * .1, s * .014, s * .11);
    for (const d of [-1, 1]) {
      const x = cx + d * s * .64;
      ctx.rect(x - s * .18, base - bh - s * .06, s * .36, s * .06);
      onion(ctx, x, base - bh - s * .06, s * .18, s * .27);
      ctx.rect(x - s * .005, base - bh - s * .06 - s * .27 - s * .06, s * .01, s * .07);
      minaret(ctx, cx + d * s * 1.1, base, s, s * tall);
      if (o.four) minaret(ctx, cx + d * s * 1.55, base, s, s * tall * .78);
    }
    ctx.fill();
    crescent(ctx, cx, dome - s * .56 - s * .14, s * .045, typeof fill === 'string' ? fill : '#e9c06a');
    if (o.detail) {
      ctx.fillStyle = o.detail; ctx.beginPath();
      for (let i = -3; i <= 3; i++) archHole(ctx, cx + i * s * .26, base, s * .065, s * .13);
      for (let i = -2; i <= 2; i++) archHole(ctx, cx + i * s * .13, dome + s * .09, s * .025, s * .03);
      ctx.fill();
    }
  }
  function palm(ctx, x, base, h, lean, fill) {
    const tx = x + lean * h * .3, ty = base - h;
    ctx.strokeStyle = fill; ctx.lineCap = 'round'; ctx.lineWidth = h * .035;
    ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x + lean * h * .02, base - h * .55, tx, ty); ctx.stroke();
    ctx.fillStyle = fill;
    [-168, -140, -112, -80, -52, -22, 6].forEach((deg, i) => {
      const a = deg * Math.PI / 180, len = h * (.36 + (i % 2) * .08), ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len + len * .38 * Math.abs(Math.cos(a));
      ctx.beginPath(); ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(tx + Math.cos(a - .25) * len * .55, ty + Math.sin(a - .25) * len * .55, ex, ey);
      ctx.quadraticCurveTo(tx + Math.cos(a + .2) * len * .5, ty + Math.sin(a + .2) * len * .5 + len * .12, tx, ty); ctx.fill();
    });
  }
  function birds(ctx, x, y, n, s, r, color) {
    ctx.strokeStyle = color; ctx.lineWidth = s * .12; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) { const bx = x + (r() - .5) * s * 14, by = y + (r() - .5) * s * 6, k = s * (.6 + r() * .6); ctx.beginPath(); ctx.moveTo(bx - k, by - k * .35); ctx.quadraticCurveTo(bx - k * .4, by - k * .5, bx, by); ctx.quadraticCurveTo(bx + k * .4, by - k * .5, bx + k, by - k * .35); ctx.stroke(); }
  }
  // نجمة ثمانية (خاتم) ونقش متكرر وإطار محراب
  function star8(ctx, x, y, r) { for (const rot of [0, Math.PI / 4]) { for (let k = 0; k < 4; k++) { const a = rot + Math.PI / 4 + k * Math.PI / 2; ctx[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); } }
  // نجمة ثمانية كشكل واحد (للتعبئة)
  function star8Solid(ctx, x, y, r) { for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8 + Math.PI / 8, rr = k % 2 ? r * .7 : r; ctx[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); }
  function khatamGrid(ctx, w, h, size, color, lw) { ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath(); for (let y = 0; y < h + size; y += size) for (let x = (Math.floor(y / size) % 2) * size / 2; x < w + size; x += size) { star8(ctx, x, y, size * .42); ctx.moveTo(x + size * .2, y); ctx.arc(x, y, size * .2, 0, TAU); } ctx.stroke(); }
  function rosette(ctx, x, y, R, color, lw) { ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath(); star8(ctx, x, y, R); star8(ctx, x, y, R * .62); ctx.moveTo(x + R * .3, y); ctx.arc(x, y, R * .3, 0, TAU); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.moveTo(x + Math.cos(a) * R * .3, y + Math.sin(a) * R * .3); ctx.lineTo(x + Math.cos(a) * R * 1.25, y + Math.sin(a) * R * 1.25); } ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, R * .08, 0, TAU); ctx.fillStyle = color; ctx.fill(); }
  function archPath(ctx, L, R, T, B) {
    const W = R - L, sh = T + W * .62, mid = (L + R) / 2;
    ctx.moveTo(L, B); ctx.lineTo(L, sh);
    ctx.bezierCurveTo(L, sh - W * .34, mid - W * .14, T + W * .16, mid, T);
    ctx.bezierCurveTo(mid + W * .14, T + W * .16, R, sh - W * .34, R, sh);
    ctx.lineTo(R, B); ctx.closePath();
  }
  // إطار المحراب؛ بالشاشة العرضية بيضل بقياس معقول بالنص
  function archBox(w, h, inset, top) { const W = Math.min(w - inset * 2, (h - top - inset) * .78), L = (w - W) / 2; return [L, L + W, top, h - inset]; }
  function archFrame(ctx, w, h, inset, top, color, u) {
    const [L, R, T, B] = archBox(w, h, inset, top);
    ctx.strokeStyle = color; ctx.lineWidth = 1.6 * u; ctx.beginPath(); archPath(ctx, L, R, T, B); ctx.stroke();
    ctx.lineWidth = .7 * u; ctx.beginPath(); archPath(ctx, L + 7 * u, R - 7 * u, T + 9 * u, B - 7 * u); ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(w / 2, T - 16 * u); ctx.lineTo(w / 2 + 5 * u, T - 6 * u); ctx.lineTo(w / 2, T + 2 * u); ctx.lineTo(w / 2 - 5 * u, T - 6 * u); ctx.closePath(); ctx.fill();
  }
  function corners(ctx, w, h, R, color, lw) { for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h]]) { ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath(); star8(ctx, x, y, R); star8(ctx, x, y, R * .66); star8(ctx, x, y, R * 1.35); ctx.moveTo(x + R * .4, y); ctx.arc(x, y, R * .4, 0, TAU); ctx.stroke(); } }
  // حبيبات خفيفة (ملمس) وتعتيم الأطراف
  let NOISE = null;
  function grain(ctx, w, h, a) {
    if (!NOISE) { NOISE = document.createElement('canvas'); NOISE.width = NOISE.height = 128; const g = NOISE.getContext('2d'), d = g.createImageData(128, 128); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); }
    ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = ctx.createPattern(NOISE, 'repeat'); ctx.fillRect(0, 0, w, h); ctx.restore();
  }
  function vignette(ctx, w, h, a) { if (!a) return; const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .35, w / 2, h / 2, Math.hypot(w, h) * .62); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
  function water(ctx, w, y, h, r, u, color, moonX) {
    for (let i = 0; i < 260; i++) {
      const yy = y + r() ** 1.6 * h, near = (yy - y) / h, len = (6 + r() * 40) * u * (.4 + near);
      const x = moonX != null && r() < .55 ? moonX + (r() - .5) * (20 + near * 140) * u : r() * w;
      ctx.fillStyle = rgba(color, (.08 + r() * .3) * (moonX != null ? 1 - near * .4 : .6)); ctx.fillRect(x - len / 2, yy, len, Math.max(1, .8 * u * (.6 + near)));
    }
  }
  // منحنى بيزييه تكعيبي: النقطة والاتجاه
  const bez = (p, t) => { const m = 1 - t; return [m * m * m * p[0][0] + 3 * m * m * t * p[1][0] + 3 * m * t * t * p[2][0] + t * t * t * p[3][0], m * m * m * p[0][1] + 3 * m * m * t * p[1][1] + 3 * m * t * t * p[2][1] + t * t * t * p[3][1]]; };
  const bezAng = (p, t) => { const a = bez(p, Math.max(0, t - .01)), b = bez(p, Math.min(1, t + .01)); return Math.atan2(b[1] - a[1], b[0] - a[0]); };
  // ورقة شجر (زيتون): قوسين من الأصل للرأس
  function leaf(ctx, x, y, ang, len, wid) {
    const c = Math.cos(ang), s = Math.sin(ang), tx = x + c * len, ty = y + s * len, nx = -s * wid, ny = c * wid;
    ctx.moveTo(x, y); ctx.quadraticCurveTo(x + c * len * .5 + nx, y + s * len * .5 + ny, tx, ty); ctx.quadraticCurveTo(x + c * len * .5 - nx, y + s * len * .5 - ny, x, y);
  }
  // غيمة: دوائر منفوخة بقاعدة مسطّحة وتدرّج للحجم
  function cloud(ctx, cx, cy, cw, r, top, bot) {
    ctx.save(); ctx.beginPath(); ctx.rect(cx - cw, cy - cw, cw * 2, cw + cw * .02); ctx.clip();
    const g = ctx.createLinearGradient(0, cy - cw * .32, 0, cy); g.addColorStop(0, top); g.addColorStop(1, bot); ctx.fillStyle = g;
    ctx.beginPath(); const n = 7;
    for (let i = 0; i < n; i++) { const t = i / (n - 1) * 2 - 1, R = cw * (.1 + .12 * (1 - t * t)) * (.85 + .3 * r()), x = cx + t * cw * .42, y = cy - R * .32; ctx.moveTo(x + R, y); ctx.arc(x, y, R, 0, TAU); }
    ctx.fill(); ctx.restore();
  }
  // فانوس معلّق: سلسلة، غطا، جسم زجاج مضوي بإطار معدن، قاعدة
  function lantern(ctx, x, y, s, P, u) {
    ctx.strokeStyle = P.metal; ctx.lineWidth = .9 * u; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y); ctx.stroke();
    glow(ctx, x, y + s * 1.05, s * 3.4, P.glowC, P.glowA);
    const g = ctx.createRadialGradient(x, y + s * 1.05, s * .05, x, y + s * 1.05, s * .75); g.addColorStop(0, P.glass); g.addColorStop(1, P.glassEdge);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - s * .48, y + s * .44); ctx.lineTo(x - s * .62, y + s * .78); ctx.lineTo(x - s * .46, y + s * 1.52); ctx.lineTo(x + s * .46, y + s * 1.52); ctx.lineTo(x + s * .62, y + s * .78); ctx.lineTo(x + s * .48, y + s * .44); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = P.metal; ctx.lineWidth = Math.max(1, s * .045); ctx.stroke();
    ctx.lineWidth = Math.max(.8, s * .03); ctx.beginPath();
    for (const d of [-.22, 0, .22]) { ctx.moveTo(x + d * s * 1.3, y + s * .44); ctx.lineTo(x + d * s * 1.55, y + s * .78); ctx.lineTo(x + d * s * 1.15, y + s * 1.52); }
    ctx.moveTo(x - s * .62, y + s * .78); ctx.lineTo(x + s * .62, y + s * .78); ctx.stroke();
    ctx.lineWidth = Math.max(.6, s * .022); ctx.beginPath(); star8(ctx, x, y + s * 1.12, s * .16); ctx.stroke();
    ctx.fillStyle = P.metal; ctx.beginPath(); onion(ctx, x, y + s * .44, s * .5, s * .42); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y - s * .02, s * .07, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - s * .5, y + s * 1.5); ctx.lineTo(x + s * .5, y + s * 1.5); ctx.lineTo(x + s * .26, y + s * 1.7); ctx.lineTo(x - s * .26, y + s * 1.7); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - s * .08, y + s * 1.7); ctx.lineTo(x, y + s * 1.98); ctx.lineTo(x + s * .08, y + s * 1.7); ctx.closePath(); ctx.fill();
  }
  // سنبلة قمح: ساق مايلة وحبّات متناوبة وشعيرات
  function stalk(ctx, x, base, len, bend, col, u) {
    const tx = x + bend * len, ty = base - len, cx = x + bend * len * .15, cy = base - len * .6;
    const at = t => [(1 - t) * (1 - t) * x + 2 * (1 - t) * t * cx + t * t * tx, (1 - t) * (1 - t) * base + 2 * (1 - t) * t * cy + t * t * ty];
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(.7 * u, len * .006); ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(cx, cy, tx, ty); ctx.stroke();
    const k = len * .034; ctx.fillStyle = col; ctx.lineWidth = Math.max(.35 * u, k * .06);
    for (let i = 0; i < 10; i++) {
      const t = .72 + i * .029, [px, py] = at(t), [qx, qy] = at(Math.min(1, t + .01)), a = Math.atan2(qy - py, qx - px), side = i % 2 ? 1 : -1, ka = a + side * .45;
      const ex = px + Math.cos(a + side * Math.PI / 2) * k * .22, ey = py + Math.sin(a + side * Math.PI / 2) * k * .22;
      ctx.beginPath(); ctx.ellipse(ex, ey, k * .55, k * .24, ka, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(ka - side * .2) * k * 2.2, ey + Math.sin(ka - side * .2) * k * 2.2); ctx.stroke();
    }
  }
  // زهرة لوز: خمس بتلات وقلب
  function flower(ctx, x, y, R, rot, P) {
    for (let k = 0; k < 5; k++) {
      const a = rot + k * TAU / 5, px = x + Math.cos(a) * R * .52, py = y + Math.sin(a) * R * .52;
      const g = ctx.createRadialGradient(x, y, R * .1, x, y, R * 1.05); g.addColorStop(0, P.petalIn); g.addColorStop(1, P.petalOut);
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(px, py, R * .56, R * .42, a, 0, TAU); ctx.fill();
    }
    disc(ctx, x, y, R * .2, P.center);
    ctx.fillStyle = P.center; for (let k = 0; k < 7; k++) { const a = rot + k * TAU / 7; ctx.beginPath(); ctx.arc(x + Math.cos(a) * R * .34, y + Math.sin(a) * R * .34, R * .05, 0, TAU); ctx.fill(); }
  }
  // غصن متفرّع (لوز): خطوات صغيرة مع ميلان، وزهر على الأطراف
  function branch(ctx, x, y, ang, len, wid, depth, r, P, u, blooms) {
    const steps = 8; let px = x, py = y, a = ang;
    ctx.strokeStyle = P.branch; ctx.lineCap = 'round';
    for (let i = 0; i < steps; i++) {
      a += (r() - .5) * .3; const nx = px + Math.cos(a) * len / steps, ny = py + Math.sin(a) * len / steps;
      ctx.lineWidth = Math.max(.6 * u, wid * (1 - i / steps * .35)); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
      if (depth <= 2 && r() < .42) blooms.push([nx + (r() - .5) * 8 * u, ny + (r() - .5) * 8 * u, (5 + r() * 5) * u, r() * TAU, r() < .2]);
      px = nx; py = ny;
    }
    if (depth > 0) { const n = depth > 2 ? 2 : 1 + (r() < .6 ? 1 : 0); for (let i = 0; i < n; i++) branch(ctx, px, py, a + (i ? 1 : -1) * (.35 + r() * .4), len * (.62 + r() * .12), wid * .6, depth - 1, r, P, u, blooms); }
    else blooms.push([px, py, (4 + r() * 2) * u, r() * TAU, true]);
  }
  // سيغايها: صفوف موج من دوائر متداخلة
  function scales(ctx, w, h, y0, R, P, u) {
    ctx.lineWidth = Math.max(.7, .9 * u); ctx.strokeStyle = P.line;
    for (let j = 0; y0 + j * R * .5 - R < h; j++) {
      const y = y0 + j * R * .5, off = (j % 2) * R;
      for (let x = -2 * R + off; x < w + 2 * R; x += 2 * R) for (let k = 4; k >= 1; k--) { ctx.beginPath(); ctx.arc(x, y, R * k / 4, 0, TAU); ctx.fillStyle = k % 2 ? P.f1 : P.f2; ctx.fill(); ctx.stroke(); }
    }
  }

  // ---------- الخلفيات ----------
  // خ١–خ٩: المعرض ١٠ بنسخة داكنة وفاتحة. ج١–ج١٠: جديدة بلا مساجد.
  const STYLES = {
    forest: { name: 'غابة الضباب', zone: 'upper', def: 'dark', modes: {
      dark: { ink: '#f6f2e6', accent: '#dcc993', scrim: '#0d2220', sky: [[0, '#173230'], [.42, '#3d6660'], [.6, '#9fbcb1'], [.66, '#c9d8cd'], [1, '#c9d8cd']], orb: '#f7f1df', orbGlow: '#fff8e6', orbA: .35, layers: ['#86a69d', '#5f8279', '#3e5f57', '#24413b'], mist: '#d9e4dc', mistA: .38, lake: ['#1d3a35', '#0b1d1a'], shimmer: '#e8f0ea', fg: '#0a1a17', vig: .35 },
      light: { light: true, ink: '#1c372f', accent: '#6f6234', scrim: '#eef3ea', sky: [[0, '#cfe0dc'], [.4, '#e3ece5'], [.6, '#f5f0df'], [.66, '#f4efdf'], [1, '#f4efdf']], orb: '#fffbf0', orbGlow: '#ffe2a0', orbA: .6, layers: ['#c3d4c8', '#9cb8aa', '#729687', '#4c7363'], mist: '#f7f6ec', mistA: .55, lake: ['#a7c4b9', '#6f9686'], shimmer: '#ffffff', fg: '#2c4d41', vig: 0 } },
      draw(ctx, w, h, r, u, P) {
        vgrad(ctx, 0, w, h, P.sky);
        glow(ctx, w * .5, h * .13, 70 * u, P.orbGlow, P.orbA); disc(ctx, w * .5, h * .13, 15 * u, P.orb);
        [[.56, 60], [.61, 52], [.67, 44], [.73, 36]].forEach(([y, amp], i) => { const c = P.layers[i], p = ridge(w, h * y, amp * u, .55, r); fillRidge(ctx, p, h, c); forestRow(ctx, w, p, 4 * u, 16 + i * 6, (10 + i * 7) * u, (22 + i * 12) * u, r, c); band(ctx, w, h * (y + .03), 26 * u, P.mist, P.mistA - i * .06); });
        vgrad(ctx, h * .8, w, h * .2, [[0, P.lake[0]], [1, P.lake[1]]]); water(ctx, w, h * .8, h * .2, r, u, P.shimmer, w * .5);
        ctx.fillStyle = P.fg;
        for (const side of [0, 1]) for (let i = 0; i < 4; i++) { const x = side ? w - (i * 22 + r() * 10) * u : (i * 22 + r() * 10) * u, hh = (120 - i * 18 + r() * 30) * u; pine(ctx, x, h * .86 + i * 6 * u, hh, hh * .34); }
        grain(ctx, w, h, .08); vignette(ctx, w, h, P.vig);
      } },
    dawn: { name: 'جبال الفجر', zone: 'upper', def: 'dark', mosque: true, modes: {
      dark: { ink: '#fbf3ea', accent: '#f2c79e', scrim: '#2a2147', sky: [[0, '#2e2c5a'], [.3, '#6c62a0'], [.5, '#c79cb4'], [.6, '#f1b893'], [1, '#f6cfae']], sunGlow: '#ffd9b0', moon: '#fff4e0', moonGlow: '#fff1d6', ridges: ['#a993c4', '#8673ac', '#634f8e', '#43356a'], band: '#f6c9b3', mosque: '#4f3f78', detail: 'rgba(241,184,147,.4)', glow2: '#ffd2ad', fg: '#251c3f', fgTrees: '#1d1633', vig: .3 },
      light: { light: true, ink: '#36295a', accent: '#9a6a82', scrim: '#fbf1ee', sky: [[0, '#cdd0ef'], [.3, '#e0d6ee'], [.5, '#f6dcd9'], [.6, '#fde4d0'], [1, '#fdefe0']], sunGlow: '#fff3df', moon: '#ffffff', moonGlow: '#ffffff', ridges: ['#ddcde7', '#c8b3dc', '#ad95ca', '#9079b4'], band: '#fdeadf', mosque: '#9a86c0', detail: 'rgba(253,233,220,.65)', glow2: '#fff0de', fg: '#705e9a', fgTrees: '#5f4e89', vig: 0 } },
      draw(ctx, w, h, r, u, P, o) {
        vgrad(ctx, 0, w, h, P.sky);
        glow(ctx, w * .5, h * .6, 160 * u, P.sunGlow, .5);
        crescent(ctx, w * .64, h * .14, 13 * u, P.moon, P.moonGlow);
        P.ridges.forEach((c, i) => {
          const p = ridge(w, h * (.64 + i * .06), (56 - i * 8) * u, .55, r); fillRidge(ctx, p, h, c); band(ctx, w, h * (.67 + i * .06), 18 * u, P.band, .32 - i * .06);
          if (i === 1 && o.mosque !== false) { const mx = w * .72; mosque(ctx, mx, ridgeY(p, mx) + 3 * u, 32 * u, P.mosque, { detail: P.detail }); }
        });
        glow(ctx, w * .45, h * .86, 120 * u, P.glow2, .18);
        const fg = ridge(w, h * .9, 24 * u, .5, r); fillRidge(ctx, fg, h, P.fg); forestRow(ctx, w, fg, 3 * u, 22, 26 * u, 60 * u, r, P.fgTrees);
        grain(ctx, w, h, .07); vignette(ctx, w, h, P.vig);
      } },
    desert: { name: 'صحرا الغروب', zone: 'upper', def: 'light', mosque: true, modes: {
      light: { light: true, ink: '#4e2f27', accent: '#9a6250', scrim: '#fbe6d6', sky: [[0, '#e9b9a1'], [.35, '#f5d2bc'], [.62, '#fae2cf'], [1, '#e9c1a6']], glowC: '#fff1df', glowA: .65, moon: '#fffaf0', moonGlow: null, starN: 0, dunes: ['#e5b7a0', '#d7a18b'], band: '#fbe3d0', bandA: .5, mosque: '#94604f', detail: 'rgba(250,226,207,.5)', palms: '#86574b', birds: 'rgba(112,72,60,.6)', ground: '#c99079', foot: ['rgba(176,122,100,0)', 'rgba(150,100,82,.9)'], corners: 'rgba(255,240,228,.55)' },
      dark: { ink: '#f5ecdc', accent: '#d9b98a', scrim: '#0d1430', sky: [[0, '#0a1030'], [.35, '#1b2353'], [.62, '#3a3a6e'], [1, '#2a2850']], glowC: '#8a7fc0', glowA: .35, moon: '#fff3d6', moonGlow: '#ffe9b8', starN: 120, dunes: ['#2f2c5a', '#252248'], band: '#5a5390', bandA: .3, mosque: '#15173b', detail: 'rgba(255,208,140,.85)', palms: '#11132e', birds: null, ground: '#1a1a3c', foot: ['rgba(10,10,30,0)', 'rgba(6,6,20,.9)'], corners: 'rgba(220,205,255,.22)' } },
      draw(ctx, w, h, r, u, P, o) {
        vgrad(ctx, 0, w, h, P.sky);
        if (P.starN) stars(ctx, w, h * .6, P.starN, r, u, '#ffffff', .7);
        glow(ctx, w * .5, h * .64, 170 * u, P.glowC, P.glowA);
        crescent(ctx, w * .5, h * .12, 12 * u, P.moon, P.moonGlow);
        fillRidge(ctx, ridge(w, h * .64, 50 * u, .5, r), h, P.dunes[0]); fillRidge(ctx, ridge(w, h * .68, 36 * u, .5, r), h, P.dunes[1]);
        band(ctx, w, h * .69, 22 * u, P.band, P.bandA);
        const base = h * .8; if (o.mosque !== false) mosque(ctx, w * .5, base, 66 * u, P.mosque, { four: true, tall: 1.25, detail: P.detail });
        palm(ctx, w * .1, base + 12 * u, 110 * u, .2, P.palms); palm(ctx, w * .2, base + 8 * u, 76 * u, -.25, P.palms); palm(ctx, w * .88, base + 10 * u, 96 * u, -.2, P.palms);
        if (P.birds) birds(ctx, w * .68, h * .5, 4, 4 * u, r, P.birds);
        ctx.fillStyle = P.ground; ctx.beginPath(); ctx.moveTo(0, h); for (let x = 0; x <= w; x += w / 40) ctx.lineTo(x, base + 14 * u + Math.sin(x / w * 5 + r()) * 6 * u); ctx.lineTo(w, h); ctx.fill();
        vgrad(ctx, h * .86, w, h * .14, [[0, P.foot[0]], [1, P.foot[1]]]);
        corners(ctx, w, h * 1.02, 46 * u, P.corners, .8 * u);
        grain(ctx, w, h, .06);
      } },
    ocean: { name: 'البحر', zone: 'upper', def: 'dark', modes: {
      dark: { ink: '#eef2fa', accent: '#c6d0e6', scrim: '#060c20', sky: [[0, '#070d22'], [.45, '#14224c'], [.58, '#22356a'], [.58, '#0d1838'], [1, '#04091a']], starN: 140, glowC: '#dfe8ff', glowA: .3, sun: false, orb: '#f3f6ff', band: '#9fb4e8', bandA: .35, shimmer: '#d8e2ff', corners: 'rgba(200,214,240,.28)', vig: .45 },
      light: { light: true, ink: '#143a52', accent: '#3d7695', scrim: '#eef6f8', sky: [[0, '#a6cbe5'], [.45, '#d2e6f1'], [.58, '#eef5f3'], [.58, '#8cc0d3'], [1, '#3b7d9c']], starN: 0, glowC: '#fffbe8', glowA: .7, sun: true, orb: '#fffdf4', band: '#ffffff', bandA: .55, shimmer: '#ffffff', corners: 'rgba(30,80,110,.22)', vig: 0 } },
      draw(ctx, w, h, r, u, P) {
        vgrad(ctx, 0, w, h, P.sky);
        if (P.starN) stars(ctx, w, h * .55, P.starN, r, u, '#ffffff', .8);
        glow(ctx, w * .5, h * .16, 90 * u, P.glowC, P.glowA);
        if (P.sun) disc(ctx, w * .5, h * .16, 17 * u, P.orb);
        else { crescent(ctx, w * .5, h * .16, 15 * u, P.orb); star5(ctx, w * .5 + 22 * u, h * .16 - 4 * u, 4 * u, P.orb); }
        band(ctx, w, h * .58, 10 * u, P.band, P.bandA);
        water(ctx, w, h * .585, h * .415, r, u, P.shimmer, w * .5);
        corners(ctx, w, h, 52 * u, P.corners, .8 * u);
        grain(ctx, w, h, .06); vignette(ctx, w, h, P.vig);
      } },
    marble: { name: 'رخام وذهب', zone: 'center', def: 'dark', mosque: true, modes: {
      dark: { ink: 'gold', accent: '#d8b66a', scrim: '#000000', base: [[0, '#121214'], [.5, '#1b1b1e'], [1, '#0b0b0c']], vein: [230, 230, 236], veinK: 1, goldVein: [214, 178, 102], khatam: 'rgba(255,255,255,.035)', glowA: .26, mosqueG: ['#f6dc94', '#9a7330'], detail: 'rgba(40,26,8,.55)', arch: '#cfa95a', vig: .5 },
      light: { light: true, ink: 'golddark', accent: '#a7803a', scrim: '#f7f5f0', base: [[0, '#f7f5f1'], [.5, '#eeebe5'], [1, '#e3dfd7']], vein: [105, 103, 110], veinK: 2.4, goldVein: [184, 140, 60], khatam: 'rgba(0,0,0,.03)', glowA: .3, mosqueG: ['#e9c874', '#9b7128'], detail: 'rgba(255,248,230,.6)', arch: '#b38a3c', vig: 0 } },
      draw(ctx, w, h, r, u, P, o) {
        vgrad(ctx, 0, w, h, P.base);
        for (let i = 0; i < 22; i++) {
          const gold = i < 3; let x = r() * w, y = r() * h, ang = (r() - .5) * 1.4 + Math.PI / 3;
          ctx.beginPath(); ctx.moveTo(x, y);
          const steps = 28 + r() * 30;
          for (let k = 0; k < steps; k++) { ang += (r() - .5) * .7; x += Math.cos(ang) * 9 * u; y += Math.sin(ang) * 9 * u; ctx.lineTo(x, y); if (r() < .06) { ctx.moveTo(x, y); ang += (r() - .5) * 1.6; } }
          const c = gold ? P.goldVein : P.vein, a = gold ? .16 + r() * .18 : (.025 + r() * .07) * P.veinK;
          ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`; ctx.lineWidth = (r() * .9 + .35) * u; ctx.stroke();
        }
        khatamGrid(ctx, w, h, 64 * u, P.khatam, .7 * u);
        const base = h * .93; glow(ctx, w / 2, base - 40 * u, 160 * u, '#e9c46a', P.glowA);
        if (o.mosque !== false) { const g = ctx.createLinearGradient(0, base - 130 * u, 0, base); g.addColorStop(0, P.mosqueG[0]); g.addColorStop(1, P.mosqueG[1]); mosque(ctx, w / 2, base, 60 * u, g, { four: true, tall: 1.15, detail: P.detail }); }
        archFrame(ctx, w, h, 22 * u, h * .1, P.arch, u);
        grain(ctx, w, h, .07); vignette(ctx, w, h, P.vig);
      } },
    emerald: { name: 'زمرّد ونقش', zone: 'center', def: 'dark', modes: {
      dark: { ink: '#f7eedb', accent: '#d9b86c', scrim: '#032419', bg: ['#11684e', '#05301f'], khatam: 'rgba(200,240,215,.07)', gold: '#d6b46a', corners: 'rgba(214,180,106,.35)', vig: .35 },
      light: { light: true, ink: '#0e4a36', accent: '#a8843c', scrim: '#fbf8ee', bg: ['#fcf9f0', '#ebe3c9'], khatam: 'rgba(17,104,78,.1)', gold: '#a8843c', corners: 'rgba(17,104,78,.28)', vig: 0 } },
      draw(ctx, w, h, r, u, P) {
        const g = ctx.createRadialGradient(w / 2, h * .45, 10, w / 2, h * .5, Math.hypot(w, h) * .6); g.addColorStop(0, P.bg[0]); g.addColorStop(1, P.bg[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        khatamGrid(ctx, w, h, 46 * u, P.khatam, .8 * u);
        archFrame(ctx, w, h, 30 * u, h * .14, P.gold, u);
        rosette(ctx, w / 2, h * .25, 16 * u, P.gold, .9 * u); rosette(ctx, w / 2, h * .82, 22 * u, P.gold, .9 * u);
        corners(ctx, w, h, 40 * u, P.corners, .8 * u);
        grain(ctx, w, h, .06); vignette(ctx, w, h, P.vig);
      } },
    ivory: { name: 'ورق وحبر', zone: 'center', def: 'light', modes: {
      light: { light: true, ink: '#2a2825', accent: '#7b746a', scrim: '#f4efe4', bg: ['#f6f2e9', '#ebe4d6'], hill: i => `rgba(${70 + i * 8},${70 + i * 8},${72 + i * 8},${.1 + i * .08})`, mist: '#f3eee4', fade: [240, 234, 222], line: '#8a8378', diamond: '#5d574e', grain: .12 },
      dark: { ink: '#f0eadc', accent: '#a39b8c', scrim: '#181715', bg: ['#262522', '#141312'], hill: i => `rgba(${226 - i * 6},${220 - i * 6},${206 - i * 6},${.05 + i * .045})`, mist: '#1d1c1a', fade: [24, 23, 21], line: '#6e685f', diamond: '#bdb5a5', grain: .1 } },
      draw(ctx, w, h, r, u, P) {
        vgrad(ctx, 0, w, h, [[0, P.bg[0]], [1, P.bg[1]]]);
        for (let i = 0; i < 5; i++) { const p = ridge(w, h * (.72 + i * .05), (60 - i * 6) * u, .6, r); fillRidge(ctx, p, h, P.hill(i)); band(ctx, w, h * (.75 + i * .05), 20 * u, P.mist, .35); }
        { const [a, b, c] = P.fade, g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, `rgba(${a},${b},${c},0)`); g.addColorStop(.55, `rgba(${a},${b},${c},.55)`); g.addColorStop(1, `rgba(${a},${b},${c},.95)`); ctx.fillStyle = g; ctx.fillRect(0, h * .6, w, h * .4); }
        ctx.strokeStyle = P.line; ctx.lineWidth = .8 * u; ctx.beginPath(); ctx.moveTo(w / 2, h * .06); ctx.lineTo(w / 2, h * .24); ctx.moveTo(w / 2, h * .8); ctx.lineTo(w / 2, h * .95); ctx.stroke();
        for (const y of [h * .06, h * .24, h * .8, h * .95]) { ctx.fillStyle = P.diamond; ctx.beginPath(); ctx.moveTo(w / 2, y - 5 * u); ctx.lineTo(w / 2 + 4 * u, y); ctx.lineTo(w / 2, y + 5 * u); ctx.lineTo(w / 2 - 4 * u, y); ctx.closePath(); ctx.fill(); }
        grain(ctx, w, h, P.grain);
      } },
    stars: { name: 'سماء النجوم', zone: 'center', def: 'dark', mosque: true, modes: {
      dark: { ink: '#f8f3e6', accent: '#e2c57a', scrim: '#050816', sky: [[0, '#04060d'], [.55, '#0f1838'], [.85, '#1d2a56'], [1, '#26346a']], milky: '#8c9ae0', milkyA: .12, starN: 420, starA: .9, moon: '#f6dc9c', moonGlow: '#f3d48a', hill: '#070a16', detail: 'rgba(243,212,138,.55)' },
      light: { light: true, ink: '#283058', accent: '#7d6a9c', scrim: '#f1eef6', sky: [[0, '#aabbe2'], [.5, '#cdd1ec'], [.8, '#efd6dc'], [1, '#fbe4d2']], milky: '#ffffff', milkyA: .14, starN: 110, starA: .6, moon: '#ffffff', moonGlow: '#ffffff', hill: '#8985b4', detail: 'rgba(255,240,222,.8)' } },
      draw(ctx, w, h, r, u, P, o) {
        vgrad(ctx, 0, w, h, P.sky);
        const milky = { y0: h * .05, y1: h * .55, spread: 110 * u };
        ctx.save(); ctx.globalAlpha = .5; for (let i = 0; i < 10; i++) { const t = i / 9; glow(ctx, t * w, milky.y0 + (milky.y1 - milky.y0) * t, 90 * u, P.milky, P.milkyA); } ctx.restore();
        stars(ctx, w, h * .85, P.starN, r, u, '#ffffff', P.starA, milky);
        crescent(ctx, w * .72, h * .14, 13 * u, P.moon, P.moonGlow);
        const hill = ridge(w, h * .9, 22 * u, .5, r); fillRidge(ctx, hill, h, P.hill);
        if (o.mosque !== false) mosque(ctx, w * .3, ridgeY(hill, w * .3) + 3 * u, 26 * u, P.hill, { detail: P.detail });
        grain(ctx, w, h, .05);
      } },
    goldnight: { name: 'مسجد بالليل', zone: 'upper', def: 'dark', mosque: true, modes: {
      dark: { ink: 'gold', accent: '#e3c27a', scrim: '#05070d', sky: [[0, '#04060c'], [.6, '#101a2e'], [.76, '#1b2843'], [.76, '#0a1120'], [1, '#03060c']], starN: 180, sun: false, moon: '#f8e3a8', moonGlow: '#f3d48a', mGlow: '#f0c66a', mGlowA: .35, mosqueG: [[0, '#fbe7ae'], [.6, '#e1b25c'], [1, '#8e6522']], detail: 'rgba(60,36,6,.6)', refl: '#e1b25c', reflA: .26, band: '#f2cf86', bandA: .25, shimmer: '#f2cf86', vig: .45 },
      light: { light: true, ink: 'golddark', accent: '#a07b36', scrim: '#fbf4e4', sky: [[0, '#f2dfb8'], [.6, '#fbefd8'], [.76, '#fdf5e4'], [.76, '#e6d0a3'], [1, '#d1b079']], starN: 0, sun: true, moon: '#fffaf0', moonGlow: '#ffe6a8', mGlow: '#fff2cc', mGlowA: .5, mosqueG: [[0, '#fffaf0'], [.6, '#f0ddb2'], [1, '#c6a161']], detail: 'rgba(140,100,36,.5)', refl: '#b8955a', reflA: .22, band: '#fff6e0', bandA: .55, shimmer: '#fffaf0', vig: 0 } },
      draw(ctx, w, h, r, u, P, o) {
        vgrad(ctx, 0, w, h, P.sky);
        if (P.starN) stars(ctx, w, h * .6, P.starN, r, u, '#ffffff', .7);
        if (P.sun) { glow(ctx, w * .5, h * .11, 60 * u, P.moonGlow, .7); disc(ctx, w * .5, h * .11, 13 * u, P.moon); }
        else crescent(ctx, w * .5, h * .11, 12 * u, P.moon, P.moonGlow);
        const base = h * .76, s = Math.min(w, h * .56) * .19;
        glow(ctx, w / 2, base - s * .5, s * 4, P.mGlow, P.mGlowA);
        if (o.mosque !== false) {
          const g = ctx.createLinearGradient(0, base - s * 1.6, 0, base); P.mosqueG.forEach(([t, c]) => g.addColorStop(t, c));
          mosque(ctx, w / 2, base, s, g, { four: true, tall: 1.12, detail: P.detail });
          ctx.save(); ctx.translate(0, base * 2); ctx.scale(1, -1); ctx.globalAlpha = P.reflA; mosque(ctx, w / 2, base, s, P.refl, { four: true, tall: 1.12 }); ctx.restore();
        }
        band(ctx, w, base + 2 * u, 8 * u, P.band, P.bandA);
        water(ctx, w, base + 2 * u, h - base, r, u, P.shimmer, w / 2);
        grain(ctx, w, h, .06); vignette(ctx, w, h, P.vig);
      } },

    // ===== ج١–ج١٠: خلفيات جديدة بأنماط تانية، بلا مساجد =====
    paper: { name: 'ورق مقصوص', zone: 'upper', def: 'light', modes: {
      light: { light: true, ink: '#5a2c1c', accent: '#b8694a', scrim: '#fdf3ea', bg: [[0, '#fdf1e4'], [1, '#f8dfc9']], orb: '#f0a07a', orbGlow: '#ffd2b8', star: null, layers: ['#f4cdae', '#efb995', '#e5a07c', '#d78866', '#c3704f', '#a85a3d'], top: ['#fae6d3', '#f6d7bd'], shadow: 'rgba(120,58,28,.28)' },
      dark: { ink: '#f6efdd', accent: '#e2c98f', scrim: '#0e2533', bg: [[0, '#0d2433'], [1, '#163a4d']], orb: '#f3e6c4', orbGlow: '#f3e6c4', star: '#f3e6c4', layers: ['#1f4d60', '#1a4355', '#163a4a', '#12313f', '#0e2833', '#0a1f28'], top: ['#123142', '#0f2a39'], shadow: 'rgba(0,0,0,.5)' } },
      draw(ctx, w, h, r, u, P) {
        vgrad(ctx, 0, w, h, P.bg);
        if (P.star) for (let i = 0; i < 28; i++) disc(ctx, r() * w, h * (.08 + r() * .45), (.6 + r() * 1.2) * u, rgba(P.star, .35 + r() * .5));
        // الشمس (أو القمر) نازلة ورا أول طبقة، بعيد عن ساعة الجوال
        const hills = P.layers.map((c, i) => wave(w, h * (.6 + i * .065), (26 - i * 2) * u, r));
        const sy = Math.max(h * .58, ridgeY(hills[0], w * .76) - 6 * u); // نص الشمس طالع فوق أول تلة
        glow(ctx, w * .76, sy, 90 * u, P.orbGlow, .4);
        ctx.save(); ctx.shadowColor = P.shadow; ctx.shadowBlur = 14 * u; ctx.shadowOffsetY = 3 * u; disc(ctx, w * .76, sy, 28 * u, P.orb); ctx.restore();
        // طبقتين من فوق (معلّقين) ببيعملوا إطار
        P.top.forEach((c, i) => { const p = wave(w, h * (.05 + i * .035), 12 * u, r); ctx.save(); ctx.shadowColor = P.shadow; ctx.shadowBlur = 12 * u; ctx.shadowOffsetY = 3 * u; ctx.beginPath(); ctx.moveTo(p[0][0], -10); p.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(p[p.length - 1][0], -10); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); ctx.restore(); });
        // طبقات التلال من تحت، كل وحدة بتعمل ظل عاللي وراها
        P.layers.forEach((c, i) => { const p = hills[i]; ctx.save(); ctx.shadowColor = P.shadow; ctx.shadowBlur = 16 * u; ctx.shadowOffsetY = -4 * u; fillRidge(ctx, p, h + 20, c); ctx.restore(); });
        grain(ctx, w, h, .11);
      } },
    olive: { name: 'غصن زيتون', zone: 'center', def: 'light', modes: {
      light: { light: true, ink: '#2f3a22', accent: '#8a7a4a', scrim: '#f6f2e7', bg: [[0, '#f6f2e7'], [1, '#ebe4d1']], stem: '#6d6a4a', leaves: ['#8a9a6b', '#a1ae82', '#6f8257', '#93a375'], vein: 'rgba(240,238,220,.7)', olive: ['#3f4a2a', '#5d6a3a'], line: null },
      dark: { ink: '#f1ead6', accent: '#cdb27a', scrim: '#141b12', bg: [[0, '#1d2619'], [1, '#10160e']], stem: '#cdb27a', leaves: ['rgba(205,178,122,.10)'], vein: 'rgba(205,178,122,.7)', olive: ['#cdb27a', '#b39556'], line: '#cdb27a' } },
      draw(ctx, w, h, r, u, P) {
        vgrad(ctx, 0, w, h, P.bg);
        const sprig = (pts, n, len, wid, lw) => {
          ctx.strokeStyle = P.stem; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(...pts[0]); ctx.bezierCurveTo(...pts[1], ...pts[2], ...pts[3]); ctx.stroke();
          for (let i = 0; i < n; i++) {
            const t = .08 + i / n * .9, [x, y] = bez(pts, t), a = bezAng(pts, t), side = i % 2 ? 1 : -1, la = a + side * (.55 + r() * .3), L = len * (.75 + r() * .4) * (1 - t * .25);
            ctx.beginPath(); leaf(ctx, x, y, la, L, wid * (.8 + r() * .3)); ctx.fillStyle = P.leaves[i % P.leaves.length]; ctx.fill();
            if (P.line) { ctx.strokeStyle = P.line; ctx.lineWidth = .8 * u; ctx.stroke(); }
            ctx.strokeStyle = P.vein; ctx.lineWidth = .6 * u; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(la) * L * .85, y + Math.sin(la) * L * .85); ctx.stroke();
            if (i % 4 === 2) { const ox = x + Math.cos(la - side * .9) * 9 * u, oy = y + Math.sin(la - side * .9) * 9 * u; ctx.fillStyle = P.olive[0]; ctx.beginPath(); ctx.ellipse(ox, oy, 5 * u, 3.6 * u, la, 0, TAU); ctx.fill(); ctx.fillStyle = P.olive[1]; ctx.beginPath(); ctx.ellipse(ox + 6 * u, oy + 5 * u, 4.5 * u, 3.3 * u, la + .4, 0, TAU); ctx.fill(); }
          }
        };
        sprig([[w * 1.04, h * .97], [w * .75, h * .93], [w * .5, h * .86], [w * .2, h * .72]], 18, 42 * u, 8 * u, 2 * u);
        sprig([[-w * .04, h * .03], [w * .14, h * .06], [w * .26, h * .1], [w * .42, h * .17]], 10, 30 * u, 6 * u, 1.5 * u);
        grain(ctx, w, h, .1);
      } },
    lanterns: { name: 'فوانيس', zone: 'center', def: 'dark', modes: {
      dark: { ink: '#f8ecd6', accent: '#e0b467', scrim: '#170f24', bg: ['#2b1e3f', '#120b1e'], metal: '#c99a4a', glass: '#ffe7a8', glassEdge: '#e08a2c', glowC: '#ffc870', glowA: .32, bokeh: '#ffd58a', bokehA: .22, vig: .4 },
      light: { light: true, ink: '#4a3418', accent: '#a77a35', scrim: '#fbf5ea', bg: ['#fdf8ee', '#efe3cc'], metal: '#9c7231', glass: '#fff6dc', glassEdge: '#f2c674', glowC: '#ffd98f', glowA: .28, bokeh: '#e8c27c', bokehA: .2, vig: 0 } },
      draw(ctx, w, h, r, u, P) {
        const g = ctx.createRadialGradient(w / 2, h * .3, 10, w / 2, h * .5, Math.hypot(w, h) * .6); g.addColorStop(0, P.bg[0]); g.addColorStop(1, P.bg[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 26; i++) { const x = r() * w, y = h * (.02 + r() * .96), R = (6 + r() * 22) * u; glow(ctx, x, y, R * 2, P.bokeh, P.bokehA * (.4 + r() * .6)); }
        // عالأطراف، حتى ساعة الجوال بالنص تضل واضحة
        [[.13, .1, 27], [.87, .17, 32], [.24, .015, 15]].forEach(([x, y, s]) => lantern(ctx, w * x, h * y, s * u, P, u));
        grain(ctx, w, h, .07); vignette(ctx, w, h, P.vig);
      } },
    clouds: { name: 'غيوم', zone: 'center', def: 'light', modes: {
      light: { light: true, ink: '#1c3c5b', accent: '#557fa2', scrim: '#f1f7fb', sky: [[0, '#8fc3e8'], [.55, '#c6e2f2'], [1, '#f2f7f6']], orb: '#fffdf2', glowC: '#fff6d2', glowA: .8, rays: 'rgba(255,250,230,.16)', starN: 0, cTop: '#ffffff', cBot: '#d2e2ee', back: .75 },
      dark: { ink: '#f3f1ea', accent: '#c9cde6', scrim: '#0f1730', sky: [[0, '#0b1229'], [.55, '#1c2950'], [1, '#3a4672']], orb: '#f4f1e6', glowC: '#dfe5ff', glowA: .3, rays: null, starN: 90, cTop: '#8a95bf', cBot: '#2d3762', back: .7 } },
      draw(ctx, w, h, r, u, P) {
        vgrad(ctx, 0, w, h, P.sky);
        if (P.starN) stars(ctx, w, h * .7, P.starN, r, u, '#ffffff', .7);
        const sx = w * .62, sy = h * .83; // طالعة من ورا الغيم تحت، مو عند الساعة
        if (P.rays) { ctx.fillStyle = P.rays; for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + r() * .2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a - .05) * h, sy + Math.sin(a - .05) * h); ctx.lineTo(sx + Math.cos(a + .05) * h, sy + Math.sin(a + .05) * h); ctx.closePath(); ctx.fill(); } }
        glow(ctx, sx, sy, 90 * u, P.glowC, P.glowA); if (P.rays) disc(ctx, sx, sy, 18 * u, P.orb); else crescent(ctx, sx, sy, 15 * u, P.orb);
        // عدد الغيمات حسب العرض، حتى ما يبين فراغ بيناتهن بالشاشة العرضية
        const n = Math.ceil(w / (95 * u)) + 1;
        ctx.save(); ctx.globalAlpha = P.back; for (let i = 0; i < n; i++) cloud(ctx, w * (i / (n - 1)) + (r() - .5) * 30 * u, h * .84, (130 + r() * 60) * u, r, P.cTop, P.cBot); ctx.restore();
        ctx.fillStyle = P.cBot; ctx.fillRect(0, h * .9, w, h * .1);
        for (let i = 0; i < n; i++) cloud(ctx, w * (i / (n - 1)) + (r() - .5) * 30 * u, h * .92, (160 + r() * 70) * u, r, P.cTop, P.cBot);
        ctx.fillRect(0, h * .92, w, h * .08);
        cloud(ctx, w * .08, h * .1, 110 * u, r, P.cTop, P.cBot); cloud(ctx, w * .95, h * .32, 80 * u, r, P.cTop, P.cBot);
        grain(ctx, w, h, .05);
      } },
    waves: { name: 'موج', zone: 'upper', def: 'light', modes: {
      light: { light: true, ink: '#1d4954', accent: '#c4673f', scrim: '#f6f0e3', bg: [[0, '#f7f1e4'], [1, '#efe5d1']], orb: '#e2805a', orbGlow: '#f6b893', f1: '#f4eee1', f2: '#dde8e2', line: '#2e6f7c', lines: 'rgba(46,111,124,.35)' },
      dark: { ink: '#f3ead6', accent: '#d4b26a', scrim: '#0a1829', bg: [[0, '#0b1a2d'], [1, '#07121f']], orb: '#efe0b8', orbGlow: '#efe0b8', f1: '#0c1d31', f2: '#11283f', line: '#c8a65c', lines: 'rgba(200,166,92,.35)' } },
      draw(ctx, w, h, r, u, P) {
        vgrad(ctx, 0, w, h, P.bg);
        // الشمس غاطسة ورا الموج
        glow(ctx, w * .5, h * .71, 110 * u, P.orbGlow, .4); disc(ctx, w * .5, h * .71, 40 * u, P.orb);
        ctx.strokeStyle = P.lines; ctx.lineWidth = 1 * u; ctx.lineCap = 'round';
        [[.05, .665, .3], [.7, .675, .95], [.12, .69, .28]].forEach(([a, y, b]) => { ctx.beginPath(); for (let x = w * a; x <= w * b; x += 4) ctx.lineTo(x, h * y + Math.sin(x / (18 * u)) * 2.5 * u); ctx.stroke(); });
        scales(ctx, w, h, h * .74, 30 * u, P, u);
        grain(ctx, w, h, .07);
      } },
    aurora: { name: 'شفق ناعم', zone: 'center', def: 'dark', modes: {
      dark: { ink: '#f5f1ff', accent: '#c9b8f0', scrim: '#080c1a', bg: '#070b18', blobs: ['#1d7f78', '#4a35a0', '#0f5e86', '#8a3a86', '#16506a', '#2f6fb0'], blobA: .55, moon: '#f2ecff' },
      light: { light: true, ink: '#2b2840', accent: '#9a6a7e', scrim: '#faf6f2', bg: '#f9f4ef', blobs: ['#ffc9b0', '#bfe3d6', '#d4cbf0', '#ffe2a8', '#f6b9c9', '#c6dcf2'], blobA: .7, moon: null } },
      draw(ctx, w, h, r, u, P) {
        ctx.fillStyle = P.bg; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 9; i++) { const x = w * (r() * 1.1 - .05), y = h * (i < 5 ? r() * .35 : .65 + r() * .4), R = Math.max(w, h) * (.28 + r() * .22); glow(ctx, x, y, R, P.blobs[i % P.blobs.length], P.blobA); }
        if (P.moon) crescent(ctx, w * .5, h * .12, 10 * u, P.moon, P.moon);
        grain(ctx, w, h, .12);
      } },
    wheat: { name: 'سنابل', zone: 'upper', def: 'light', modes: {
      light: { light: true, ink: '#4a3313', accent: '#a8772c', scrim: '#fdf5e6', sky: [[0, '#f6dcae'], [.45, '#fbecd2'], [.62, '#fdf3e2'], [1, '#f3d9a6']], sunC: '#fff2c7', sunGlow: '#ffd88a', sunY: .6, moon: null, rows: ['#e6c98c', '#d7ad62', '#bf8f43', '#9e7030'], haze: '#fdf0d8', flies: null, birds: 'rgba(110,80,40,.55)' },
      dark: { ink: '#f6ead2', accent: '#e2b86a', scrim: '#141429', sky: [[0, '#121a36'], [.45, '#2c2d55'], [.62, '#5a4a66'], [1, '#2a2338']], sunC: null, sunGlow: '#c58a70', sunY: .62, moon: '#fbeccb', rows: ['#3a2f45', '#2a2236', '#1d1828', '#14111d'], haze: '#5a4a66', flies: '#ffd98a', birds: null } },
      draw(ctx, w, h, r, u, P) {
        vgrad(ctx, 0, w, h, P.sky);
        glow(ctx, w * .55, h * P.sunY, 190 * u, P.sunGlow, .55);
        if (P.sunC) disc(ctx, w * .55, h * P.sunY, 22 * u, P.sunC);
        if (P.moon) { stars(ctx, w, h * .5, 90, r, u, '#ffffff', .6); crescent(ctx, w * .26, h * .12, 12 * u, P.moon, P.moon); }
        if (P.birds) birds(ctx, w * .3, h * .2, 5, 4 * u, r, P.birds);
        P.rows.forEach((c, k) => {
          const n = 46 - k * 7, minL = h * (.16 + k * .06), maxL = h * (.22 + k * .07);
          for (let i = 0; i < n; i++) { const x = (i + r()) / n * w * 1.1 - w * .05; stalk(ctx, x, h * 1.02, minL + r() * (maxL - minL), (r() - .45) * .22, c, u); }
          if (k < P.rows.length - 1) band(ctx, w, h * (.8 - k * .02), 14 * u, P.haze, .22);
        });
        if (P.flies) for (let i = 0; i < 26; i++) { const x = r() * w, y = h * (.55 + r() * .4); glow(ctx, x, y, 7 * u, P.flies, .5); disc(ctx, x, y, .9 * u, P.flies); }
        grain(ctx, w, h, .07);
      } },
    blossom: { name: 'زهر اللوز', zone: 'center', def: 'light', modes: {
      light: { light: true, ink: '#3d2a2e', accent: '#b07080', scrim: '#f8f3f1', bg: [[0, '#f8f4f1'], [1, '#f0e5e1']], branch: '#5b4038', petalIn: '#ffffff', petalOut: '#f5d3dc', center: '#c4506a', fall: '#f2c9d3', glow: null },
      dark: { ink: '#f7ecef', accent: '#e3b3c2', scrim: '#160e17', bg: [[0, '#24172a'], [1, '#110b13']], branch: '#6e505d', petalIn: '#fff4f7', petalOut: '#e7b3c3', center: '#e98aa3', fall: '#e7b3c3', glow: '#f3c3d2' } },
      draw(ctx, w, h, r, u, P) {
        vgrad(ctx, 0, w, h, P.bg);
        const blooms = [];
        branch(ctx, w * 1.04, h * .02, 2.45, 120 * u, 7 * u, 4, r, P, u, blooms);
        branch(ctx, -w * .04, h * .99, -.75, 90 * u, 6 * u, 3, r, P, u, blooms);
        blooms.forEach(([x, y, R, rot, bud]) => { if (P.glow) glow(ctx, x, y, R * 3, P.glow, .12); if (bud) { ctx.fillStyle = P.petalOut; ctx.beginPath(); ctx.ellipse(x, y, R * .45, R * .32, rot, 0, TAU); ctx.fill(); } else flower(ctx, x, y, R, rot, P); });
        for (let i = 0; i < 9; i++) { ctx.fillStyle = rgba(P.fall, .5 + r() * .4); ctx.beginPath(); ctx.ellipse(w * (.15 + r() * .7), h * (.3 + r() * .45), 3.2 * u, 2.2 * u, r() * TAU, 0, TAU); ctx.fill(); }
        grain(ctx, w, h, .06);
      } },
    zellige: { name: 'زليج', zone: 'center', def: 'light', modes: {
      light: { light: true, ink: '#1c4a52', accent: '#b9663a', scrim: '#fbf8f1', base: '#e9d9b6', t1: '#1f6f78', t2: '#c46a3b', t3: '#f4efe4', grout: '#fbf8f1', plate: '#fbf8f1', trim: '#1f6f78', shine: 'rgba(255,255,255,.12)' },
      dark: { ink: '#f4ecd8', accent: '#c9a75c', scrim: '#0b1a2a', base: '#123f3a', t1: '#0f3b57', t2: '#c9a75c', t3: '#0b2235', grout: '#08131f', plate: '#0b1a2a', trim: '#c9a75c', shine: 'rgba(255,255,255,.05)' } },
      draw(ctx, w, h, r, u, P) {
        ctx.fillStyle = P.base; ctx.fillRect(0, 0, w, h);
        const S = 46 * u; ctx.lineWidth = 1.8 * u; ctx.strokeStyle = P.grout;
        for (let j = -1; j * S < h + S; j++) for (let i = -1; i * S < w + S; i++) {
          const x = i * S, y = j * S;
          ctx.beginPath(); star8Solid(ctx, x, y, S * .46); ctx.fillStyle = (i + j) % 2 ? P.t1 : P.t2; ctx.fill(); ctx.stroke();
          ctx.beginPath(); star8Solid(ctx, x, y, S * .2); ctx.fillStyle = P.t3; ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x + S / 2, y + S / 2 - S * .17); ctx.lineTo(x + S / 2 + S * .17, y + S / 2); ctx.lineTo(x + S / 2, y + S / 2 + S * .17); ctx.lineTo(x + S / 2 - S * .17, y + S / 2); ctx.closePath(); ctx.fillStyle = P.t3; ctx.fill(); ctx.stroke();
        }
        { const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, P.shine); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(1, P.shine); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
        const [L, R, T, B] = archBox(w, h, w * .09, h * .1);
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 18 * u; ctx.fillStyle = P.plate; ctx.beginPath(); archPath(ctx, L, R, T, B); ctx.fill(); ctx.restore();
        ctx.strokeStyle = P.trim; ctx.lineWidth = 2 * u; ctx.beginPath(); archPath(ctx, L, R, T, B); ctx.stroke();
        ctx.lineWidth = .8 * u; ctx.beginPath(); archPath(ctx, L + 7 * u, R - 7 * u, T + 9 * u, B - 7 * u); ctx.stroke();
        grain(ctx, w, h, .07);
      } },
    oasis: { name: 'واحة النخيل', zone: 'upper', def: 'light', modes: {
      light: { light: true, ink: '#4a2f1a', accent: '#a0683e', scrim: '#fdf2e2', sky: [[0, '#f7d5ae'], [.45, '#fbe6cb'], [.66, '#fdf0dd'], [1, '#fdf0dd']], sun: '#fff7e6', sunGlow: '#ffcf86', starN: 0, moon: null, dunes: ['#efcaa0', '#e2b482'], water: ['#a3d2cf', '#6caeb3'], shimmer: '#ffffff', palms: '#3e5734', ground: '#d9aa79', grass: '#7f7a42', reflA: .22 },
      dark: { ink: '#f4ead6', accent: '#d8bd86', scrim: '#0b1330', sky: [[0, '#060c22'], [.45, '#15204a'], [.66, '#2a3a6c'], [1, '#2a3a6c']], sun: null, sunGlow: '#7d8fd0', starN: 160, moon: '#fff1cf', dunes: ['#1e2852', '#171f44'], water: ['#1d2c5a', '#0d1636'], shimmer: '#dfe6ff', palms: '#050918', ground: '#0c1230', grass: '#0a0f26', reflA: .3 } },
      draw(ctx, w, h, r, u, P) {
        vgrad(ctx, 0, w, h, P.sky);
        if (P.starN) stars(ctx, w, h * .6, P.starN, r, u, '#ffffff', .75);
        glow(ctx, w * .6, h * .62, 170 * u, P.sunGlow, .5);
        if (P.sun) disc(ctx, w * .6, h * .62, 20 * u, P.sun); else crescent(ctx, w * .3, h * .13, 13 * u, P.moon, P.moon);
        fillRidge(ctx, ridge(w, h * .66, 34 * u, .45, r), h, P.dunes[0]); fillRidge(ctx, ridge(w, h * .7, 26 * u, .45, r), h, P.dunes[1]);
        const wy = h * .78, wh = h * .1;
        vgrad(ctx, wy, w, wh, [[0, P.water[0]], [1, P.water[1]]]);
        const trees = [[.08, 120, .18], [.17, 92, -.22], [.27, 70, .1], [.83, 104, -.2], [.94, 80, .15]];
        ctx.save(); ctx.beginPath(); ctx.rect(0, wy, w, wh); ctx.clip(); ctx.translate(0, wy * 2); ctx.scale(1, -1); ctx.globalAlpha = P.reflA; trees.forEach(([x, s, l]) => palm(ctx, w * x, wy, s * u, l, P.palms)); ctx.restore();
        water(ctx, w, wy, wh, r, u, P.shimmer, w * .6);
        trees.forEach(([x, s, l]) => palm(ctx, w * x, wy + 2 * u, s * u, l, P.palms));
        ctx.fillStyle = P.ground; ctx.beginPath(); ctx.moveTo(0, h); for (let x = 0; x <= w; x += w / 40) ctx.lineTo(x, wy + wh + Math.sin(x / w * 6 + 1) * 5 * u); ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = P.grass; ctx.lineWidth = .9 * u; for (let i = 0; i < 60; i++) { const x = r() * w, y = wy + wh + (2 + r() * 8) * u; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - .5) * 6 * u, y - (5 + r() * 9) * u); ctx.stroke(); }
        grain(ctx, w, h, .06);
      } }
  };
  // القديمة والجديدة متداخلين بالشريط، حتى ما يجو المساجد ورا بعض
  const ORDER = ['forest', 'paper', 'ocean', 'olive', 'dawn', 'clouds', 'emerald', 'waves', 'marble', 'lanterns', 'ivory', 'wheat', 'desert', 'blossom', 'stars', 'aurora', 'goldnight', 'zellige', 'oasis'];

  // بيرسم الخلفية وبيرجّع { name, zone, ink, accent, scrim, light } لـ text()
  function draw(ctx, w, h, style, seed = 1, mode, opts = {}) {
    const st = STYLES[style] || STYLES.forest, m = st.modes[mode] ? mode : st.def, P = st.modes[m], u = Math.min(w, h) / 400;
    ctx.save(); st.draw(ctx, w, h, rng(seed * 9973 + 7), u, P, opts); ctx.restore();
    return { name: st.name, zone: st.zone, mode: m, ink: P.ink, accent: P.accent, scrim: P.scrim, light: !!P.light };
  }

  // ---------- الكتابة ----------
  // المنطقة الآمنة: الجوال بيترك فوق للساعة وتحت للأيقونات، والستوري بيترك أماكن أزرار إنستغرام وواتساب
  function zone(kind, w, h) {
    if (kind === 'phone') return { x: w * .1, y: h * .33, w: w * .8, h: h * .45 };
    if (kind === 'story') return { x: w * .1, y: h * .18, w: w * .8, h: h * .6 };
    if (kind === 'square') return { x: w * .12, y: h * .14, w: w * .76, h: h * .72 };
    return { x: w * .24, y: h * .2, w: w * .52, h: h * .6 }; // لابتوب
  }
  function wrap(ctx, text, maxW) { const words = text.split(/\s+/), lines = []; let line = ''; for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (line && ctx.measureText(t).width > maxW) { lines.push(line); line = wd; } else line = t; } if (line) lines.push(line); return lines; }
  const GOLD = { gold: ['#fbe6a8', '#e2bb64', '#b88a3a'], golddark: ['#b88a3a', '#8f6720', '#6b4a12'] };
  // o: { kind: phone|story|square|desktop, layout: auto|center|upper|lower, style, sign: «مُذكّر» تحت (بالمشاركة بس) }
  function text(ctx, w, h, item, o) {
    const st = o.style || { zone: 'center', ink: '#ffffff', accent: '#dddddd', scrim: '#000000' }, z = zone(o.kind, w, h), u = Math.min(w, h) / 400, hasMarks = item.text.includes('﴿'), isAyah = item.kind === 'ayah' || hasMarks;
    const font = isAyah ? '"Amiri Quran", "Amiri", serif' : '"Amiri", "Amiri Quran", serif';
    const body = isAyah && !hasMarks ? '﴿' + item.text + '﴾' : item.text;
    ctx.save(); ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    let size = Math.min(z.w / 6, h * .06), lines = [], lh = 0;
    for (let i = 0; i < 40; i++) { ctx.font = `${size}px ${font}`; lines = wrap(ctx, body, z.w); lh = size * (isAyah ? 1.95 : 1.8); if (lines.length * lh <= z.h * .8) break; size *= .93; }
    const refSize = Math.max(11 * u, size * .34), blockH = lines.length * lh + (item.ref ? refSize * 3.2 : refSize * 1.6);
    const layout = o.layout === 'auto' || !o.layout ? (st.zone === 'upper' ? 'upper' : 'center') : o.layout;
    const top = layout === 'lower' ? z.y + z.h - blockH : layout === 'upper' ? z.y : z.y + (z.h - blockH) / 2;
    const cx = z.x + z.w / 2;
    // خلفية ناعمة ورا الكتابة حتى تنقرا فوق أي منظر (st.scrimA: أقوى للصور المزحومة)
    const sa = st.scrimA != null ? st.scrimA : st.light ? .6 : .42;
    if (layout === 'lower') vgrad(ctx, top - lh * .9, w, h - top + lh * .9, [[0, rgba(st.scrim, 0)], [.2, rgba(st.scrim, Math.max(sa, st.light ? .5 : .55))], [1, rgba(st.scrim, Math.max(sa, st.light ? .75 : .8))]]);
    else { const cy = top + blockH / 2, R = Math.max(z.w * .7, blockH), g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R); g.addColorStop(0, rgba(st.scrim, sa)); g.addColorStop(.55, rgba(st.scrim, sa * (st.scrimA != null ? .7 : .45)));g.addColorStop(1, rgba(st.scrim, 0)); ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, R * 2, R * 2); }
    ctx.font = `${size}px ${font}`;
    if (GOLD[st.ink]) { const g = ctx.createLinearGradient(0, top, 0, top + lines.length * lh), c = GOLD[st.ink]; g.addColorStop(0, c[0]); g.addColorStop(.5, c[1]); g.addColorStop(1, c[2]); ctx.fillStyle = g; }
    else ctx.fillStyle = st.ink;
    ctx.shadowColor = st.light ? 'rgba(255,255,255,.6)' : 'rgba(0,0,0,.45)'; ctx.shadowBlur = size * .3;
    lines.forEach((ln, i) => ctx.fillText(ln, cx, top + lh * i + size * 1.15));
    ctx.shadowBlur = 0;
    // فاصل مزخرف + المصدر
    const dy = top + lines.length * lh + refSize * .9, half = Math.min(z.w * .22, 70 * u);
    ctx.strokeStyle = st.accent; ctx.fillStyle = st.accent; ctx.lineWidth = .9 * u;
    ctx.beginPath(); ctx.moveTo(cx - half, dy); ctx.lineTo(cx - 9 * u, dy); ctx.moveTo(cx + 9 * u, dy); ctx.lineTo(cx + half, dy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, dy - 5 * u); ctx.lineTo(cx + 5 * u, dy); ctx.lineTo(cx, dy + 5 * u); ctx.lineTo(cx - 5 * u, dy); ctx.closePath(); ctx.fill();
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + d * (half + 4 * u), dy, 1.6 * u, 0, TAU); ctx.fill(); }
    if (item.ref) { ctx.font = `500 ${refSize}px "Readex Pro", sans-serif`; ctx.fillText(item.ref.replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]), cx, dy + refSize * 2); }
    if (o.sign) { ctx.globalAlpha = .75; ctx.font = `600 ${13 * u}px "Readex Pro", sans-serif`; ctx.fillStyle = st.light ? '#4b4038' : '#f3ecdc'; ctx.fillText('مُذكّر', w / 2, h - (o.kind === 'story' ? h * .1 : h * .035)); }
    ctx.restore();
  }
  // ---------- صورة المستخدم («أضف خلفية»، الإصدار ٢٤، معرض ١٢: ق٣ ك١) ----------
  // v: { fit: 'cover'|'contain', zoom ≥ 1, ox, oy بين -1 و 1 = إزاحة نسبية من الوسط } حتى تطلع نفسها بالمعاينة وبالحفظ
  function photoGeom(img, w, h, v) {
    const base = v.fit === 'contain' ? Math.min(w / img.width, h / img.height) : Math.max(w / img.width, h / img.height);
    const s = base * (v.zoom || 1), dw = img.width * s, dh = img.height * s, mx = Math.max(0, (dw - w) / 2), my = Math.max(0, (dh - h) / 2);
    return { x: (w - dw) / 2 + (v.ox || 0) * mx, y: (h - dh) / 2 + (v.oy || 0) * my, dw, dh, mx, my };
  }
  // «الصورة كاملة»: الفراغ حواليها بنسخة مغبّشة منها (تصغير كتير وتكبير، بيشتغل بكل المتصفحات)
  function photo(ctx, w, h, img, v) {
    if (v.fit === 'contain') {
      const t = document.createElement('canvas'); t.width = 24; t.height = Math.max(6, Math.round(24 * h / w));
      const b = photoGeom(img, t.width, t.height, { fit: 'cover' }); t.getContext('2d').drawImage(img, b.x, b.y, b.dw, b.dh);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(t, 0, 0, w, h); ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(0, 0, w, h);
    }
    const g = photoGeom(img, w, h, v); ctx.drawImage(img, g.x, g.y, g.dw, g.dh);
    return g;
  }
  // بيقرا الصورة بعد ما انرسمت: أهدى منطقة (فوق، نص، تحت) جوّا المنطقة الآمنة، ولون الكتابة حسب إضاءتها
  function photoStyle(cv, kind) {
    const sw = 72, sh = Math.max(16, Math.round(72 * cv.height / cv.width)), t = document.createElement('canvas'); t.width = sw; t.height = sh;
    const g = t.getContext('2d'); g.drawImage(cv, 0, 0, sw, sh);
    let d; try { d = g.getImageData(0, 0, sw, sh).data; } catch (e) { return { name: 'صورتك', zone: 'center', layout: 'center', ink: '#ffffff', accent: '#ecca78', scrim: '#000000', light: false, scrimA: .6 }; }
    const L = (x, y) => { const i = (y * sw + x) * 4; return (.2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]) / 255; };
    const z = zone(kind, 1, 1); let best = null;
    for (const [layout, a, b] of [['upper', 0, .5], ['center', .25, .75], ['lower', .5, 1]]) {
      const y0 = Math.floor((z.y + z.h * a) * sh), y1 = Math.min(sh - 2, Math.ceil((z.y + z.h * b) * sh)), x0 = Math.floor(sw * .12), x1 = Math.ceil(sw * .88);
      let sum = 0, busy = 0, n = 0;
      for (let y = y0; y <= y1; y++) for (let x = x0; x < x1; x++) { const l = L(x, y); sum += l; busy += Math.abs(l - L(x + 1, y)) + Math.abs(l - L(x, y + 1)); n++; }
      const score = busy / n + (layout === 'center' ? 0 : .012);
      if (!best || score < best.score) best = { layout, score, busy: busy / n, lum: sum / n };
    }
    const light = best.lum > .58;
    // الظل ورا الكتابة أقوى كل ما كانت الصورة مزحومة أكتر
    return { name: 'صورتك', zone: 'center', layout: best.layout, light, ink: light ? '#1d1b18' : '#ffffff', accent: light ? '#7a5a26' : '#ecca78', scrim: light ? '#ffffff' : '#000000', scrimA: Math.min(.82, Math.max(light ? .55 : .4, .35 + best.busy * 5)) };
  }
  return { draw, text, photo, photoGeom, photoStyle, STYLES, ORDER };
})();
