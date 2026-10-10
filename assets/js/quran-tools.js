/* =====================================================================
 * مُذكّر — quran-tools.js
 * أدوات القرآن المشتركة بين القراءة الحرة ووضع التركيز في الورد:
 *   QSheet       لوحة منبثقة من أسفل الشاشة (مع رجوع بين الصفحات الداخلية)
 *   AyahStore    العلامات المرجعية، التمييز بلون، ملاحظات التدبّر (في الجهاز)
 *   Tajweed      ألوان التجويد (من alquran.cloud — نسخة quran-tajweed)
 *   Tafsir       التفسير: الميسر، المختصر، ابن كثير (عبر سيرفر مُذكّر /tafsir)
 *   AyahSheet    ما يظهر عند الضغط المطوّل على آية (بدون «استمع»)
 *   QuranMarks   قائمة العلامات والملاحظات
 *   QuranSearch  البحث في القرآن
 *   FocusTools   زرّا «ألوان التجويد» و«التفسير» في وضع التركيز
 * يُحمَّل بعد wird.js (QuranData) وقبل reader.js.
 * ===================================================================== */

const qEl = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
const qEsc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const qAr = n => Number(n).toLocaleString('ar-EG');
const surahName = s => (typeof SURAH_NAMES !== 'undefined' && SURAH_NAMES[s - 1]) || ('سورة ' + s);
const ayahRef = (s, a) => `${surahName(s)} · الآية ${qAr(a)}`;
const ICONS = {
    tafsir: '<path d="M4 5h11a3 3 0 0 1 3 3v12H7a3 3 0 0 1-3-3z"/><path d="M8 9h6M8 13h6"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    share: '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/>',
    bookmark: '<path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z"/>',
    highlight: '<path d="M4 20h7"/><path d="M14.5 4.5l5 5L10 19l-5 1 1-5z"/>',
    note: '<path d="M5 4h14v12l-4 4H5z"/><path d="M15 20v-4h4M8 9h8M8 13h5"/>',
    ask: '<path d="M4 5h16v11H9l-5 4z"/><path d="M12 8.5l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z"/>'
};
const svgIcon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

// ===================== اللوحة المنبثقة =====================
const QSheet = (() => {
    const $ = id => document.getElementById(id);
    const layer = $('qsheet'), body = $('qsheet-body'), title = $('qsheet-title'), back = $('qsheet-back'), stash = $('qsheet-stash');
    let stack = [], lastFocus = null, closeTimer = 0;
    // العناصر الثابتة (مثل «تنسيق المصحف») ترجع لمخزنها دائمًا حتى لا تُفقد
    const stashNode = e => { if (e.node.dataset && e.node.dataset.static === '1') stash.append(e.node); };
    function show() {
        const top = stack[stack.length - 1];
        title.textContent = top.title;
        back.hidden = stack.length < 2;
        body.replaceChildren(top.node);
        body.scrollTop = 0;
        top.node.hidden = false;
        if (top.onShow) top.onShow();
    }
    function finishClose() {
        clearTimeout(closeTimer); closeTimer = 0;
        body.replaceChildren();
        stack.forEach(stashNode);
        stack = [];
        layer.hidden = true;
    }
    function open(t, node, opts = {}) {
        if (closeTimer) finishClose(); // لوحة كانت تُغلق للتو
        if (layer.hidden) lastFocus = document.activeElement;
        stack.forEach(e => { e.onClose && e.onClose(); stashNode(e); });
        stack = [{ title: t, node, ...opts }];
        layer.hidden = false;
        requestAnimationFrame(() => layer.classList.add('open'));
        show();
        setTimeout(() => (body.querySelector('[autofocus]') || body.querySelector('button, input, textarea'))?.focus({ preventScroll: true }), 60);
    }
    function push(t, node, opts = {}) { stack.push({ title: t, node, ...opts }); show(); }
    function pop() { if (stack.length < 2) return close(); const e = stack.pop(); e.onClose && e.onClose(); stashNode(e); show(); }
    function close() {
        if (layer.hidden || closeTimer) return;
        stack.forEach(e => e.onClose && e.onClose());
        layer.classList.remove('open');
        closeTimer = setTimeout(finishClose, 260);
        lastFocus?.focus?.({ preventScroll: true });
    }
    layer.querySelectorAll('[data-qsheet-close]').forEach(b => b.addEventListener('click', close));
    back.addEventListener('click', pop);
    // Escape يغلق اللوحة فقط (قبل أن يصل لوضع القراءة)
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape' || layer.hidden) return;
        e.stopImmediatePropagation(); e.preventDefault();
        stack.length > 1 ? pop() : close();
    }, true);
    stash.querySelectorAll(':scope > *').forEach(n => { n.dataset.static = '1'; });
    return { open, push, pop, close, isOpen: () => !layer.hidden && !closeTimer };
})();

