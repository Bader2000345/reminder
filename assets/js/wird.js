/* =====================================================================
 * مُذكّر — wird.js
 * الورد اليومي وختمة القرآن: الخطة، التقدم، السلسلة، بيانات المصحف (QuranData)، والإشعار العائم (Toast).
 * يُحمَّل بالترتيب من index.html؛ الأجزاء تتشارك المتغيرات العامة فيما بينها.
 * ===================================================================== */

// 4. الورد اليومي بآلية «الختمة»: خطة (مدة أو ورد يومي) + موضع قراءة محفوظ + ورد يتجدد كل يوم
const WIRD_STREAK_KEY = 'mudhakkir-wird-streak';
const SURAH_NAMES = ['الفاتحة','البقرة','آل عمران','النساء','المائدة','الأنعام','الأعراف','الأنفال','التوبة','يونس','هود','يوسف','الرعد','إبراهيم','الحجر','النحل','الإسراء','الكهف','مريم','طه','الأنبياء','الحج','المؤمنون','النور','الفرقان','الشعراء','النمل','القصص','العنكبوت','الروم','لقمان','السجدة','الأحزاب','سبأ','فاطر','يس','الصافات','ص','الزمر','غافر','فصلت','الشورى','الزخرف','الدخان','الجاثية','الأحقاف','محمد','الفتح','الحجرات','ق','الذاريات','الطور','النجم','القمر','الرحمن','الواقعة','الحديد','المجادلة','الحشر','الممتحنة','الصف','الجمعة','المنافقون','التغابن','الطلاق','التحريم','الملك','القلم','الحاقة','المعارج','نوح','الجن','المزمل','المدثر','القيامة','الإنسان','المرسلات','النبأ','النازعات','عبس','التكوير','الانفطار','المطففين','الانشقاق','البروج','الطارق','الأعلى','الغاشية','الفجر','البلد','الشمس','الليل','الضحى','الشرح','التين','العلق','القدر','البينة','الزلزلة','العاديات','القارعة','التكاثر','العصر','الهمزة','الفيل','قريش','الماعون','الكوثر','الكافرون','النصر','المسد','الإخلاص','الفلق','الناس'];
function formatAr(n) { return Number(n).toLocaleString('ar-EG'); }
function streakData() { try { return JSON.parse(localStorage.getItem(WIRD_STREAK_KEY)) || {days:0,last:''}; } catch(e) { return {days:0,last:''}; } }
function markWirdDay() { const d=new Date(), key=`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; const st=streakData(); if(st.last===key) return st; const prev=new Date(d); prev.setDate(d.getDate()-1); const pk=`${prev.getFullYear()}-${prev.getMonth()+1}-${prev.getDate()}`; st.days = st.last===pk ? Number(st.days||0)+1 : 1; st.last=key; try{localStorage.setItem(WIRD_STREAK_KEY,JSON.stringify(st));}catch(e){} return st; }
let feedbackAudioContext = null;
function playWirdFeedback(){
    try { feedbackAudioContext ||= new (window.AudioContext || window.webkitAudioContext)(); const ctx=feedbackAudioContext, osc=ctx.createOscillator(), gain=ctx.createGain(); osc.type='sine'; osc.frequency.setValueAtTime(620,ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(820,ctx.currentTime+.12); gain.gain.setValueAtTime(.0001,ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.045,ctx.currentTime+.015); gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.16); osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime+.17); } catch(e) {}
    try { if (navigator.vibrate) navigator.vibrate([18, 24, 28]); } catch(e) {}
}

// صيغة عدد الأيام بالعربية: يوم / يومان / ٣ أيام / ١١ يوماً
function daysLabel(n) {
    if (n === 1) return 'يوم';
    if (n === 2) return 'يومان';
    return `${formatAr(n)} ${n >= 3 && n <= 10 ? 'أيام' : 'يوماً'}`;
}

const Toast = (() => {
    let timer = 0;
    return {
        show(message, ms = 2800) {
            const el = document.getElementById('toast');
            if (!el) return;
            el.textContent = message;
            el.classList.add('show');
            clearTimeout(timer);
            timer = setTimeout(() => el.classList.remove('show'), ms);
        }
    };
})();

// بيانات المصحف المشتركة بين الورد اليومي ووضع القراءة (صفحات مصحف المدينة: ٦٠٤)
const QuranData = (() => {
    const TOTAL_PAGES = 604;
    const API = 'https://api.alquran.cloud/v1/page/';
    const BASMALA = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
    // أول صفحة لكل سورة (١١٤ سورة)
    const SURAH_START_PAGES = [1, 2, 50, 77, 106, 128, 151, 177, 187, 208, 221, 235, 249, 255, 262, 267, 282, 293, 305, 312, 322, 332, 342, 350, 359, 367, 377, 385, 396, 404, 411, 415, 418, 428, 434, 440, 446, 453, 458, 467, 477, 483, 489, 496, 499, 502, 507, 511, 515, 518, 520, 523, 526, 528, 531, 534, 537, 542, 545, 549, 551, 553, 554, 556, 558, 560, 562, 564, 566, 568, 570, 572, 574, 575, 577, 578, 580, 582, 583, 585, 586, 587, 587, 589, 590, 591, 591, 592, 593, 594, 595, 595, 596, 596, 597, 597, 598, 598, 599, 599, 600, 600, 601, 601, 601, 602, 602, 602, 603, 603, 603, 604, 604, 604];
    const STORE_PREFIX = 'mudhakkir-qp1-';
    const cache = new Map();
    const inflight = new Map();
    const stripMarks = word => word.replace(/[\u064B-\u065F\u0670\u0640]/g, '');

    const clampPage = n => Math.max(1, Math.min(TOTAL_PAGES, Math.trunc(Number(n)) || 1));
    // رقم الصفحة بعد قراءة `count` صفحة منذ صفحة البداية (مع الالتفاف بعد صفحة ٦٠٤)
    const pageAt = (startPage, count) => ((startPage - 1 + count) % TOTAL_PAGES + TOTAL_PAGES) % TOTAL_PAGES + 1;
    const juzOfPage = page => Math.min(30, page <= 21 ? 1 : Math.floor((page - 2) / 20) + 1);
    const surahStartPage = number => SURAH_START_PAGES[Math.max(1, Math.min(114, number)) - 1];
    // تقريب احتياطي إلى أن تصل بيانات الصفحة
    const surahAtPage = page => SURAH_START_PAGES.reduce((found, start, i) => (start <= page ? i + 1 : found), 1);

    const normalize = rows => rows.map(r => ({ text: r.t, numberInSurah: r.n, juz: r.j, surah: { number: r.s, name: r.sn } }));
    function readStored(n) {
        try {
            const rows = JSON.parse(localStorage.getItem(STORE_PREFIX + n));
            return Array.isArray(rows) && rows.length ? rows : null;
        } catch (e) { return null; }
    }
    function writeStored(n, rows) {
        try { localStorage.setItem(STORE_PREFIX + n, JSON.stringify(rows)); } catch (e) { /* التخزين ممتلئ: نتجاوز بصمت */ }
    }
    async function fetchRows(n) {
        const res = await fetch(`${API}${n}/quran-uthmani`);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        const ayahs = json && json.data && json.data.ayahs;
        if (!Array.isArray(ayahs) || !ayahs.length) throw new Error('Bad payload');
        return ayahs.map(a => {
            const row = { t: a.text, n: a.numberInSurah, s: a.surah.number, j: a.juz };
            if (a.numberInSurah === 1) row.sn = a.surah.name;
            return row;
        });
    }
    function getPage(n) {
        n = clampPage(n);
        if (cache.has(n)) return Promise.resolve(cache.get(n));
        if (!inflight.has(n)) {
            const job = (async () => {
                let rows = readStored(n);
                if (!rows) { rows = await fetchRows(n); writeStored(n, rows); }
                const ayahs = normalize(rows);
                cache.set(n, ayahs);
                return ayahs;
            })().finally(() => inflight.delete(n));
            inflight.set(n, job);
        }
        return inflight.get(n);
    }

    // أول آية في السورة (عدا الفاتحة والتوبة) تبدأ في النص بالبسملة؛ نعرضها منفصلة
    const hasBasmalaHeader = a => a.numberInSurah === 1 && a.surah.number !== 1 && a.surah.number !== 9;
    function verseText(a) {
        if (!hasBasmalaHeader(a)) return a.text;
        const words = a.text.split(' ');
        return stripMarks(words[0]) === 'بسم' ? words.slice(4).join(' ') : a.text;
    }

    return { TOTAL_PAGES, BASMALA, SURAH_START_PAGES, getPage, hasBasmalaHeader, verseText, pageAt, juzOfPage, surahStartPage, surahAtPage };
})();

const Wird = (() => {
    const KEY = 'mudhakkir-wird-v2';
    const TOTAL = QuranData.TOTAL_PAGES;
    const MAX_PAGES_PER_DAY = 100;
    const MIN_DAYS = 7;
    const MAX_DAYS = 730;
    const DEFAULT_DAYS = 30;
    const DURATION_PRESETS = [7, 10, 15, 20, 30, 45, 60, 90, 120, 180, 365];
    const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
    const $ = id => document.getElementById(id);
    const fmt = n => Number(n).toLocaleString('ar-EG');
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    // ---------- التواريخ ----------
    const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayNumber = key => { const [y, m, d] = key.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };
    const daysBetween = (from, to) => dayNumber(to) - dayNumber(from);
    const addDays = (key, n) => { const t = new Date((dayNumber(key) + n) * 86400000); return new Date(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()); };
    const longDate = date => date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });

    // ---------- الحالة ----------
    // readCount: عدد الصفحات المكتملة منذ بداية الختمة (٠–٦٠٤) · verseIdx: آيات مكتملة في الصفحة الحالية
    const blankState = () => ({ v: 2, mode: 'duration', days: DEFAULT_DAYS, pagesPerDay: Math.ceil(TOTAL / DEFAULT_DAYS), planDate: dayKey(), startPage: 1, readCount: 0, verseIdx: 0, pageLen: 0, khatmas: 0, today: null, pos: null });
    function sanitize(raw) {
        const s = blankState();
        if (!raw || typeof raw !== 'object') return s;
        const int = (v, lo, hi, fallback) => (Number.isFinite(Number(v)) ? clamp(Math.trunc(Number(v)), lo, hi) : fallback);
        s.mode = raw.mode === 'daily' ? 'daily' : 'duration';
        s.days = int(raw.days, MIN_DAYS, MAX_DAYS, s.days);
        s.pagesPerDay = int(raw.pagesPerDay, 1, MAX_PAGES_PER_DAY, s.pagesPerDay);
        if (DATE_RE.test(raw.planDate)) s.planDate = raw.planDate;
        s.startPage = int(raw.startPage, 1, TOTAL, 1);
        s.readCount = int(raw.readCount, 0, TOTAL, 0);
        s.verseIdx = s.readCount >= TOTAL ? 0 : int(raw.verseIdx, 0, 400, 0);
        s.pageLen = int(raw.pageLen, 0, 400, 0);
        s.khatmas = int(raw.khatmas, 0, 9999, 0);
        const t = raw.today;
        if (t && DATE_RE.test(t.date)) s.today = { date: t.date, fromCount: int(t.fromCount, 0, TOTAL, 0), pages: int(t.pages, 0, TOTAL, 0), done: !!t.done };
        const p = raw.pos;
        if (p && Number.isFinite(p.surah) && Number.isFinite(p.page)) s.pos = { surah: int(p.surah, 1, 114, 1), juz: int(p.juz, 1, 30, 1), page: int(p.page, 1, TOTAL, 1) };
        return s;
    }
    function load() {
        try { const raw = localStorage.getItem(KEY); if (raw) return sanitize(JSON.parse(raw)); } catch (e) { /* بيانات تالفة: نبدأ من جديد */ }
        return blankState();
    }
    let S = blankState();
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* تجاهل */ } };

    const isComplete = () => S.readCount >= TOTAL;
    const pageNo = count => QuranData.pageAt(S.startPage, Math.min(count, TOTAL - 1));
    const partialOfPage = () => (S.pageLen > 0 ? Math.min(1, S.verseIdx / S.pageLen) : 0);

    // كمية ورد اليوم: ثابتة في وضع «الورد اليومي»، ومحسوبة من المتبقي والأيام المتبقية في وضع «المدة»
    function amountFor(baseline) {
        const remaining = TOTAL - baseline;
        if (remaining <= 0) return 0;
        if (S.mode === 'daily') return Math.min(S.pagesPerDay, remaining);
        const elapsed = Math.max(0, daysBetween(S.planDate, dayKey()));
        const daysLeft = Math.max(1, S.days - elapsed);
        return Math.min(MAX_PAGES_PER_DAY, remaining, Math.ceil(remaining / daysLeft));
    }
    function ensureToday() {
        const key = dayKey();
        if (S.today && S.today.date === key) return false;
        S.today = { date: key, fromCount: S.readCount, pages: amountFor(S.readCount), done: isComplete() };
        return true;
    }
    function todayFraction() {
        const t = S.today;
        if (t.done || t.pages <= 0) return 1;
        return clamp((S.readCount - t.fromCount + partialOfPage()) / t.pages, 0, 1);
    }
    const khatmaFraction = () => (isComplete() ? 1 : clamp((S.readCount + partialOfPage()) / TOTAL, 0, 1));
    function planDays() {
        const dayN = Math.max(1, daysBetween(S.planDate, dayKey()) + 1);
        const totalDays = S.mode === 'daily'
            ? dayN - 1 + Math.max(1, Math.ceil((TOTAL - S.today.fromCount) / S.pagesPerDay))
            : Math.max(S.days, dayN);
        return { dayN, totalDays };
    }
    function rangeInfo() {
        const t = S.today;
        const last = Math.max(t.fromCount, Math.min(TOTAL, t.fromCount + t.pages) - 1);
        return { from: pageNo(t.fromCount), to: pageNo(last), pages: t.pages };
    }

    // ---------- مؤشر العرض (قد يسبق أو يتأخر عن التقدم الفعلي للمراجعة) ----------
    let view = { count: 0, idx: 0 };
    let current = null;
    let token = 0;
    let rangeToken = 0;
    let rangeTitle = '';

    function resetView() {
        if (isComplete()) view = { count: TOTAL - 1, idx: -1 };
        else if (S.today.done) view = { count: S.readCount - 1, idx: -1 };
        else view = { count: S.readCount, idx: S.verseIdx };
    }
    const atEnd = () => !!(current && S.today.done && view.count === S.readCount - 1 && view.idx === current.ayahs.length - 1);
    function isBehind() {
        if (S.today.done) return !atEnd();
        return view.count < S.readCount || (view.count === S.readCount && view.idx < S.verseIdx);
    }
    const canGoBack = () => view.idx > 0 || view.count > S.today.fromCount;

    // ---------- العرض ----------
    function paintVerse(el, ayah) {
        el.replaceChildren();
        if (QuranData.hasBasmalaHeader(ayah)) {
            const b = document.createElement('span');
            b.className = 'verse-basmala';
            b.textContent = QuranData.BASMALA;
            el.append(b);
        }
        el.append(document.createTextNode(QuranData.verseText(ayah)));
    }
    const surahTitle = number => `سورة ${SURAH_NAMES[number - 1]}`;
    const titleFor = (a, b) => (a === b ? surahTitle(a) : `من ${surahTitle(a)} إلى ${surahTitle(b)}`);

    function renderHeader() {
        const title = $('wird-title-display'), details = $('wird-details-display');
        if (isComplete()) {
            title.textContent = 'ما شاء الله، أتممت الختمة ✓';
            details.textContent = 'تقبّل الله منك — ابدأ ختمة جديدة متى شئت';
            return;
        }
        const r = rangeInfo(), { dayN, totalDays } = planDays();
        const pages = r.from === r.to ? `الصفحة ${fmt(r.from)}` : `الصفحات ${fmt(r.from)} – ${fmt(r.to)}`;
        const ja = QuranData.juzOfPage(r.from), jb = QuranData.juzOfPage(r.to);
        const juz = ja === jb ? `الجزء ${fmt(ja)}` : `الجزء ${fmt(ja)} – ${fmt(jb)}`;
        title.textContent = rangeTitle || titleFor(QuranData.surahAtPage(r.from), QuranData.surahAtPage(r.to));
        details.textContent = `${pages} · ${juz} · اليوم ${fmt(dayN)} من ${fmt(totalDays)}`;
    }
    function renderProgress() {
        const t = S.today, pct = Math.round(todayFraction() * 100);
        const done = isComplete() ? TOTAL : clamp(S.readCount - t.fromCount, 0, t.pages);
        const total = isComplete() ? TOTAL : t.pages;
        $('wird-live-progress').style.width = pct + '%';
        $('wird-progress-label').textContent = isComplete() ? 'ختمة كاملة' : `${fmt(done)} / ${fmt(total)} صفحة`;
        $('wird-total-target').textContent = fmt(total);
        $('wird-khatma-display').textContent = daysLabel(planDays().totalDays);
    }
    function renderKhatma() {
        const pct = Math.round(khatmaFraction() * 100);
        $('khatma-percent').textContent = `${fmt(pct)}٪`;
        $('khatma-progress').style.width = pct + '%';
        const meta = $('khatma-meta');
        if (isComplete()) { meta.textContent = `ختمات مكتملة: ${fmt(S.khatmas)} · تقبّل الله منك`; return; }
        const end = longDate(addDays(S.planDate, planDays().totalDays - 1));
        meta.textContent = `قرأت ${fmt(S.readCount)} من ${fmt(TOTAL)} صفحة · المتبقي ${fmt(TOTAL - S.readCount)} · تنتهي بإذن الله في ${end}`;
    }
    function renderStreak() {
        const st = streakData(), badge = $('wird-badge');
        $('wird-streak-text').textContent = st.days ? `أنت مستمر منذ ${formatAr(st.days)} يوم${st.days === 1 ? '' : 'اً'}` : 'استمرارية الورد تبدأ اليوم';
        $('wird-streak-sub').textContent = st.days >= 30 ? 'وسام الختمة الشهرية جاهز لك' : st.days >= 7 ? 'أسبوع كامل من الثبات — أحسنت' : 'أتمم وردك اليوم لتحافظ على سلسلتك';
        badge.classList.toggle('visible', st.days >= 7);
        badge.textContent = st.days >= 30 ? 'وسام ٣٠ يوماً' : 'وسام ٧ أيام متتالية';
    }
    function renderDashboard() {
        const t = S.today, pct = Math.round(todayFraction() * 100);
        const page = pageNo(S.readCount);
        const pos = S.pos || { surah: QuranData.surahAtPage(page), juz: QuranData.juzOfPage(page), page };
        const { dayN, totalDays } = planDays();
        $('dashboard-wird-label').textContent = isComplete() ? 'ختمة مكتملة' : `وردك القرآني · اليوم ${fmt(dayN)} من ${fmt(totalDays)}`;
        $('dashboard-progress-percent').textContent = `${fmt(pct)}٪`;
        $('dashboard-progress-bar').style.width = pct + '%';
        $('dashboard-quran-page').textContent = `${fmt(page)} من ${fmt(TOTAL)}`;
        $('dashboard-resume-surah').textContent = surahTitle(pos.surah);
        const r = rangeInfo();
        const state = isComplete() ? 'أتممت الختمة ✓' : t.done ? 'أتممت وردك اليوم ✓' : `وردك اليوم: ${fmt(r.from)} – ${fmt(r.to)}`;
        $('dashboard-resume-meta').textContent = `الجزء ${fmt(pos.juz)} · ${state}`;
    }
    function renderBanner() {
        const banner = $('wird-finished-msg'), t = S.today;
        banner.style.display = t.done ? 'block' : 'none';
        if (t.done) banner.textContent = isComplete() ? '🎉 ما شاء الله! أتممت ختمة القرآن الكريم كاملة، تقبّل الله منك.' : `🎉 تقبّل الله طاعتك! أتممت وردك اليوم (${fmt(t.pages)} صفحة).`;
        $('wird-new-khatma').hidden = !isComplete();
    }
    function renderControls() {
        const next = $('next-verse-btn'), focusNext = $('focus-complete-btn');
        const finished = S.today.done && atEnd();
        next.disabled = finished || !current;
        focusNext.disabled = next.disabled;
        next.innerHTML = finished ? 'اكتمل الورد ✓' : isBehind() ? 'التالية' : 'أتممت هذه الآية <span aria-hidden="true">✓</span>';
        focusNext.textContent = finished ? 'اكتمل الورد ✓' : isBehind() ? 'التالية' : 'أتممت هذه الآية · التالية';
        $('prev-verse-btn').disabled = !canGoBack();
        $('wird-page-btn').disabled = S.today.done || isComplete() || !current;
    }
    function renderAll() {
        renderHeader(); renderProgress(); renderKhatma(); renderStreak(); renderDashboard(); renderBanner(); renderControls();
    }

    function showLoadError() {
        const el = $('single-verse-text');
        el.replaceChildren();
        const box = document.createElement('div');
        box.className = 'wird-error';
        const msg = document.createElement('span');
        msg.textContent = 'تعذّر تحميل الورد. تأكد من الاتصال بالإنترنت.';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'primary-button';
        btn.textContent = 'إعادة المحاولة';
        btn.addEventListener('click', showView);
        box.append(msg, btn);
        el.append(box);
        current = null;
        renderControls();
    }

    async function showView() {
        const my = ++token, verseEl = $('single-verse-text');
        if (!current || current.count !== view.count) verseEl.textContent = 'جارٍ تحميل الآية الكريمة...';
        let ayahs;
        try { ayahs = await QuranData.getPage(pageNo(view.count)); }
        catch (e) { if (my === token) showLoadError(); return; }
        if (my !== token) return;
        current = { count: view.count, ayahs };
        view.idx = view.idx < 0 ? ayahs.length - 1 : Math.min(view.idx, ayahs.length - 1);
        const atReached = view.count === S.readCount || (S.today.done && view.count === S.readCount - 1);
        if (view.count === S.readCount && !isComplete()) {
            S.verseIdx = Math.min(S.verseIdx, ayahs.length - 1);
            S.pageLen = ayahs.length;
        }
        const ayah = ayahs[view.idx];
        paintVerse(verseEl, ayah);
        $('verse-badge-num').textContent = `${SURAH_NAMES[ayah.surah.number - 1]} · الآية ${fmt(ayah.numberInSurah)}`;
        $('verse-page-note').textContent = `الصفحة ${fmt(pageNo(view.count))} · الجزء ${fmt(ayah.juz || QuranData.juzOfPage(pageNo(view.count)))}`;
        $('wird-current-aya-num').textContent = fmt(ayah.numberInSurah);
        paintVerse($('focus-verse-text'), ayah);
        $('focus-verse-badge').textContent = $('verse-badge-num').textContent;
        if (atReached) { S.pos = { surah: ayah.surah.number, juz: ayah.juz || QuranData.juzOfPage(pageNo(view.count)), page: pageNo(view.count) }; save(); }
        renderAll();
        if (view.count + 1 < TOTAL) QuranData.getPage(pageNo(view.count + 1)).catch(() => {});
    }

    async function refreshRangeTitle() {
        const my = ++rangeToken;
        if (isComplete()) return;
        const r = rangeInfo();
        rangeTitle = titleFor(QuranData.surahAtPage(r.from), QuranData.surahAtPage(r.to));
        renderHeader();
        try {
            const [first, last] = await Promise.all([QuranData.getPage(r.from), QuranData.getPage(r.to)]);
            if (my !== rangeToken) return;
            rangeTitle = titleFor(first[0].surah.number, last[last.length - 1].surah.number);
            renderHeader();
        } catch (e) { /* نُبقي العنوان التقريبي */ }
    }

    // ---------- التقدم ----------
    function finishDay(khatmaDone) {
        S.today.done = true;
        markWirdDay();
        if (khatmaDone) S.khatmas += 1;
        Toast.show(khatmaDone ? 'ما شاء الله! أتممت الختمة، تقبّل الله منك' : 'تقبّل الله طاعتك، أتممت وردك اليوم');
    }
    function completePageCore() {
        S.readCount += 1; S.verseIdx = 0; S.pageLen = 0;
        if (S.readCount >= TOTAL) finishDay(true);
        else if (S.readCount >= S.today.fromCount + S.today.pages) finishDay(false);
    }
    function celebrate(label) {
        const card = document.querySelector('.single-verse-display');
        card?.classList.remove('reading-bump'); void card?.offsetWidth; card?.classList.add('reading-bump');
        const plus = $('wird-float-plus');
        plus.textContent = label;
        plus.classList.remove('show'); void plus.offsetWidth; plus.classList.add('show');
    }
    function afterProgress(label) {
        celebrate(label);
        resetView(); save(); renderAll(); showView();
    }

    async function stepForward() {
        if (!current) return;
        if (view.idx + 1 < current.ayahs.length) view.idx += 1;
        else { view.count += 1; view.idx = 0; }
        await showView();
    }
    async function stepBack() {
        if (!canGoBack()) return;
        if (view.idx > 0) view.idx -= 1;
        else { view.count -= 1; view.idx = -1; }
        await showView();
    }
    async function advance() {
        if (!current) return;
        if (isBehind()) { await stepForward(); return; }
        if (S.today.done) return;
        playWirdFeedback();
        DailyStats.add('wirdVerses', 1);
        S.verseIdx += 1;
        S.pageLen = current.ayahs.length;
        if (S.verseIdx >= S.pageLen) completePageCore();
        afterProgress('+١ آية');
    }
    async function completePage() {
        if (!current || S.today.done || isComplete()) return;
        if (isBehind()) {
            const next = view.count + 1;
            view = next >= S.readCount ? { count: S.readCount, idx: S.verseIdx } : { count: next, idx: 0 };
            await showView();
            return;
        }
        playWirdFeedback();
        DailyStats.add('wirdVerses', Math.max(1, current.ayahs.length - S.verseIdx));
        completePageCore();
        afterProgress('+١ صفحة');
    }
    // تقدّم المستخدم صفحة تلو الأخرى في المصحف على صفحة وِرده الحالية
    function onReaderAdvance(fromPage) {
        if (isComplete() || S.today.done || fromPage !== pageNo(S.readCount)) return;
        const len = current && current.count === S.readCount ? current.ayahs.length : S.pageLen || 1;
        DailyStats.add('wirdVerses', Math.max(1, len - S.verseIdx));
        completePageCore();
        resetView(); save(); renderAll(); showView();
    }
    function readerStartPage() {
        if (isComplete()) return pageNo(TOTAL - 1);
        return pageNo(S.today.done ? S.readCount - 1 : S.readCount);
    }

    // ---------- نافذة الخطة ----------
    let formMode = 'duration';
    function fillSurahSelect() {
        const sel = $('input-wird-sura');
        if (sel.options.length) return;
        SURAH_NAMES.forEach((name, i) => sel.append(new Option(`${i + 1}. سورة ${name}`, i + 1)));
    }
    function setMode(mode) {
        formMode = mode;
        document.querySelectorAll('#wird-mode [data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
        $('wird-duration-field').hidden = mode !== 'duration';
        $('wird-daily-field').hidden = mode !== 'daily';
        syncFields();
    }
    function syncFields() {
        const custom = formMode === 'duration' && $('input-wird-days').value === 'custom';
        $('wird-custom-days-field').hidden = !custom;
        $('input-wird-custom-days').required = custom;
        $('input-wird-pages').required = formMode === 'daily';
        $('wird-surah-field').hidden = $('input-wird-start').value !== 'surah';
    }
    // تاريخ الختم ⇄ عدد الأيام
    function syncEndDate() {
        const end = $('input-wird-end-date');
        const n = clamp(Math.trunc(Number($('input-wird-custom-days').value)) || DEFAULT_DAYS, MIN_DAYS, MAX_DAYS);
        end.min = dayKey(addDays(dayKey(), MIN_DAYS - 1));
        end.max = dayKey(addDays(dayKey(), MAX_DAYS - 1));
        Picker.setValue(end, dayKey(addDays(dayKey(), n - 1)), false);
    }
    function onEndDate() {
        const v = $('input-wird-end-date').value; if (!v) return;
        $('input-wird-custom-days').value = clamp(daysBetween(dayKey(), v) + 1, MIN_DAYS, MAX_DAYS);
        syncEndDate(); updatePreview();
    }
    function readForm() {
        const sel = $('input-wird-days').value;
        const days = sel === 'custom' ? clamp(Math.trunc(Number($('input-wird-custom-days').value)) || DEFAULT_DAYS, MIN_DAYS, MAX_DAYS) : Number(sel);
        const pagesPerDay = clamp(Math.trunc(Number($('input-wird-pages').value)) || 20, 1, MAX_PAGES_PER_DAY);
        return { mode: formMode, days, pagesPerDay, start: $('input-wird-start').value, surah: Number($('input-wird-sura').value) || 1 };
    }
    function updatePreview() {
        const f = readForm();
        const baseline = f.start === 'continue' ? S.today.fromCount : 0;
        const remaining = TOTAL - baseline;
        const pages = f.mode === 'daily' ? f.pagesPerDay : Math.ceil(remaining / f.days);
        const days = f.mode === 'daily' ? Math.ceil(remaining / f.pagesPerDay) : f.days;
        const juz = pages >= 5 ? ` (≈ ${(Math.round(pages / 20 * 10) / 10).toLocaleString('ar-EG')} جزء)` : '';
        $('wird-plan-preview').textContent = `وردك ${fmt(pages)} صفحة يوميًا${juz} · تنتهي الختمة خلال ${daysLabel(days)} بإذن الله، في ${longDate(addDays(dayKey(), days - 1))}.`;
    }
    function openPlanModal(fresh = false) {
        fillSurahSelect();
        const canContinue = !fresh && !isComplete() && (S.readCount > 0 || S.verseIdx > 0);
        const start = $('input-wird-start');
        start.replaceChildren();
        if (canContinue) start.append(new Option('متابعة من موضعي الحالي', 'continue'));
        start.append(new Option('من بداية المصحف (سورة الفاتحة)', 'beginning'), new Option('من سورة محددة', 'surah'));
        start.value = canContinue ? 'continue' : 'beginning';
        $('input-wird-days').value = DURATION_PRESETS.includes(S.days) ? String(S.days) : 'custom';
        $('input-wird-custom-days').value = S.days;
        syncEndDate();
        $('input-wird-pages').value = S.pagesPerDay;
        $('input-wird-sura').value = S.pos ? S.pos.surah : 1;
        setMode(S.mode);
        updatePreview();
        setModalState($('edit-wird-modal'), true);
    }
    function applyPlan(f) {
        const key = dayKey();
        S.mode = f.mode; S.days = f.days; S.pagesPerDay = f.pagesPerDay; S.planDate = key;
        if (f.start === 'continue' && !isComplete()) {
            // نُبقي بداية اليوم كما هي حتى لا يضيع ما قُرئ اليوم، ونعيد حساب الكمية فقط
            const baseline = S.today.fromCount;
            S.today = { date: key, fromCount: baseline, pages: amountFor(baseline), done: false };
            if (S.readCount >= baseline + S.today.pages) finishDay(false);
        } else {
            S.startPage = f.start === 'surah' ? QuranData.surahStartPage(f.surah) : 1;
            S.readCount = 0; S.verseIdx = 0; S.pageLen = 0; S.pos = null;
            S.today = { date: key, fromCount: 0, pages: amountFor(0), done: false };
        }
        current = null;
        resetView(); save(); renderAll(); refreshRangeTitle(); showView();
        setModalState($('edit-wird-modal'), false);
        Toast.show('تم حفظ خطة الورد');
    }

    // ---------- بدء التشغيل ----------
    function checkDay() {
        if (S.today && S.today.date === dayKey()) return;
        ensureToday(); current = null; resetView(); save(); renderAll(); refreshRangeTitle(); showView();
    }
    function snapshot() {
        const r = rangeInfo(), { dayN, totalDays } = planDays();
        return {
            complete: isComplete(), done: S.today.done, pages: S.today.pages, from: r.from, to: r.to,
            rangeTitle: rangeTitle || titleFor(QuranData.surahAtPage(r.from), QuranData.surahAtPage(r.to)),
            todayPct: Math.round(todayFraction() * 100), khatmaPct: Math.round(khatmaFraction() * 100),
            readPages: S.readCount, dayN, totalDays, khatmas: S.khatmas, streak: streakData().days || 0
        };
    }
    function init() {
        S = load();
        ensureToday();
        save();
        resetView();
        $('next-verse-btn').addEventListener('click', advance);
        $('focus-complete-btn').addEventListener('click', advance);
        $('prev-verse-btn').addEventListener('click', stepBack);
        $('wird-page-btn').addEventListener('click', completePage);
        $('wird-reader-btn').addEventListener('click', () => Reader.openAt(readerStartPage()));
        $('wird-edit-btn').addEventListener('click', () => openPlanModal());
        $('wird-new-khatma').addEventListener('click', () => openPlanModal(true));
        // وضع التركيز: ملء الشاشة، وزر الإغلاق يظهر بضغطة على الشاشة
        const focusRoot = $('wird-focus');
        const closeFocus = (fromPop = false) => { if (!focusRoot.classList.contains('open')) return; focusRoot.classList.remove('open'); Immersive.exit(focusRoot, fromPop === true); };
        $('wird-focus-btn').addEventListener('click', () => { focusRoot.classList.add('open'); Immersive.enter(focusRoot, { onClose: closeFocus, hideAfter: 2500 }); });
        $('wird-focus-close').addEventListener('click', () => closeFocus());
        Immersive.bindTap(focusRoot, focusRoot);
        document.querySelectorAll('#wird-mode [data-mode]').forEach(b => b.addEventListener('click', () => { setMode(b.dataset.mode); updatePreview(); }));
        ['input-wird-days', 'input-wird-start'].forEach(id => $(id).addEventListener('change', () => { syncFields(); updatePreview(); }));
        ['input-wird-custom-days', 'input-wird-pages', 'input-wird-sura'].forEach(id => $(id).addEventListener('input', updatePreview));
        $('input-wird-custom-days').addEventListener('input', syncEndDate);
        $('input-wird-end-date').addEventListener('change', onEndDate);
        $('wird-form').addEventListener('submit', e => { e.preventDefault(); applyPlan(readForm()); });
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkDay(); });
        setInterval(checkDay, 60000);
        renderAll();
        refreshRangeTitle();
        showView();
    }

    return { init, snapshot, onReaderAdvance };
})();
