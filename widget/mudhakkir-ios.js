// =====================================================================
// مُذكّر — أداة الشاشة الرئيسية للآيفون (تطبيق Scriptable)            الإصدار ١٧
// ورد اليوم وتقدّمه، وذكر الوقت، وآية أو حديث اليوم، بشكل مُذكّر الزمرّدي (معرض ١٠: أ١).
// الأحجام: صغيرة، متوسطة، كبيرة، وكمان أدوات شاشة القفل.
//
// التركيب (مرة وحدة):
//   ١) نزّل تطبيق Scriptable المجاني من App Store.
//   ٢) من مُذكّر ← الإعدادات ← «أدوات مُذكّر» ← «انسخ كود الآيفون».
//   ٣) افتح Scriptable ← + ← الصق الكود ← سمّيه «مُذكّر» ← Done.
//   ٤) اضغط مطوّلًا عالشاشة الرئيسية ← + ← Scriptable ← اختار الحجم ← «إضافة الأداة».
//   ٥) اضغط عالأداة مطوّلًا ← «تعديل الأداة» ← Script: مُذكّر.
// الرمز تحت بيربط الأداة بتقدّم وردك. هو رمز عشوائي، بلا اسم ولا إيميل.
// =====================================================================
const KEY = '__KEY__';
const API = 'https://mudhakkir-push.bader-bm-2000.workers.dev/widget';
const APP = 'https://bader2000345.github.io/reminder/';

const C = {
  top: new Color('#13705a'), bottom: new Color('#0b3d31'),
  ink: new Color('#f3efe4'), soft: new Color('#f3efe4', 0.74), gold: new Color('#e6c879'),
  track: new Color('#ffffff', 0.16), block: new Color('#000000', 0.18), sep: new Color('#ffffff', 0.18)
};
const AR = n => Number(n).toLocaleString('ar-EG');
const times = n => (n === 2 ? 'مرتين' : `${AR(n)} ${n <= 10 ? 'مرات' : 'مرة'}`);

// ---------- البيانات: من سيرفر مُذكّر، وآخر نسخة محفوظة إذا ما في نت ----------
async function load() {
  const fm = FileManager.local();
  const path = fm.joinPath(fm.cacheDirectory(), 'mudhakkir-widget.json');
  let tz = 'UTC';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) {}
  const key = /^[a-z0-9]{20,40}$/.test(KEY) ? KEY : '';
  try {
    const req = new Request(`${API}?tz=${encodeURIComponent(tz)}${key ? '&k=' + key : ''}`);
    req.timeoutInterval = 12;
    const d = await req.loadJSON();
    if (d && d.v === 1) { fm.writeString(path, JSON.stringify(d)); return d; }
  } catch (e) {}
  try { if (fm.fileExists(path)) return JSON.parse(fm.readString(path)); } catch (e) {}
  return null;
}

