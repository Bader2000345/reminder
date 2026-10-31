/* =====================================================================
 * مُذكّر — cards.js  (الإصدار ٢٣، معرض ١٠: ن٣ ص١ ق١ د٣)
 * «صنع بطاقة»: أي ذكر أو آية ← بطاقة للمشاركة أو خلفية للجهاز، بالخلفيات المرسومة (cardart.js).
 *   Cards.open(item)  ← شاشة الصنع بملء الشاشة (ص١): الخلفيات، المقاس (خلفية لجهازي / ستوري / مربّع)،
 *                        «بلا كتابة»، «رسمة تانية»، حفظ ومشاركة. item: { kind: 'ayah'|'dhikr', text, ref } أو null للخلفية لحالها
 *   صفحة «صنع بطاقة» (ق١، من الإعدادات د٣): آياتي (العلامات والتمييز والملاحظات)، ورد اليوم، الأذكار.
 * «خلفية لجهازي» بمقاس الشاشة الحقيقي، والنص بعيد عن الساعة والأيقونات. «مُذكّر» بيطلع زغير بس بالمشاركة.
 * المداخل التانية: زر البطاقة بعارض الأذكار، «صنع بطاقة» بالضغط المطوّل على الآية، وزر «بطاقة» بوضع التركيز بالورد.
 * يعتمد على CardArt و AyahStore و QuranData و Wird و AdhkarViewer و FocusTools و Immersive و Toast.
 * ===================================================================== */
