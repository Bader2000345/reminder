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

    // بدايات أرباع الأحزاب (٢٤٠ ربع = ٦٠ حزب = ٣٠ جزء): [السورة، الآية، الصفحة] — من api.alquran.cloud/v1/meta
    // كل ٤ أرباع حزب، وكل ٨ أرباع جزء
    const QUARTERS = [[1,1,1],[2,26,5],[2,44,7],[2,60,9],[2,75,11],[2,92,14],[2,106,17],[2,124,19],[2,142,22],[2,158,24],[2,177,27],[2,189,29],[2,203,32],[2,219,34],[2,233,37],[2,243,39],[2,253,42],[2,263,44],[2,272,46],[2,283,49],[3,15,51],[3,33,54],[3,52,56],[3,75,59],[3,93,62],[3,113,64],[3,133,67],[3,153,69],[3,171,72],[3,186,74],[4,1,77],[4,12,79],[4,24,82],[4,36,84],[4,58,87],[4,74,89],[4,88,92],[4,100,94],[4,114,97],[4,135,100],[4,148,102],[4,163,104],[5,1,106],[5,12,109],[5,27,112],[5,41,114],[5,51,117],[5,67,119],[5,82,121],[5,97,124],[5,109,126],[6,13,129],[6,36,132],[6,59,134],[6,74,137],[6,95,140],[6,111,142],[6,127,144],[6,141,146],[6,151,148],[7,1,151],[7,31,154],[7,47,156],[7,65,158],[7,88,162],[7,117,164],[7,142,167],[7,156,170],[7,171,173],[7,189,175],[8,1,177],[8,22,179],[8,41,182],[8,61,184],[9,1,187],[9,19,189],[9,34,192],[9,46,194],[9,60,196],[9,75,199],[9,93,201],[9,111,204],[9,122,206],[10,11,209],[10,26,212],[10,53,214],[10,71,217],[10,90,219],[11,6,222],[11,24,224],[11,41,226],[11,61,228],[11,84,231],[11,108,233],[12,7,236],[12,30,238],[12,53,242],[12,77,244],[12,101,247],[13,5,249],[13,19,252],[13,35,254],[14,10,256],[14,28,259],[15,1,262],[15,50,264],[16,1,267],[16,30,270],[16,51,272],[16,75,275],[16,90,277],[16,111,280],[17,1,282],[17,23,284],[17,50,287],[17,70,289],[17,99,292],[18,17,295],[18,32,297],[18,51,299],[18,75,302],[18,99,304],[19,22,306],[19,59,309],[20,1,312],[20,55,315],[20,83,317],[20,111,319],[21,1,322],[21,29,324],[21,51,326],[21,83,329],[22,1,332],[22,19,334],[22,38,336],[22,60,339],[23,1,342],[23,36,344],[23,75,347],[24,1,350],[24,21,352],[24,35,354],[24,53,356],[25,1,359],[25,21,362],[25,53,364],[26,1,367],[26,52,369],[26,111,371],[26,181,374],[27,1,377],[27,27,379],[27,56,382],[27,82,384],[28,12,386],[28,29,389],[28,51,392],[28,76,394],[29,1,396],[29,26,399],[29,46,402],[30,1,404],[30,31,407],[30,54,410],[31,22,413],[32,11,415],[33,1,418],[33,18,420],[33,31,422],[33,51,425],[33,60,426],[34,10,429],[34,24,431],[34,46,433],[35,15,436],[35,41,439],[36,28,442],[36,60,444],[37,22,446],[37,83,449],[37,145,451],[38,21,454],[38,52,456],[39,8,459],[39,32,462],[39,53,464],[40,1,467],[40,21,469],[40,41,472],[40,66,474],[41,9,477],[41,25,479],[41,47,482],[42,13,484],[42,27,486],[42,51,488],[43,24,491],[43,57,493],[44,17,496],[45,12,499],[46,1,502],[46,21,505],[47,10,507],[47,33,510],[48,18,513],[49,1,515],[49,14,517],[50,27,519],[51,31,522],[52,24,524],[53,26,526],[54,9,529],[55,1,531],[56,1,534],[56,75,536],[57,16,539],[58,1,542],[58,14,544],[59,11,547],[60,7,550],[62,1,553],[63,4,554],[65,1,558],[66,1,560],[67,1,562],[68,1,564],[69,1,566],[70,19,569],[72,1,572],[73,20,575],[75,1,577],[76,19,579],[78,1,582],[80,1,585],[82,1,587],[84,1,589],[87,1,591],[90,1,594],[94,1,596],[100,9,599]];
    const QUARTER_AT = new Map(QUARTERS.map((q, i) => [q[0] * 1000 + q[1], i]));

    const clampPage = n => Math.max(1, Math.min(TOTAL_PAGES, Math.trunc(Number(n)) || 1));
    // رقم الصفحة بعد قراءة `count` صفحة منذ صفحة البداية (مع الالتفاف بعد صفحة ٦٠٤)
    const pageAt = (startPage, count) => ((startPage - 1 + count) % TOTAL_PAGES + TOTAL_PAGES) % TOTAL_PAGES + 1;
    // آخر ربع بيبلش بهالصفحة أو قبلها (الجزء ٧ والجزء ١١ بيبلشوا بنص الصفحة ١٢١ و٢٠١)
    const quarterOfPage = page => { let i = 0; while (i + 1 < QUARTERS.length && QUARTERS[i + 1][2] <= page) i++; return i; };
    const juzOfPage = page => Math.floor(quarterOfPage(clampPage(page)) / 8) + 1;
    const hizbOfPage = page => Math.floor(quarterOfPage(clampPage(page)) / 4) + 1;
    // رقم الربع (من ٠) إذا الآية أول ربع، وإلا -1
    const quarterAt = (s, a) => { const i = QUARTER_AT.get(s * 1000 + a); return i === undefined ? -1 : i; };
    // علامة نهاية الآية متل المصحف: «۝» والرقم جوّاها (خط Amiri Quran بيرسمهن شكل واحد)
    const endMark = n => '۝' + Number(n).toLocaleString('ar-EG');
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

    return { TOTAL_PAGES, BASMALA, SURAH_START_PAGES, QUARTERS, getPage, hasBasmalaHeader, verseText, pageAt, juzOfPage, hizbOfPage, quarterAt, endMark, surahStartPage, surahAtPage };
})();

