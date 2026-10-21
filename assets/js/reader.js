/* =====================================================================
 * مُذكّر — reader.js
 * القراءة الحرة بملء الشاشة (الإصدار ١٤: ص٣ ع١ ط٣ ش٢ ل١ إ٢ إ٣ إ٩ — والإصدار ١٥: مصحف المدينة وصفحتين):
 *   - فوق: إغلاق، البحث، العلامات، و«تنسيق المصحف»
 *     (العرض: مصحف المدينة (mushaf.js، متل الطبعة) / نصي / مصوّر، الصفحات: تلقائي / صفحة / صفحتين،
 *      الخط وحجمه وألوان التجويد — في النصي فقط — والمظهر والإضاءة الدافئة)
 *   - تحت: شريط عائم واحد للتقليب، ورقم الصفحة بيفتح «الانتقال» (السور، الأجزاء، الأحزاب وأرباعها)
 *   - الصفحة ورقة مصحف مزخرفة: اسم السورة والجزء والحزب فوق، «۞» عند كل ربع، و«۝» برقم الآية والصفحة
 *   - النص يُرسم آية آية: الضغط المطوّل على آية يفتح أدواتها (التفسير، النسخ، المشاركة، العلامات…)
 *   - التنقل بالأسهم والسحب، والتكبير بإصبعين في الوضع القرآني
 * يعتمد على quran-tools.js (QSheet, Tajweed, AyahSheet, QuranMarks, QuranSearch, AyahStore).
 * ===================================================================== */