// ===================== العلامات والتمييز والملاحظات =====================
const AyahStore = (() => {
    const KEY = 'mudhakkir-ayah-marks';
    let d = { b: {}, h: {}, n: {} };
    try { d = Object.assign(d, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} };
    return {
        isBookmarked: k => !!d.b[k],
        toggleBookmark(k, page) { if (d.b[k]) delete d.b[k]; else d.b[k] = { p: page, t: Date.now() }; save(); return !!d.b[k]; },
        color: k => (d.h[k] && d.h[k].c) || null,
        setColor(k, c, page) { if (c) d.h[k] = { c, p: page, t: Date.now() }; else delete d.h[k]; save(); },
        note: k => (d.n[k] && d.n[k].text) || '',
        setNote(k, text, page) { text = String(text || '').trim(); if (text) d.n[k] = { text: text.slice(0, 2000), p: page, t: Date.now() }; else delete d.n[k]; save(); },
        // كل الآيات المعلَّمة، الأحدث أولًا
        list() {
            const all = {};
            const add = (k, rec, kind) => { const e = all[k] || (all[k] = { key: k, p: rec.p, t: 0, kinds: [] }); e.kinds.push(kind); e.t = Math.max(e.t, rec.t || 0); e.p = e.p || rec.p; };
            Object.entries(d.b).forEach(([k, r]) => add(k, r, 'bookmark'));
            Object.entries(d.h).forEach(([k, r]) => add(k, r, 'highlight'));
            Object.entries(d.n).forEach(([k, r]) => add(k, r, 'note'));
            return Object.values(all).sort((x, y) => y.t - x.t);
        }
    };
})();

