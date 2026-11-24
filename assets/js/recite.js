/* =====================================================================
 * مُذكّر — recite.js  (الإصدار 36، معرض القائمة والفيديو: ت1)
 * تلاوة المصحف بأصوات خمس مشايخ من EveryAyah.com (ملف لكل آية، والموقع بيسمح للتطبيق ياخد الصوت):
 *   Recite   التشغيل آية آية: الآية يلي عم تنقرا بتضوي بالمصحف والصفحة بتقلب لحالها، «تكرار الآية»،
 *            والتحكم من شاشة القفل وسماعات البلوتوث (Media Session). شريط صغير تحت الشاشة (ت1)،
 *            فوق «شريط الصفحات» بالمصحف، وبيضل لو سكّرت المصحف.
 *            البسملة قبل أول آية بكل سورة (إلا الفاتحة والتوبة) من ملف ١:١ لنفس القارئ.
 *   التلاوة بلا نت: تنزيل سورة سورة لكل قارئ (Cache API «mudhakkir-quran-audio-v1»؛ اسمو بيبلّش بـ
 *            mudhakkir-quran- فـ sw.js ما بيمسحو عند التحديث، متل صفحات المصحف).
 * صنع الفيديو (video.js) بياخد الصوت من هون: Recite.fetchAyah (من الجهاز إذا محفوظ، وإلا من النت).
 * يُحمَّل بعد reader.js و quran-tools.js و offline.js (QuranIndex)، وقبل main.js.
 * ===================================================================== */
