/* =====================================================================
 * مُذكّر — reader.js
 * المصحف بملء الشاشة (الإصدار ١٦، معرض ٩: م١ ب٣ ل١ ن٢ ش٢ — متل تطبيق آية):
 *   - العرضين: «مصحف المدينة» (mushaf.js، متل الطبعة بالضبط) و«نصي» (كل آية بسطرها وبينهن فاصل رفيع)
 *   - الصفحة بملء الشاشة بلا مربع: فوق السورة والساعة والجزء، وتحت ربع الحزب ورقم الصفحة
 *   - صفحة وحدة أو صفحتين متقابلتين متل المصحف المفتوح (تلقائي: صفحتين عالشاشة العريضة)
 *   - فوق: إغلاق، البحث، العلامات، و«تنسيق المصحف». تحت: «شريط الصفحات» بعرض الشاشة بثلاث أنماط
 *     (الصفحات، شريط التمرير، الفواصل) — الضغط المطوّل عليه بيغيّر النمط، والضغط على الرقم بيفتح «الانتقال»
 *   - الأدوات بتختفي بعد لحظات وبتطلع بضغطة عالصفحة. التقليب بالسحب أو الأسهم، مع «قلب ورقة خفيف»
 *   - الضغط المطوّل على آية بيفتح أدواتها (التفسير، النسخ، المشاركة، العلامات…)
 * يعتمد على mushaf.js و quran-tools.js (QSheet, Tajweed, AyahSheet, QuranMarks, QuranSearch, AyahStore).
 * ===================================================================== */