// ===================== ألوان التجويد =====================
const Tajweed = (() => {
    const API = 'https://api.alquran.cloud/v1/page/';
    const PREFIX = 'mudhakkir-qpt1-';
    const mem = new Map(), inflight = new Map();
    // رموز alquran.cloud ← اسم الحكم
    const RULES = {
        h: ['tj-wasl', 'همزة وصل'], s: ['tj-silent', 'لا يُنطق'], l: ['tj-silent', 'لام شمسية'],
        n: ['tj-madd2', 'مدّ طبيعي (حركتان)'], p: ['tj-madd246', 'مدّ جائز (٢، ٤، ٦)'], o: ['tj-madd45', 'مدّ واجب (٤–٥)'], m: ['tj-madd6', 'مدّ لازم (٦ حركات)'],
        q: ['tj-qalqala', 'قلقلة'], g: ['tj-ghunna', 'غُنّة'], f: ['tj-ikhfa', 'إخفاء'], c: ['tj-ikhfa-sh', 'إخفاء شفوي'],
        i: ['tj-iqlab', 'إقلاب'], a: ['tj-idgham-g', 'إدغام بغنّة'], u: ['tj-idgham', 'إدغام بلا غنّة'], w: ['tj-idgham-sh', 'إدغام شفوي'],
        d: ['tj-idgham-m', 'إدغام متجانس'], b: ['tj-idgham-m', 'إدغام متقارب']
    };
    const LEGEND = [['tj-madd2', 'مدّ طبيعي'], ['tj-madd246', 'مدّ جائز'], ['tj-madd45', 'مدّ واجب'], ['tj-madd6', 'مدّ لازم'], ['tj-ghunna', 'غُنّة'], ['tj-ikhfa', 'إخفاء'], ['tj-ikhfa-sh', 'إخفاء شفوي'], ['tj-idgham-g', 'إدغام بغنّة'], ['tj-idgham', 'إدغام بلا غنّة'], ['tj-idgham-sh', 'إدغام شفوي'], ['tj-iqlab', 'إقلاب'], ['tj-qalqala', 'قلقلة'], ['tj-silent', 'لا يُنطق']];

    // "بِسْمِ [h:1[ٱ]للَّهِ" ← مقاطع {cls, text}
    function parse(raw) {
        const segs = [], re = /\[([a-z])(?::\d+)?\[([^\]]*)\]/g;
        let last = 0, m;
        while ((m = re.exec(raw))) {
            if (m.index > last) segs.push({ cls: null, text: raw.slice(last, m.index) });
            segs.push({ cls: (RULES[m[1]] || [null])[0], title: (RULES[m[1]] || [, ''])[1], text: m[2] });
            last = re.lastIndex;
        }
        if (last < raw.length) segs.push({ cls: null, text: raw.slice(last) });
        return segs;
    }
    // حذف أول n من الكلمات (البسملة في أول السورة تُعرض منفصلة)
    function dropWords(segs, n) {
        const plain = segs.map(s => s.text).join('');
        let idx = 0, count = 0;
        while (count < n && idx < plain.length) { const sp = plain.indexOf(' ', idx); if (sp < 0) return segs; idx = sp + 1; count++; }
        const out = []; let pos = 0;
        segs.forEach(s => { const end = pos + s.text.length; if (end > idx) out.push({ ...s, text: s.text.slice(Math.max(0, idx - pos)) }); pos = end; });
        return out;
    }
    const toHtml = segs => segs.map(s => s.cls ? `<span class="${s.cls}" title="${qEsc(s.title)}">${qEsc(s.text)}</span>` : qEsc(s.text)).join('');

    async function fetchRows(n) {
        const res = await fetch(`${API}${n}/quran-tajweed`);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const ayahs = (await res.json()).data.ayahs;
        return ayahs.map(a => ({ t: a.text, n: a.numberInSurah, s: a.surah.number }));
    }
    function getPage(n) {
        if (mem.has(n)) return Promise.resolve(mem.get(n));
        if (!inflight.has(n)) {
            inflight.set(n, (async () => {
                let rows = null;
                try { rows = JSON.parse(localStorage.getItem(PREFIX + n)); } catch (e) {}
                if (!Array.isArray(rows) || !rows.length) { rows = await fetchRows(n); try { localStorage.setItem(PREFIX + n, JSON.stringify(rows)); } catch (e) {} }
                mem.set(n, rows);
                return rows;
            })().finally(() => inflight.delete(n)));
        }
        return inflight.get(n);
    }
    // HTML ملوّن لآية (يحذف البسملة إن كانت أول السورة مثل QuranData.verseText)
    function ayahHtml(row, ayah) {
        let segs = parse(row.t);
        if (ayah && QuranData.hasBasmalaHeader(ayah)) {
            const firstWord = QuranData.verseText({ ...ayah, text: segs.map(s => s.text).join('') });
            if (firstWord !== segs.map(s => s.text).join('')) segs = dropWords(segs, 4);
        }
        return toHtml(segs);
    }
    function legendNode() {
        const box = qEl('div', 'tj-legend-chips');
        LEGEND.forEach(([cls, name]) => { const c = qEl('span', 'tj-chip'); c.innerHTML = `<i class="${cls}">ـ</i>${qEsc(name)}`; box.append(c); });
        return box;
    }
    return { getPage, ayahHtml, legendNode, parse, toHtml };
})();

