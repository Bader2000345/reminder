/* =====================================================================
 * مُذكّر — screen.js  (الإصدار ١٦، معرض ٩: س١ س٢ س٣)
 * «شاشة مُذكّر»: شاشة كاملة بتنحط على الطاولة أو التلفزيون، متل أدوات الجوال:
 *   الساعة، والتاريخ الميلادي والهجري، وورد اليوم وتقدّمه، وذكر الوقت (الصباح أو المساء)، وآية أو حديث اليوم.
 *   ثلاث أنماط، وكل جهاز إله نمطه تلقائيًا (وبيقدر يغيّره):
 *     س٢ «بطاقات متل الأدوات» للجوال والتابلت · س١ «لوحة التلفزيون» للتلفزيون · س٣ «هادئة لليل» للابتوب
 *   الشاشة ما بتطفي (KeepAwake)، والأدوات (إغلاق والنمط) بتطلع بضغطة. الخروج: × أو Esc أو زر الرجوع.
 *   بالنمطين الغامقين الكلام بيتزحزح بكسلات قليلة كل دقيقة حتى ما يعلّم عالشاشة (OLED والتلفزيون).
 * الفتح: زر الرئيسية، الإعدادات، ‎?open=screen‎ (اختصار الأيقونة)، والمساعد.
 * المحتوى من assets/data/widget-content.json (نفس محتوى الأدوات برّا التطبيق، widgets.js و widget/).
 * يعتمد على Wird.snapshot (wird.js) و Hijri (extras.js) و KeepAwake/Immersive (core.js).
 * ===================================================================== */

