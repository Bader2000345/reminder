/* =====================================================================
 * مُذكّر — widget/common.js  (الإصدار ١٧)
 * مشترك بين صفحات الأدوات برّا التطبيق: خلفية اللابتوب (wallpaper.html) ولوحة التلفزيون (tv.html).
 *   - المحتوى من السيرفر (worker.js ← GET /widget): التاريخين، ذكر الوقت، آية أو حديث اليوم، وتقدّم الورد
 *   - بيتحدّث كل ١٠ دقايق ولما يتغيّر اليوم، وآخر نسخة بتنحفظ فبتضل الصفحة شغّالة إذا انقطع النت
 *   - الساعة والتاريخ بينحسبوا هون، فما بيوقفوا ولا ثانية
 *   - الرابط فيه رمز الأداة ‎?k=…‎ (من «أدوات مُذكّر» بالتطبيق) حتى يبيّن الورد، وبلاه بتشتغل بلا ورد
 * ما في Service Worker هون، والصفحة ما بتعرف أي شي عن المستخدم غير هالرمز العشوائي.
 * ===================================================================== */
const MdkWidget = (() => {
    const API = 'https://mudhakkir-push.bader-bm-2000.workers.dev/widget';
    const q = new URLSearchParams(location.search);
    // للتجربة على الجهاز بس: ‎?api=‎ لسيرفر محلي
    const api = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /^http:\/\/(localhost|127\.0\.0\.1)[:/]/.test(q.get('api') || '') ? q.get('api') : API;
    const key = /^[a-z0-9]{20,40}$/.test(q.get('k') || '') ? q.get('k') : '';
    const STORE = 'mdk-widget-last';
    const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } })();
    const AR = n => Number(n).toLocaleString('ar-EG');
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

    function clock(d = new Date()) {
        const parts = new Intl.DateTimeFormat('ar-EG', { hour: 'numeric', minute: '2-digit' }).formatToParts(d);
        return { time: parts.filter(p => p.type !== 'dayPeriod').map(p => p.value).join('').trim(), period: (parts.find(p => p.type === 'dayPeriod') || {}).value || '' };
    }
    const ymd = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    // التاريخين محليًا (لما السيرفر ما يرد، أو بعد نص الليل قبل التحديث)
    function localDates() {
        const d = new Date();
        let hijri = '';
        try { hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab', { day: 'numeric', month: 'long', year: 'numeric' }).format(d).replace(/\s*هـ$/, '') + ' هـ'; } catch (e) {}
        return { greg: d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }), hijri, ymd: ymd(d) };
    }
    const saved = () => { try { return JSON.parse(localStorage.getItem(STORE)) || null; } catch (e) { return null; } };
    async function load() {
        try {
            const res = await fetch(`${api}?tz=${encodeURIComponent(tz)}${key ? '&k=' + key : ''}`, { cache: 'no-store' });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const d = await res.json();
            if (!d || d.v !== 1) throw new Error('bad');
            try { localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) {}
            return d;
        } catch (e) { return null; }
    }
    // البيانات المعروضة: من السيرفر، مع التاريخ المحلي إذا اليوم تغيّر وما وصل الجديد لسا
    function merge(d) {
        const loc = localDates();
        if (!d) return { ...loc, dhikr: null, daily: null, wird: null };
        if (d.ymd !== loc.ymd) return { ...d, greg: loc.greg, hijri: loc.hijri, wird: d.wird ? { ...d.wird, today: false, pct: 0, range: '', done: false, line: 'ورد اليوم لسا ما بلّش' } : null };
        return d;
    }

    // render(data) بينعاد كل ما وصل جديد؛ tick() كل ٥ ثواني للساعة
    function start(render, tick) {
        let data = merge(saved()), lastDay = ymd();
        render(data); tick();
        const refresh = () => load().then(d => { if (d) { data = merge(d); render(data); } });
        refresh();
        setInterval(refresh, 10 * 60 * 1000);
        setInterval(() => {
            tick();
            if (ymd() !== lastDay) { lastDay = ymd(); data = merge(saved()); render(data); refresh(); }
        }, 5000);
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });
    }
    // زحزحة بسيطة كل دقيقة حتى ما يعلّم الكلام الثابت عالشاشة (OLED والتلفزيون)
    function antiBurn(el, px = 6) {
        if (reduceMotion.matches) return;
        setInterval(() => { el.style.transform = `translate(${Math.round(Math.random() * px * 2 - px)}px, ${Math.round(Math.random() * px * 2 - px)}px)`; }, 60000);
    }
    // سطر بيتبدّل بهدوء بين عدة جمل
    function rotate(el, getLines, every = 12000) {
        let i = 0;
        const show = () => {
            const lines = getLines().filter(Boolean);
            if (!lines.length) { el.textContent = ''; return; }
            i = (i + 1) % lines.length;
            if (reduceMotion.matches) { el.textContent = lines[i]; return; }
            el.classList.add('is-fading');
            setTimeout(() => { el.textContent = lines[i % lines.length]; el.classList.remove('is-fading'); }, 600);
        };
        const first = getLines().filter(Boolean); el.textContent = first[0] || '';
        setInterval(show, every);
    }
    return { q, key, AR, clock, start, antiBurn, rotate };
})();