// 5. وضع القراءة (ملء الشاشة)
const Reader = (() => {
    const $ = id => document.getElementById(id);
    const KEY = 'mudhakkir-reader', TOTAL = 604;
    const st = { page: 1, mode: 'mushaf', spread: 'auto', theme: 'auto', size: 30, font: 'amiri', tajweed: false, warm: 'auto' };
    try { Object.assign(st, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
    // الإصدار ١٥: العرض الأساسي صار «مصحف المدينة» (متل الطبعة). يلي كان على النصي بينقل له مرة وحدة، وبيقدر يرجع من «تنسيق المصحف»
    if (st.v !== 16) { if (st.mode === 'text') st.mode = 'mushaf'; st.v = 16; }
    if (!['mushaf', 'text', 'image'].includes(st.mode)) st.mode = 'mushaf';
    if (!['auto', 'one', 'two'].includes(st.spread)) st.spread = 'auto';
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
    const root = $('reader'), stage = $('reader-stage');
    const ar = n => Number(n).toLocaleString('ar-EG');
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let token = 0, usedFs = false, current = null, pendingFlash = null, suppressTap = false, turnDir = 0;
    const pad = n => String(n).padStart(3, '0');
    const CDN = n => `https://cdn.jsdelivr.net/gh/GovarJabbar/Quran-PNG@master/${pad(n)}.png`;
    const RAW = n => `https://raw.githubusercontent.com/GovarJabbar/Quran-PNG/master/${pad(n)}.png`;
    const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt !== undefined) n.textContent = txt; return n; };
    const msg = t => el('p', 'rd-msg', t);
    // معاينة «تنسيق المصحف» (البسملة بصيغة التجويد)
    const PREVIEW_TAJWEED = 'بِسْمِ [h:1[ٱ]للَّهِ [h:2[ٱ][l[ل]رَّحْمَ[n[ـٰ]نِ [h:3[ٱ][l[ل]رَّح[p[ِي]مِ';

    // حجم الخط: يُطبَّق فورًا دون إعادة تحميل الصفحة، مع الحفاظ على موضع القراءة
    const sizeMax = () => (innerWidth < 700 ? 46 : 56);
    function setSize(n) {
        st.size = Math.max(18, Math.min(sizeMax(), Math.round(n)));
        save();
        $('rd-size-val').textContent = st.size.toLocaleString('ar-EG');
        paintPreview();
        const boxes = stage.querySelectorAll('.rd-text');
        if (!boxes.length) return;
        const ratio = stage.scrollHeight > stage.clientHeight ? stage.scrollTop / (stage.scrollHeight - stage.clientHeight) : 0;
        boxes.forEach(box => { box.style.fontSize = st.size + 'px'; });
        stage.scrollTop = ratio * (stage.scrollHeight - stage.clientHeight);
        fitSoon();
    }

    // ضبط السطور متل المصحف: النص مضبوط من الطرفين، وأي سطر بيطلع فيه فراغ أكبر من ضعف المسافة العادية
    // بنحطّ بآخره فاصل سطر، فبيصطف لليمين بدل ما تتمدد الفراغات. بينعاد مع كل تغيير بالحجم أو العرض أو الخط.
    function fitLines() {
        if (root.hidden) return;
        if (st.mode === 'mushaf') return fitMushaf();
        stage.querySelectorAll('.rd-text:not(.rd-skeleton)').forEach(fitBox);
    }
    function fitBox(box) {
        box.querySelectorAll('br.jbr').forEach(b => { const p = b.parentNode; b.remove(); p.normalize(); });
        const fs = parseFloat(getComputedStyle(box).fontSize), limit = fs * .62, r = document.createRange();
        box.querySelectorAll('p').forEach(p => {
            const frags = [], tw = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
            let node;
            while ((node = tw.nextNode())) {
                const re = /\S+/g; let m;
                while ((m = re.exec(node.data))) {
                    r.setStart(node, m.index); r.setEnd(node, m.index + m[0].length);
                    const b = r.getBoundingClientRect(); if (!b.width) continue; // كل مستطيلات الكلمة سوا (الأقواس ﴿﴾ بتنرسم قطع)
                    frags.push({ node, end: m.index + m[0].length, l: b.left, rr: b.right, cy: (b.top + b.bottom) / 2 });
                }
            }
            const lines = []; let cur = null;
            frags.forEach(f => { if (!cur || Math.abs(f.cy - cur.cy) > fs * .8) { cur = { cy: f.cy, items: [] }; lines.push(cur); } cur.items.push(f); });
            const ends = [];
            lines.slice(0, -1).forEach(L => {
                let gap = 0;
                for (let i = 1; i < L.items.length; i++) gap = Math.max(gap, L.items[i - 1].l - L.items[i].rr);
                if (gap > limit) ends.push(L.items[L.items.length - 1]);
            });
            // من الآخر للأول حتى ما تتغير مواضع الكلمات يلي قبل
            ends.reverse().forEach(f => { r.setStart(f.node, f.end); r.collapse(true); const br = el('br', 'jbr'); r.insertNode(br); });
        });
    }
    let fitTimer = 0;
    const fitSoon = (ms = 120) => { clearTimeout(fitTimer); fitTimer = setTimeout(fitLines, ms); };

    // ---------- الإصدار ١٥: صفحة وحدة أو صفحتين متقابلتين متل المصحف المفتوح ----------
    // «تلقائي»: صفحتين لما الشاشة عريضة (كمبيوتر، تابلت بالعرض)، وصفحة وحدة عالجوال
    const isSpread = () => st.spread === 'two' || (st.spread === 'auto' && stage.clientWidth >= 900 && stage.clientWidth > stage.clientHeight * 1.2);
    // الصفحة الفردية يمين والزوجية شمال (متل المصحف: ١ و٢ متقابلتين)
    function spreadOf(n) {
        if (!isSpread()) return [n];
        const a = n % 2 ? n : n - 1;
        return a + 1 <= TOTAL ? [a, a + 1] : [a];
    }
    let shownSpread = [1];
    // المساحة المتاحة لكل صفحة من صفحات المصحف
    function pageBox(count) {
        const cs = getComputedStyle(stage);
        const w = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const h = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        const gap = count > 1 ? Math.min(24, w * .02) : 0;
        return { w: (w - gap) / count, h };
    }
    function fitMushaf() {
        const cards = [...stage.querySelectorAll('.qp:not(.qp-skeleton)')];
        if (!cards.length) return;
        // صفحتين: نفس الحجم للتنتين (الأصغر) حتى يبينوا متل كتاب مفتوح
        const box = pageBox(cards.length);
        const sizes = cards.map(c => Mushaf.fit(c, box));
        if (cards.length > 1) {
            const fs = Math.min(...sizes); cards.forEach(c => Mushaf.fit(c, box, fs));
            const w = Math.max(...cards.map(c => parseFloat(c.style.width) || 0)); // نفس العرض للصفحتين
            cards.forEach(c => { c.style.width = w + 'px'; });
        }
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
        // الإضاءة الدافئة: بالليل (حسب وقت الشمس) أو دائمًا
        const night = typeof Atmosphere !== 'undefined' && Atmosphere.phaseAt() === 'night';
        root.toggleAttribute('data-warm', st.warm === 'on' || (st.warm === 'auto' && night));
        document.querySelectorAll('[data-warm]').forEach(b => { if (b !== root) b.classList.toggle('active', b.dataset.warm === st.warm); });
        document.querySelectorAll('[data-rt]').forEach(b => b.classList.toggle('active', b.dataset.rt === st.theme));
        document.querySelectorAll('#reader-mode [data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === st.mode));
        document.querySelectorAll('#reader-font [data-font]').forEach(b => b.classList.toggle('active', b.dataset.font === st.font));
        document.querySelectorAll('#reader-spread [data-spread]').forEach(b => b.classList.toggle('active', b.dataset.spread === st.spread));
        // الخط وحجمه والتجويد تظهر في العرض النصي فقط
        $('lay-text-only').hidden = st.mode !== 'text';
        $('lay-image-note').hidden = st.mode === 'text';
        const note = $('lay-image-note');
        if (note) note.textContent = st.mode === 'mushaf'
            ? 'مصحف المدينة: الصفحة متل الطبعة بالضبط وبتاخد حجمها من الشاشة. الخط وحجمه وألوان التجويد بالعرض النصي.'
            : 'الخط وحجمه وألوان التجويد متاحة في العرض النصي.';
        $('rd-tajweed').checked = !!st.tajweed;
        paintPreview();
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
        all[0].scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        all.forEach(sp => sp.classList.add('is-flash'));
        setTimeout(() => all.forEach(sp => sp.classList.remove('is-flash')), 2800);
    }

    // ل١: الصفحة الجديدة بتدخل من جهة التقليب (التالية من الشمال، السابقة من اليمين)
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
    // الشريط العائم: رقم الصفحة (أو الصفحتين)، والسورة والجزء
    function paintBar(pages, ayahs) {
        const n = pages[0];
        $('rd-page-no').textContent = pages.map(ar).join('–');
        const s = ayahs ? ayahs[0].surah.number : QuranData.surahAtPage(n);
        $('rd-where').textContent = `${surahName(s)} · الجزء ${ar(QuranData.juzOfPage(n))}`;
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
            const sk = el('div', st.mode === 'mushaf' ? 'qp qp-skeleton' : 'rd-text rd-skeleton'); sk.setAttribute('aria-label', 'جارٍ تحميل الصفحة');
            for (let i = 0; i < (st.mode === 'mushaf' ? 15 : 11); i++) sk.append(el('i', 'sk-line'));
            return sk;
        }), pages);
    }

    async function render() {
        const my = ++token, pages = spreadOf(st.page);
        shownSpread = pages;
        paintBar(pages);
        stage.scrollTop = 0;
        current = null;
        if (st.mode === 'image') {
            show(pages.map(n => {
                const img = el('img', 'rd-img'); img.alt = 'صفحة ' + n; img.src = CDN(n);
                const sheet = el('div', 'rd-sheet'); sheet.dataset.page = n; sheet.append(img);
                img.onerror = () => { if (!img.dataset.fb) { img.dataset.fb = '1'; img.src = RAW(n); } };
                return sheet;
            }), pages);
            const next = pages[pages.length - 1] + 1;
            if (next <= TOTAL) new Image().src = CDN(next);
            return;
        }
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
                current = { n: pages[0], pages };
                afterRender(pages, my);
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
        current = { n: pages[0], pages, ayahs: data[0][0] };
        paintBar(pages, data[0][0]);
        fitLines();
        afterRender(pages, my);
    }
    function afterRender(pages, my) {
        paintMarks();
        if (pendingFlash) { const k = pendingFlash; pendingFlash = null; requestAnimationFrame(() => flash(k)); setTimeout(() => flash(k), 120); }
        const next = pages[pages.length - 1] + 1;
        if (next <= TOTAL) {
            if (st.mode === 'mushaf') { Mushaf.prefetch(next); if (pages.length > 1) Mushaf.prefetch(next + 1); }
            else getPage(next).catch(() => {});
        }
    }

    // ط٣: ورقة مصحف مزخرفة (العرض النصي)؛ فوقها اسم السورة والجزء والحزب، وتحتها رقم الصفحة بعلامة «۝»
    function textPage(n, ayahs, tj) {
        const box = el('div', 'rd-text'); box.style.fontSize = st.size + 'px';
        box.dataset.font = st.font; box.dataset.page = n;
        box.classList.toggle('has-tajweed', !!tj);
        const head = el('div', 'rd-head'); head.setAttribute('aria-hidden', 'true');
        head.append(el('span', '', 'سورة ' + surahName(ayahs[0].surah.number)), el('span', '', `الجزء ${ar(QuranData.juzOfPage(n))} · الحزب ${ar(QuranData.hizbOfPage(n))}`));
        box.append(head);
        let para = null;
        ayahs.forEach((a, i) => {
            if (a.numberInSurah === 1) {
                box.append(el('div', 'rd-surah', 'سورة ' + surahName(a.surah.number)));
                if (QuranData.hasBasmalaHeader(a)) box.append(el('div', 'rd-basmala', QuranData.BASMALA));
                para = null;
            }
            if (!para) { para = el('p'); box.append(para); }
            // «۞» عند أول كل ربع حزب (إلا أول المصحف)
            const q = QuranData.quarterAt(a.surah.number, a.numberInSurah);
            if (q > 0) {
                const mk = el('span', 'rd-hizb' + (q % 4 ? '' : ' is-hizb'), '۞');
                const label = q % 4 ? `${['', 'ربع', 'نصف', 'ثلاثة أرباع'][q % 4]} الحزب ${ar(Math.floor(q / 4) + 1)}` : `بداية الحزب ${ar(q / 4 + 1)}`;
                mk.title = label; mk.setAttribute('aria-label', label);
                para.append(mk, document.createTextNode(' '));
            }
            // كل آية في عنصر مستقل ليعمل الضغط المطوّل والتمييز والتجويد
            const sp = el('span', 'ayah'); sp.dataset.k = `${a.surah.number}:${a.numberInSurah}`; sp.dataset.i = i;
            const t = el('span', 'ayah-text');
            const row = tj && tj[i];
            if (row && row.n === a.numberInSurah && row.s === a.surah.number) t.innerHTML = Tajweed.ayahHtml(row, a);
            else t.textContent = QuranData.verseText(a);
            // ع١: علامة نهاية الآية متل المصحف «۝» والرقم جوّاها، بمسافة ما بتنكسر حتى ما تنفصل عن آخر كلمة
            const num = el('span', 'ayah-num', QuranData.endMark(a.numberInSurah)); num.setAttribute('aria-label', 'الآية ' + ar(a.numberInSurah));
            sp.append(t, document.createTextNode(' '), num);
            para.append(sp, document.createTextNode(' '));
        });
        const foot = el('div', 'rd-foot'); foot.append(el('span', 'rd-pno', QuranData.endMark(n))); foot.setAttribute('aria-label', 'صفحة ' + ar(n));
        box.append(foot);
        return box;
    }

    let advanceHook = null;
    function goTo(n, sequential = false, flashKey = null) {
        const prev = shownSpread;
        n = Math.max(1, Math.min(TOTAL, parseInt(n, 10) || 1));
        turnDir = Math.sign(n - st.page);
        pendingFlash = flashKey;
        if (flashKey && st.mode === 'image') { st.mode = 'mushaf'; applyTheme(); } // الإضاءة تحتاج نص (مصحف المدينة أو النصي)
        // الصفحة المطلوبة معروضة أصلًا (صفحة أو ضمن الصفحتين): منضوّي الآية بس
        if (flashKey && current && prev.includes(n) && st.mode !== 'image') { st.page = n; save(); pendingFlash = null; flash(flashKey); return; }
        st.page = n; save(); render(); updateResume();
        // تقدّم الورد: كل صفحة قرأها قبل ما يقلّب للي بعدها
        if (sequential && advanceHook && n === prev[prev.length - 1] + 1) prev.forEach(p => advanceHook(p));
    }
    // التالي/السابق: صفحة، أو صفحتين بالمصحف المفتوح
    const nextPage = () => { const n = shownSpread[shownSpread.length - 1] + 1; if (n <= TOTAL) goTo(n, true); };
    const prevPage = () => { const n = shownSpread[0] - 1; if (n >= 1) goTo(n); };
    function updateResume() { const r = $('reader-resume'); if (r) r.textContent = 'متابعة من صفحة ' + st.page.toLocaleString('ar-EG'); }

    // ملء الشاشة دون شريط التنقل؛ الأدوات تختفي بعد لحظات وتظهر بضغطة على الصفحة
    async function enter() {
        if (!root.hidden) return;
        root.hidden = false; document.body.classList.add('reader-open');
        Immersive.enter(root, { onClose: close, hideAfter: 2500 });
        KeepAwake.on('reader'); // إ٣: الشاشة ما بتطفي وقت القراءة
        turnDir = 0; applyTheme(); render();
        try { if (window.matchMedia('(min-width: 701px)').matches && document.documentElement.requestFullscreen) { await document.documentElement.requestFullscreen(); usedFs = true; } } catch (e) { usedFs = false; }
    }
    function close(fromPop = false) {
        if (root.hidden) return;
        QSheet.close();
        root.hidden = true; document.body.classList.remove('reader-open');
        KeepAwake.off('reader');
        Immersive.exit(root, fromPop === true);
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        usedFs = false;
    }

    // ---------- إ٢: الانتقال (السور، الأجزاء، الأحزاب وأرباعها، ورقم الصفحة) — كله من بيانات محلية بلا نت ----------
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
        const curSurah = current && current.ayahs ? current.ayahs[0].surah.number : QuranData.surahAtPage(st.page);
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
            // الإضاءة على أول آية (ما منغيّر العرض المصوّر)
            goTo(Number(b.dataset.p), false, st.mode !== 'image' && !/:1$/.test(b.dataset.k) ? b.dataset.k : null);
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
            onChange: paintMarks,
            onClose: () => group.forEach(x => x.classList.remove('is-selected'))
        });
    }
    let lpTimer = 0, lpStart = null;
    const cancelPress = () => { clearTimeout(lpTimer); lpStart = null; };
    stage.addEventListener('pointerdown', e => {
        if (st.mode === 'image' || (e.pointerType === 'mouse' && e.button !== 0)) return;
        const sp = e.target.closest('.ayah, .qw'); if (!sp) return;
        lpStart = { x: e.clientX, y: e.clientY };
        clearTimeout(lpTimer);
        lpTimer = setTimeout(() => { lpStart = null; suppressTap = true; moved = true; openAyah(sp); }, 480);
    });
    stage.addEventListener('pointermove', e => { if (lpStart && Math.hypot(e.clientX - lpStart.x, e.clientY - lpStart.y) > 10) cancelPress(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => stage.addEventListener(t, cancelPress));
    stage.addEventListener('scroll', cancelPress, { passive: true });
    stage.addEventListener('contextmenu', e => {
        const sp = e.target.closest('.ayah, .qw');
        if (!sp || st.mode === 'image') return;
        e.preventDefault(); cancelPress(); suppressTap = true; openAyah(sp);
    });

    // ---------- الشريط ولوحة «تنسيق المصحف» ----------
    $('reader-enter')?.addEventListener('click', enter);
    $('reader-close')?.addEventListener('click', () => close());
    $('rd-next')?.addEventListener('click', nextPage);
    $('rd-prev')?.addEventListener('click', prevPage);
    $('rd-goto')?.addEventListener('click', openGoto);
    $('rd-layout-btn')?.addEventListener('click', () => { applyTheme(); QSheet.open('تنسيق المصحف', $('rd-layout')); });
    $('rd-marks-btn')?.addEventListener('click', () => QSheet.open('العلامات والملاحظات', QuranMarks.view((p, k) => goTo(p, false, k))));
    $('rd-search-btn')?.addEventListener('click', () => QSheet.open('البحث في القرآن', QuranSearch.view((p, k) => goTo(p, false, k))));
    document.querySelectorAll('#reader-mode [data-mode]').forEach(b => b.addEventListener('click', () => { st.mode = b.dataset.mode; save(); applyTheme(); render(); }));
    document.querySelectorAll('#reader-spread [data-spread]').forEach(b => b.addEventListener('click', () => { st.spread = b.dataset.spread; save(); applyTheme(); if (!root.hidden) render(); }));
    document.querySelectorAll('#reader-font [data-font]').forEach(b => b.addEventListener('click', () => {
        st.font = b.dataset.font; save(); applyTheme();
        stage.querySelectorAll('.rd-text').forEach(box => { box.dataset.font = st.font; });
        document.fonts?.ready.then(() => fitSoon(0)); fitSoon(60);
    }));
    // تغيير حجم الشاشة: «تلقائي» ممكن يتحول بين صفحة وصفحتين، وإلا منعيد ضبط الحجم بس
    addEventListener('resize', () => {
        if (root.hidden) return;
        clearTimeout(fitTimer);
        fitTimer = setTimeout(() => { if (spreadOf(st.page).length !== shownSpread.length) render(); else fitLines(); }, 160);
    });
    document.fonts?.addEventListener?.('loadingdone', () => fitSoon(0));
    $('rd-tajweed')?.addEventListener('change', e => { st.tajweed = e.target.checked; save(); paintPreview(); if (st.mode === 'text') render(); });
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
        if (e.key === 'ArrowLeft') nextPage();
        else if (e.key === 'ArrowRight') prevPage();
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
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx > 0 ? nextPage : prevPage)();
    }, { passive: true });
    // ضغطة قصيرة = إظهار/إخفاء الأدوات، أما بعد الضغط المطوّل فلا
    Immersive.bindTap(root, stage, () => { if (suppressTap) { suppressTap = false; return true; } return moved; });
    matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (st.theme === 'auto') applyTheme(); });

    st.size = Math.max(18, Math.min(sizeMax(), Number(st.size) || 30));
    if (!['amiri', 'scheherazade', 'naskh'].includes(st.font)) st.font = 'amiri';
    $('rd-size-val').textContent = st.size.toLocaleString('ar-EG');
    if (!['auto', 'on', 'off'].includes(st.warm)) st.warm = 'auto';
    applyTheme(); updateResume();
    // soft: لا نغيّر العرض المصوّر من أجل الإضاءة (مثل فتح سورة الكهف)
    function openAt(page, flashKey = null, soft = false) {
        if (soft && st.mode === 'image') flashKey = null;
        if (!root.hidden) return goTo(page, false, flashKey); // مفتوح أصلًا: ننتقل فقط
        st.page = Math.max(1, Math.min(TOTAL, parseInt(page, 10) || 1));
        if (flashKey && st.mode === 'image') st.mode = 'mushaf'; // الإضاءة تحتاج نص (مصحف المدينة أو النصي)
        pendingFlash = flashKey;
        save(); updateResume(); enter();
    }
    return { enter, close, openAt, goTo, setAdvanceHook: fn => { advanceHook = fn; } };
})();