const Recite = (() => {
    const $ = id => document.getElementById(id);
    const KEY = 'mudhakkir-recite', DL_KEY = 'mudhakkir-recite-dl';
    const STORE = 'mudhakkir-quran-audio-v1';
    const BASE = 'https://everyayah.com/data/';
    // kb: متوسط حجم الآية تقريبًا (لتقدير حجم السورة قبل التنزيل بس)
    const RECITERS = [
        { id: 'husary', name: 'محمود خليل الحصري', short: 'الحصري', dir: 'Husary_128kbps', kb: 240 },
        { id: 'minshawi', name: 'محمد صديق المنشاوي', note: 'مجوّد', short: 'المنشاوي', dir: 'Minshawy_Mujawwad_192kbps', kb: 450 },
        { id: 'afasy', name: 'مشاري راشد العفاسي', short: 'العفاسي', dir: 'Alafasy_128kbps', kb: 210 },
        { id: 'sowaid', name: 'أيمن رشدي سويد', short: 'أيمن سويد', dir: 'Ayman_Sowaid_64kbps', kb: 170 },
        { id: 'ajamy', name: 'أحمد بن علي العجمي', short: 'العجمي', dir: 'Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net', kb: 185 }
    ];
    const st = { rid: 'husary', repeat: false };
    try { Object.assign(st, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
    if (!RECITERS.some(r => r.id === st.rid)) st.rid = 'husary';
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ rid: st.rid, repeat: !!st.repeat })); } catch (e) {} };
    const rec = id => RECITERS.find(r => r.id === (id || st.rid)) || RECITERS[0];
    const pad = n => String(n).padStart(3, '0');
    const url = (s, a, rid) => `${BASE}${rec(rid).dir}/${pad(s)}${pad(a)}.mp3`;
    const count = s => (QuranIndex.COUNTS[s - 1] || 0);
    const ar = n => Number(n).toLocaleString('ar-EG-u-nu-latn');
    const mb = bytes => (bytes / 1048576 < 10 ? (bytes / 1048576).toFixed(1) : Math.round(bytes / 1048576)).toLocaleString('ar-EG-u-nu-latn');
    const needsBasmala = (s, a) => a === 1 && s !== 1 && s !== 9;
    // العدد: آية وحدة، آيتين، 3–10 آيات، 11 وفوق آية
    const ayat = n => (n === 1 ? 'آية وحدة' : n === 2 ? 'آيتين' : n <= 10 ? `${ar(n)} آيات` : `${ar(n)} آية`);
    const EN = typeof I18n !== 'undefined' && I18n.isEn;
    const sn = s => (EN ? I18n.surah(surahName(s)) : surahName(s));
    const hasCaches = typeof caches !== 'undefined';

    // ---------- الملفات: من الجهاز إذا محفوظة، وإلا من النت ----------
    async function cached(u) {
        if (!hasCaches) return null;
        try { return (await (await caches.open(STORE)).match(u)) || null; } catch (e) { return null; }
    }
    async function fetchAyah(s, a, rid) {
        const u = url(s, a, rid);
        const hit = await cached(u);
        if (hit) return hit;
        const r = await fetch(u);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r;
    }

    // ---------- التشغيل ----------
    const au = new Audio(); au.preload = 'auto';
    const pre = new Audio(); pre.preload = 'auto'; pre.muted = true;
    let cur = null, active = false, objUrl = '', token = 0;
    const itemUrl = (it, rid) => (it.bas ? url(1, 1, rid) : url(it.s, it.a, rid));
    async function srcFor(it) {
        const u = itemUrl(it), hit = await cached(u);
        if (objUrl) { URL.revokeObjectURL(objUrl); objUrl = ''; }
        if (hit) { objUrl = URL.createObjectURL(await hit.blob()); return objUrl; }
        return u;
    }
    function nextOf(it) {
        if (it.bas) return { s: it.s, a: it.a };
        if (it.a < count(it.s)) return { s: it.s, a: it.a + 1 };
        if (it.s < 114) { const s = it.s + 1; return { s, a: 1, bas: needsBasmala(s, 1) }; }
        return null;
    }
    function prevOf(it) {
        if (it.bas || it.a === 1) { if (it.s > 1) { const s = it.s - 1; return { s, a: count(s) }; } return { s: 1, a: 1 }; }
        return { s: it.s, a: it.a - 1 };
    }
    // الملف الجاي بينجهّز من هلّق (حتى ما يوقف بين الآيات)
    async function warm(it) {
        if (!it) return;
        const u = itemUrl(it);
        if (await cached(u)) return;
        if (pre.src !== u) { pre.src = u; try { pre.load(); } catch (e) {} }
    }
    async function playItem(it) {
        const my = ++token;
        cur = it; active = true;
        paint(); announce();
        let src;
        try { src = await srcFor(it); } catch (e) { src = itemUrl(it); }
        if (my !== token) return;
        au.src = src;
        try { await au.play(); } catch (e) { if (my === token) setPlaying(false); }
        warm(nextOf(it));
    }
    au.addEventListener('ended', () => {
        if (!active || !cur) return;
        if (st.repeat && !cur.bas) { au.currentTime = 0; au.play().catch(() => {}); return; }
        const n = nextOf(cur);
        if (n) playItem(n); else stop();
    });
    au.addEventListener('play', () => setPlaying(true));
    au.addEventListener('pause', () => setPlaying(false));
    au.addEventListener('error', () => {
        if (!active || !cur) return;
        setPlaying(false);
        Toast.show(navigator.onLine ? 'تعذّر تشغيل التلاوة، جرّب كمان شوي' : 'التلاوة بدّها نت، أو نزّل السورة من «التلاوة بلا نت»', 3600);
    });

    function start(s, a) {
        s = Math.max(1, Math.min(114, Number(s) || 1)); a = Math.max(1, Math.min(count(s), Number(a) || 1));
        // من برّا المصحف: منفتح المصحف عالصفحة
        if (typeof Reader !== 'undefined' && !Reader.isOpen()) Reader.openAt(QuranIndex.pageOf(s, a));
        playItem({ s, a, bas: needsBasmala(s, a) });
    }
    // زر 🎧 بالمصحف: إذا في تلاوة شغّالة بيوقّفها أو بيكمّلها، وإلا بيبلّش من أول آية بالصفحة
    function toggle() {
        if (active && cur) { if (au.paused) au.play().catch(() => {}); else au.pause(); return; }
        const k = typeof Reader !== 'undefined' && Reader.firstKey();
        const [s, a] = k ? k.split(':').map(Number) : [1, 1];
        playItem({ s, a, bas: needsBasmala(s, a) });
    }
    function stop() {
        token++;
        active = false; cur = null;
        try { au.pause(); au.removeAttribute('src'); au.load(); } catch (e) {}
        if (objUrl) { URL.revokeObjectURL(objUrl); objUrl = ''; }
        paint();
        if (typeof Reader !== 'undefined') Reader.playing(null, 0);
        if ('mediaSession' in navigator) { try { navigator.mediaSession.metadata = null; navigator.mediaSession.playbackState = 'none'; } catch (e) {} }
    }
    function setReciter(id) {
        if (!RECITERS.some(r => r.id === id) || id === st.rid) return;
        st.rid = id; save(); paint();
        if (active && cur) playItem(cur); // نفس الآية بالصوت الجديد
    }
    const step = dir => { if (!cur) return; const n = dir > 0 ? nextOf(cur) : prevOf(cur); if (n) playItem(n); };

    // ---------- الشريط (ت1) ----------
    const whereText = it => (EN ? (it.bas ? `${sn(it.s)} · Basmala` : `${sn(it.s)} · Ayah ${it.a}`)
        : it.bas ? `${surahName(it.s)} · البسملة` : `${surahName(it.s)} · الآية ${ar(it.a)}`);
    function paint() {
        const bar = $('rc-bar'); if (!bar) return;
        bar.hidden = !active;
        document.body.classList.toggle('is-reciting', active);
        $('rc-name').textContent = rec().short;
        $('rc-where').textContent = cur ? whereText(cur) : '';
        $('rc-rep').setAttribute('aria-pressed', String(!!st.repeat));
        // مكان الشريط بالمصحف: فوق «شريط الصفحات» (طولو بيختلف حسب نمطو)
        const pg = $('rd-pager');
        if (pg && document.body.classList.contains('reader-open')) document.documentElement.style.setProperty('--rd-pg-h', pg.offsetHeight + 'px');
    }
    function setPlaying(on) {
        const b = $('rc-pp'); if (!b) return;
        b.classList.toggle('is-playing', on);
        b.setAttribute('aria-label', on ? 'إيقاف مؤقت' : 'تشغيل');
        if ('mediaSession' in navigator) { try { navigator.mediaSession.playbackState = on ? 'playing' : 'paused'; } catch (e) {} }
    }
    // الآية يلي عم تنقرا: بتضوي بالمصحف، والصفحة بتقلب لحالها، وشاشة القفل بتعرف اسمها
    function announce() {
        if (!cur) return;
        if (typeof Reader !== 'undefined') Reader.playing(cur.bas ? null : `${cur.s}:${cur.a}`, QuranIndex.pageOf(cur.s, cur.a));
        if (!('mediaSession' in navigator)) return;
        try {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: whereText(cur), artist: rec().name, album: 'مُذكّر',
                artwork: [{ src: new URL('assets/img/icon-192.png', document.baseURI).href, sizes: '192x192', type: 'image/png' }]
            });
        } catch (e) {}
    }
    if ('mediaSession' in navigator) {
        const set = (a, fn) => { try { navigator.mediaSession.setActionHandler(a, fn); } catch (e) {} };
        set('play', () => au.play().catch(() => {}));
        set('pause', () => au.pause());
        set('nexttrack', () => step(1));
        set('previoustrack', () => step(-1));
        set('stop', () => stop());
    }

    // ---------- اختيار القارئ ----------
    function pickerView() {
        const v = qEl('div', 'rc-pick');
        const list = qEl('div', 'rc-opts'); list.setAttribute('role', 'radiogroup'); list.setAttribute('aria-label', 'القارئ');
        RECITERS.forEach(r => {
            const b = qEl('button', 'rc-opt'); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(r.id === st.rid));
            b.innerHTML = `<b>${qEsc(r.name)}</b>${r.note ? `<small>${qEsc(r.note)}</small>` : ''}`;
            b.addEventListener('click', () => { setReciter(r.id); QSheet.close(); });
            list.append(b);
        });
        const dl = qEl('button', 'glist-row rc-dl-link'); dl.type = 'button';
        dl.innerHTML = '<strong>التلاوة بلا نت</strong><small>نزّل سور بصوت القارئ لتسمعها بلا نت</small>';
        dl.addEventListener('click', () => QSheet.push('التلاوة بلا نت', downloadView()));
        const more = qEl('div', 'glist rc-more'); more.append(dl);
        v.append(list, more);
        return v;
    }
    const openPicker = () => QSheet.open('القارئ', pickerView());

    // ---------- التلاوة بلا نت: سورة سورة ----------
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(DL_KEY)) || {}; } catch (e) {}
    const persist = () => { try { localStorage.setItem(DL_KEY, JSON.stringify(saved)); } catch (e) {} };
    const savedBytes = (rid, s) => (saved[rid] && saved[rid][s]) || 0;
    let job = null; // { rid, s, done, total, cancel }
    const listeners = new Set();
    const notify = () => listeners.forEach(fn => { try { fn(); } catch (e) {} });
    async function downloadSurah(rid, s) {
        if (job) { Toast.show('في تنزيل شغّال، استنّى يخلص'); return; }
        if (!hasCaches) { Toast.show('متصفحك ما بيقدر يحفظ التلاوة'); return; }
        if (!navigator.onLine) { Toast.show('بدّك نت لتنزيل التلاوة'); return; }
        const urls = [];
        for (let a = 1; a <= count(s); a++) urls.push(url(s, a, rid));
        if (needsBasmala(s, 1)) urls.push(url(1, 1, rid));
        job = { rid, s, done: 0, total: urls.length, cancel: false };
        notify();
        const cache = await caches.open(STORE);
        let i = 0, bytes = 0, failed = 0;
        const worker = async () => {
            while (i < urls.length && !job.cancel) {
                const u = urls[i++];
                try {
                    const hit = await cache.match(u);
                    if (hit) bytes += Number(hit.headers.get('content-length')) || 0;
                    else {
                        const res = await fetch(u);
                        if (!res.ok) throw new Error('HTTP ' + res.status);
                        const blob = await res.blob();
                        bytes += blob.size;
                        await cache.put(u, new Response(blob, { headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': String(blob.size) } }));
                    }
                } catch (e) { failed++; }
                job.done++;
                if (job.done % 3 === 0 || job.done === job.total) notify();
            }
        };
        await Promise.all([worker(), worker(), worker()]);
        const cancelled = job.cancel;
        job = null;
        if (cancelled) { notify(); return; }
        if (failed) { Toast.show(`ما كمل التنزيل (${ar(failed)} آية). تأكد من النت وجرّب كمان مرة`, 3600); notify(); return; }
        (saved[rid] || (saved[rid] = {}))[s] = bytes || 1;
        persist();
        try { await navigator.storage?.persist?.(); } catch (e) {}
        Toast.show(`انحفظت سورة ${surahName(s)} بصوت ${rec(rid).short} ✓`);
        notify();
    }
    async function removeSurah(rid, s) {
        if (hasCaches) {
            try { const c = await caches.open(STORE); await Promise.all(Array.from({ length: count(s) }, (_, k) => c.delete(url(s, k + 1, rid)))); } catch (e) {}
        }
        if (saved[rid]) { delete saved[rid][s]; persist(); }
        notify();
    }
    function downloadView() {
        const r = rec(), v = qEl('div', 'rc-dl');
        const lead = qEl('p', 'rc-dl-lead', `سور بصوت ${r.short}${r.note ? ' (' + r.note + ')' : ''}، كل سورة لحالها. بعد التنزيل بتسمعها بلا نت، وبتشتغل بصنع الفيديو كمان.`);
        const list = qEl('div', 'glist rc-dl-list');
        const curS = cur ? cur.s : (typeof Reader !== 'undefined' && Reader.firstKey() ? Number(Reader.firstKey().split(':')[0]) : 0);
        const order = curS ? [curS, ...Array.from({ length: 114 }, (_, k) => k + 1).filter(x => x !== curS)] : Array.from({ length: 114 }, (_, k) => k + 1);
        function row(s) {
            const b = savedBytes(r.id, s), busy = job && job.rid === r.id && job.s === s;
            const est = Math.max(1, count(s) * r.kb * 1024);
            const sub = EN ? (busy ? `Downloading… ${job.done} of ${job.total}` : b ? `Saved ✓ · ${mb(b)} MB` : `${count(s)} ayat · about ${mb(est)} MB`)
                : busy ? `جارٍ التنزيل… ${ar(job.done)} من ${ar(job.total)}`
                : b ? `محفوظة ✓ · ${mb(b)} ميغا` : `${ayat(count(s))} · حوالي ${mb(est)} ميغا`;
            const btn = busy ? 'إلغاء' : b ? 'احذف' : 'نزّل';
            return `<div class="rc-dl-row${b ? ' is-saved' : ''}${busy ? ' is-busy' : ''}" data-s="${s}"><span><strong>${qEsc(sn(s))}${s === curS ? ' <em>هلّق</em>' : ''}</strong><small>${sub}</small></span><button type="button" class="rc-dl-btn" data-act="${busy ? 'cancel' : b ? 'del' : 'get'}">${btn}</button></div>`;
        }
        const paintList = () => { list.innerHTML = order.map(row).join(''); };
        list.addEventListener('click', e => {
            const b = e.target.closest('[data-act]'); if (!b) return;
            const s = Number(b.closest('[data-s]').dataset.s);
            if (b.dataset.act === 'get') downloadSurah(r.id, s);
            else if (b.dataset.act === 'cancel') { if (job) job.cancel = true; }
            else if (b.dataset.act === 'del') removeSurah(r.id, s);
        });
        const onChange = () => { if (!list.isConnected) { listeners.delete(onChange); return; } paintList(); };
        listeners.add(onChange);
        paintList();
        v.append(lead, list);
        return v;
    }
    const openDownloads = () => QSheet.open('التلاوة بلا نت', downloadView());

    // ---------- الربط ----------
    function init() {
        $('rc-pp')?.addEventListener('click', () => { if (!cur) return; if (au.paused) au.play().catch(() => {}); else au.pause(); });
        $('rc-who')?.addEventListener('click', openPicker);
        $('rc-rep')?.addEventListener('click', () => { st.repeat = !st.repeat; save(); paint(); Toast.show(st.repeat ? 'تكرار الآية: شغّال' : 'تكرار الآية: طافي'); });
        $('rc-x')?.addEventListener('click', stop);
        $('q-recite-dl')?.addEventListener('click', openDownloads);
        addEventListener('resize', () => { if (active) paint(); });
        paint();
    }
    return { init, start, toggle, stop, setReciter, openPicker, openDownloads, fetchAyah, url, rec, isActive: () => active, RECITERS, get rid() { return st.rid; } };
})();
