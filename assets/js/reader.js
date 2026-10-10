/* =====================================================================
 * مُذكّر — reader.js
 * القراءة الحرة بملء الشاشة:
 *   - الشريط: إغلاق، السورة، البحث، العلامات، و«تنسيق المصحف»
 *     (العرض قرآني/مصوّر، الخط، حجم الخط، ألوان التجويد — في القرآني فقط — والمظهر)
 *   - النص يُرسم آية آية: الضغط المطوّل على آية يفتح أدواتها (التفسير، النسخ، المشاركة، العلامات…)
 *   - التنقل بالأسهم والسحب، والتكبير بإصبعين في الوضع القرآني
 * يعتمد على quran-tools.js (QSheet, Tajweed, AyahSheet, QuranMarks, QuranSearch, AyahStore).
 * ===================================================================== */

// 5. وضع القراءة (ملء الشاشة)
const Reader = (() => {
    const $ = id => document.getElementById(id);
    const KEY = 'mudhakkir-reader', TOTAL = 604;
    const st = { page: 1, mode: 'text', theme: 'auto', size: 30, font: 'amiri', tajweed: false };
    try { Object.assign(st, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
    const root = $('reader'), stage = $('reader-stage');
    let token = 0, usedFs = false, current = null, pendingFlash = null, suppressTap = false;
    const pad = n => String(n).padStart(3, '0');
    const CDN = n => `https://cdn.jsdelivr.net/gh/GovarJabbar/Quran-PNG@master/${pad(n)}.png`;
    const RAW = n => `https://raw.githubusercontent.com/GovarJabbar/Quran-PNG/master/${pad(n)}.png`;
    const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt !== undefined) n.textContent = txt; return n; };
    const msg = t => el('p', 'rd-msg', t);
    // معاينة «تنسيق المصحف» (البسملة بصيغة التجويد)
    const PREVIEW_TAJWEED = 'بِسْمِ [h:1[ٱ]للَّهِ [h:2[ٱ][l[ل]رَّحْمَ[n[ـٰ]نِ [h:3[ٱ][l[ل]رَّح[p[ِي]مِ';

    // حجم الخط: يُطبَّق فورًا دون إعادة تحميل الصفحة، مع الحفاظ على موضع القراءة
    const sizeMax = () => (innerWidth < 700 ? 46 : 56);
    function isLarge() { return st.size * 8.5 > Math.min(innerWidth, 720); } // أقل من ~٨ كلمات في السطر
    function setSize(n) {
        st.size = Math.max(18, Math.min(sizeMax(), Math.round(n)));
        save();
        $('rd-size-val').textContent = st.size.toLocaleString('ar-EG');
        paintPreview();
        const box = stage.querySelector('.rd-text');
        if (!box) return;
        const ratio = stage.scrollHeight > stage.clientHeight ? stage.scrollTop / (stage.scrollHeight - stage.clientHeight) : 0;
        box.style.fontSize = st.size + 'px';
        box.classList.toggle('is-large', isLarge());
        stage.scrollTop = ratio * (stage.scrollHeight - stage.clientHeight);
    }

    function paintPreview() {
        const p = $('lay-preview'); if (!p) return;
        p.dataset.font = st.font;
        p.style.fontSize = Math.min(st.size, 34) + 'px';
        p.classList.toggle('has-tajweed', st.tajweed);
        p.innerHTML = st.tajweed ? Tajweed.toHtml(Tajweed.parse(PREVIEW_TAJWEED)) : 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
    }
    function applyTheme() {
        // «تلقائي» يتبع مظهر التطبيق نفسه (فاتح/داكن/حسب الجهاز/حسب الشمس)
        const dark = st.theme === 'dark' || (st.theme === 'auto' && document.body.classList.contains('dark-mode'));
        root.dataset.theme = st.theme === 'sepia' ? 'sepia' : dark ? 'dark' : 'light';
        document.querySelectorAll('[data-rt]').forEach(b => b.classList.toggle('active', b.dataset.rt === st.theme));
        document.querySelectorAll('#reader-mode [data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === st.mode));
        document.querySelectorAll('#reader-font [data-font]').forEach(b => b.classList.toggle('active', b.dataset.font === st.font));
        // الخط وحجمه والتجويد تظهر في العرض القرآني فقط
        $('lay-text-only').hidden = st.mode !== 'text';
        $('lay-image-note').hidden = st.mode === 'text';
        $('rd-tajweed').checked = !!st.tajweed;
        paintPreview();
    }

    const getPage = n => QuranData.getPage(n);

    // شكل الآيات المعلَّمة (علامة، تمييز، ملاحظة)
    function paintMarks() {
        stage.querySelectorAll('.ayah').forEach(sp => {
            const k = sp.dataset.k, c = AyahStore.color(k);
            sp.classList.toggle('is-bm', AyahStore.isBookmarked(k));
            sp.classList.toggle('has-note', !!AyahStore.note(k));
            ['gold', 'green', 'blue', 'rose'].forEach(x => sp.classList.toggle('hl-' + x, c === x));
        });
    }
    function flash(key) {
        const sp = stage.querySelector(`.ayah[data-k="${key}"]`);
        if (!sp) return;
        sp.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        sp.classList.add('is-flash');
        setTimeout(() => sp.classList.remove('is-flash'), 2800);
    }

    async function render() {
        const my = ++token, n = st.page;
        $('rd-page').value = n;
        stage.scrollTop = 0;
        current = null;
        if (st.mode === 'image') {
            const img = el('img', 'rd-img'); img.alt = 'صفحة ' + n; img.src = CDN(n);
            const sheet = el('div', 'rd-sheet'); sheet.append(img);
            img.onerror = () => { if (!img.dataset.fb) { img.dataset.fb = '1'; img.src = RAW(n); } };
            stage.replaceChildren(sheet);
            if (n < TOTAL) new Image().src = CDN(n + 1);
            return;
        }
        stage.replaceChildren(msg('جارٍ التحميل…'));
        let ayahs, tj = null;
        try {
            [ayahs, tj] = await Promise.all([getPage(n), st.tajweed ? Tajweed.getPage(n).catch(() => null) : null]);
        } catch (e) { if (my === token) stage.replaceChildren(msg('تعذر تحميل الصفحة. تحقق من الاتصال بالإنترنت.')); return; }
        if (my !== token) return;
        if (st.tajweed && !tj) Toast.show('تعذّر تحميل ألوان التجويد لهذه الصفحة');
        const box = el('div', 'rd-text'); box.style.fontSize = st.size + 'px';
        box.dataset.font = st.font;
        box.classList.toggle('is-large', isLarge());
        box.classList.toggle('has-tajweed', !!tj);
        let para = null;
        ayahs.forEach((a, i) => {
            if (a.numberInSurah === 1) {
                box.append(el('div', 'rd-surah', a.surah.name));
                if (QuranData.hasBasmalaHeader(a)) box.append(el('div', 'rd-basmala', QuranData.BASMALA));
                para = null;
            }
            if (!para) { para = el('p'); box.append(para); }
            // كل آية في عنصر مستقل ليعمل الضغط المطوّل والتمييز والتجويد
            const sp = el('span', 'ayah'); sp.dataset.k = `${a.surah.number}:${a.numberInSurah}`; sp.dataset.i = i;
            const t = el('span', 'ayah-text');
            const row = tj && tj[i];
            if (row && row.n === a.numberInSurah && row.s === a.surah.number) t.innerHTML = Tajweed.ayahHtml(row, a);
            else t.textContent = QuranData.verseText(a);
            sp.append(t, document.createTextNode(' '), el('span', 'ayah-num', '﴿' + a.numberInSurah.toLocaleString('ar-EG') + '﴾'));
            para.append(sp, document.createTextNode(' '));
        });
        stage.replaceChildren(box);
        current = { n, ayahs };
        paintMarks();
        if (pendingFlash) { const k = pendingFlash; pendingFlash = null; requestAnimationFrame(() => flash(k)); setTimeout(() => flash(k), 120); }
        if (n < TOTAL) getPage(n + 1).catch(() => {});
        const sel = $('reader-surah'); if (sel.options.length > 1) sel.value = ayahs[0].surah.number;
    }

    let advanceHook = null;
    function goTo(n, sequential = false, flashKey = null) {
        const prev = st.page;
        n = Math.max(1, Math.min(TOTAL, parseInt(n, 10) || 1));
        pendingFlash = flashKey;
        if (flashKey && st.mode !== 'text') { st.mode = 'text'; applyTheme(); } // الإضاءة تحتاج العرض القرآني
        if (n === prev && flashKey && current && current.n === n) { st.page = n; pendingFlash = null; flash(flashKey); return; }
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
        QSheet.close();
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

    // ---------- أدوات الآية: ضغط مطوّل (أو زر الفأرة الأيمن) ----------
    function openAyah(sp) {
        if (!current) return;
        const ay = current.ayahs[Number(sp.dataset.i)];
        if (!ay) return;
        sp.classList.add('is-selected');
        try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {}
        Immersive.show(root);
        AyahSheet.open({ s: ay.surah.number, a: ay.numberInSurah, page: st.page, text: QuranData.verseText(ay) }, {
            onChange: paintMarks,
            onClose: () => sp.classList.remove('is-selected')
        });
    }
    let lpTimer = 0, lpStart = null;
    const cancelPress = () => { clearTimeout(lpTimer); lpStart = null; };
    stage.addEventListener('pointerdown', e => {
        if (st.mode !== 'text' || (e.pointerType === 'mouse' && e.button !== 0)) return;
        const sp = e.target.closest('.ayah'); if (!sp) return;
        lpStart = { x: e.clientX, y: e.clientY };
        clearTimeout(lpTimer);
        lpTimer = setTimeout(() => { lpStart = null; suppressTap = true; moved = true; openAyah(sp); }, 480);
    });
    stage.addEventListener('pointermove', e => { if (lpStart && Math.hypot(e.clientX - lpStart.x, e.clientY - lpStart.y) > 10) cancelPress(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => stage.addEventListener(t, cancelPress));
    stage.addEventListener('scroll', cancelPress, { passive: true });
    stage.addEventListener('contextmenu', e => {
        const sp = e.target.closest('.ayah');
        if (!sp || st.mode !== 'text') return;
        e.preventDefault(); cancelPress(); suppressTap = true; openAyah(sp);
    });

    // ---------- الشريط ولوحة «تنسيق المصحف» ----------
    $('reader-enter')?.addEventListener('click', enter);
    $('reader-close')?.addEventListener('click', () => close());
    $('rd-next')?.addEventListener('click', () => goTo(st.page + 1, true));
    $('rd-prev')?.addEventListener('click', () => goTo(st.page - 1));
    $('rd-page')?.addEventListener('change', e => goTo(e.target.value));
    $('reader-surah')?.addEventListener('change', async e => {
        try { const j = await (await fetch(`https://api.alquran.cloud/v1/ayah/${e.target.value}:1`)).json(); goTo(j.data.page); } catch (err) {}
    });
    $('rd-layout-btn')?.addEventListener('click', () => { applyTheme(); QSheet.open('تنسيق المصحف', $('rd-layout')); });
    $('rd-marks-btn')?.addEventListener('click', () => QSheet.open('العلامات والملاحظات', QuranMarks.view((p, k) => goTo(p, false, k))));
    $('rd-search-btn')?.addEventListener('click', () => QSheet.open('البحث في القرآن', QuranSearch.view((p, k) => goTo(p, false, k))));
    document.querySelectorAll('#reader-mode [data-mode]').forEach(b => b.addEventListener('click', () => { st.mode = b.dataset.mode; save(); applyTheme(); render(); }));
    document.querySelectorAll('#reader-font [data-font]').forEach(b => b.addEventListener('click', () => {
        st.font = b.dataset.font; save(); applyTheme();
        const box = stage.querySelector('.rd-text'); if (box) box.dataset.font = st.font;
    }));
    $('rd-tajweed')?.addEventListener('change', e => { st.tajweed = e.target.checked; save(); paintPreview(); if (st.mode === 'text') render(); });
    $('rd-tajweed-legend-btn')?.addEventListener('click', e => {
        const lg = $('rd-tajweed-legend');
        if (!lg.childElementCount) lg.append(Tajweed.legendNode());
        lg.hidden = !lg.hidden;
        e.currentTarget.setAttribute('aria-expanded', String(!lg.hidden));
    });
    document.querySelectorAll('[data-rt]').forEach(b => b.addEventListener('click', () => { st.theme = b.dataset.rt; save(); applyTheme(); }));
    document.querySelectorAll('#reader-size [data-d]').forEach(b => b.addEventListener('click', () => setSize(st.size + Number(b.dataset.d))));
    // تكبير/تصغير الخط بإصبعين في الوضع النصي
    let pinch0 = 0, size0 = 0;
    const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    stage.addEventListener('touchstart', e => { if (e.touches.length === 2 && st.mode === 'text') { cancelPress(); pinch0 = dist(e.touches); size0 = st.size; } }, { passive: true });
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
        if (root.hidden || QSheet.isOpen() || document.body.classList.contains('ask-open') || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
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
    // ضغطة قصيرة = إظهار/إخفاء الأدوات، أما بعد الضغط المطوّل فلا
    Immersive.bindTap(root, stage, () => { if (suppressTap) { suppressTap = false; return true; } return moved; });
    matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (st.theme === 'auto') applyTheme(); });

    st.size = Math.max(18, Math.min(sizeMax(), Number(st.size) || 30));
    if (!['amiri', 'scheherazade', 'naskh'].includes(st.font)) st.font = 'amiri';
    $('rd-size-val').textContent = st.size.toLocaleString('ar-EG');
    applyTheme(); updateResume(); loadSurahs();
    // soft: لا نغيّر العرض المصوّر من أجل الإضاءة (مثل فتح سورة الكهف)
    function openAt(page, flashKey = null, soft = false) {
        if (soft && st.mode !== 'text') flashKey = null;
        if (!root.hidden) return goTo(page, false, flashKey); // مفتوح أصلًا: ننتقل فقط
        st.page = Math.max(1, Math.min(TOTAL, parseInt(page, 10) || 1));
        if (flashKey && st.mode !== 'text') st.mode = 'text'; // الإضاءة تحتاج العرض القرآني
        pendingFlash = flashKey;
        save(); updateResume(); enter();
    }
    return { enter, close, openAt, goTo, setAdvanceHook: fn => { advanceHook = fn; } };
})();