const MdkScreen = (() => {
    const $ = id => document.getElementById(id);
    const KEY = 'mudhakkir-screen';
    const AR = n => Number(n).toLocaleString('ar-EG');
    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const root = $('mdk-screen'), body = $('scr-body');
    let pref = 'auto';
    try { pref = localStorage.getItem(KEY) || 'auto'; } catch (e) {}
    if (!['auto', '1', '2', '3'].includes(pref)) pref = 'auto';
    let timer = 0, rotTimer = 0, lastMinute = '', lastKey = '', usedFs = false;

    // ---------- أي نمط لهالجهاز؟ ----------
    const TV_UA = /SMART-?TV|Tizen|Web0S|webOS|HbbTV|BRAVIA|NetCast|Viera|AFT[A-Z]|Android TV|GoogleTV|CrKey|Roku|AppleTV/i;
    function autoStyle() {
        if (TV_UA.test(navigator.userAgent) || (matchMedia('(pointer: none)').matches && !matchMedia('(any-pointer: fine)').matches && screen.width >= 1200)) return '1';
        if (matchMedia('(pointer: coarse)').matches) return '2'; // جوال أو تابلت
        return '3'; // لابتوب وكمبيوتر
    }
    const style = () => (pref === 'auto' ? autoStyle() : pref);

    // ---------- المحتوى ----------
    function clockParts(d = new Date()) {
        const parts = new Intl.DateTimeFormat('ar-EG', { hour: 'numeric', minute: '2-digit' }).formatToParts(d);
        const time = parts.filter(p => p.type !== 'dayPeriod').map(p => p.value).join('').trim();
        const period = (parts.find(p => p.type === 'dayPeriod') || {}).value || '';
        return { time, period };
    }
    const greg = () => new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
    const hijri = () => { try { return (typeof Hijri !== 'undefined' && Hijri.today()?.text) || ''; } catch (e) { return ''; } };
    // الصباح من الفجر للعصر تقريبًا، والمساء بعده
    const isMorning = () => { const h = new Date().getHours(); return h >= 3 && h < 15; };
    // المحتوى (الأذكار القصيرة، آيات وأحاديث اليوم) من assets/data/widget-content.json:
    // نفس الملف يلي بتقرا منه الأدوات برّا التطبيق (worker.js ← /widget)، فالشاشة والأدوات بيعرضوا نفس الشي.
    // محفوظ بالـ Service Worker، فبيشتغل بلا نت. وإذا ما وصل لسبب ما منعرض المحتوى الاحتياطي.
    const FALLBACK = { ayat: [['أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ', 'الرعد ٢٨']], hadith: [['أَحَبُّ الْأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ', 'متفق عليه']], morning: [], evening: [] };
    let content = null;
    function loadContent() {
        if (content) return Promise.resolve(content);
        return fetch(new URL('assets/data/widget-content.json', document.baseURI))
            .then(r => (r.ok ? r.json() : null)).catch(() => null)
            .then(d => { content = d && Array.isArray(d.ayat) && d.ayat.length ? d : FALLBACK; return content; });
    }
    const C = () => content || FALLBACK;
    function dhikr() {
        const kicker = isMorning() ? 'من أذكار الصباح' : 'من أذكار المساء';
        let list = C()[isMorning() ? 'morning' : 'evening'] || [];
        // احتياط: من قاعدة الأذكار نفسها
        if (!list.length && typeof ADHKAR_DATABASE !== 'undefined') list = (ADHKAR_DATABASE[isMorning() ? 'morning' : 'evening']?.items || []).filter(it => it.text && it.text.length <= 240).map(it => [it.text.replace(/\s+/g, ' ').trim(), it.count || 1]);
        if (!list.length) return { kicker, text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', count: 100 };
        // بيتبدّل كل دقيقتين
        const [text, count] = list[Math.floor(Date.now() / 120000) % list.length];
        return { kicker, text, count: count || 1 };
    }
    // آية أو حديث اليوم: يوم آية ويوم حديث (أحاديث من الصحيحين)
    const dayIndex = () => { const d = new Date(); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5); };
    function daily() {
        const i = dayIndex(), { ayat, hadith } = C();
        if (i % 2 === 0) { const [t, src] = ayat[(i / 2) % ayat.length]; return { kicker: 'آية اليوم', text: `﴿${t}﴾`, src, quran: true }; }
        const [t, src] = hadith[((i - 1) / 2) % hadith.length];
        return { kicker: 'حديث اليوم', text: `قال رسول الله ﷺ: «${t}»`, src, quran: false };
    }
    function wird() {
        try {
            const w = Wird.snapshot();
            const pct = Math.max(0, Math.min(100, w.complete ? 100 : w.todayPct || 0));
            const range = w.from && w.to ? (w.from === w.to ? `صفحة ${AR(w.from)}` : `من صفحة ${AR(w.from)} لـ ${AR(w.to)}`) : '';
            return { pct, range, title: w.rangeTitle || '', streak: w.streak || 0, done: !!w.done || pct >= 100, complete: !!w.complete };
        } catch (e) { return { pct: 0, range: '', title: '', streak: 0, done: false, complete: false }; }
    }
    // ملاحظة: ما منحط «·» جنب الأرقام العربية لأنها بتبيّن متل الصفر (٣· بتنقرا ٣٠)، منستعمل الفاصلة
    const wirdLine = w => (w.complete ? 'الختمة كاملة، تقبّل الله' : w.done ? 'ورد اليوم تمّ، تقبّل الله' : `ورد اليوم ${AR(w.pct)}٪${w.range ? '، ' + w.range : ''}`);
    const streakText = n => (n > 0 ? `سلسلة ${AR(n)} ${n === 1 ? 'يوم' : n === 2 ? 'يومين' : n <= 10 ? 'أيام' : 'يوم'}` : 'ابدأ سلسلتك اليوم');

    // ---------- الرسم ----------
    const clockHtml = () => { const c = clockParts(); return `<span class="scr-clock" dir="rtl"><b class="scr-time">${esc(c.time)}</b><small class="scr-period">${esc(c.period)}</small></span>`; };
    const dateHtml = () => { const h = hijri(); return `<span class="scr-date"><span class="scr-g">${esc(greg())}</span>${h ? `<span class="scr-h">${esc(h)}</span>` : ''}</span>`; };
    const dailyHtml = d => `<span class="scr-k">${esc(d.kicker)}</span><p class="scr-text${d.quran ? ' is-quran' : ''}">${esc(d.text)}</p><span class="scr-src">${esc(d.src)}</span>`;
    const times = n => (n === 2 ? 'مرتين' : `${AR(n)} ${n <= 10 ? 'مرات' : 'مرة'}`);
    const dhikrHtml = k => `<span class="scr-k">${esc(k.kicker)}${k.count > 1 ? `، ${times(k.count)}` : ''}</span><p class="scr-text is-dhikr">${esc(k.text)}</p>`;
    function render() {
        const s = style();
        const w = wird(), d = daily(), k = dhikr();
        root.dataset.style = s;
        clearInterval(rotTimer);
        if (s === '1') {
            body.innerHTML = `
                <div class="s1-top">${dateHtml()}<span class="scr-brand">مُذكّر</span></div>
                <div class="s1-clock">${clockHtml()}</div>
                <article class="scr-card s1-daily">${dailyHtml(d)}</article>
                <div class="s1-row">
                    <article class="scr-card s1-wird"><span class="scr-k">ورد اليوم${w.title ? '، ' + esc(w.title) : ''}</span><b class="scr-big">${esc(w.complete ? 'الختمة كاملة، تقبّل الله' : w.done ? 'تمّ، تقبّل الله' : w.range || 'ورد اليوم')}</b><span class="scr-bar"><i style="width:${w.pct}%"></i></span><span class="scr-src">${esc(`أنجزت ${AR(w.pct)}٪، ${streakText(w.streak)}`)}</span></article>
                    <article class="scr-card s1-dhikr">${dhikrHtml(k)}</article>
                </div>`;
        } else if (s === '2') {
            body.innerHTML = `
                <article class="scr-card c-clock">${dateHtml()}${clockHtml()}<span class="scr-brand">مُذكّر</span></article>
                <article class="scr-card c-wird"><span class="scr-ring" style="--p:${w.pct}" role="img" aria-label="ورد اليوم ${AR(w.pct)}٪"><b>${AR(w.pct)}٪</b></span><span class="scr-k">ورد اليوم</span><span class="scr-src">${esc(w.done ? 'تمّ، تقبّل الله' : w.range || streakText(w.streak))}</span></article>
                <article class="scr-card c-daily">${dailyHtml(d)}</article>
                <article class="scr-card c-dhikr">${dhikrHtml(k)}</article>`;
        } else {
            // س٣ هادئة: الساعة كبيرة، وتحتها سطر واحد بيتبدّل بهدوء (الورد، الذكر، آية أو حديث اليوم)
            const lines = [wirdLine(w), k.text, `${d.text} (${d.src})`];
            body.innerHTML = `${clockHtml()}${dateHtml()}<p class="s3-line">${esc(lines[0])}</p>`;
            let i = 0;
            rotTimer = setInterval(() => {
                const l = body.querySelector('.s3-line'); if (!l) return;
                i = (i + 1) % lines.length;
                if (reduceMotion.matches) { l.textContent = lines[i]; return; }
                l.classList.add('is-fading');
                setTimeout(() => { l.textContent = lines[i]; l.classList.remove('is-fading'); }, 600);
            }, 9000);
        }
        document.querySelectorAll('#scr-style [data-ms]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ms === pref)));
        lastKey = contentKey();
    }
    // المحتوى بيتغيّر مع اليوم، والصباح/المساء، والذكر كل دقيقتين، وتقدّم الورد
    const contentKey = () => [dayIndex(), isMorning(), Math.floor(Date.now() / 120000), wird().pct, style()].join('|');
    function tick() {
        const c = clockParts(), m = c.time + c.period;
        if (m !== lastMinute) {
            lastMinute = m;
            if (contentKey() !== lastKey) render();
            else body.querySelectorAll('.scr-clock').forEach(x => { x.querySelector('.scr-time').textContent = c.time; x.querySelector('.scr-period').textContent = c.period; });
            // بالنمطين الغامقين: زحزحة بسيطة كل دقيقة حتى ما يعلّم الكلام الثابت عالشاشة
            if (style() !== '2') { root.style.setProperty('--scr-dx', Math.round(Math.random() * 12 - 6) + 'px'); root.style.setProperty('--scr-dy', Math.round(Math.random() * 10 - 5) + 'px'); }
        }
    }

    // ---------- الفتح والإغلاق ----------
    async function open() {
        if (!root.hidden) return;
        root.hidden = false;
        document.body.classList.add('screen-open');
        lastMinute = '';
        render(); tick();
        if (!content) loadContent().then(() => { if (!root.hidden) render(); });
        clearInterval(timer); timer = setInterval(tick, 5000);
        KeepAwake.on('screen');
        Immersive.enter(root, { onClose: close, hideAfter: 3000 });
        // ملء الشاشة لو المتصفح بيسمح (الجوال بيخفي شريط الحالة، والتلفزيون والكمبيوتر بيصيروا متل اللوحة)
        try { if (document.documentElement.requestFullscreen && !document.fullscreenElement) { await document.documentElement.requestFullscreen(); usedFs = true; } } catch (e) { usedFs = false; }
        setTimeout(() => $('scr-close')?.focus({ preventScroll: true }), 80);
    }
    function close(fromPop = false) {
        if (root.hidden) return;
        root.hidden = true;
        document.body.classList.remove('screen-open');
        clearInterval(timer); clearInterval(rotTimer);
        KeepAwake.off('screen');
        Immersive.exit(root, fromPop === true);
        if (usedFs && document.fullscreenElement) document.exitFullscreen().catch(() => {});
        usedFs = false;
    }
    function setStyle(v) {
        pref = v;
        try { localStorage.setItem(KEY, v); } catch (e) {}
        render(); Immersive.show(root);
    }

    function init() {
        if (!root) return;
        $('scr-close')?.addEventListener('click', () => close());
        document.querySelectorAll('#scr-style [data-ms]').forEach(b => b.addEventListener('click', () => setStyle(b.dataset.ms)));
        document.querySelectorAll('[data-open-screen]').forEach(b => b.addEventListener('click', open));
        Immersive.bindTap(root, root);
        // ريموت التلفزيون والكيبورد: أي زر بيطلّع الأدوات، و Esc بيطلع
        document.addEventListener('keydown', e => {
            if (root.hidden) return;
            if (e.key === 'Escape') { e.preventDefault(); close(); return; }
            Immersive.show(root);
        });
        document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && usedFs && !root.hidden) { usedFs = false; close(); } });
        document.addEventListener('visibilitychange', () => { if (!root.hidden && document.visibilityState === 'visible') { lastMinute = ''; tick(); } });
        matchMedia('(pointer: coarse)').addEventListener?.('change', () => { if (!root.hidden && pref === 'auto') render(); });
    }
    return { init, open, close };
})();
