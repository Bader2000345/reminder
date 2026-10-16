/* =====================================================================
 * مُذكّر — reader.js
 * القراءة الحرة بملء الشاشة (الإصدار ١٤: ص٣ ع١ ط٣ ش٢ ل١ إ٢ إ٣ إ٩):
 *   - فوق: إغلاق، البحث، العلامات، و«تنسيق المصحف»
 *     (العرض قرآني/مصوّر، الخط، حجم الخط، ألوان التجويد — في القرآني فقط — والمظهر والإضاءة الدافئة)
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
    const st = { page: 1, mode: 'text', theme: 'auto', size: 30, font: 'amiri', tajweed: false, warm: 'auto' };
    try { Object.assign(st, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
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
        const box = stage.querySelector('.rd-text');
        if (!box) return;
        const ratio = stage.scrollHeight > stage.clientHeight ? stage.scrollTop / (stage.scrollHeight - stage.clientHeight) : 0;
        box.style.fontSize = st.size + 'px';
        stage.scrollTop = ratio * (stage.scrollHeight - stage.clientHeight);
        fitSoon();
    }

    // ضبط السطور متل المصحف: النص مضبوط من الطرفين، وأي سطر بيطلع فيه فراغ أكبر من ضعف المسافة العادية
    // بنحطّ بآخره فاصل سطر، فبيصطف لليمين بدل ما تتمدد الفراغات. بينعاد مع كل تغيير بالحجم أو العرض أو الخط.
    function fitLines() {
        const box = stage.querySelector('.rd-text:not(.rd-skeleton)');
        if (!box || root.hidden) return;
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

    // ل١: الصفحة الجديدة بتدخل من جهة التقليب (التالية من الشمال، السابقة من اليمين)
    function animateTurn(node) {
        const d = turnDir; turnDir = 0;
        if (!d || reduceMotion.matches) return;
        node.classList.add(d > 0 ? 'turn-next' : 'turn-prev');
        node.addEventListener('animationend', () => node.classList.remove('turn-next', 'turn-prev'), { once: true });
    }
    // الشريط العائم: رقم الصفحة، والسورة والجزء
    function paintBar(n, ayahs) {
        $('rd-page-no').textContent = ar(n);
        const s = ayahs ? ayahs[0].surah.number : QuranData.surahAtPage(n);
        $('rd-where').textContent = `${surahName(s)} · الجزء ${ar(QuranData.juzOfPage(n))}`;
    }

    async function render() {
        const my = ++token, n = st.page;
        paintBar(n);
        stage.scrollTop = 0;
        current = null;
        if (st.mode === 'image') {
            const img = el('img', 'rd-img'); img.alt = 'صفحة ' + n; img.src = CDN(n);
            const sheet = el('div', 'rd-sheet'); sheet.append(img);
            img.onerror = () => { if (!img.dataset.fb) { img.dataset.fb = '1'; img.src = RAW(n); } };
            stage.replaceChildren(sheet);
            animateTurn(sheet);
            if (n < TOTAL) new Image().src = CDN(n + 1);
            return;
        }
        // هيكل تحميل بشكل الصفحة بدل نص «جارٍ التحميل»
        const sk = el('div', 'rd-text rd-skeleton'); sk.setAttribute('aria-label', 'جارٍ تحميل الصفحة');
        for (let i = 0; i < 11; i++) sk.append(el('i', 'sk-line'));
        stage.replaceChildren(sk);
        let ayahs, tj = null;
        try {
            [ayahs, tj] = await Promise.all([getPage(n), st.tajweed ? Tajweed.getPage(n).catch(() => null) : null]);
        } catch (e) { if (my === token) stage.replaceChildren(msg('تعذر تحميل الصفحة. تحقق من الاتصال بالإنترنت.')); return; }
        if (my !== token) return;
        if (st.tajweed && !tj) Toast.show('تعذّر تحميل ألوان التجويد لهذه الصفحة');
        // ط٣: ورقة مصحف مزخرفة؛ فوقها اسم السورة والجزء والحزب، وتحتها رقم الصفحة بعلامة «۝»
        const box = el('div', 'rd-text'); box.style.fontSize = st.size + 'px';
        box.dataset.font = st.font;
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
        stage.replaceChildren(box);
        current = { n, ayahs };
        paintBar(n, ayahs);
        fitLines();
        paintMarks();
        animateTurn(box);
        if (pendingFlash) { const k = pendingFlash; pendingFlash = null; requestAnimationFrame(() => flash(k)); setTimeout(() => flash(k), 120); }
        if (n < TOTAL) getPage(n + 1).catch(() => {});
    }

    let advanceHook = null;
    function goTo(n, sequential = false, flashKey = null) {
        const prev = st.page;
        n = Math.max(1, Math.min(TOTAL, parseInt(n, 10) || 1));
        turnDir = Math.sign(n - prev);
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
        const curSurah = current ? current.ayahs[0].surah.number : QuranData.surahAtPage(st.page);
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
            // الإضاءة على أول آية بالعرض النصي فقط (ما منغيّر العرض المصوّر)
            goTo(Number(b.dataset.p), false, st.mode === 'text' && !/:1$/.test(b.dataset.k) ? b.dataset.k : null);
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
    $('rd-goto')?.addEventListener('click', openGoto);
    $('rd-layout-btn')?.addEventListener('click', () => { applyTheme(); QSheet.open('تنسيق المصحف', $('rd-layout')); });
    $('rd-marks-btn')?.addEventListener('click', () => QSheet.open('العلامات والملاحظات', QuranMarks.view((p, k) => goTo(p, false, k))));
    $('rd-search-btn')?.addEventListener('click', () => QSheet.open('البحث في القرآن', QuranSearch.view((p, k) => goTo(p, false, k))));
    document.querySelectorAll('#reader-mode [data-mode]').forEach(b => b.addEventListener('click', () => { st.mode = b.dataset.mode; save(); applyTheme(); render(); }));
    document.querySelectorAll('#reader-font [data-font]').forEach(b => b.addEventListener('click', () => {
        st.font = b.dataset.font; save(); applyTheme();
        const box = stage.querySelector('.rd-text'); if (box) box.dataset.font = st.font;
        document.fonts?.ready.then(() => fitSoon(0)); fitSoon(60);
    }));
    addEventListener('resize', () => fitSoon(160));
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
    if (!['auto', 'on', 'off'].includes(st.warm)) st.warm = 'auto';
    applyTheme(); updateResume();
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