// ===================== التفسير =====================
const Tafsir = (() => {
    const SOURCES = [
        { key: 'muyassar', name: 'الميسر', title: 'التفسير الميسر', credit: 'Quran.com' },
        { key: 'mukhtasar', name: 'المختصر', title: 'المختصر في تفسير القرآن الكريم', credit: 'QuranEnc.com — مركز تفسير للدراسات القرآنية' },
        { key: 'ibnkathir', name: 'ابن كثير', title: 'تفسير ابن كثير', credit: 'Quran.com' }
    ];
    const DIRECT = {
        muyassar: (s, a) => [`https://api.quran.com/api/v4/tafsirs/16/by_ayah/${s}:${a}`, j => j.tafsir && j.tafsir.text],
        ibnkathir: (s, a) => [`https://api.quran.com/api/v4/tafsirs/14/by_ayah/${s}:${a}`, j => j.tafsir && j.tafsir.text],
        mukhtasar: (s, a) => [`https://quranenc.com/api/v1/translation/aya/arabic_mokhtasar/${s}/${a}`, j => j.result && j.result.translation]
    };
    const KEY = 'mudhakkir-tafsir-cache', MAX = 80;
    const PREF = 'mudhakkir-tafsir-src';
    let cache = {};
    try { cache = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
    const persist = () => {
        const keys = Object.keys(cache);
        if (keys.length > MAX) keys.sort((x, y) => cache[x].t - cache[y].t).slice(0, keys.length - MAX).forEach(k => delete cache[k]);
        try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) { cache = {}; }
    };
    const clean = html => String(html || '').replace(/<\s*br\s*\/?>/gi, '\n').replace(/<\/(p|div|h\d|li)>/gi, '\n\n').replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
        .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();

    async function get(src, s, a) {
        const k = `${src}/${s}/${a}`;
        if (cache[k]) return cache[k].text;
        let text = '';
        // ١) عبر سيرفر مُذكّر (مخزّن ومنظّف)  ٢) مباشرة من المصدر إن لم يكن السيرفر محدّثًا
        try {
            const res = await fetch(`${PUSH_SERVER}/tafsir?src=${src}&s=${s}&a=${a}`);
            if (res.ok) text = (await res.json()).text || '';
        } catch (e) {}
        if (!text) {
            const [url, pick] = DIRECT[src](s, a);
            const res = await fetch(url);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            text = clean(pick(await res.json()));
        }
        if (!text) throw new Error('empty');
        cache[k] = { text, t: Date.now() }; persist();
        return text;
    }

    // عرض التفسير بتبويبات المصادر الثلاثة
    function view(ayah) {
        const box = qEl('div', 'tf-view');
        const quote = qEl('blockquote', 'tf-ayah');
        quote.append(qEl('span', 'tf-ayah-text', '﴿' + ayah.text + '﴾'), qEl('small', '', ayahRef(ayah.s, ayah.a)));
        const tabs = qEl('div', 'segmented tf-tabs'); tabs.setAttribute('role', 'tablist');
        const out = qEl('div', 'tf-body'); out.setAttribute('aria-live', 'polite');
        const credit = qEl('p', 'tf-credit');
        const copyBtn = qEl('button', 'ghost-button tf-copy', 'نسخ التفسير'); copyBtn.type = 'button';
        let current = localStorage.getItem(PREF) || 'muyassar', token = 0;
        async function load(src) {
            current = src; try { localStorage.setItem(PREF, src); } catch (e) {}
            tabs.querySelectorAll('button').forEach(b => { const on = b.dataset.src === src; b.classList.toggle('active', on); b.setAttribute('aria-selected', String(on)); });
            const meta = SOURCES.find(x => x.key === src);
            credit.textContent = `${meta.title} · المصدر: ${meta.credit}`;
            const my = ++token;
            out.replaceChildren(qEl('div', 'tf-skeleton'), qEl('div', 'tf-skeleton short'), qEl('div', 'tf-skeleton'));
            copyBtn.hidden = true;
            try {
                const text = await get(src, ayah.s, ayah.a);
                if (my !== token) return;
                out.replaceChildren(...text.split(/\n{2,}/).map(p => qEl('p', '', p)));
                copyBtn.hidden = false;
                copyBtn.onclick = async () => { try { await navigator.clipboard.writeText(`${meta.title} — ${ayahRef(ayah.s, ayah.a)}\n\n${text}`); Toast.show('تم نسخ التفسير'); } catch (e) {} };
            } catch (e) {
                if (my !== token) return;
                out.replaceChildren(qEl('p', 'tf-error', 'تعذّر تحميل التفسير الآن. تأكد من الاتصال بالإنترنت ثم حاول مرة أخرى.'));
            }
        }
        SOURCES.forEach(src => { const b = qEl('button', '', src.name); b.type = 'button'; b.dataset.src = src.key; b.setAttribute('role', 'tab'); b.addEventListener('click', () => load(src.key)); tabs.append(b); });
        box.append(quote, tabs, out, credit, copyBtn);
        load(current);
        return box;
    }
    return { get, view, SOURCES };
})();