const Cards = (() => {
    const $ = id => document.getElementById(id);
    const ar = n => Number(n).toLocaleString('ar-EG');
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const KEY_STYLE = 'mudhakkir-card-style', KEY_SIZE = 'mudhakkir-card-size';
    const SIZES = ['device', 'story', 'square'];
    let item = null, style = 'forest', size = 'device', bare = false, seed = 1, busy = false, thumbsDrawn = false, tab = 'mine';
    try {
        const st = localStorage.getItem(KEY_STYLE), sz = localStorage.getItem(KEY_SIZE);
        if (CardArt.STYLES[st]) style = st;
        if (SIZES.includes(sz)) size = sz;
    } catch (e) {}
    let fontsP = null;
    const fontsReady = () => fontsP || (fontsP = Promise.all(['40px "Amiri Quran"', '40px "Amiri"', '500 20px "Readex Pro"', '600 20px "Readex Pro"']
        .map(f => (document.fonts && document.fonts.load ? document.fonts.load(f, 'بسم الله') : Promise.resolve()).catch(() => {}))));
    const ayahRefText = (s, a) => `[${surahName(s)}: ${ar(a)}]`;

    // ---------- المقاس ----------
    // خلفية لجهازي: مقاس الشاشة الفعلي (بكثافة البكسل)، واللابتوب بيتعرف من إنو الشاشة عرضية
    function deviceSpec() {
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        let w = screen.width || innerWidth, h = screen.height || innerHeight;
        const land = matchMedia('(orientation: landscape)').matches;
        if ((land && h > w) || (!land && w > h)) [w, h] = [h, w];
        let W = Math.round(w * dpr), H = Math.round(h * dpr);
        const k = Math.min(1, 4096 / Math.max(W, H));
        return { W: Math.round(W * k), H: Math.round(H * k), kind: w > h ? 'desktop' : 'phone' };
    }
    const spec = () => (size === 'story' ? { W: 1080, H: 1920, kind: 'story' } : size === 'square' ? { W: 1080, H: 1080, kind: 'square' } : deviceSpec());

    function render(canvas, W, H, kind, sign) {
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d'), st = CardArt.draw(ctx, W, H, style, seed);
        if (!bare && item) CardArt.text(ctx, W, H, item, { kind, layout: 'auto', style: st, sign });
    }

    // ---------- شاشة الصنع (ص١) ----------
    function paintPreview() {
        const stage = $('cm-stage'), cv = $('cm-canvas'), s = spec();
        const maxW = Math.max(120, stage.clientWidth - 32), maxH = Math.max(160, stage.clientHeight - 16);
        const k = Math.min(maxW / s.W, maxH / s.H), cw = Math.round(s.W * k), ch = Math.round(s.H * k), dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
        render(cv, Math.round(cw * dpr), Math.round(ch * dpr), s.kind, false);
        cv.setAttribute('aria-label', `معاينة البطاقة: ${CardArt.STYLES[style].name}${item && !bare ? '' : '، بلا كتابة'}`);
    }
    function paintThumbs() {
        const box = $('cm-thumbs');
        if (!thumbsDrawn) {
            box.innerHTML = CardArt.ORDER.map(k => `<button type="button" role="radio" data-style="${k}" aria-checked="false" aria-label="${CardArt.STYLES[k].name}" title="${CardArt.STYLES[k].name}"><canvas width="104" height="176"></canvas></button>`).join('');
            box.querySelectorAll('canvas').forEach(c => CardArt.draw(c.getContext('2d'), c.width, c.height, c.parentElement.dataset.style, 3));
            thumbsDrawn = true;
        }
        box.querySelectorAll('[data-style]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.style === style)));
    }
    function paintChrome() {
        $('cm-sizes').querySelectorAll('[data-size]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.size === size)));
        const bb = $('cm-bare');
        bb.setAttribute('aria-pressed', String(bare)); bb.disabled = !item;
        $('cm-title').textContent = item ? 'صنع بطاقة' : 'خلفية بلا كتابة';
    }
    async function open(it) {
        item = it && String(it.text || '').trim() ? { kind: it.kind === 'ayah' ? 'ayah' : 'dhikr', text: String(it.text).trim(), ref: it.ref || '' } : null;
        bare = !item; seed = 1 + Math.floor(Math.random() * 9999);
        const root = $('card-maker');
        root.hidden = false; document.body.classList.add('cm-open');
        Immersive.enter(root, { onClose: close, hideAfter: 0 });
        paintChrome();
        await fontsReady();
        if (root.hidden) return;
        paintThumbs(); paintPreview();
        $('cm-share').focus({ preventScroll: true });
        root.querySelector(`[data-style="${style}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest' });
    }
    function close(fromPop = false) {
        const root = $('card-maker');
        if (root.hidden) return;
        root.hidden = true; document.body.classList.remove('cm-open');
        Immersive.exit(root, fromPop === true);
    }

    // ---------- الحفظ والمشاركة ----------
    function makeBlob(sign) {
        const s = spec(), cv = document.createElement('canvas');
        render(cv, s.W, s.H, s.kind, sign);
        // الصور الكبيرة (خلفية لابتوب أو جوال حديث) JPEG حتى ما يكون الملف عشرات الميغات
        const big = s.W * s.H > 2.6e6;
        return new Promise(res => cv.toBlob(b => res(b), big ? 'image/jpeg' : 'image/png', .94));
    }
    const fileName = b => `mudhakkir-${size === 'device' ? 'wallpaper' : size}-${Date.now().toString(36)}.${b && b.type === 'image/png' ? 'png' : 'jpg'}`;
    function caption() {
        const url = typeof SITE_URL !== 'undefined' ? SITE_URL : location.href.split('#')[0];
        if (!item) return `من تطبيق مُذكّر: ${url}`;
        const t = item.kind === 'ayah' && !item.text.includes('﴿') ? `﴿${item.text}﴾` : item.text;
        return `${t}${item.ref ? ' ' + item.ref : ''}\n\nمن تطبيق مُذكّر: ${url}`;
    }
    function download(blob, name) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = name;
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
    function setBusy(on, btn, label) {
        busy = on;
        ['cm-save', 'cm-share'].forEach(id => { $(id).disabled = on; });
        btn.textContent = on ? 'جارٍ التجهيز…' : label;
    }
    async function share() {
        if (busy) return;
        const btn = $('cm-share');
        setBusy(true, btn, 'مشاركة');
        try {
            await fontsReady();
            const blob = await makeBlob(true);
            const file = new File([blob], fileName(blob), { type: blob.type });
            if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text: caption() });
            else { download(blob, file.name); Toast.show('انحفظت الصورة، فيك تشاركها من ملفاتك'); }
        } catch (e) {
            if (!e || e.name !== 'AbortError') Toast.show('تعذّرت المشاركة، جرّب «حفظ»');
        } finally { setBusy(false, btn, 'مشاركة'); }
    }
    async function save() {
        if (busy) return;
        const btn = $('cm-save');
        setBusy(true, btn, 'حفظ');
        try {
            await fontsReady();
            const blob = await makeBlob(false), name = fileName(blob);
            // عالجوال: قائمة المشاركة فيها «حفظ الصورة» (الآيفون ما بيحفظ الصور من رابط تنزيل)
            if (matchMedia('(pointer: coarse)').matches && navigator.canShare) {
                const file = new File([blob], name, { type: blob.type });
                if (navigator.canShare({ files: [file] })) {
                    try { await navigator.share({ files: [file] }); saved(); return; }
                    catch (e) { if (e && e.name === 'AbortError') return; }
                }
            }
            download(blob, name); saved();
        } catch (e) { Toast.show('تعذّر الحفظ، جرّب مرة تانية'); }
        finally { setBusy(false, btn, 'حفظ'); }
    }
    function saved() {
        if (size !== 'device') { Toast.show('انحفظت الصورة ✓'); return; }
        Toast.show(spec().kind === 'desktop' ? 'انحفظت ✓ افتحها وكبس يمين ← «تعيين كخلفية»' : 'انحفظت ✓ من الصور: مشاركة ← «استخدام كخلفية»');
    }

    // ---------- صفحة «صنع بطاقة» (ق١) ----------
    let rows = [];
    async function ayahText(s, a, page) {
        if (!page) return '';
        try {
            const ayahs = await QuranData.getPage(page);
            const hit = ayahs.find(x => x.surah.number === s && x.numberInSurah === a);
            return hit ? QuranData.verseText(hit) : '';
        } catch (e) { return ''; }
    }
    function rowHTML(r, i) {
        return `<button type="button" class="cd-row" data-i="${i}"><span class="cd-text${r.kind === 'ayah' ? ' is-ayah' : ''}">${r.text ? esc(r.text) : '…'}</span><small>${esc(r.label)}</small></button>`;
    }
    function paintList(note = '') {
        const box = $('cd-list');
        box.innerHTML = rows.length ? `<div class="cd-rows">${rows.map(rowHTML).join('')}</div>${note ? `<p class="cd-note">${note}</p>` : ''}` : note;
    }
    async function showTab(t) {
        tab = t;
        document.querySelectorAll('#cd-tabs [data-cd]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.cd === t)));
        rows = [];
        const my = t;
        if (t === 'adhkar') {
            rows = (typeof GENERAL_ADHKAR_LIST !== 'undefined' ? GENERAL_ADHKAR_LIST : []).map(text => ({ kind: 'dhikr', text, ref: '', label: 'من الأذكار' }));
            paintList();
            return;
        }
        if (t === 'mine') {
            const marks = typeof AyahStore !== 'undefined' ? AyahStore.list().slice(0, 60) : [];
            if (!marks.length) { paintList('<div class="cd-empty"><p>ما في آيات معلّمة لسا. بالمصحف اضغط مطوّلًا على أي آية واختار «علامة مرجعية» أو «تمييز»، أو «صنع بطاقة» مباشرة.</p><button type="button" class="ghost-button" data-cd-open="reader">افتح المصحف</button></div>'); return; }
            const KIND = { bookmark: 'علامة', highlight: 'مميّزة', note: 'فيها ملاحظة' };
            rows = marks.map(m => { const [s, a] = m.key.split(':').map(Number); return { kind: 'ayah', s, a, page: m.p, text: '', ref: ayahRefText(s, a), label: `${surahName(s)} ${ar(a)}، ${m.kinds.map(k => KIND[k]).filter(Boolean).join(' و')}` }; });
            paintList();
            for (const r of rows) { r.text = await ayahText(r.s, r.a, r.page); if (tab !== my) return; }
            rows = rows.filter(r => r.text);
            paintList(rows.length < marks.length ? 'في آيات ما قدرنا نجيب نصها هلّق، بتبين لما يكون في نت.' : '');
            return;
        }
        // ورد اليوم: آيات صفحات ورد اليوم (أول ٦ صفحات)
        let snap = null;
        try { snap = Wird.snapshot(); } catch (e) {}
        if (!snap || !snap.from) { paintList('<div class="cd-empty"><p>لسا ما في ورد. جهّز خطة الورد من صفحة القرآن.</p></div>'); return; }
        paintList('<div class="cd-empty"><p>جارٍ تحميل آيات ورد اليوم…</p></div>');
        const pages = [];
        for (let p = snap.from; pages.length < 6; p = p % QuranData.TOTAL_PAGES + 1) { pages.push(p); if (p === snap.to) break; }
        try {
            for (const p of pages) {
                const ayahs = await QuranData.getPage(p);
                if (tab !== my) return;
                ayahs.forEach(x => rows.push({ kind: 'ayah', text: QuranData.verseText(x), ref: ayahRefText(x.surah.number, x.numberInSurah), label: `${surahName(x.surah.number)} ${ar(x.numberInSurah)}، صفحة ${ar(p)}` }));
            }
            paintList(pages.length < (snap.to - snap.from + 1) ? 'هي آيات أول ٦ صفحات من ورد اليوم.' : '');
        } catch (e) {
            if (tab !== my) return;
            paintList(rows.length ? 'ما قدرنا نجيب باقي الصفحات، تأكد من النت.' : '<div class="cd-empty"><p>ما قدرنا نجيب آيات ورد اليوم. تأكد من النت.</p></div>');
        }
    }

    // ---------- المداخل ----------
    // عارض الأذكار: الذكر المفتوح (والأذكار المتتابعة بتنضم ببعض)
    function fromViewer() {
        const c = typeof AdhkarViewer !== 'undefined' && AdhkarViewer.current ? AdhkarViewer.current() : null;
        const it = c && c.item;
        const text = it ? (it.text || (it.seq ? it.seq.map(x => x.text).join('، ') : '')) : '';
        if (!text) { Toast.show('هالصفحة ما فيها ذكر لبطاقة'); return; }
        open({ kind: text.includes('﴿') ? 'ayah' : 'dhikr', text, ref: it.ref || c.title });
    }
    function fromFocus() {
        const c = typeof FocusTools !== 'undefined' && FocusTools.current ? FocusTools.current() : null;
        if (!c || !c.ayah) return;
        const a = c.ayah;
        open({ kind: 'ayah', text: QuranData.verseText(a), ref: ayahRefText(a.surah.number, a.numberInSurah) });
    }

    function init() {
        const root = $('card-maker');
        if (!root) return;
        $('cm-close').addEventListener('click', () => close());
        $('cm-again').addEventListener('click', () => { seed += 1; paintPreview(); });
        $('cm-thumbs').addEventListener('click', e => {
            const b = e.target.closest('[data-style]'); if (!b) return;
            style = b.dataset.style; try { localStorage.setItem(KEY_STYLE, style); } catch (err) {}
            paintThumbs(); paintPreview();
        });
        $('cm-sizes').addEventListener('click', e => {
            const b = e.target.closest('[data-size]'); if (!b) return;
            size = b.dataset.size; try { localStorage.setItem(KEY_SIZE, size); } catch (err) {}
            paintChrome(); paintPreview();
        });
        $('cm-bare').addEventListener('click', () => { if (!item) return; bare = !bare; paintChrome(); paintPreview(); });
        $('cm-save').addEventListener('click', save);
        $('cm-share').addEventListener('click', share);
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && !root.hidden) { e.stopImmediatePropagation(); close(); } }, true);
        let rt = 0;
        addEventListener('resize', () => { if (root.hidden) return; clearTimeout(rt); rt = setTimeout(paintPreview, 200); });
        // الصفحة
        $('cd-tabs').addEventListener('click', e => { const b = e.target.closest('[data-cd]'); if (b) showTab(b.dataset.cd); });
        $('cd-list').addEventListener('click', e => {
            if (e.target.closest('[data-cd-open="reader"]')) { navigateTo('quran'); if (typeof Reader !== 'undefined') Reader.enter(); return; }
            const b = e.target.closest('[data-i]'); if (!b) return;
            const r = rows[Number(b.dataset.i)];
            if (r && r.text) open({ kind: r.kind, text: r.text, ref: r.ref });
        });
        $('cd-bare').addEventListener('click', () => open(null));
        const page = $('page-cards');
        let wasOpen = false;
        new MutationObserver(() => { const on = page.classList.contains('active-page'); if (on && !wasOpen) showTab(tab); wasOpen = on; }).observe(page, { attributes: true, attributeFilter: ['class'] });
        // عارض الأذكار ووضع التركيز بالورد
        $('dk-card')?.addEventListener('click', fromViewer);
        $('focus-card')?.addEventListener('click', fromFocus);
    }
    return { init, open, close };
})();
