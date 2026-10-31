/* =====================================================================
 * مُذكّر — cardart.js  (الإصدار ٢٣، معرض ١٠: خ١–خ٩ ن٣)
 * محرّك «صنع بطاقة»: خلفيات مرسومة بالكود (بلا صور ولا نت) + كتابة الذكر أو الآية بمكان مريح حسب الجهاز.
 *   CardArt.draw(ctx, w, h, style, seed) ← بيرسم الخلفية وبيرجّع ألوان الكتابة المناسبة إلها
 *   CardArt.text(ctx, w, h, item, opts)   ← بيكتب { text, ref, kind:'ayah'|'dhikr' } بالمنطقة الآمنة لـ opts.kind
 *   CardArt.ORDER                         ← ترتيب الخلفيات بشاشة الصنع
 * المساجد مرسومة بلا أي أشخاص. لإضافة خلفية: دالة رسم جديدة بـ STYLES واسمها بـ ORDER.
 * ===================================================================== */
const CardArt = (() => {
  const TAU = Math.PI * 2;
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const hex = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };

  // ---------- أدوات الرسم ----------
  function vgrad(ctx, y, w, h, stops) { const g = ctx.createLinearGradient(0, y, 0, y + h); stops.forEach(([o, c]) => g.addColorStop(o, c)); ctx.fillStyle = g; ctx.fillRect(0, y, w, h); }
  function glow(ctx, x, y, r, c, a) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(c, a)); g.addColorStop(.35, rgba(c, a * .45)); g.addColorStop(1, rgba(c, 0)); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  function band(ctx, w, y, hh, c, a) { const g = ctx.createLinearGradient(0, y - hh, 0, y + hh); g.addColorStop(0, rgba(c, 0)); g.addColorStop(.5, rgba(c, a)); g.addColorStop(1, rgba(c, 0)); ctx.fillStyle = g; ctx.fillRect(0, y - hh, w, hh * 2); }
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
    ctx.rect(cx - bw * 1.04, base - bh - s * .025, bw * 2.08, s * .03); // الحافة فوق القاعة
    ctx.rect(cx - s * .4, dome, s * .8, s * .11); // رقبة القبة
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
    if (o.detail) { // أقواس القاعة وشبابيك الرقبة
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
  function khatamGrid(ctx, w, h, size, color, lw) { ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath(); for (let y = 0; y < h + size; y += size) for (let x = (Math.floor(y / size) % 2) * size / 2; x < w + size; x += size) { star8(ctx, x, y, size * .42); ctx.moveTo(x + size * .2, y); ctx.arc(x, y, size * .2, 0, TAU); } ctx.stroke(); }
  function rosette(ctx, x, y, R, color, lw) { ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath(); star8(ctx, x, y, R); star8(ctx, x, y, R * .62); ctx.moveTo(x + R * .3, y); ctx.arc(x, y, R * .3, 0, TAU); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.moveTo(x + Math.cos(a) * R * .3, y + Math.sin(a) * R * .3); ctx.lineTo(x + Math.cos(a) * R * 1.25, y + Math.sin(a) * R * 1.25); } ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, R * .08, 0, TAU); ctx.fillStyle = color; ctx.fill(); }
  function archPath(ctx, L, R, T, B) {
    const W = R - L, sh = T + W * .62, mid = (L + R) / 2;
    ctx.moveTo(L, B); ctx.lineTo(L, sh);
    ctx.bezierCurveTo(L, sh - W * .34, mid - W * .14, T + W * .16, mid, T);
    ctx.bezierCurveTo(mid + W * .14, T + W * .16, R, sh - W * .34, R, sh);
    ctx.lineTo(R, B); ctx.closePath();
  }
  function archFrame(ctx, w, h, inset, top, color, u) {
    ctx.strokeStyle = color; ctx.lineWidth = 1.6 * u; ctx.beginPath(); archPath(ctx, inset, w - inset, top, h - inset); ctx.stroke();
    ctx.lineWidth = .7 * u; ctx.beginPath(); archPath(ctx, inset + 7 * u, w - inset - 7 * u, top + 9 * u, h - inset - 7 * u); ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(w / 2, top - 16 * u); ctx.lineTo(w / 2 + 5 * u, top - 6 * u); ctx.lineTo(w / 2, top + 2 * u); ctx.lineTo(w / 2 - 5 * u, top - 6 * u); ctx.closePath(); ctx.fill();
  }
  function corners(ctx, w, h, R, color, lw) { for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h]]) { ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath(); star8(ctx, x, y, R); star8(ctx, x, y, R * .66); star8(ctx, x, y, R * 1.35); ctx.moveTo(x + R * .4, y); ctx.arc(x, y, R * .4, 0, TAU); ctx.stroke(); } }
  // حبيبات خفيفة (ملمس) وتعتيم الأطراف
  let NOISE = null;
  function grain(ctx, w, h, a) {
    if (!NOISE) { NOISE = document.createElement('canvas'); NOISE.width = NOISE.height = 128; const g = NOISE.getContext('2d'), d = g.createImageData(128, 128); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); }
    ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = ctx.createPattern(NOISE, 'repeat'); ctx.fillRect(0, 0, w, h); ctx.restore();
  }
  function vignette(ctx, w, h, a) { const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .35, w / 2, h / 2, Math.hypot(w, h) * .62); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
  function water(ctx, w, y, h, r, u, color, moonX) {
    for (let i = 0; i < 260; i++) {
      const yy = y + r() ** 1.6 * h, near = (yy - y) / h, len = (6 + r() * 40) * u * (.4 + near);
      const x = moonX != null && r() < .55 ? moonX + (r() - .5) * (20 + near * 140) * u : r() * w;
      ctx.fillStyle = rgba(color, (.08 + r() * .3) * (moonX != null ? 1 - near * .4 : .6)); ctx.fillRect(x - len / 2, yy, len, Math.max(1, .8 * u * (.6 + near)));
    }
  }

  // ---------- الخلفيات (خ١–خ٩) ----------
  const STYLES = {
    forest: { name: 'غابة الضباب', zone: 'upper', ink: '#f6f2e6', accent: '#dcc993', scrim: '#0d2220', draw(ctx, w, h, r, u) {
      vgrad(ctx, 0, w, h, [[0, '#173230'], [.42, '#3d6660'], [.6, '#9fbcb1'], [.66, '#c9d8cd'], [1, '#c9d8cd']]);
      glow(ctx, w * .5, h * .13, 70 * u, '#fff8e6', .35); ctx.fillStyle = '#f7f1df'; ctx.beginPath(); ctx.arc(w * .5, h * .13, 15 * u, 0, TAU); ctx.fill();
      const layers = [['#86a69d', .56, 60], ['#5f8279', .61, 52], ['#3e5f57', .67, 44], ['#24413b', .73, 36]];
      layers.forEach(([c, y, amp], i) => { const p = ridge(w, h * y, amp * u, .55, r); fillRidge(ctx, p, h, c); forestRow(ctx, w, p, 4 * u, 16 + i * 6, (10 + i * 7) * u, (22 + i * 12) * u, r, c); band(ctx, w, h * (y + .03), 26 * u, '#d9e4dc', .38 - i * .06); });
      vgrad(ctx, h * .8, w, h * .2, [[0, '#1d3a35'], [1, '#0b1d1a']]); water(ctx, w, h * .8, h * .2, r, u, '#e8f0ea', w * .5);
      ctx.fillStyle = '#0a1a17';
      for (const side of [0, 1]) for (let i = 0; i < 4; i++) { const x = side ? w - (i * 22 + r() * 10) * u : (i * 22 + r() * 10) * u, hh = (120 - i * 18 + r() * 30) * u; pine(ctx, x, h * .86 + i * 6 * u, hh, hh * .34); }
      grain(ctx, w, h, .08); vignette(ctx, w, h, .35);
    } },
    dawn: { name: 'جبال الفجر', zone: 'upper', ink: '#fbf3ea', accent: '#f2c79e', scrim: '#2a2147', draw(ctx, w, h, r, u) {
      vgrad(ctx, 0, w, h, [[0, '#2e2c5a'], [.3, '#6c62a0'], [.5, '#c79cb4'], [.6, '#f1b893'], [1, '#f6cfae']]);
      glow(ctx, w * .5, h * .6, 160 * u, '#ffd9b0', .5);
      crescent(ctx, w * .64, h * .14, 13 * u, '#fff4e0', '#fff1d6');
      ['#a993c4', '#8673ac', '#634f8e', '#43356a'].forEach((c, i) => {
        const p = ridge(w, h * (.64 + i * .06), (56 - i * 8) * u, .55, r); fillRidge(ctx, p, h, c); band(ctx, w, h * (.67 + i * .06), 18 * u, '#f6c9b3', .32 - i * .06);
        if (i === 1) { const mx = w * .72; mosque(ctx, mx, ridgeY(p, mx) + 3 * u, 32 * u, '#4f3f78', { detail: 'rgba(241,184,147,.4)' }); }
      });
      glow(ctx, w * .45, h * .86, 120 * u, '#ffd2ad', .18);
      const fg = ridge(w, h * .9, 24 * u, .5, r); fillRidge(ctx, fg, h, '#251c3f'); forestRow(ctx, w, fg, 3 * u, 22, 26 * u, 60 * u, r, '#1d1633');
      grain(ctx, w, h, .07); vignette(ctx, w, h, .3);
    } },
    desert: { name: 'صحرا الغروب', zone: 'upper', ink: '#4e2f27', accent: '#9a6250', scrim: '#fbe6d6', light: true, draw(ctx, w, h, r, u) {
      vgrad(ctx, 0, w, h, [[0, '#e9b9a1'], [.35, '#f5d2bc'], [.62, '#fae2cf'], [1, '#e9c1a6']]);
      glow(ctx, w * .5, h * .64, 170 * u, '#fff1df', .65);
      crescent(ctx, w * .5, h * .12, 12 * u, '#fffaf0');
      fillRidge(ctx, ridge(w, h * .64, 50 * u, .5, r), h, '#e5b7a0'); fillRidge(ctx, ridge(w, h * .68, 36 * u, .5, r), h, '#d7a18b');
      band(ctx, w, h * .69, 22 * u, '#fbe3d0', .5);
      const base = h * .8; mosque(ctx, w * .5, base, 66 * u, '#94604f', { four: true, tall: 1.25, detail: 'rgba(250,226,207,.5)' });
      palm(ctx, w * .1, base + 12 * u, 110 * u, .2, '#86574b'); palm(ctx, w * .2, base + 8 * u, 76 * u, -.25, '#86574b'); palm(ctx, w * .88, base + 10 * u, 96 * u, -.2, '#86574b');
      birds(ctx, w * .68, h * .5, 4, 4 * u, r, 'rgba(112,72,60,.6)');
      ctx.fillStyle = '#c99079'; ctx.beginPath(); ctx.moveTo(0, h); for (let x = 0; x <= w; x += w / 40) ctx.lineTo(x, base + 14 * u + Math.sin(x / w * 5 + r()) * 6 * u); ctx.lineTo(w, h); ctx.fill();
      vgrad(ctx, h * .86, w, h * .14, [[0, 'rgba(176,122,100,0)'], [1, 'rgba(150,100,82,.9)']]);
      corners(ctx, w, h * 1.02, 46 * u, 'rgba(255,240,228,.55)', .8 * u);
      grain(ctx, w, h, .06);
    } },
    ocean: { name: 'بحر الليل', zone: 'upper', ink: '#eef2fa', accent: '#c6d0e6', scrim: '#060c20', draw(ctx, w, h, r, u) {
      vgrad(ctx, 0, w, h, [[0, '#070d22'], [.45, '#14224c'], [.58, '#22356a'], [.58, '#0d1838'], [1, '#04091a']]);
      stars(ctx, w, h * .55, 140, r, u, '#ffffff', .8);
      glow(ctx, w * .5, h * .16, 90 * u, '#dfe8ff', .3);
      crescent(ctx, w * .5, h * .16, 15 * u, '#f3f6ff'); star5(ctx, w * .5 + 22 * u, h * .16 - 4 * u, 4 * u, '#f3f6ff');
      band(ctx, w, h * .58, 10 * u, '#9fb4e8', .35);
      water(ctx, w, h * .585, h * .415, r, u, '#d8e2ff', w * .5);
      corners(ctx, w, h, 52 * u, 'rgba(200,214,240,.28)', .8 * u);
      grain(ctx, w, h, .06); vignette(ctx, w, h, .45);
    } },
    marble: { name: 'رخام وذهب', zone: 'center', ink: 'gold', accent: '#d8b66a', scrim: '#000000', draw(ctx, w, h, r, u) {
      vgrad(ctx, 0, w, h, [[0, '#121214'], [.5, '#1b1b1e'], [1, '#0b0b0c']]);
      // عروق الرخام: خطوط رفيعة متعرّجة، أغلبها رمادي فاتح وقليل ذهبي
      for (let i = 0; i < 22; i++) {
        const gold = i < 3; let x = r() * w, y = r() * h, ang = (r() - .5) * 1.4 + Math.PI / 3;
        ctx.beginPath(); ctx.moveTo(x, y);
        const steps = 28 + r() * 30;
        for (let k = 0; k < steps; k++) { ang += (r() - .5) * .7; x += Math.cos(ang) * 9 * u; y += Math.sin(ang) * 9 * u; ctx.lineTo(x, y); if (r() < .06) { ctx.moveTo(x, y); ang += (r() - .5) * 1.6; } }
        ctx.strokeStyle = gold ? `rgba(214,178,102,${.16 + r() * .18})` : `rgba(230,230,236,${.025 + r() * .07})`; ctx.lineWidth = (r() * .9 + .35) * u; ctx.stroke();
      }
      khatamGrid(ctx, w, h, 64 * u, 'rgba(255,255,255,.035)', .7 * u);
      const base = h * .93; glow(ctx, w / 2, base - 40 * u, 160 * u, '#e9c46a', .26);
      const g = ctx.createLinearGradient(0, base - 130 * u, 0, base); g.addColorStop(0, '#f6dc94'); g.addColorStop(1, '#9a7330');
      mosque(ctx, w / 2, base, 60 * u, g, { four: true, tall: 1.15, detail: 'rgba(40,26,8,.55)' });
      archFrame(ctx, w, h, 22 * u, h * .1, '#cfa95a', u);
      grain(ctx, w, h, .07); vignette(ctx, w, h, .5);
    } },
    emerald: { name: 'زمرّد ونقش', zone: 'center', ink: '#f7eedb', accent: '#d9b86c', scrim: '#032419', draw(ctx, w, h, r, u) {
      const g = ctx.createRadialGradient(w / 2, h * .45, 10, w / 2, h * .5, Math.hypot(w, h) * .6); g.addColorStop(0, '#11684e'); g.addColorStop(1, '#05301f'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      khatamGrid(ctx, w, h, 46 * u, 'rgba(200,240,215,.07)', .8 * u);
      archFrame(ctx, w, h, 30 * u, h * .14, '#d6b46a', u);
      rosette(ctx, w / 2, h * .25, 16 * u, '#d6b46a', .9 * u); rosette(ctx, w / 2, h * .82, 22 * u, '#d6b46a', .9 * u);
      corners(ctx, w, h, 40 * u, 'rgba(214,180,106,.35)', .8 * u);
      grain(ctx, w, h, .06); vignette(ctx, w, h, .35);
    } },
    ivory: { name: 'ورق وحبر', zone: 'center', ink: '#2a2825', accent: '#7b746a', scrim: '#f4efe4', light: true, draw(ctx, w, h, r, u) {
      vgrad(ctx, 0, w, h, [[0, '#f6f2e9'], [1, '#ebe4d6']]);
      // تلال حبر من الزاوية تحت يسار، بتتلاشى عاليمين
      for (let i = 0; i < 5; i++) { const p = ridge(w, h * (.72 + i * .05), (60 - i * 6) * u, .6, r); fillRidge(ctx, p, h, `rgba(${70 + i * 8},${70 + i * 8},${72 + i * 8},${.1 + i * .08})`); band(ctx, w, h * (.75 + i * .05), 20 * u, '#f3eee4', .35); }
      { const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(240,234,222,0)'); g.addColorStop(.55, 'rgba(240,234,222,.55)'); g.addColorStop(1, 'rgba(240,234,222,.95)'); ctx.fillStyle = g; ctx.fillRect(0, h * .6, w, h * .4); }
      ctx.strokeStyle = '#8a8378'; ctx.lineWidth = .8 * u; ctx.beginPath(); ctx.moveTo(w / 2, h * .06); ctx.lineTo(w / 2, h * .24); ctx.moveTo(w / 2, h * .8); ctx.lineTo(w / 2, h * .95); ctx.stroke();
      for (const y of [h * .06, h * .24, h * .8, h * .95]) { ctx.fillStyle = '#5d574e'; ctx.beginPath(); ctx.moveTo(w / 2, y - 5 * u); ctx.lineTo(w / 2 + 4 * u, y); ctx.lineTo(w / 2, y + 5 * u); ctx.lineTo(w / 2 - 4 * u, y); ctx.closePath(); ctx.fill(); }
      grain(ctx, w, h, .12);
    } },
    stars: { name: 'سماء النجوم', zone: 'center', ink: '#f8f3e6', accent: '#e2c57a', scrim: '#050816', draw(ctx, w, h, r, u) {
      vgrad(ctx, 0, w, h, [[0, '#04060d'], [.55, '#0f1838'], [.85, '#1d2a56'], [1, '#26346a']]);
      const milky = { y0: h * .05, y1: h * .55, spread: 110 * u };
      ctx.save(); ctx.globalAlpha = .5; for (let i = 0; i < 10; i++) { const t = i / 9; glow(ctx, t * w, milky.y0 + (milky.y1 - milky.y0) * t, 90 * u, '#8c9ae0', .12); } ctx.restore();
      stars(ctx, w, h * .85, 420, r, u, '#ffffff', .9, milky);
      crescent(ctx, w * .72, h * .14, 13 * u, '#f6dc9c', '#f3d48a');
      const hill = ridge(w, h * .9, 22 * u, .5, r); fillRidge(ctx, hill, h, '#070a16');
      mosque(ctx, w * .3, ridgeY(hill, w * .3) + 3 * u, 26 * u, '#070a16', { detail: 'rgba(243,212,138,.55)' });
      grain(ctx, w, h, .05);
    } },
    goldnight: { name: 'مسجد بالليل', zone: 'upper', ink: 'gold', accent: '#e3c27a', scrim: '#05070d', draw(ctx, w, h, r, u) {
      vgrad(ctx, 0, w, h, [[0, '#04060c'], [.6, '#101a2e'], [.76, '#1b2843'], [.76, '#0a1120'], [1, '#03060c']]);
      stars(ctx, w, h * .6, 180, r, u, '#ffffff', .7);
      crescent(ctx, w * .5, h * .11, 12 * u, '#f8e3a8', '#f3d48a');
      const base = h * .76, s = Math.min(w, h * .56) * .19;
      glow(ctx, w / 2, base - s * .5, s * 4, '#f0c66a', .35);
      const g = ctx.createLinearGradient(0, base - s * 1.6, 0, base); g.addColorStop(0, '#fbe7ae'); g.addColorStop(.6, '#e1b25c'); g.addColorStop(1, '#8e6522');
      mosque(ctx, w / 2, base, s, g, { four: true, tall: 1.12, detail: 'rgba(60,36,6,.6)' });
      ctx.save(); ctx.translate(0, base * 2); ctx.scale(1, -1); ctx.globalAlpha = .26; mosque(ctx, w / 2, base, s, '#e1b25c', { four: true, tall: 1.12 }); ctx.restore();
      band(ctx, w, base + 2 * u, 8 * u, '#f2cf86', .25);
      water(ctx, w, base + 2 * u, h - base, r, u, '#f2cf86', w / 2);
      grain(ctx, w, h, .06); vignette(ctx, w, h, .45);
    } }
  };
  const ORDER = ['forest', 'dawn', 'desert', 'ocean', 'marble', 'emerald', 'ivory', 'stars', 'goldnight'];

  function draw(ctx, w, h, style, seed = 1) {
    const st = STYLES[style] || STYLES.forest, u = Math.min(w, h) / 400;
    ctx.save(); st.draw(ctx, w, h, rng(seed * 9973 + 7), u); ctx.restore();
    return st;
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
  // o: { kind: phone|story|square|desktop, layout: auto|center|upper|lower, style, sign: «مُذكّر» تحت (بالمشاركة بس) }
  function text(ctx, w, h, item, o) {
    // آيات الأذكار (آية الكرسي، المعوذات…) نصها فيه ﴿﴾ أصلًا: منكتبها بخط المصحف بلا أقواس زيادة
    const st = o.style || STYLES.forest, z = zone(o.kind, w, h), u = Math.min(w, h) / 400, hasMarks = item.text.includes('﴿'), isAyah = item.kind === 'ayah' || hasMarks;
    const font = isAyah ? '"Amiri Quran", "Amiri", serif' : '"Amiri", "Amiri Quran", serif';
    const body = isAyah && !hasMarks ? '﴿' + item.text + '﴾' : item.text;
    ctx.save(); ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    let size = Math.min(z.w / 6, h * .06), lines = [], lh = 0;
    for (let i = 0; i < 40; i++) { ctx.font = `${size}px ${font}`; lines = wrap(ctx, body, z.w); lh = size * (isAyah ? 1.95 : 1.8); if (lines.length * lh <= z.h * .8) break; size *= .93; }
    const refSize = Math.max(11 * u, size * .34), blockH = lines.length * lh + (item.ref ? refSize * 3.2 : refSize * 1.6);
    const layout = o.layout === 'auto' || !o.layout ? (st.zone === 'upper' ? 'upper' : 'center') : o.layout;
    const top = layout === 'lower' ? z.y + z.h - blockH : layout === 'upper' ? z.y : z.y + (z.h - blockH) / 2;
    const cx = z.x + z.w / 2;
    // خلفية ناعمة ورا الكتابة حتى تنقرا فوق أي منظر
    if (layout === 'lower') vgrad(ctx, top - lh, w, h - top + lh, [[0, rgba(st.scrim, 0)], [.35, rgba(st.scrim, st.light ? .5 : .55)], [1, rgba(st.scrim, st.light ? .75 : .8)]]);
    else { const cy = top + blockH / 2, R = Math.max(z.w * .7, blockH), g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R); g.addColorStop(0, rgba(st.scrim, st.light ? .55 : .42)); g.addColorStop(1, rgba(st.scrim, 0)); ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, R * 2, R * 2); }
    ctx.font = `${size}px ${font}`;
    if (st.ink === 'gold') { const g = ctx.createLinearGradient(0, top, 0, top + lines.length * lh); g.addColorStop(0, '#fbe6a8'); g.addColorStop(.5, '#e2bb64'); g.addColorStop(1, '#b88a3a'); ctx.fillStyle = g; }
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
  return { draw, text, STYLES, ORDER };
})();
