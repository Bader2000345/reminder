/* =====================================================================
 * مُذكّر — atmosphere.js
 * جوّ التطبيق حسب الوقت وتحسينات الحركة:
 *   - فترة اليوم (فجر، نهار، عصر، مغرب، ليل) من الشروق والغروب الحقيقيين إن عُرف الموقع (theme.js)
 *     وإلا من الساعة؛ تُوضع في <html data-daytime> فتتبدل ألوان الخلفية والبطاقة الرئيسية بنعومة (10-atmosphere.css).
 *   - أيقونة سماء في شريط التاريخ. (زخرفة الخلفية صارت في fx.js: «زخرفة تحت الضوء»)
 *   - الأرقام تعدّ صعودًا عند فتح الرئيسية.
 * يُحمَّل بعد theme.js و time-context.js.
 * ===================================================================== */

const Atmosphere = (() => {
    const root = document.documentElement;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const KEY = 'mudhakkir-daytime';
    const NAMES = { dawn: 'وقت الفجر', day: 'وقت النهار', afternoon: 'وقت العصر', sunset: 'وقت المغرب', night: 'وقت الليل' };
    const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
    const SKY = {
        dawn: svg('<path d="M3 19h18"/><path d="M7 19a5 5 0 0 1 10 0"/><path d="M12 4v6M9.5 6.5L12 4l2.5 2.5"/>'),
        day: svg('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>'),
        afternoon: svg('<circle cx="12" cy="13" r="4"/><path d="M12 5v2M5 13h2M17 13h2M7 8l1.4 1.4M17 8l-1.4 1.4M3 20h18"/>'),
        sunset: svg('<path d="M3 19h18"/><path d="M7 19a5 5 0 0 1 10 0"/><path d="M12 4v6M9.5 7.5L12 10l2.5-2.5"/>'),
        night: svg('<path d="M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.5z"/><path d="M17.5 3.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z"/>')
    };
    let manual = null; // للتجربة: Atmosphere.preview('night')

    // فترة اليوم الآن
    function phaseAt(now = new Date()) {
        let rise = null, set = null;
        try {
            if (typeof sunCoords !== 'undefined' && sunCoords) {
                const s = sunTimes(now, sunCoords.lat, sunCoords.lon);
                if (s.polar) return s.polar === 'night' ? 'night' : 'day';
                rise = s.rise; set = s.set;
            }
        } catch (e) {}
        const mins = d => d.getHours() * 60 + d.getMinutes();
        const t = mins(now), r = rise ? mins(rise) : 6 * 60, st = set ? mins(set) : 18 * 60;
        if (t >= r - 90 && t < r + 45) return 'dawn';
        if (t >= r + 45 && t < st - 150) return 'day';
        if (t >= st - 150 && t < st - 40) return 'afternoon';
        if (t >= st - 40 && t < st + 50) return 'sunset';
        return 'night';
    }

    function apply(phase = manual || phaseAt()) {
        if (root.dataset.daytime !== phase) root.dataset.daytime = phase;
        try { localStorage.setItem(KEY, phase); } catch (e) {}
        const icon = document.querySelector('.home-date .sky-icon');
        if (icon && icon.dataset.phase !== phase) { icon.dataset.phase = phase; icon.innerHTML = SKY[phase]; icon.title = NAMES[phase]; }
    }

    // أيقونة السماء بدل النقطة في شريط التاريخ
    function skyIcon() {
        const pill = document.querySelector('.home-date');
        if (!pill || pill.querySelector('.sky-icon')) return;
        const dot = pill.querySelector('i');
        const icon = document.createElement('span'); icon.className = 'sky-icon';
        if (dot) dot.replaceWith(icon); else pill.prepend(icon);
    }

    // الأرقام تعدّ صعودًا (نسبة الورد وإحصائية اليوم)
    const toNum = s => Number(String(s).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^\d.]/g, ''));
    function countUp(el) {
        if (!el || reduce.matches || el.dataset.counting) return;
        const final = el.textContent, target = toNum(final);
        if (!target || target > 100000) return;
        const tpl = final.replace(/[٠-٩\d][٠-٩\d.,٬]*/, '{n}');
        if (!tpl.includes('{n}')) return;
        const t0 = performance.now(), dur = 900;
        let written = null;
        el.dataset.counting = '1';
        const step = now => {
            // تغيّر الرقم من مكان آخر أثناء العدّ: نتوقف ونترك القيمة الجديدة
            if (written !== null && el.textContent !== written) { delete el.dataset.counting; return; }
            const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
            if (k < 1) { written = tpl.replace('{n}', Math.round(target * e).toLocaleString('ar-EG')); el.textContent = written; requestAnimationFrame(step); }
            else { el.textContent = final; delete el.dataset.counting; }
        };
        requestAnimationFrame(step);
    }
    function countHome() {
        countUp(document.getElementById('dashboard-progress-percent'));
        document.querySelectorAll('#daily-stats-line strong').forEach(countUp);
    }

    function init() {
        skyIcon();
        apply();
        // الانتقال الناعم للألوان يبدأ بعد أول رسم (حتى لا تتحرك الألوان عند فتح التطبيق)
        const ready = () => { root.dataset.skyReady = '1'; };
        requestAnimationFrame(() => requestAnimationFrame(ready));
        setTimeout(ready, 800); // احتياط إن توقف الرسم (تبويب مخفي)
        setInterval(() => apply(), 60000);
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') apply(); });
        // كلما فُتحت الرئيسية
        const home = document.getElementById('page-home');
        if (home) {
            new MutationObserver(() => { if (home.classList.contains('active-page')) countHome(); }).observe(home, { attributes: true, attributeFilter: ['class'] });
            if (home.classList.contains('active-page')) setTimeout(countHome, 250);
        }
    }
    // للتجربة من الكونسول: Atmosphere.preview('sunset')، و Atmosphere.preview(null) للرجوع للوقت الحقيقي
    function preview(phase) { manual = phase || null; apply(); }
    return { init, apply, phaseAt, preview };
})();