// ===================== أدوات الآية (الضغط المطوّل) =====================
const AyahSheet = (() => {
    const COLORS = [['gold', 'ذهبي'], ['green', 'أخضر'], ['blue', 'أزرق'], ['rose', 'وردي']];
    // ayah: { s, a, page, text } — onChange يُستدعى بعد أي تغيير لتحديث شكل الآية في الصفحة
    function open(ayah, { onChange = () => {}, onClose } = {}) {
        const k = `${ayah.s}:${ayah.a}`;
        const box = qEl('div', 'ay-sheet');
        const head = qEl('div', 'ay-head');
        head.append(qEl('p', 'ay-text', '﴿' + ayah.text + '﴾'));
        const actions = qEl('div', 'ay-actions');
        const add = (icon, label, fn, extraCls = '') => { const b = qEl('button', 'ay-action ' + extraCls); b.type = 'button'; b.innerHTML = svgIcon(icon) + `<span>${qEsc(label)}</span>`; b.addEventListener('click', fn); actions.append(b); return b; };
        add('tafsir', 'التفسير', () => QSheet.push('التفسير', Tafsir.view(ayah)), 'is-primary');
        add('copy', 'نسخ', async () => {
            try { await navigator.clipboard.writeText(`﴿${ayah.text}﴾ [${surahName(ayah.s)}: ${ayah.a}]`); Toast.show('تم نسخ الآية'); } catch (e) {}
        });
        add('share', 'مشاركة', async () => {
            const text = `﴿${ayah.text}﴾ [${surahName(ayah.s)}: ${ayah.a}]\n\nمن تطبيق مُذكّر: ${typeof SITE_URL !== 'undefined' ? SITE_URL : location.href}`;
            try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { return; }
            try { await navigator.clipboard.writeText(text); Toast.show('تم نسخ الآية للمشاركة'); } catch (e) {}
        });
        const bm = add('bookmark', AyahStore.isBookmarked(k) ? 'إزالة العلامة' : 'علامة مرجعية', () => {
            const on = AyahStore.toggleBookmark(k, ayah.page);
            bm.querySelector('span').textContent = on ? 'إزالة العلامة' : 'علامة مرجعية';
            bm.classList.toggle('is-on', on);
            Toast.show(on ? 'تم حفظ العلامة' : 'تمت إزالة العلامة');
            onChange();
        }, AyahStore.isBookmarked(k) ? 'is-on' : '');
        add('highlight', 'تمييز', () => QSheet.push('تمييز الآية', colorView()));
        add('note', AyahStore.note(k) ? 'ملاحظتي' : 'ملاحظة', () => QSheet.push('ملاحظة تدبّر', noteView()), AyahStore.note(k) ? 'is-on' : '');
        add('ask', 'اسأل مُذكّر', () => {
            QSheet.close();
            if (typeof Assistant !== 'undefined') Assistant.open({ question: `اشرح لي معنى هذه الآية باختصار: ${surahName(ayah.s)} ${ayah.a}`, ayah: { ref: `${surahName(ayah.s)}: ${ayah.a}`, text: ayah.text, s: ayah.s, a: ayah.a } });
        });
        box.append(head, actions);
        if (AyahStore.note(k)) { const n = qEl('p', 'ay-note-preview', AyahStore.note(k)); box.append(n); }

        function colorView() {
            const v = qEl('div', 'ay-colors');
            const cur = AyahStore.color(k);
            COLORS.forEach(([c, name]) => {
                const b = qEl('button', `ay-swatch hl-${c}${cur === c ? ' is-on' : ''}`); b.type = 'button';
                b.innerHTML = `<i></i><span>${name}</span>`;
                b.addEventListener('click', () => { AyahStore.setColor(k, c, ayah.page); onChange(); QSheet.pop(); Toast.show('تم تمييز الآية'); });
                v.append(b);
            });
            const clear = qEl('button', 'ghost-button', 'إزالة التمييز'); clear.type = 'button'; clear.hidden = !cur;
            clear.addEventListener('click', () => { AyahStore.setColor(k, null); onChange(); QSheet.pop(); });
            const wrap = qEl('div'); wrap.append(v, clear);
            return wrap;
        }
        function noteView() {
            const v = qEl('div', 'ay-note');
            const ta = qEl('textarea'); ta.rows = 6; ta.maxLength = 2000; ta.value = AyahStore.note(k);
            ta.placeholder = 'اكتب ما تدبّرته في هذه الآية…'; ta.setAttribute('aria-label', 'ملاحظة على الآية'); ta.setAttribute('autofocus', '');
            const row = qEl('div', 'ay-note-actions');
            const saveBtn = qEl('button', 'primary-button', 'حفظ الملاحظة'); saveBtn.type = 'button';
            saveBtn.addEventListener('click', () => { AyahStore.setNote(k, ta.value, ayah.page); onChange(); QSheet.close(); Toast.show(ta.value.trim() ? 'تم حفظ الملاحظة' : 'تم حذف الملاحظة'); });
            row.append(saveBtn);
            if (AyahStore.note(k)) { const del = qEl('button', 'delete-reminder', 'حذف'); del.type = 'button'; del.addEventListener('click', () => { AyahStore.setNote(k, ''); onChange(); QSheet.close(); }); row.append(del); }
            v.append(ta, row);
            return v;
        }
        QSheet.open(ayahRef(ayah.s, ayah.a), box, { onClose });
    }
    return { open };
})();