// 5. وضع القراءة (ملء الشاشة)
const Reader = (() => {
    const $ = id => document.getElementById(id);
    const KEY = 'mudhakkir-reader', TOTAL = 604;
    const st = { page: 1, mode: 'mushaf', spread: 'auto', pager: 'pages', theme: 'auto', size: 30, font: 'amiri', tajweed: false, warm: 'auto' };
    try { Object.assign(st, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
    // الإصدار ١٥: العرض الأساسي صار «مصحف المدينة» (متل الطبعة). يلي كان على النصي بينقل له مرة وحدة، وبيقدر يرجع من «تنسيق المصحف»
    if (st.v !== 16) { if (st.mode === 'text') st.mode = 'mushaf'; st.v = 16; }
    // «مصوّر» انشال: بقي مصحف المدينة والنصي
    if (!['mushaf', 'text'].includes(st.mode)) st.mode = 'mushaf';
    if (!['auto', 'one', 'two'].includes(st.spread)) st.spread = 'auto';
    if (!['pages', 'slide', 'marks'].includes(st.pager)) st.pager = 'pages';
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
    const root = $('reader'), stage = $('reader-stage');
    const ar = n => Number(n).toLocaleString('ar-EG');
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let token = 0, usedFs = false, current = null, pendingFlash = null, suppressTap = false, turnDir = 0, clockTimer = 0;
    const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt !== undefined) n.textContent = txt; return n; };
    const msg = t => el('p', 'rd-msg', t);
    // معاينة «تنسيق المصحف» (البسملة بصيغة التجويد)
    const PREVIEW_TAJWEED = 'بِسْمِ [h:1[ٱ]للَّهِ [h:2[ٱ][l[ل]رَّحْمَ[n[ـٰ]نِ [h:3[ٱ][l[ل]رَّح[p[ِي]مِ';

    // حجم الخط (النصي): يُطبَّق فورًا دون إعادة تحميل الصفحة، مع الحفاظ على موضع القراءة
    const sizeMax = () => (innerWidth < 700 ? 46 : 56);
    function setSize(n) {
        st.size = Math.max(18, Math.min(sizeMax(), Math.round(n)));
        save();
        $('rd-size-val').textContent = st.size.toLocaleString('ar-EG');
        paintPreview();
        const bodies = stage.querySelectorAll('.tp-body');
        if (!bodies.length) return;
        const ratio = stage.scrollHeight > stage.clientHeight ? stage.scrollTop / (stage.scrollHeight - stage.clientHeight) : 0;
        bodies.forEach(b => { b.style.fontSize = st.size + 'px'; });
        stage.scrollTop = ratio * (stage.scrollHeight - stage.clientHeight);
    }

    // ---------- صفحة وحدة أو صفحتين متقابلتين متل المصحف المفتوح ----------
    // «تلقائي»: صفحتين لما الشاشة عريضة (كمبيوتر، تابلت بالعرض)، وصفحة وحدة عالجوال
    const isSpread = () => st.spread === 'two' || (st.spread === 'auto' && stage.clientWidth >= 900 && stage.clientWidth > stage.clientHeight * 1.2);
    // الصفحة الفردية يمين والزوجية شمال (متل المصحف: ١ و٢ متقابلتين)
    function spreadOf(n) {
        if (!isSpread()) return [n];
        const a = n % 2 ? n : n - 1;
        return a + 1 <= TOTAL ? [a, a + 1] : [a];
    }
    let shownSpread = [1];
    // مصحف المدينة: الكلام بياخد عرض الصفحة والسطور بتتوزّع على طولها؛ والصفحتين بنفس الحجم ونفس عرض السطور
    function fitMushaf() {
        const cards = [...stage.querySelectorAll('.qp:not(.qp-skeleton)')];
        if (!cards.length) return;
        const sizes = cards.map(c => Mushaf.fit(c, c.clientWidth));
        if (cards.length > 1) {
            const fs = Math.min(...sizes);
            cards.forEach(c => Mushaf.fit(c, c.clientWidth, fs));
            const w = Math.max(...cards.map(c => parseFloat(c.style.getPropertyValue('--qw')) || 0));
            cards.forEach(c => { c.style.setProperty('--qw', w + 'px'); Mushaf.paintBanners(c); });
        }
    }
    const refit = () => { if (root.hidden) return; if (st.mode === 'mushaf') fitMushaf(); else Mushaf.paintBanners(stage); };
    let fitTimer = 0;
    const refitSoon = (ms = 120) => { clearTimeout(fitTimer); fitTimer = setTimeout(refit, ms); };

    function paintPreview() {
        const p = $('lay-preview'); if (!p) return;
        p.dataset.font = st.font;
        p.style.fontSize = Math.min(st.size, 34) + 'px';
        p.classList.toggle('has-tajweed', st.tajweed);
        p.innerHTML = st.tajweed ? Tajweed.toHtml(Tajweed.parse(PREVIEW_TAJWEED)) : 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
    }
    const activate = (sel, attr, val) => document.querySelectorAll(sel).forEach(b => b.classList.toggle('active', b.dataset[attr] === val));
    function applyTheme() {
        // «تلقائي» يتبع مظهر التطبيق نفسه (فاتح/داكن/حسب الجهاز/حسب الشمس)
        const dark = st.theme === 'dark' || (st.theme === 'auto' && document.body.classList.contains('dark-mode'));
        root.dataset.theme = st.theme === 'sepia' ? 'sepia' : dark ? 'dark' : 'light';
        // الإضاءة الدافئة: بالليل (حسب وقت الشمس) أو دائمًا
        const night = typeof Atmosphere !== 'undefined' && Atmosphere.phaseAt() === 'night';
        root.toggleAttribute('data-warm', st.warm === 'on' || (st.warm === 'auto' && night));
        document.querySelectorAll('#reader-warm [data-warm]').forEach(b => b.classList.toggle('active', b.dataset.warm === st.warm));
        activate('[data-rt]', 'rt', st.theme);
        activate('#reader-mode [data-mode]', 'mode', st.mode);
        activate('#reader-font [data-font]', 'font', st.font);
        activate('#reader-spread [data-spread]', 'spread', st.spread);
        activate('#reader-pager [data-pager]', 'pager', st.pager);
        // الخط وحجمه والتجويد بالعرض النصي بس
        $('lay-text-only').hidden = st.mode !== 'text';
        $('lay-mushaf-note').hidden = st.mode !== 'mushaf';
        $('rd-tajweed').checked = !!st.tajweed;
        paintPreview();
        // إطار اسم السورة بألوان المظهر الجديد
        if (!root.hidden) Mushaf.paintBanners(stage);
    }

    const getPage = n => QuranData.getPage(n);

    // شكل الآيات المعلَّمة (علامة، تمييز، ملاحظة) — بالنصي الآية عنصر واحد، وبمصحف المدينة كل كلمة لحالها
    function paintMarks() {
        const memo = new Map();
        stage.querySelectorAll('.ayah, .qw').forEach(sp => {
            const k = sp.dataset.k;
            if (!memo.has(k)) memo.set(k, { c: AyahStore.color(k), bm: AyahStore.isBookmarked(k), note: !!AyahStore.note(k) });
            const m = memo.get(k);
            sp.classList.toggle('is-bm', m.bm);
            sp.classList.toggle('has-note', m.note);
            ['gold', 'green', 'blue', 'rose'].forEach(x => sp.classList.toggle('hl-' + x, m.c === x));
        });
    }
    function flash(key) {
        const all = stage.querySelectorAll(`.ayah[data-k="${key}"], .qw[data-k="${key}"]`);
        if (!all.length) return;
        all[0].scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
        all.forEach(sp => sp.classList.add('is-flash'));
        setTimeout(() => all.forEach(sp => sp.classList.remove('is-flash')), 2800);
    }

    // ح٥ «قلب ورقة خفيف»: الصفحة بتنفتح من عند الكعب (التالية من اليمين، السابقة من الشمال)
    function animateTurn(node) {
        const d = turnDir; turnDir = 0;
        if (!d || reduceMotion.matches) return;
        node.classList.add(d > 0 ? 'turn-next' : 'turn-prev');
        // بس حركة الغلاف نفسه (مو حركات الكلمات جوّاه)، ومع احتياط إذا ما وصل animationend (نافذة مخفية مثلًا)
        const done = () => { clearTimeout(t); node.classList.remove('turn-next', 'turn-prev'); node.removeEventListener('animationend', end); };
        const end = e => { if (e.target === node) done(); };
        const t = setTimeout(done, 600);
        node.addEventListener('animationend', end);
    }

    // الصفحة (أو الصفحتين) داخل غلاف واحد بيتحرّك مع التقليب
    function show(nodes, pages) {
        const wrap = el('div', 'rd-spread' + (pages.length > 1 ? ' is-two' : ''));
        wrap.append(...nodes);
        stage.replaceChildren(wrap);
        stage.dataset.mode = st.mode;
        animateTurn(wrap);
        return wrap;
    }
    // هيكل تحميل بشكل الصفحة بدل نص «جارٍ التحميل»
    function skeleton(pages) {
        show(pages.map(() => {
            const sk = el('div', st.mode === 'mushaf' ? 'qp qp-skeleton' : 'tp tp-skeleton'); sk.setAttribute('aria-label', 'جارٍ تحميل الصفحة');
            for (let i = 0; i < (st.mode === 'mushaf' ? 15 : 9); i++) sk.append(el('i', 'sk-line'));
            return sk;
        }), pages);
    }

    async function render() {
        const my = ++token, pages = spreadOf(st.page);
        shownSpread = pages;
        paintPager(pages);
        stage.scrollTop = 0;
        current = null;
        // الهيكل بيطلع بس إذا التحميل طوّل (الصفحة المحفوظة بتطلع فورًا بلا ومضة)
        const dir = turnDir; turnDir = 0;
        const skTimer = setTimeout(() => { if (my === token) skeleton(pages); }, 140);
        const ready = () => { clearTimeout(skTimer); turnDir = dir; };
        if (st.mode === 'mushaf') {
            // مصحف المدينة؛ إذا ما قدر يحمّل (أول مرة بلا نت) منعرض النص بداله
            try {
                const cards = await Promise.all(pages.map(p => Mushaf.page(p)));
                if (my !== token) return;
                ready();
                show(cards, pages);
                fitMushaf();
                current = { n: pages[0], pages, s: Number(cards[0].dataset.surah) || 0 };
                paintPager(pages, current.s);
                afterRender(pages);
                return;
            } catch (e) {
                if (my !== token) return;
                Toast.show('مصحف المدينة بدّه نت أول مرة لهالصفحة، عرضنالك النص');
            }
        }
        let data;
        try {
            data = await Promise.all(pages.map(n => Promise.all([getPage(n), st.tajweed ? Tajweed.getPage(n).catch(() => null) : null])));
        } catch (e) { if (my === token) { clearTimeout(skTimer); stage.replaceChildren(msg('تعذر تحميل الصفحة. تحقق من الاتصال بالإنترنت.')); } return; }
        if (my !== token) return;
        if (st.tajweed && data.some(([, tj]) => !tj)) Toast.show('تعذّر تحميل ألوان التجويد لهذه الصفحة');
        ready();
        show(data.map(([ayahs, tj], i) => textPage(pages[i], ayahs, tj)), pages);
        stage.dataset.mode = 'text';
        current = { n: pages[0], pages, ayahs: data[0][0], s: data[0][0][0].surah.number };
        paintPager(pages, current.s);
        Mushaf.paintBanners(stage);
        afterRender(pages);
    }
    function afterRender(pages) {
        paintMarks();
        if (pendingFlash) { const k = pendingFlash; pendingFlash = null; requestAnimationFrame(() => flash(k)); setTimeout(() => flash(k), 120); }
        const next = pages[pages.length - 1] + 1;
        if (next <= TOTAL) {
            if (st.mode === 'mushaf') { Mushaf.prefetch(next); if (pages.length > 1) Mushaf.prefetch(next + 1); }
            else getPage(next).catch(() => {});
        }
    }

    // ن٢: العرض النصي بملء الشاشة؛ نفس راس الصفحة وتذييلها، وإطار السورة الزمرّدي، وكل آية بسطرها وبينهن فاصل رفيع
    function textPage(n, ayahs, tj) {
        const page = el('article', 'tp');
        page.dataset.page = n; page.dataset.font = st.font;
        page.classList.toggle('has-tajweed', !!tj);
        const body = el('div', 'tp-body'); body.style.fontSize = st.size + 'px';
        ayahs.forEach((a, i) => {
            if (a.numberInSurah === 1) {
                body.append(Mushaf.surahBanner(a.surah.number));
                if (QuranData.hasBasmalaHeader(a)) body.append(el('p', 'tp-basmala', QuranData.BASMALA));
            }
            const p = el('p', 'tp-a');
            // «۞» عند أول كل ربع حزب (إلا أول المصحف)
            const q = QuranData.quarterAt(a.surah.number, a.numberInSurah);
            if (q > 0) {
                const mk = el('span', 'rd-hizb' + (q % 4 ? '' : ' is-hizb'), '۞');
                const label = q % 4 ? `${['', 'ربع', 'نصف', 'ثلاثة أرباع'][q % 4]} الحزب ${ar(Math.floor(q / 4) + 1)}` : `بداية الحزب ${ar(q / 4 + 1)}`;
                mk.title = label; mk.setAttribute('aria-label', label);
                p.append(mk, document.createTextNode(' '));
            }
            // كل آية في عنصر مستقل ليعمل الضغط المطوّل والتمييز والتجويد
            const sp = el('span', 'ayah'); sp.dataset.k = `${a.surah.number}:${a.numberInSurah}`; sp.dataset.i = i;
            const t = el('span', 'ayah-text');
            const row = tj && tj[i];
            if (row && row.n === a.numberInSurah && row.s === a.surah.number) t.innerHTML = Tajweed.ayahHtml(row, a);
            else t.textContent = QuranData.verseText(a);
            // علامة نهاية الآية متل المصحف «۝» والرقم جوّاها، بمسافة ما بتنكسر حتى ما تنفصل عن آخر كلمة
            const num = el('span', 'ayah-num', QuranData.endMark(a.numberInSurah)); num.setAttribute('aria-label', 'الآية ' + ar(a.numberInSurah));
            sp.append(t, document.createTextNode(' '), num);
            p.append(sp);
            body.append(p);
        });
        page.append(Mushaf.pageTop(n, ayahs[0].surah.number), body, Mushaf.pageFoot(n));
        return page;
    }

    let advanceHook = null;
    function goTo(n, sequential = false, flashKey = null) {
        const prev = shownSpread;
        n = Math.max(1, Math.min(TOTAL, parseInt(n, 10) || 1));
        turnDir = Math.sign(n - st.page);
        pendingFlash = flashKey;
        // الصفحة المطلوبة معروضة أصلًا (صفحة أو ضمن الصفحتين): منضوّي الآية بس
        if (current && prev.includes(n)) {
            st.page = n; save(); pendingFlash = null; turnDir = 0;
            if (flashKey) flash(flashKey);
            return;
        }
        st.page = n; save(); render(); updateResume();
        // تقدّم الورد: كل صفحة قرأها قبل ما يقلّب للي بعدها
        if (sequential && advanceHook && n === prev[prev.length - 1] + 1) prev.forEach(p => advanceHook(p));
    }
    // التالي/السابق: صفحة، أو صفحتين بالمصحف المفتوح
    const nextPage = () => { const n = shownSpread[shownSpread.length - 1] + 1; if (n <= TOTAL) goTo(n, true); };
    const prevPage = () => { const n = shownSpread[0] - 1; if (n >= 1) goTo(n); };
    function updateResume() { const r = $('reader-resume'); if (r) r.textContent = 'متابعة من صفحة ' + st.page.toLocaleString('ar-EG'); }

    // ---------- ش٢: «شريط الصفحات» تحت بعرض الشاشة ----------
    // الصفحات: كل صفحات المصحف شرائح صغيرة، بتسحبها وبتوقف عالصفحة يلي بالنص · شريط التمرير · الفواصل: آياتك المعلَّمة
    const pager = $('rd-pager'), pagerBody = $('rd-pager-body');
    const SURAH_STARTS = new Set(QuranData.SURAH_START_PAGES);
    let strip = null, stripTimer = 0, stripFrame = 0, stripQuiet = 0;
    const PAGER_NAMES = { pages: 'الصفحات', slide: 'شريط التمرير', marks: 'الفواصل' };
    const whereText = (n, s) => `${surahName(s || QuranData.surahAtPage(n))} · الجزء ${ar(QuranData.juzOfPage(n))}`;
    function paintLabel(pages, s) {
        $('rd-page-no').textContent = 'صفحة ' + pages.map(ar).join('–');
        $('rd-where').textContent = whereText(pages[0], s);
    }
    function paintPager(pages, s) {
        paintLabel(pages, s);
        if (strip) {
            strip.querySelectorAll('.pg-tile.on').forEach(t => t.classList.remove('on'));
            pages.forEach(p => strip.children[p - 1]?.classList.add('on'));
            centerTile(pages[0]);
        }
        const range = pagerBody.querySelector('.pg-range');
        if (range) range.value = pages[0];
    }
    // الشريحة يلي بالنص: بنحسبها من مكان أول شريحتين (كلهن بنفس العرض)، أخف من elementFromPoint
    function centeredPage() {
        const a = strip.children[0].getBoundingClientRect(), b = strip.children[1].getBoundingClientRect();
        const pitch = a.left - b.left; if (!pitch) return 0;
        const r = strip.getBoundingClientRect(), cx = r.left + r.width / 2;
        return Math.max(1, Math.min(TOTAL, 1 + Math.round((a.left + a.width / 2 - cx) / pitch)));
    }
    function centerTile(p, smooth = false) {
        const t = strip && strip.children[p - 1]; if (!t || root.hidden) return;
        const r = strip.getBoundingClientRect(), tr = t.getBoundingClientRect();
        const delta = (tr.left + tr.width / 2) - (r.left + r.width / 2);
        if (Math.abs(delta) < 1) return;
        const glide = smooth && Math.abs(delta) < 1600 && !reduceMotion.matches;
        // تمرير منّا (مو من المستخدم): ما بيطلّع الأدوات وما بينقل صفحة
        stripQuiet = performance.now() + (glide ? 700 : 120);
        strip.scrollBy({ left: delta, behavior: glide ? 'smooth' : 'auto' });
    }
    function onStripScroll() {
        if (performance.now() < stripQuiet) return;
        Immersive.show(root);
        cancelAnimationFrame(stripFrame);
        // أثناء السحب: الرقم فوق بيتبع الشريحة يلي بالنص
        stripFrame = requestAnimationFrame(() => {
            const p = centeredPage(); if (!p) return;
            strip.querySelector('.pg-tile.is-c')?.classList.remove('is-c');
            strip.children[p - 1].classList.add('is-c');
            paintLabel([p]);
        });
        // وقف السحب: منروح عالصفحة (إلا إذا هي نفسها المعروضة)
        clearTimeout(stripTimer);
        stripTimer = setTimeout(() => {
            const p = centeredPage();
            strip.querySelector('.pg-tile.is-c')?.classList.remove('is-c');
            if (p && !shownSpread.includes(p)) goTo(p, false);
            else paintLabel(shownSpread, current && current.s);
        }, 260);
    }
    function marksNode() {
        const list = AyahStore.list();
        if (!list.length) return el('p', 'pg-empty', 'ما في فواصل بعد. اضغط مطوّلًا على أي آية وحطّ علامة، بتطلع هون.');
        const box = el('div', 'pg-marks');
        list.slice(0, 40).forEach(e => {
            const [s, a] = e.key.split(':').map(Number);
            const p = e.p || QuranData.surahStartPage(s);
            const b = el('button', 'pg-mark'); b.type = 'button';
            const kind = e.kinds.includes('bookmark') ? 'k-bm' : e.kinds.includes('note') ? 'k-note' : 'hl-' + AyahStore.color(e.key);
            b.append(el('i', kind), `${surahName(s)} ${ar(a)}، ص${ar(p)}`); // «·» جنب الرقم بيبيّن متل الصفر
            b.addEventListener('click', () => goTo(p, false, e.key));
            box.append(b);
        });
        return box;
    }
    function buildPager() {
        pager.dataset.style = st.pager;
        strip = null;
        let node;
        if (st.pager === 'pages') {
            node = strip = el('div', 'pg-strip');
            strip.setAttribute('aria-hidden', 'true'); // للوحة المفاتيح والقارئ: الأسهم و«الانتقال»
            const frag = document.createDocumentFragment();
            for (let p = 1; p <= TOTAL; p++) { const t = el('span', 'pg-tile' + (SURAH_STARTS.has(p) ? ' is-surah' : '')); frag.append(t); }
            strip.append(frag);
            strip.addEventListener('scroll', onStripScroll, { passive: true });
            strip.addEventListener('click', e => {
                const t = e.target.closest('.pg-tile'); if (!t) return;
                const p = [...strip.children].indexOf(t) + 1;
                clearTimeout(stripTimer);
                if (!shownSpread.includes(p)) goTo(p, false);
            });
        } else if (st.pager === 'slide') {
            node = el('div', 'pg-slide');
            const range = el('input', 'pg-range');
            Object.assign(range, { type: 'range', min: 1, max: TOTAL, step: 1, value: st.page });
            range.dir = 'rtl'; range.setAttribute('aria-label', 'رقم الصفحة');
            range.addEventListener('input', () => { Immersive.show(root); paintLabel([Number(range.value)]); });
            range.addEventListener('change', () => goTo(Number(range.value), false));
            node.append(range);
        } else node = marksNode();
        pagerBody.replaceChildren(node);
        paintPager(shownSpread, current && current.s);
    }
    function setPager(style) { st.pager = style; save(); applyTheme(); buildPager(); }
    // اختيار نمط الشريط (بالضغط المطوّل عليه)
    function pagerMenu() {
        const v = el('div', 'pg-menu');
        const grid = el('div', 'pg-menu-grid');
        Object.entries(PAGER_NAMES).forEach(([k, name]) => {
            const b = el('button', 'pg-opt'); b.type = 'button';
            b.setAttribute('aria-pressed', String(st.pager === k));
            const th = el('span', 'pg-thumb is-' + k); th.setAttribute('aria-hidden', 'true');
            th.innerHTML = k === 'slide' ? '<i></i>' : '<i></i><i class="c"></i><i></i>';
            b.append(th, name);
            b.addEventListener('click', () => { setPager(k); QSheet.close(); });
            grid.append(b);
        });
        v.append(grid, el('p', 'pg-menu-hint', 'لتغيّر النمط بسرعة: اضغط مطوّلًا على الشريط. وموجود كمان بـ«تنسيق المصحف».'));
        QSheet.open('نمط شريط الصفحات', v);
    }
    let pgPress = 0, pgStart = null;
    const pgCancel = () => { clearTimeout(pgPress); pgStart = null; };
    pager.addEventListener('pointerdown', e => {
        Immersive.show(root);
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (e.target.closest('#rd-goto, .pg-range')) return;
        pgStart = { x: e.clientX, y: e.clientY };
        clearTimeout(pgPress);
        pgPress = setTimeout(() => { pgStart = null; try { navigator.vibrate?.(12); } catch (err) {} pagerMenu(); }, 550);
    });
    pager.addEventListener('pointermove', e => { if (pgStart && Math.hypot(e.clientX - pgStart.x, e.clientY - pgStart.y) > 8) pgCancel(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => pager.addEventListener(t, pgCancel));
    pager.addEventListener('scroll', pgCancel, true);
    pager.addEventListener('contextmenu', e => { if (e.target.closest('#rd-goto')) return; e.preventDefault(); pgCancel(); pagerMenu(); });

    // ملء الشاشة دون شريط التنقل؛ الأدوات تختفي بعد لحظات وتظهر بضغطة على الصفحة
    async function enter() {
        if (!root.hidden) return;
        root.hidden = false; document.body.classList.add('reader-open');
        Immersive.enter(root, { onClose: close, hideAfter: 2500 });
        KeepAwake.on('reader'); // الشاشة ما بتطفي وقت القراءة
        turnDir = 0; applyTheme(); buildPager(); render();
        // الساعة براس الصفحة
        clearInterval(clockTimer); clockTimer = setInterval(() => Mushaf.tickClocks(stage), 30 * 1000);
        try { if (window.matchMedia('(min-width: 701px)').matches && document.documentElement.requestFullscreen) { await document.documentElement.requestFullscreen(); usedFs = true; } } catch (e) { usedFs = false; }
    }
    function close(fromPop = false) {
        if (root.hidden) return;
        QSheet.close();
        root.hidden = true; document.body.classList.remove('reader-open');
        clearInterval(clockTimer);
        KeepAwake.off('reader');
        Immersive.exit(root, fromPop === true);
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        usedFs = false;
    }

    // ---------- «الانتقال» (السور، الأجزاء، الأحزاب وأرباعها، ورقم الصفحة) — كله من بيانات محلية بلا نت ----------
    const GT_KEY = 'mudhakkir-reader-goto';
    const toLatin = s => String(s).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
    function gotoView() {
        const v = el('div', 'rd-goto-view');
        const form = el('form', 'gt-page');
        const input = el('input'); input.id = 'gt-page-in'; input.type = 'text'; input.inputMode = 'numeric'; input.placeholder = '١ – ٦٠٤'; input.setAttribute('aria-label', 'رقم الصفحة');
        const lab = el('label', '', 'رقم الصفحة'); lab.htmlFor = 'gt-page-in';
        const go = el('button', 'primary-button', 'انتقال'); go.type = 'submit';
        form.append(lab, input, go);
        form.addEventListener('submit', e => {
            e.preventDefault();
            const p = parseInt(toLatin(input.value), 10);
            if (p >= 1 && p <= TOTAL) { QSheet.close(); goTo(p); } else Toast.show('اكتب رقم صفحة من ١ إلى ٦٠٤');
        });
        const tabs = el('div', 'segmented gt-tabs'); tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', 'نوع الفهرس');
        const list = el('div', 'gt-list');
        let tab = 'surah';
        try { tab = localStorage.getItem(GT_KEY) || 'surah'; } catch (e) {}
        const curSurah = (current && current.s) || QuranData.surahAtPage(st.page);
        const curJuz = QuranData.juzOfPage(st.page), curHizb = QuranData.hizbOfPage(st.page);
        const row = (n, title, sub, p, k, on) => `<button type="button" class="gt-row${on ? ' is-on' : ''}" data-p="${p}" data-k="${k}"${on ? ' aria-current="true"' : ''}><span class="gt-n">${ar(n)}</span><span class="gt-t"><b>${title}</b><small>${sub}</small></span></button>`;
        const Q = QuranData.QUARTERS;
        function paint() {
            tabs.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.gt === tab));
            if (tab === 'surah') list.innerHTML = QuranData.SURAH_START_PAGES.map((p, i) => row(i + 1, surahName(i + 1), `صفحة ${ar(p)}`, p, `${i + 1}:1`, i + 1 === curSurah)).join('');
            else if (tab === 'juz') list.innerHTML = Array.from({ length: 30 }, (_, j) => { const q = Q[j * 8]; return row(j + 1, `الجزء ${ar(j + 1)}`, `${surahName(q[0])} ${ar(q[1])} · صفحة ${ar(q[2])}`, q[2], `${q[0]}:${q[1]}`, j + 1 === curJuz); }).join('');
            else list.innerHTML = Array.from({ length: 60 }, (_, h) => {
                const q = Q[h * 4];
                const parts = [1, 2, 3].map(x => { const r = Q[h * 4 + x]; return `<button type="button" class="gt-q" data-p="${r[2]}" data-k="${r[0]}:${r[1]}" aria-label="${['', 'ربع', 'نصف', 'ثلاثة أرباع'][x]} الحزب ${ar(h + 1)}: ${surahName(r[0])} ${ar(r[1])}">${['', '¼', '½', '¾'][x]}</button>`; }).join('');
                return `<div class="gt-hizb">${row(h + 1, `الحزب ${ar(h + 1)}`, `${surahName(q[0])} ${ar(q[1])} · صفحة ${ar(q[2])}`, q[2], `${q[0]}:${q[1]}`, h + 1 === curHizb)}<div class="gt-qs">${parts}</div></div>`;
            }).join('');
        }
        [['surah', 'السور'], ['juz', 'الأجزاء'], ['hizb', 'الأحزاب']].forEach(([k, t]) => { const b = el('button', '', t); b.type = 'button'; b.dataset.gt = k; tabs.append(b); });
        tabs.addEventListener('click', e => {
            const b = e.target.closest('[data-gt]'); if (!b) return;
            tab = b.dataset.gt; try { localStorage.setItem(GT_KEY, tab); } catch (err) {}
            paint(); list.querySelector('.is-on')?.scrollIntoView({ block: 'center' });
        });
        list.addEventListener('click', e => {
            const b = e.target.closest('[data-p]'); if (!b) return;
            QSheet.close();
            // الإضاءة على أول آية بالربع (أول السورة واضح لحاله)
            goTo(Number(b.dataset.p), false, !/:1$/.test(b.dataset.k) ? b.dataset.k : null);
        });
        paint();
        v.append(form, tabs, list);
        return v;
    }
    function openGoto() {
        const v = gotoView();
        QSheet.open('الانتقال في المصحف', v, { onShow: () => v.querySelector('.is-on')?.scrollIntoView({ block: 'center' }) });
    }

    // ---------- أدوات الآية: ضغط مطوّل (أو زر الفأرة الأيمن) ----------
    // بالنصي الآية عنصر واحد، وبمصحف المدينة كلماتها موزّعة على السطور (كلها عليها data-k)
    async function openAyah(sp) {
        const k = sp.dataset.k; if (!k) return;
        const [s, a] = k.split(':').map(Number);
        const page = Number(sp.closest('[data-page]')?.dataset.page) || st.page;
        const group = stage.querySelectorAll(`.ayah[data-k="${k}"], .qw[data-k="${k}"]`);
        group.forEach(x => x.classList.add('is-selected'));
        try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {}
        Immersive.show(root);
        // نص الآية (للنسخ والمشاركة) من بيانات المصحف النصية — محفوظة غالبًا
        let text = '';
        try { const ay = (await getPage(page)).find(x => x.surah.number === s && x.numberInSurah === a); if (ay) text = QuranData.verseText(ay); } catch (e) {}
        AyahSheet.open({ s, a, page, text }, {
            onChange: () => { paintMarks(); if (st.pager === 'marks') buildPager(); },
            onClose: () => group.forEach(x => x.classList.remove('is-selected'))
        });
    }
    let lpTimer = 0, lpStart = null;
    const cancelPress = () => { clearTimeout(lpTimer); lpStart = null; };
    stage.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const sp = e.target.closest('.ayah, .qw'); if (!sp) return;
        lpStart = { x: e.clientX, y: e.clientY };
        clearTimeout(lpTimer);
        lpTimer = setTimeout(() => { lpStart = null; suppressTap = true; moved = true; openAyah(sp); }, 480);
    });
    stage.addEventListener('pointermove', e => { if (lpStart && Math.hypot(e.clientX - lpStart.x, e.clientY - lpStart.y) > 10) cancelPress(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => stage.addEventListener(t, cancelPress));
    stage.addEventListener('scroll', cancelPress, { passive: true });
    stage.addEventListener('contextmenu', e => {
        const sp = e.target.closest('.ayah, .qw'); if (!sp) return;
        e.preventDefault(); cancelPress(); suppressTap = true; openAyah(sp);
    });

    // ---------- الأزرار ولوحة «تنسيق المصحف» ----------
    $('reader-enter')?.addEventListener('click', enter);
    $('reader-close')?.addEventListener('click', () => close());
    $('rd-goto')?.addEventListener('click', openGoto);
    $('rd-layout-btn')?.addEventListener('click', () => { applyTheme(); QSheet.open('تنسيق المصحف', $('rd-layout')); });
    $('rd-marks-btn')?.addEventListener('click', () => QSheet.open('العلامات والملاحظات', QuranMarks.view((p, k) => goTo(p, false, k))));
    $('rd-search-btn')?.addEventListener('click', () => QSheet.open('البحث في القرآن', QuranSearch.view((p, k) => goTo(p, false, k))));
    document.querySelectorAll('#reader-mode [data-mode]').forEach(b => b.addEventListener('click', () => { st.mode = b.dataset.mode; save(); applyTheme(); if (!root.hidden) render(); }));
    document.querySelectorAll('#reader-spread [data-spread]').forEach(b => b.addEventListener('click', () => { st.spread = b.dataset.spread; save(); applyTheme(); if (!root.hidden) render(); }));
    document.querySelectorAll('#reader-pager [data-pager]').forEach(b => b.addEventListener('click', () => setPager(b.dataset.pager)));
    document.querySelectorAll('#reader-font [data-font]').forEach(b => b.addEventListener('click', () => {
        st.font = b.dataset.font; save(); applyTheme();
        stage.querySelectorAll('.tp').forEach(p => { p.dataset.font = st.font; });
    }));
    // تغيير حجم الشاشة: «تلقائي» ممكن يتحول بين صفحة وصفحتين، وإلا منعيد ضبط الحجم بس
    addEventListener('resize', () => {
        if (root.hidden) return;
        clearTimeout(fitTimer);
        fitTimer = setTimeout(() => { if (spreadOf(st.page).length !== shownSpread.length) render(); else { refit(); paintPager(shownSpread, current && current.s); } }, 160);
    });
    document.fonts?.addEventListener?.('loadingdone', () => { if (st.mode === 'mushaf') refitSoon(0); });
    $('rd-tajweed')?.addEventListener('change', e => { st.tajweed = e.target.checked; save(); paintPreview(); if (st.mode === 'text' && !root.hidden) render(); });
    $('rd-tajweed-legend-btn')?.addEventListener('click', e => {
        const lg = $('rd-tajweed-legend');
        if (!lg.childElementCount) lg.append(Tajweed.legendNode());
        lg.hidden = !lg.hidden;
        e.currentTarget.setAttribute('aria-expanded', String(!lg.hidden));
    });
    document.querySelectorAll('[data-rt]').forEach(b => b.addEventListener('click', () => { st.theme = b.dataset.rt; save(); applyTheme(); }));
    document.querySelectorAll('#reader-warm [data-warm]').forEach(b => b.addEventListener('click', () => { st.warm = b.dataset.warm; save(); applyTheme(); }));
    // «بالليل»: منراجع كل ١٠ دقايق إذا صار ليل أو طلع الفجر
    setInterval(() => { if (!root.hidden && st.warm === 'auto') applyTheme(); }, 10 * 60 * 1000);
    document.querySelectorAll('#reader-size [data-d]').forEach(b => b.addEventListener('click', () => setSize(st.size + Number(b.dataset.d))));
    // تكبير/تصغير الخط بإصبعين في العرض النصي
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
        if (e.key === 'ArrowLeft') nextPage();
        else if (e.key === 'ArrowRight') prevPage();
        else if (e.key === 'Escape') close();
    });
    // السحب للتقليب (متل المصحف: لليمين = الصفحة التالية)
    let tx = 0, ty = 0, moved = false, multi = false;
    stage.addEventListener('touchstart', e => {
        if (e.touches.length === 1) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; moved = false; multi = false; }
        else multi = true; // إصبعان = تكبير، لا تقليب
    }, { passive: true });
    stage.addEventListener('touchend', e => {
        if (multi) { moved = true; if (!e.touches.length) multi = false; return; }
        const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) moved = true; // تمرير أو سحب، لا ضغطة
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx > 0 ? nextPage : prevPage)();
    }, { passive: true });
    // ضغطة قصيرة = إظهار/إخفاء الأدوات، أما بعد الضغط المطوّل فلا
    Immersive.bindTap(root, stage, () => { if (suppressTap) { suppressTap = false; return true; } return moved; });
    matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (st.theme === 'auto') applyTheme(); });

    st.size = Math.max(18, Math.min(sizeMax(), Number(st.size) || 30));
    if (!['amiri', 'scheherazade', 'naskh'].includes(st.font)) st.font = 'amiri';
    $('rd-size-val').textContent = st.size.toLocaleString('ar-EG');
    if (!['auto', 'on', 'off'].includes(st.warm)) st.warm = 'auto';
    save(); applyTheme(); updateResume();
    // flashKey: الآية يلي بتضوّي بعد الفتح (مثل فتح سورة الكهف). الوسيط الثالث باقي للتوافق
    function openAt(page, flashKey = null) {
        if (!root.hidden) return goTo(page, false, flashKey); // مفتوح أصلًا: ننتقل فقط
        st.page = Math.max(1, Math.min(TOTAL, parseInt(page, 10) || 1));
        pendingFlash = flashKey;
        save(); updateResume(); enter();
    }
    return { enter, close, openAt, goTo, setAdvanceHook: fn => { advanceHook = fn; } };
})();