// ---------- أدوات الرسم ----------
function base() {
  const w = new ListWidget();
  const g = new LinearGradient();
  g.colors = [C.top, C.bottom];
  g.locations = [0, 1];
  g.startPoint = new Point(1, 0);
  g.endPoint = new Point(0, 1);
  w.backgroundGradient = g;
  return w;
}
// Scriptable بيرتّب من الشمال لليمين، فالسطر العربي: فراغ مرن قبله والنص لليمين
function rtl(stack, str, font, color, lines = 0, scale = 0.75) {
  const row = stack.addStack();
  row.layoutHorizontally();
  row.addSpacer();
  const t = row.addText(String(str || ''));
  t.font = font; t.textColor = color; t.rightAlignText();
  if (lines) t.lineLimit = lines;
  t.minimumScaleFactor = scale;
  return t;
}
function center(stack, str, font, color, lines = 1) {
  const row = stack.addStack();
  row.layoutHorizontally();
  row.addSpacer();
  const t = row.addText(String(str || ''));
  t.font = font; t.textColor = color; t.centerAlignText(); t.lineLimit = lines; t.minimumScaleFactor = 0.7;
  row.addSpacer();
  return t;
}
// خط دائري (Path ما فيه قوس، فمنرسمه قطع صغيرة)
function arc(dc, c, r, from, to, color, lw) {
  const p = new Path();
  const steps = Math.max(2, Math.ceil((to - from) / 4));
  for (let i = 0; i <= steps; i++) {
    const a = ((from + (to - from) * i / steps) - 90) * Math.PI / 180;
    const pt = new Point(c + r * Math.cos(a), c + r * Math.sin(a));
    if (i === 0) p.move(pt); else p.addLine(pt);
  }
  dc.addPath(p); dc.setStrokeColor(color); dc.setLineWidth(lw); dc.strokePath();
}
function ringImage(pct, size, ink = C.ink, track = C.track, fill = C.gold) {
  const dc = new DrawContext();
  dc.size = new Size(size, size); dc.opaque = false; dc.respectScreenScale = true;
  const lw = size * 0.11, c = size / 2, r = (size - lw) / 2;
  arc(dc, c, r, 0, 360, track, lw);
  if (pct > 0) arc(dc, c, r, 0, 360 * Math.min(100, pct) / 100, fill, lw);
  dc.setTextAlignedCenter();
  dc.setFont(Font.semiboldSystemFont(size * 0.22));
  dc.setTextColor(ink);
  dc.drawTextInRect(`${AR(pct)}٪`, new Rect(0, c - size * 0.15, size, size * 0.32));
  return dc.getImage();
}
// شريط التقدّم من اليمين
function barImage(pct, width, height) {
  const dc = new DrawContext();
  dc.size = new Size(width, height); dc.opaque = false; dc.respectScreenScale = true;
  const track = new Path(); track.addRoundedRect(new Rect(0, 0, width, height), height / 2, height / 2);
  dc.addPath(track); dc.setFillColor(C.track); dc.fillPath();
  const fw = Math.round(width * Math.min(100, Math.max(0, pct)) / 100);
  if (fw > 0) { const f = new Path(); f.addRoundedRect(new Rect(width - fw, 0, fw, height), height / 2, height / 2); dc.addPath(f); dc.setFillColor(C.gold); dc.fillPath(); }
  return dc.getImage();
}
function block(parent) {
  const b = parent.addStack();
  b.layoutVertically(); b.backgroundColor = C.block; b.cornerRadius = 14; b.setPadding(8, 10, 8, 10); b.spacing = 3;
  return b;
}
const shortRange = r => String(r || '').replace('من صفحة ', 'ص ').replace(' لـ ', '–');
const wirdSub = w => (w.complete ? 'الختمة كاملة' : w.done ? 'تمّ، تقبّل الله' : w.today ? shortRange(w.range) || w.line : 'لسا ما بلّش');