// ===================== قائمة العلامات والملاحظات =====================
const QuranMarks = (() => {
    function view(onGo) {
        const box = qEl('div', 'qm-view');
        const list = AyahStore.list();
        if (!list.length) {
            box.append(qEl('p', 'qm-empty', 'لا توجد علامات بعد. اضغط مطوّلًا على أي آية لتضع علامة مرجعية أو تمييزًا أو ملاحظة.'));
            return box;
        }
        list.forEach(e => {
            const [s, a] = e.key.split(':').map(Number);
            const b = qEl('button', 'qm-item'); b.type = 'button';
            const kinds = e.kinds.map(kd => kd === 'bookmark' ? svgIcon('bookmark') : kd === 'note' ? svgIcon('note') : `<i class="qm-dot hl-${AyahStore.color(e.key)}"></i>`).join('');
            b.innerHTML = `<span class="qm-kinds">${kinds}</span><span class="qm-copy"><strong>${qEsc(ayahRef(s, a))}</strong><small>${e.p ? 'الصفحة ' + qAr(e.p) : ''}</small>${AyahStore.note(e.key) ? `<em>${qEsc(AyahStore.note(e.key).slice(0, 90))}</em>` : ''}</span>`;
            b.addEventListener('click', () => { QSheet.close(); onGo(e.p, e.key); });
            box.append(b);
        });
        return box;
    }
    return { view };
})();

