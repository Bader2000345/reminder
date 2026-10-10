/* =====================================================================
 * مُذكّر — theme.js
 * المظهر: فاتح / داكن / حسب الجهاز / حسب الشمس (حساب الشروق والغروب)، والانتقال الدائري.
 * يُحمَّل بالترتيب من index.html؛ الأجزاء تتشارك المتغيرات العامة فيما بينها.
 * ===================================================================== */

// 3. المظهر (فاتح / تلقائي / داكن)
//    «الشمس»: يغمق التطبيق بعد غروب الشمس ويفتح بعد شروقها في موقعك
const THEME_KEY = 'mudhakkir-theme';
const THEME_DARK_KEY = 'mudhakkir-theme-dark';
const SUN_KEY = 'mudhakkir-sun-coords';
let themeMode = 'light';
try { themeMode = localStorage.getItem(THEME_KEY) || 'light'; } catch (e) {}
let sunCoords = null;
try { sunCoords = JSON.parse(localStorage.getItem(SUN_KEY)); } catch (e) {}

// وقت الشروق والغروب (معادلات NOAA المبسطة، دقة دقيقة أو اثنتين)
function sunTimes(date, lat, lon) {
    const rad = Math.PI / 180, y = date.getFullYear(), m = date.getMonth(), d = date.getDate();
    const doy = Math.round((Date.UTC(y, m, d) - Date.UTC(y, 0, 0)) / 864e5);
    const g = 2 * Math.PI / 365 * (doy - 1);
    const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const cosH = (Math.cos(90.833 * rad) - Math.sin(lat * rad) * Math.sin(decl)) / (Math.cos(lat * rad) * Math.cos(decl));
    if (cosH > 1) return { polar: 'night' };
    if (cosH < -1) return { polar: 'day' };
    const ha = Math.acos(cosH) / rad, base = Date.UTC(y, m, d);
    return { rise: new Date(base + (720 - 4 * (lon + ha) - eqt) * 60000), set: new Date(base + (720 - 4 * (lon - ha) - eqt) * 60000) };
}
function isNightNow() {
    const now = new Date();
    if (sunCoords) {
        const s = sunTimes(now, sunCoords.lat, sunCoords.lon);
        if (s.polar) return s.polar === 'night';
        return now < s.rise || now >= s.set;
    }
    const h = now.getHours();
    return h < 6 || h >= 18;
}
function themeIsDark() {
    if (themeMode === 'dark') return true;
    if (themeMode === 'auto') return matchMedia('(prefers-color-scheme: dark)').matches;
    if (themeMode === 'sun') return isNightNow();
    return false;
}
function themeStatusText() {
    if (themeMode !== 'sun') return 'اختر المظهر المناسب لك';
    if (!sunCoords) return 'حسب الوقت: داكن من ٦ مساءً حتى ٦ صباحًا (لم يُحدَّد موقعك)';
    const s = sunTimes(new Date(), sunCoords.lat, sunCoords.lon);
    if (s.polar) return 'حسب موقعك';
    const t = d => d.toLocaleTimeString('ar', { hour: 'numeric', minute: '2-digit' });
    return `حسب موقعك: فاتح من الشروق ${t(s.rise)} حتى الغروب ${t(s.set)}`;
}
function applyTheme(origin) {
    const dark = themeIsDark();
    try { localStorage.setItem(THEME_DARK_KEY, dark ? '1' : '0'); } catch (e) {}
    document.querySelectorAll('[data-theme-opt]').forEach(b => b.classList.toggle('active', b.dataset.themeOpt === themeMode));
    const status = document.getElementById('theme-status'); if (status) status.textContent = themeStatusText();
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = dark ? '#08110e' : '#0b4234';
    if (dark === document.body.classList.contains('dark-mode')) return;
    const flip = () => document.body.classList.toggle('dark-mode', dark);
    // انتقال دائري ناعم من مكان الضغط
    if (origin && document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.documentElement.style.setProperty('--vt-x', origin.x + 'px');
        document.documentElement.style.setProperty('--vt-y', origin.y + 'px');
        const vt = document.startViewTransition(flip);
        // إن تخطّى المتصفح الحركة (تبويب مخفي مثلًا) يبقى التبديل نفسه مطبّقًا
        vt.ready.catch(() => {}); vt.finished.catch(() => {});
    } else flip();
}
function setThemeMode(mode, origin) {
    themeMode = mode;
    try { localStorage.setItem(THEME_KEY, themeMode); } catch (e) {}
    applyTheme(origin);
    if (mode === 'sun' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(p => {
            sunCoords = { lat: +p.coords.latitude.toFixed(2), lon: +p.coords.longitude.toFixed(2) };
            try { localStorage.setItem(SUN_KEY, JSON.stringify(sunCoords)); } catch (e) {}
            applyTheme(origin);
        }, () => Toast.show('تعذّر تحديد موقعك، سنعتمد على الوقت (٦ص – ٦م)'), { maximumAge: 864e5, timeout: 15000 });
    }
}
document.querySelectorAll('[data-theme-opt]').forEach(b => b.addEventListener('click', e => setThemeMode(b.dataset.themeOpt, { x: e.clientX, y: e.clientY })));
document.getElementById('theme-quick')?.addEventListener('click', e => {
    const o = { x: e.clientX, y: e.clientY };
    setThemeMode(document.body.classList.contains('dark-mode') ? 'light' : 'dark', o);
});
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (themeMode === 'auto') applyTheme(); });
setInterval(() => { if (themeMode === 'sun') applyTheme(); }, 60000);
applyTheme();