// ---------- الأحجام ----------
function small(d) {
  const w = base(); w.setPadding(12, 12, 12, 12);
  if (d.wird) {
    rtl(w, 'ورد اليوم', Font.semiboldSystemFont(12), C.gold, 1);
    w.addSpacer(4);
    const r = w.addStack(); r.addSpacer();
    const im = r.addImage(ringImage(d.wird.pct, 140)); im.imageSize = new Size(70, 70);
    r.addSpacer();
    w.addSpacer(4);
    center(w, wirdSub(d.wird), Font.mediumSystemFont(11), C.soft);
    w.url = APP + '?open=wird';
  } else {
    rtl(w, d.dhikr.k, Font.semiboldSystemFont(11), C.gold, 1);
    w.addSpacer(4);
    rtl(w, d.dhikr.t, Font.systemFont(14), C.ink, 5, 0.6);
    w.addSpacer();
    w.url = APP + '?open=' + (d.period === 'morning' ? 'morning' : 'evening');
  }
  return w;
}
function medium(d) {
  const w = base(); w.setPadding(12, 14, 12, 14);
  const row = w.addStack(); row.layoutHorizontally(); row.centerAlignContent();
  // الشمال: ذكر الوقت
  const main = row.addStack(); main.layoutVertically(); main.spacing = 3;
  rtl(main, d.dhikr.k + (d.dhikr.n > 1 ? `، ${times(d.dhikr.n)}` : ''), Font.semiboldSystemFont(11), C.gold, 1);
  rtl(main, d.dhikr.t, Font.systemFont(15), C.ink, 4, 0.65);
  row.addSpacer(10);
  const sep = row.addStack(); sep.size = new Size(1, 96); sep.backgroundColor = C.sep;
  row.addSpacer(10);
  // اليمين: التاريخ والورد
  const side = row.addStack(); side.layoutVertically(); side.spacing = 4; side.size = new Size(96, 0);
  rtl(side, d.greg, Font.semiboldSystemFont(11), C.gold, 1, 0.6);
  if (d.wird) {
    const r = side.addStack(); r.addSpacer();
    const im = r.addImage(ringImage(d.wird.pct, 124)); im.imageSize = new Size(62, 62);
    rtl(side, wirdSub(d.wird), Font.systemFont(10), C.soft, 1, 0.6);
  } else {
    rtl(side, d.hijri, Font.mediumSystemFont(13), C.ink, 3, 0.7);
  }
  w.url = APP + (d.wird ? '?open=wird' : '');
  return w;
}
function large(d) {
  const w = base(); w.setPadding(14, 14, 14, 14);
  const head = w.addStack(); head.layoutHorizontally(); head.topAlignContent();
  const brand = head.addText('مُذكّر'); brand.font = Font.boldSystemFont(12); brand.textColor = C.gold;
  head.addSpacer();
  const dates = head.addStack(); dates.layoutVertically(); dates.spacing = 1;
  rtl(dates, d.greg, Font.semiboldSystemFont(16), C.ink, 1);
  rtl(dates, d.hijri, Font.systemFont(11), C.soft, 1);
  w.addSpacer(10);
  if (d.wird) {
    const b = block(w);
    rtl(b, 'ورد اليوم' + (d.wird.range ? '، ' + d.wird.range : ''), Font.semiboldSystemFont(11), C.gold, 1, 0.6);
    const br = b.addStack(); br.addSpacer();
    const im = br.addImage(barImage(d.wird.pct, 290, 6)); im.imageSize = new Size(290, 6);
    rtl(b, d.wird.done || d.wird.complete ? `${wirdSub(d.wird)}، ${d.wird.streak}` : d.wird.today ? `أنجزت ${AR(d.wird.pct)}٪، ${d.wird.streak}` : `${d.wird.line}، ${d.wird.streak}`, Font.systemFont(11), C.soft, 1, 0.6);
    w.addSpacer(8);
  }
  const k = block(w);
  rtl(k, d.dhikr.k + (d.dhikr.n > 1 ? `، ${times(d.dhikr.n)}` : ''), Font.semiboldSystemFont(11), C.gold, 1);
  rtl(k, d.dhikr.t, Font.systemFont(15), C.ink, d.wird ? 3 : 4, 0.65);
  w.addSpacer(8);
  const a = block(w);
  rtl(a, d.daily.k, Font.semiboldSystemFont(11), C.gold, 1);
  rtl(a, d.daily.t, Font.systemFont(d.daily.q ? 17 : 14), C.ink, 3, 0.65);
  rtl(a, d.daily.s, Font.systemFont(10), C.soft, 1);
  w.addSpacer();
  w.url = APP + (d.wird ? '?open=wird' : '');
  return w;
}
// شاشة القفل: الأداة بتاخد لون النظام
function accessory(d, family) {
  const w = new ListWidget();
  if (family === 'accessoryCircular') {
    if (d.wird) {
      const im = w.addImage(ringImage(d.wird.pct, 120, Color.white(), new Color('#ffffff', 0.25), Color.white()));
      im.imageSize = new Size(58, 58);
    } else {
      const t = w.addText('مُذكّر'); t.font = Font.semiboldSystemFont(12); t.centerAlignText(); t.minimumScaleFactor = 0.6;
    }
  } else if (family === 'accessoryInline') {
    w.addText(d.wird ? `ورد اليوم ${AR(d.wird.pct)}٪` : d.dhikr.k);
  } else {
    rtl(w, d.wird ? `ورد اليوم ${AR(d.wird.pct)}٪` : d.dhikr.k, Font.semiboldSystemFont(12), Color.white(), 1);
    rtl(w, d.dhikr.t, Font.systemFont(12), Color.white(), 2, 0.6);
  }
  w.url = APP + (d.wird ? '?open=wird' : '');
  return w;
}
function offline() {
  const w = base(); w.setPadding(12, 12, 12, 12);
  rtl(w, 'مُذكّر', Font.boldSystemFont(13), C.gold, 1);
  w.addSpacer(6);
  rtl(w, 'بتتحدّث الأداة أول ما يرجع النت', Font.systemFont(12), C.ink, 3);
  w.addSpacer();
  return w;
}

// ---------- التشغيل ----------
const data = await load();
const family = config.widgetFamily || 'large';
let widget;
if (!data) widget = offline();
else if (family.startsWith('accessory')) widget = accessory(data, family);
else if (family === 'small') widget = small(data);
else if (family === 'medium') widget = medium(data);
else widget = large(data);
// بتتحدّث كل ربع ساعة تقريبًا (iOS هو يلي بيقرّر الوقت بالضبط)
widget.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
if (config.runsInWidget) Script.setWidget(widget);
else await widget.presentLarge();
Script.complete();