// ===================== البحث في القرآن =====================
const QuranSearch = (() => {
    const API = 'https://api.alquran.cloud/v1/';
    const strip = s => (typeof Knowledge !== 'undefined' ? Knowledge.norm(s) : String(s)).trim();
    function view(onGo) {
        const box = qEl('div', 'qs-view');
        const form = qEl('form', 'qs-form');
        const input = qEl('input'); input.type = 'search'; input.placeholder = 'اكتب كلمة أو جزءًا من آية (دون تشكيل)'; input.setAttribute('aria-label', 'البحث في القرآن'); input.setAttribute('autofocus', ''); input.enterKeyHint = 'search';
        const go = qEl('button', 'primary-button', 'بحث'); go.type = 'submit';
        form.append(input, go);
        const info = qEl('p', 'qs-info', 'مثال: الصبر، رحمة الله، إن مع العسر يسرا');
        const results = qEl('div', 'qs-results');
        let token = 0;
        async function run() {
            const q = strip(input.value);
            if (q.length < 2) { info.textContent = 'اكتب حرفين على الأقل.'; return; }
            const my = ++token;
            info.textContent = 'جارٍ البحث…'; results.replaceChildren();
            try {
                const res = await fetch(`${API}search/${encodeURIComponent(q)}/all/quran-simple-clean`);
                const j = res.ok ? await res.json() : null;
                if (my !== token) return;
                const matches = (j && j.data && j.data.matches) || [];
                info.textContent = matches.length ? `${qAr(j.data.count)} نتيجة${j.data.count > 60 ? ' (أول ٦٠)' : ''}` : 'لا توجد نتائج. جرّب كلمة أخرى أو اكتبها دون تشكيل.';
                // مطابقة حرفًا بحرف للإبراز (إن = ان، ى = ي، ة = ه) دون تغيير طول النص
                const flat = s => s.replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');
                matches.slice(0, 60).forEach(m => {
                    const b = qEl('button', 'qs-item'); b.type = 'button';
                    const idx = flat(m.text).indexOf(flat(q));
                    const snippet = idx < 0 ? qEsc(m.text) : qEsc(m.text.slice(0, idx)) + `<mark>${qEsc(m.text.slice(idx, idx + q.length))}</mark>` + qEsc(m.text.slice(idx + q.length));
                    b.innerHTML = `<small>${qEsc(ayahRef(m.surah.number, m.numberInSurah))}</small><span>${snippet}</span>`;
                    b.addEventListener('click', async () => {
                        b.disabled = true;
                        try {
                            const r = await (await fetch(`${API}ayah/${m.number}`)).json();
                            QSheet.close(); onGo(r.data.page, `${m.surah.number}:${m.numberInSurah}`);
                        } catch (e) { b.disabled = false; Toast.show('تعذّر فتح الآية، حاول مرة أخرى'); }
                    });
                    results.append(b);
                });
            } catch (e) { if (my === token) info.textContent = 'تعذّر البحث الآن. تأكد من الاتصال بالإنترنت.'; }
        }
        form.addEventListener('submit', e => { e.preventDefault(); run(); });
        box.append(form, info, results);
        return box;
    }
    return { view };
})();

// ===================== وضع التركيز: التجويد والتفسير =====================
const FocusTools = (() => {
    const $ = id => document.getElementById(id);
    const KEY = 'mudhakkir-focus-tajweed';
    let current = null, on = false;
    try { on = localStorage.getItem(KEY) === '1'; } catch (e) {}
    function paintPlain(el, ayah) {
        el.replaceChildren();
        if (QuranData.hasBasmalaHeader(ayah)) el.append(qEl('span', 'verse-basmala', QuranData.BASMALA));
        el.append(document.createTextNode(QuranData.verseText(ayah)));
    }
    async function paint() {
        const el = $('focus-verse-text');
        if (!current || !el) return;
        const { ayah, page, idx } = current;
        $('focus-tajweed').setAttribute('aria-pressed', String(on));
        el.classList.toggle('has-tajweed', on);
        if (!on) return paintPlain(el, ayah);
        try {
            const rows = await Tajweed.getPage(page);
            if (current.ayah !== ayah) return;
            const row = rows[idx];
            if (!row || row.n !== ayah.numberInSurah) return paintPlain(el, ayah);
            el.replaceChildren();
            if (QuranData.hasBasmalaHeader(ayah)) el.append(qEl('span', 'verse-basmala', QuranData.BASMALA));
            const span = qEl('span'); span.innerHTML = Tajweed.ayahHtml(row, ayah); el.append(span);
        } catch (e) { paintPlain(el, ayah); Toast.show('تعذّر تحميل ألوان التجويد الآن'); }
    }
    // تُستدعى من الورد كلما تغيّرت الآية
    function update(ayah, page, idx) { current = { ayah, page, idx }; if (on) paint(); }
    function init() {
        $('focus-tajweed')?.addEventListener('click', () => { on = !on; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {} paint(); });
        $('focus-tafsir')?.addEventListener('click', () => {
            if (!current) return;
            const a = current.ayah;
            QSheet.open('التفسير', Tafsir.view({ s: a.surah.number, a: a.numberInSurah, page: current.page, text: QuranData.verseText(a) }));
        });
        $('focus-tajweed')?.setAttribute('aria-pressed', String(on));
    }
    return { init, update };
})();
