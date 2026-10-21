/* =====================================================================
 * مُذكّر — offline.js  (الإصدار ١٥)
 *   QuranIndex    إ٤ البحث بالقرآن بلا نت: نص القرآن الإملائي المشكول (٦٢٣٦ آية، حوالي ٤٠٠ كيلو مضغوط)
 *                 بينحفظ بالجهاز أول مرة تبحث، وبعدها البحث محلي وفوري: بلا تشكيل، و أ/إ/آ = ا، ى = ي، ة = ه.
 *                 صفحة كل آية من جدول بدايات صفحات مصحف المدينة (فما في داعي لنت لتفتح النتيجة).
 *   QuranOffline  إ٣ تنزيل المصحف كامل (٦٠٤ صفحة) من زر «المصحف بدون نت» بصفحة القرآن، مع التقدّم.
 * التخزين بـ Cache API (ما بيثقّل فتح التطبيق)، و sw.js ما بيمسح هالمخازن عند التحديث.
 * يُحمَّل بعد wird.js (QuranData) و quran-tools.js، وقبل main.js. التشغيل: QuranOffline.init() من main.js.
 * ===================================================================== */

const QuranIndex = (() => {
    // fawazahmed0/quran-api (رخصة مفتوحة، عبر jsDelivr): { quran: [{ chapter, verse, text }] }
    const SRC = 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/ara-quransimple.min.json';
    const STORE = 'mudhakkir-search-v1';
    const KEY = new URL('__mdk/quran-index', document.baseURI).href;
    // عدد آيات كل سورة، وأول آية بكل صفحة بترتيبها العام (١–٦٢٣٦) — من api.alquran.cloud/v1/meta
    const COUNTS = '7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6'.split(',').map(Number);
    const PAGE_STARTS = '1,8,13,24,32,37,45,56,65,69,77,84,91,96,101,109,113,120,127,134,142,149,153,161,171,177,184,189,194,198,204,210,218,223,227,232,238,241,245,253,256,260,264,267,272,277,282,289,290,294,303,309,316,323,331,339,346,355,364,371,377,385,394,402,409,415,426,434,442,447,451,459,467,474,480,488,494,500,505,508,513,517,520,527,531,538,545,553,559,568,573,580,585,588,595,599,607,615,621,628,634,641,648,656,664,669,672,675,679,683,687,693,701,706,711,715,720,727,734,740,746,752,759,765,773,778,783,790,798,808,817,825,834,842,849,858,863,871,880,884,891,900,908,914,921,927,932,936,941,947,955,966,977,985,992,998,1006,1012,1022,1028,1036,1042,1050,1059,1075,1085,1092,1098,1104,1110,1114,1118,1125,1133,1142,1150,1161,1169,1177,1186,1194,1201,1206,1213,1222,1230,1236,1242,1249,1256,1262,1267,1272,1276,1283,1290,1297,1304,1308,1315,1322,1329,1335,1342,1347,1353,1358,1365,1371,1379,1385,1390,1398,1407,1418,1426,1435,1443,1453,1462,1471,1479,1486,1493,1502,1511,1519,1527,1536,1545,1555,1562,1571,1582,1591,1601,1611,1619,1627,1634,1640,1649,1660,1666,1675,1683,1692,1700,1708,1713,1721,1726,1736,1742,1750,1756,1761,1769,1775,1784,1793,1803,1818,1834,1854,1873,1893,1908,1916,1928,1936,1944,1956,1966,1974,1981,1989,1995,2004,2012,2020,2030,2037,2047,2057,2068,2079,2088,2096,2105,2116,2126,2134,2145,2156,2161,2168,2175,2186,2194,2202,2215,2224,2238,2251,2262,2276,2289,2302,2315,2327,2346,2361,2386,2400,2413,2425,2436,2447,2462,2474,2484,2494,2508,2519,2528,2541,2556,2565,2574,2585,2596,2601,2611,2619,2626,2634,2642,2651,2660,2668,2674,2691,2701,2716,2733,2748,2763,2778,2792,2802,2812,2819,2823,2828,2835,2845,2850,2853,2858,2867,2876,2888,2899,2911,2923,2933,2952,2972,2993,3016,3044,3069,3092,3116,3139,3160,3173,3182,3195,3204,3215,3223,3236,3248,3258,3266,3274,3281,3288,3296,3303,3312,3323,3330,3337,3347,3355,3364,3371,3379,3386,3393,3404,3415,3425,3434,3442,3451,3460,3470,3481,3489,3498,3504,3515,3524,3534,3540,3549,3556,3564,3569,3577,3584,3588,3596,3607,3614,3621,3629,3638,3646,3655,3664,3672,3679,3691,3699,3705,3718,3733,3746,3760,3776,3789,3813,3840,3865,3891,3915,3942,3971,3987,3997,4013,4032,4054,4064,4069,4080,4090,4099,4106,4115,4126,4133,4141,4150,4159,4167,4174,4183,4192,4200,4211,4219,4230,4239,4248,4257,4265,4273,4283,4288,4295,4304,4317,4324,4336,4348,4359,4373,4386,4399,4415,4433,4454,4474,4487,4496,4506,4516,4525,4531,4539,4546,4557,4565,4575,4584,4593,4599,4607,4612,4617,4624,4631,4646,4666,4682,4706,4727,4750,4767,4785,4811,4829,4853,4874,4896,4918,4942,4969,4996,5030,5056,5079,5087,5094,5100,5105,5111,5116,5126,5130,5136,5143,5151,5156,5162,5169,5178,5186,5193,5200,5209,5218,5223,5230,5237,5242,5254,5268,5287,5314,5332,5358,5386,5415,5430,5448,5461,5476,5495,5513,5543,5571,5597,5617,5642,5673,5703,5728,5759,5801,5830,5855,5883,5910,5932,5964,5994,6017,6044,6073,6099,6126,6138,6156,6177,6194,6208,6222'.split(',').map(Number);
    const OFF = [0]; COUNTS.forEach((c, i) => OFF.push(OFF[i] + c));
    const MARK = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/;
    const FOLD = { 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ى': 'ي', 'ة': 'ه', 'ؤ': 'و', 'ئ': 'ي' };
    // نص «مطوي» للمقارنة، مع موقع كل حرف بالنص الأصلي (حتى نبرز الكلمة وهي مشكولة)
    function fold(s, withMap = false) {
        let out = ''; const map = withMap ? [] : null;
        for (let i = 0; i < s.length; i++) {
            const ch = s[i];
            if (MARK.test(ch)) continue;
            out += FOLD[ch] || (/[\u0621-\u064A0-9]/.test(ch) ? ch : ' ');
            if (map) map.push(i);
        }
        return withMap ? { out, map } : out;
    }
    const foldQuery = q => fold(String(q || '')).replace(/\s+/g, ' ').trim();
    const BASMALA = 'بسم الله الرحمن الرحيم';
    // أول آية بكل سورة (إلا الفاتحة والتوبة) جاية بالمصدر والبسملة قبلها: منشيلها
    function dropBasmala(t) {
        const w = t.split(' ');
        return foldQuery(w.slice(0, 4).join(' ')) === BASMALA ? w.slice(4).join(' ') : t;
    }

    let rows = null, loading = null;
    async function cached() {
        if (!('caches' in window)) return null;
        try { return await (await caches.open(STORE)).match(KEY); } catch (e) { return null; }
    }
    const has = async () => !!rows || !!(await cached());
    async function download() {
        const res = await fetch(SRC);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const txt = await res.text();
        const list = JSON.parse(txt).quran;
        if (!Array.isArray(list) || list.length !== OFF[114]) throw new Error('Bad payload');
        if ('caches' in window) { try { await (await caches.open(STORE)).put(KEY, new Response(txt, { headers: { 'Content-Type': 'application/json' } })); } catch (e) {} }
        return list;
    }
    // fetchIfMissing=false: بس من الجهاز (بلا تنزيل)
    function load({ fetchIfMissing = true } = {}) {
        if (rows) return Promise.resolve(rows);
        if (!loading) loading = (async () => {
            let list = null;
            const hit = await cached();
            if (hit) { try { list = JSON.parse(await hit.text()).quran; } catch (e) { list = null; } }
            if (!list) { if (!fetchIfMissing) return null; list = await download(); }
            rows = list.map(r => {
                const t = r.verse === 1 && r.chapter !== 1 && r.chapter !== 9 ? dropBasmala(r.text) : r.text;
                return { s: r.chapter, a: r.verse, t, f: foldQuery(t) };
            });
            return rows;
        })().finally(() => { loading = null; });
        return loading;
    }
    // صفحة الآية بمصحف المدينة (١–٦٠٤)
    function pageOf(s, a) {
        const g = OFF[Math.max(1, Math.min(114, s)) - 1] + Math.max(1, a);
        let lo = 0, hi = PAGE_STARTS.length - 1;
        while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (PAGE_STARTS[mid] <= g) lo = mid; else hi = mid - 1; }
        return lo + 1;
    }
    // البحث: كل الآيات يلي فيها النص (بعد الطي)، وأول `limit` منها للعرض
    // التاء المربوطة بآخر الكلمة بتنكتب بالمصحف أحيانًا مفتوحة (رحمة ← رَحْمَتَ): منقبل الاثنين
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matcher = qn => /ه(?= |$)/.test(qn) ? (re => t => re.test(t))(new RegExp(esc(qn).replace(/ه(?= |$)/g, '[هت]'))) : t => t.includes(qn);
    async function search(q, limit = 60) {
        const qn = foldQuery(q);
        if (qn.length < 2) return { qn, count: 0, items: [] };
        const all = await load(), hit = matcher(qn);
        const items = []; let count = 0;
        for (const r of all) if (hit(r.f)) { count++; if (items.length < limit) items.push(r); }
        return { qn, count, items };
    }
    // مكان الكلمة بالنص الأصلي المشكول: [بداية، نهاية] أو null
    function locate(t, qn) {
        const { out, map } = fold(t, true);
        let i = out.indexOf(qn), len = qn.length;
        if (i < 0) {
            const m = out.match(new RegExp(esc(qn).replace(/ /g, ' +').replace(/ه(?= |$)/g, '[هت]')));
            if (!m) return null;
            i = m.index; len = m[0].length;
        }
        let end = map[i + len - 1] + 1;
        while (end < t.length && MARK.test(t[end])) end++;
        return [map[i], end];
    }
    return { load, has, search, locate, pageOf, foldQuery, COUNTS };
})();

