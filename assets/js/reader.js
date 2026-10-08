/* =====================================================================
 * مُذكّر — reader.js
 * القراءة الحرة بملء الشاشة: النصي والمصوّر، حجم الخط (والتكبير بإصبعين)، المظهر، والتنقل بين الصفحات.
 * يُحمَّل بالترتيب من index.html؛ الأجزاء تتشارك المتغيرات العامة فيما بينها.
 * ===================================================================== */

// 5. وضع القراءة (ملء الشاشة)
const Reader = (() => {
    const $ = id => document.getElementById(id);
    const KEY = 'mudhakkir-reader', TOTAL = 604;
    const st = { page: 1, mode: 'text', theme: 'auto', size: 30 };
    try { Object.assign(st, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
    const root = $('reader'), stage = $('reader-stage');
    let token = 0, usedFs = false;
    const pad = n => String(n).padStart(3, '0');
    const CDN = n => `https://cdn.jsdelivr.net/gh/GovarJabbar/Quran-PNG@master/${pad(n)}.png`;
    const RAW = n => `https://raw.githubusercontent.com/GovarJabbar/Quran-PNG/master/${pad(n)}.png`;
    const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt !== undefined) n.textContent = txt; return n; };
    const msg = t => el('p', 'rd-msg', t);

    // حجم الخط: يُطبَّق فورًا دون إعادة تحميل الصفحة، مع الحفاظ على موضع القراءة
    const sizeMax = () => (innerWidth < 700 ? 46 : 56);
    function isLarge() { return st.size * 8.5 > Math.min(innerWidth, 720); } // أقل من ~٨ كلمات في السطر
    function setSize(n) {
        st.size = Math.max(18, Math.min(sizeMax(), Math.round(n)));
        save();
        $('rd-size-val').textContent = st.size.toLocaleString('ar-EG');
        const box = stage.querySelector('.rd-text');
        if (!box) return;
        const ratio = stage.scrollHeight > stage.clientHeight ? stage.scrollTop / (stage.scrollHeight - stage.clientHeight) : 0;
        box.style.fontSize = st.size + 'px';
        box.classList.toggle('is-large', isLarge());
        stage.scrollTop = ratio * (stage.scrollHeight - stage.clientHeight);
    }

    function applyTheme() {
        // «تلقائي» يتبع مظهر التطبيق نفسه (فاتح/داكن/حسب الجهاز/حسب الشمس)
        const dark = st.theme === 'dark' || (st.theme === 'auto' && document.body.classList.contains('dark-mode'));
        root.dataset.theme = dark ? 'dark' : 'light';
        document.querySelectorAll('[data-rt]').forEach(b => b.classList.toggle('active', b.dataset.rt === st.theme));
        document.querySelectorAll('#reader-mode [data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === st.mode));
    }

    const getPage = n => QuranData.getPage(n);

    async function render() {
        const my = ++token, n = st.page;
        $('rd-page').value = n;
        stage.scrollTop = 0;
        if (st.mode === 'image') {
            const img = el('img', 'rd-img'); img.alt = 'صفحة ' + n; img.src = CDN(n);
            const sheet = el('div', 'rd-sheet'); sheet.append(img);
            img.onerror = () => { if (!img.dataset.fb) { img.dataset.fb = '1'; img.src = RAW(n); } };
            stage.replaceChildren(sheet);
            if (n < TOTAL) new Image().src = CDN(n + 1);
            return;
        }
        stage.replaceChildren(msg('جارٍ التحميل…'));
        let ayahs;
        try { ayahs = await getPage(n); } catch (e) { if (my === token) stage.replaceChildren(msg('تعذر تحميل الصفحة. تحقق من الاتصال بالإنترنت.')); return; }
        if (my !== token) return;
        const box = el('div', 'rd-text'); box.style.fontSize = st.size + 'px';
        box.classList.toggle('is-large', isLarge());
        let para = null;
        ayahs.forEach(a => {
            let text = a.text;
            if (a.numberInSurah === 1) {
                box.append(el('div', 'rd-surah', a.surah.name));
                if (a.surah.number !== 1 && a.surah.number !== 9) {
                    box.append(el('div', 'rd-basmala', QuranData.BASMALA));
                    text = QuranData.verseText(a);
                }
                para = null;
            }
            if (!para) { para = el('p'); para.style.margin = '0'; box.append(para); }
            para.append(text + ' ﴿' + a.numberInSurah.toLocaleString('ar-EG') + '﴾ ');
        });
        stage.replaceChildren(box);
        if (n < TOTAL) getPage(n + 1).catch(() => {});
        const sel = $('reader-surah'); if (sel.options.length > 1) sel.value = ayahs[0].surah.number;
    }

    let advanceHook = null;
    function goTo(n, sequential = false) {
        const prev = st.page;
        n = Math.max(1, Math.min(TOTAL, parseInt(n, 10) || 1));
        st.page = n; save(); render(); updateResume();
        if (sequential && n === prev + 1 && advanceHook) advanceHook(prev);
    }
    function updateResume() { const r = $('reader-resume'); if (r) r.textContent = 'متابعة من صفحة ' + st.page.toLocaleString('ar-EG'); }

    // ملء الشاشة دون شريط التنقل؛ الأدوات تختفي بعد لحظات وتظهر بضغطة على الصفحة
    async function enter() {
        if (!root.hidden) return;
        root.hidden = false; document.body.classList.add('reader-open');
        Immersive.enter(root, { onClose: close, hideAfter: 2500 });
        applyTheme(); render();
        try { if (window.matchMedia('(min-width: 701px)').matches && document.documentElement.requestFullscreen) { await document.documentElement.requestFullscreen(); usedFs = true; } } catch (e) { usedFs = false; }
    }
    function close(fromPop = false) {
        if (root.hidden) return;
        root.hidden = true; document.body.classList.remove('reader-open');
        Immersive.exit(root, fromPop === true);
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        usedFs = false;
    }

    async function loadSurahs() {
        try {
            const json = await (await fetch('https://api.alquran.cloud/v1/surah')).json();
            const sel = $('reader-surah'); sel.replaceChildren();
            json.data.forEach(s => sel.append(new Option(s.number + '. ' + s.name, s.number)));
        } catch (e) { /* القائمة اختيارية، ويمكن التنقل بالصفحات */ }
    }

    $('reader-enter')?.addEventListener('click', enter);
    $('reader-close')?.addEventListener('click', () => close());
    $('rd-next')?.addEventListener('click', () => goTo(st.page + 1, true));
    $('rd-prev')?.addEventListener('click', () => goTo(st.page - 1));
    $('rd-page')?.addEventListener('change', e => goTo(e.target.value));
    $('reader-surah')?.addEventListener('change', async e => {
        try { const j = await (await fetch(`https://api.alquran.cloud/v1/ayah/${e.target.value}:1`)).json(); goTo(j.data.page); } catch (err) {}
    });
    document.querySelectorAll('#reader-mode [data-mode]').forEach(b => b.addEventListener('click', () => { st.mode = b.dataset.mode; save(); applyTheme(); render(); }));
    document.querySelectorAll('[data-rt]').forEach(b => b.addEventListener('click', () => { st.theme = b.dataset.rt; save(); applyTheme(); }));
    document.querySelectorAll('#reader-size [data-d]').forEach(b => b.addEventListener('click', () => setSize(st.size + Number(b.dataset.d))));
    // تكبير/تصغير الخط بإصبعين في الوضع النصي
    let pinch0 = 0, size0 = 0;
    const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    stage.addEventListener('touchstart', e => { if (e.touches.length === 2 && st.mode === 'text') { pinch0 = dist(e.touches); size0 = st.size; } }, { passive: true });
    stage.addEventListener('touchmove', e => {
        if (e.touches.length !== 2 || !pinch0) return;
        e.preventDefault();
        setSize(size0 * dist(e.touches) / pinch0);
    }, { passive: false });
    stage.addEventListener('touchend', e => { if (e.touches.length < 2 && pinch0) { pinch0 = 0; moved = true; } }, { passive: true });
    // مظهر التطبيق تغيّر ← نحدّث القراءة إن كانت على «تلقائي»
    new MutationObserver(() => { if (st.theme === 'auto') applyTheme(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && usedFs && !root.hidden) close(); });
    document.addEventListener('keydown', e => {
        if (root.hidden || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
        if (e.key === 'ArrowLeft') goTo(st.page + 1, true);
        else if (e.key === 'ArrowRight') goTo(st.page - 1);
        else if (e.key === 'Escape') close();
    });
    let tx = 0, ty = 0, moved = false, multi = false;
    stage.addEventListener('touchstart', e => {
        if (e.touches.length === 1) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; moved = false; multi = false; }
        else multi = true; // إصبعان = تكبير، لا تقليب
    }, { passive: true });
    stage.addEventListener('touchend', e => {
        if (multi) { moved = true; if (!e.touches.length) multi = false; return; }
        const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) moved = true; // تمرير أو سحب، لا ضغطة
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) goTo(st.page + (dx > 0 ? 1 : -1), dx > 0);
    }, { passive: true });
    Immersive.bindTap(root, stage, () => moved);
    matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (st.theme === 'auto') applyTheme(); });

    st.size = Math.max(18, Math.min(sizeMax(), Number(st.size) || 30));
    $('rd-size-val').textContent = st.size.toLocaleString('ar-EG');
    applyTheme(); updateResume(); loadSurahs();
    function openAt(page) {
        st.page = Math.max(1, Math.min(TOTAL, parseInt(page, 10) || 1));
        save(); updateResume(); enter();
    }
    return { enter, close, openAt, setAdvanceHook: fn => { advanceHook = fn; } };
})();