const Wird = (() => {
    const KEY = 'mudhakkir-wird-v2';
    const TOTAL = QuranData.TOTAL_PAGES;
    const MAX_PAGES_PER_DAY = 100;
    const MIN_DAYS = 7;
    const MAX_DAYS = 730;
    const DEFAULT_DAYS = 30;
    const DURATION_PRESETS = [7, 10, 15, 20, 30, 45, 60, 90, 120, 180, 365];
    // تحزيب الصحابة (فمي بشوق): أول صفحة لكل حزب من الأحزاب السبعة، بحدود السور
    // الفاتحة، المائدة، يونس، الإسراء (بني إسرائيل)، الشعراء، الصافات، ق
    const HIZB_PAGES = [1, 106, 208, 282, 367, 446, 518];
    const nextHizbStart = page => HIZB_PAGES.find(p => p > page) || TOTAL + 1;
    const HIZB_NAMES = [['الفاتحة', 'النساء'], ['المائدة', 'التوبة'], ['يونس', 'النحل'], ['الإسراء', 'الفرقان'], ['الشعراء', 'يس'], ['الصافات', 'الحجرات'], ['ق', 'الناس']];
    function hizbTitle(page) {
        const i = HIZB_PAGES.reduce((found, p, k) => (p <= page ? k : found), 0), [a, b] = HIZB_NAMES[i];
        return `الحزب ${fmt(i + 1)}: من سورة ${a} إلى سورة ${b}`;
    }
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
    // goal: عدد الختمات المنويّة (من أسئلة الخطة)
    const blankState = () => ({ v: 2, mode: 'duration', days: DEFAULT_DAYS, pagesPerDay: Math.ceil(TOTAL / DEFAULT_DAYS), planDate: dayKey(), startPage: 1, readCount: 0, verseIdx: 0, pageLen: 0, khatmas: 0, goal: 1, today: null, pos: null });
    function sanitize(raw) {
        const s = blankState();
        if (!raw || typeof raw !== 'object') return s;
        const int = (v, lo, hi, fallback) => (Number.isFinite(Number(v)) ? clamp(Math.trunc(Number(v)), lo, hi) : fallback);
        s.mode = ['daily', 'sahaba'].includes(raw.mode) ? raw.mode : 'duration';
        s.days = int(raw.days, MIN_DAYS, MAX_DAYS, s.days);
        s.pagesPerDay = int(raw.pagesPerDay, 1, MAX_PAGES_PER_DAY, s.pagesPerDay);
        if (DATE_RE.test(raw.planDate)) s.planDate = raw.planDate;
        s.startPage = int(raw.startPage, 1, TOTAL, 1);
        s.readCount = int(raw.readCount, 0, TOTAL, 0);
        s.verseIdx = s.readCount >= TOTAL ? 0 : int(raw.verseIdx, 0, 400, 0);
        s.pageLen = int(raw.pageLen, 0, 400, 0);
        s.khatmas = int(raw.khatmas, 0, 9999, 0);
        s.goal = int(raw.goal, 1, 100, 1);
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
        // تحزيب الصحابة: ورد اليوم = من مكانك لآخر الحزب يلي إنت فيه
        if (S.mode === 'sahaba') { const page = pageNo(baseline); return Math.min(remaining, nextHizbStart(page) - page); }
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
    // عدد الأحزاب الباقية من موضع معيّن لآخر الختمة (تحزيب الصحابة)
    function hizbDaysFrom(count) {
        let c = count, n = 0;
        while (c < TOTAL && n < 20) { const page = pageNo(c); c += Math.min(TOTAL - c, nextHizbStart(page) - page); n++; }
        return Math.max(1, n);
    }
    function planDays() {
        const dayN = Math.max(1, daysBetween(S.planDate, dayKey()) + 1);
        const totalDays = S.mode === 'daily'
            ? dayN - 1 + Math.max(1, Math.ceil((TOTAL - S.today.fromCount) / S.pagesPerDay))
            : S.mode === 'sahaba' ? dayN - 1 + hizbDaysFrom(S.today.fromCount)
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
        // رقم الآية بآخرها بعلامة المصحف «۝»
        const n = document.createElement('span');
        n.className = 'ayah-no'; n.textContent = QuranData.endMark(ayah.numberInSurah); n.setAttribute('aria-label', `الآية ${fmt(ayah.numberInSurah)}`);
        el.append(' ', n); // مسافة ما بتنكسر: الرقم ما بينفصل عن آخر كلمة
    }

    // ---------- ورد اليوم بدون نت: صفحاته بتتنزّل لحالها بالخلفية ----------
    let prefetchKey = '';
    async function prefetchToday() {
        if (isComplete() || !navigator.onLine) return;
        const r = rangeInfo(), key = `${S.today.date}:${r.from}-${r.to}`;
        if (prefetchKey === key) return;
        prefetchKey = key;
        const pages = [];
        for (let c = S.today.fromCount; c < Math.min(TOTAL, S.today.fromCount + S.today.pages); c++) pages.push(pageNo(c));
        const note = $('wird-offline');
        let done = 0;
        const paint = () => {
            if (!note) return;
            note.hidden = false;
            note.classList.toggle('ready', done === pages.length);
            note.textContent = done === pages.length ? '✓ ورد اليوم محفوظ، بتقدر تقرأه بدون نت' : `جارٍ حفظ ورد اليوم للقراءة بدون نت… ${fmt(done)} من ${fmt(pages.length)}`;
        };
        paint();
        // صفحتين مع بعض، وبهدوء حتى ما يثقل على الجهاز
        let i = 0;
        const worker = async () => {
            while (i < pages.length && prefetchKey === key) {
                const p = pages[i++];
                try { await QuranData.getPage(p); done++; paint(); } catch (e) { if (note) note.hidden = true; prefetchKey = ''; return; }
                await new Promise(res => setTimeout(res, 120));
            }
        };
        await Promise.all([worker(), worker()]);
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
        // النيّة من أسئلة الخطة: «الختمة ٢ من ٣»
        const goal = S.goal > 1 ? `الختمة ${fmt(Math.min(S.khatmas + (isComplete() ? 0 : 1), S.goal))} من ${fmt(S.goal)} · ` : '';
        if (isComplete()) { meta.textContent = `${goal}ختمات مكتملة: ${fmt(S.khatmas)} · تقبّل الله منك`; return; }
        const end = longDate(addDays(S.planDate, planDays().totalDays - 1));
        meta.textContent = `${goal}قرأت ${fmt(S.readCount)} من ${fmt(TOTAL)} صفحة · المتبقي ${fmt(TOTAL - S.readCount)} · تنتهي بإذن الله في ${end}`;
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
        if (typeof FocusTools !== 'undefined') FocusTools.update(ayah, pageNo(view.count), view.idx); // التجويد والتفسير في وضع التركيز
        $('focus-verse-badge').textContent = $('verse-badge-num').textContent;
        if (atReached) { S.pos = { surah: ayah.surah.number, juz: ayah.juz || QuranData.juzOfPage(pageNo(view.count)), page: pageNo(view.count) }; save(); }
        renderAll();
        if (view.count + 1 < TOTAL) QuranData.getPage(pageNo(view.count + 1)).catch(() => {});
    }

    async function refreshRangeTitle() {
        const my = ++rangeToken;
        if (isComplete()) return;
        const r = rangeInfo();
        // تحزيب الصحابة: العنوان اسم الحزب بحدود السور
        if (S.mode === 'sahaba') { rangeTitle = hizbTitle(r.from); renderHeader(); return; }
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
        if (typeof WeekLog !== 'undefined') WeekLog.mark('w');
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
        $('wird-sahaba-field').hidden = mode !== 'sahaba';
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
        if (f.mode === 'sahaba') {
            $('wird-plan-preview').textContent = `كل يوم حزب (بين ٧٢ و١٠٥ صفحات، يعني تقريبًا ٤ إلى ٥ أجزاء) · ختمة كل أسبوع بإذن الله.`;
            return;
        }
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
    function applyPlan(f, { silent = false } = {}) {
        const key = dayKey();
        S.mode = f.mode; S.days = f.days; S.pagesPerDay = f.pagesPerDay; S.planDate = key;
        if (f.goal) S.goal = clamp(Math.trunc(f.goal) || 1, 1, 100);
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
        current = null; prefetchKey = '';
        resetView(); save(); renderAll(); refreshRangeTitle(); showView(); prefetchToday();
        setModalState($('edit-wird-modal'), false);
        if (!silent) Toast.show('تم حفظ خطة الورد');
    }

    // ---------- بدء التشغيل ----------
    function checkDay() {
        if (S.today && S.today.date === dayKey()) return;
        ensureToday(); current = null; resetView(); save(); renderAll(); refreshRangeTitle(); showView(); prefetchToday();
    }
    // لأسئلة الخطة (wird-intro.js)
    function info() {
        const page = pageNo(S.readCount);
        return {
            hasProgress: !isComplete() && (S.readCount > 0 || S.verseIdx > 0), complete: isComplete(),
            mode: S.mode, days: S.days, pagesPerDay: S.pagesPerDay, goal: S.goal, khatmas: S.khatmas,
            surah: S.pos ? S.pos.surah : QuranData.surahAtPage(page)
        };
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
        // الشاشة ما بتطفي طول ما وضع التركيز مفتوح (KeepAwake بـ core.js)
        const closeFocus = (fromPop = false) => { if (!focusRoot.classList.contains('open')) return; focusRoot.classList.remove('open'); KeepAwake.off('focus'); Immersive.exit(focusRoot, fromPop === true); };
        $('wird-focus-btn').addEventListener('click', () => { focusRoot.classList.add('open'); KeepAwake.on('focus'); Immersive.enter(focusRoot, { onClose: closeFocus, hideAfter: 2500 }); });
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
        addEventListener('online', () => { prefetchKey = ''; prefetchToday(); });
        renderAll();
        refreshRangeTitle();
        showView();
        // بعد ما يهدأ التشغيل بشوي: نحفظ ورد اليوم للقراءة بدون نت
        setTimeout(prefetchToday, 2500);
    }

    return { init, snapshot, onReaderAdvance, info, applyIntro: f => applyPlan(f, { silent: true }), openPlan: () => openPlanModal() };
})();