const QuranOffline = (() => {
    const $ = id => document.getElementById(id);
    const FLAG = 'mudhakkir-mushaf-offline';
    const TOTAL = 604, WORKERS = 4;
    const AR = n => Number(n).toLocaleString('ar-EG');
    let running = false;
    const isDone = () => { try { return localStorage.getItem(FLAG) === String(TOTAL); } catch (e) { return false; } };
    function paint(text, state = '') {
        const sub = $('q-offline-sub'), btn = $('q-offline');
        if (sub) sub.textContent = text;
        if (btn) { btn.dataset.state = state; btn.setAttribute('aria-busy', String(state === 'busy')); }
    }
    const idle = () => paint(isDone() ? 'محفوظ على جهازك ✓ القراءة والبحث بلا نت' : 'نزّل المصحف كامل مرة وحدة (حوالي ٢ ميغا) ليشتغل بلا نت', isDone() ? 'done' : '');
    async function start() {
        if (running) return;
        if (isDone()) { Toast.show('المصحف محفوظ على جهازك ✓'); return; }
        if (!navigator.onLine) { Toast.show('بدّك نت مرة وحدة لتنزيل المصحف'); return; }
        running = true;
        paint('جارٍ التجهيز…', 'busy');
        // البحث كمان بيصير بلا نت
        QuranIndex.load().catch(() => {});
        let next = 1, done = 0, failed = 0;
        const worker = async () => {
            while (next <= TOTAL) {
                const p = next++;
                try { if (!(await QuranData.ensureStored(p))) failed++; } catch (e) { failed++; }
                done++;
                if (done % 6 === 0 || done === TOTAL) paint(`جارٍ التنزيل… ${AR(done)} من ${AR(TOTAL)} صفحة`, 'busy');
            }
        };
        await Promise.all(Array.from({ length: WORKERS }, worker));
        running = false;
        if (failed) {
            paint(`انحفظ ${AR(TOTAL - failed)} من ${AR(TOTAL)}، اضغط لتكمّل الباقي`, '');
            Toast.show('ما كمل التنزيل، تأكد من النت واضغط مرة تانية');
            return;
        }
        try { localStorage.setItem(FLAG, String(TOTAL)); } catch (e) {}
        try { await navigator.storage?.persist?.(); } catch (e) {}
        idle();
        Toast.show('انحفظ المصحف كامل ✓ بتقدر تقرأ وتبحث بلا نت');
    }
    function init() {
        const btn = $('q-offline'); if (!btn) return;
        btn.addEventListener('click', start);
        idle();
    }
    return { init, start, isDone };
})();