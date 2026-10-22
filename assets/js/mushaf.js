/* =====================================================================
 * مُذكّر — mushaf.js  (الإصدار ١٥)
 * «مصحف المدينة»: صفحة المصحف متل الطبعة بالضبط — ١٥ سطر، وكل سطر بكلماته متل المصحف المطبوع،
 * بخط مجمع الملك فهد (QCF V1: لكل صفحة خطّها)، وإطار اسم السورة والبسملة مخطوطين.
 * الشكل (الإصدار ١٦، معرض ٩: م١ ب٣ ل١): الصفحة بملء الشاشة بلا مربع متل تطبيق آية، فوق السورة والساعة والجزء،
 * وتحت ربع الحزب ورقم الصفحة، وإطار السورة زمرّدي بورود ذهبية.
 *   - البيانات: api.quran.com (كل كلمة برقم سطرها ورمزها بخط الصفحة) — بنحفظ نسخة صغيرة (٢–٣ كيلو للصفحة)
 *   - الخطوط: static.qurancdn.com (حوالي ٨٠ كيلو للصفحة)، وأسماء السور بخط الثلث (sura_names)
 *   - كلشي بينحفظ بالجهاز (Cache API، نفس مخزن المصحف) بعد أول مرة، فالصفحة يلي فتحتها بتشتغل بلا نت
 *   - الكلمات عليها data-k (رقم الآية) فالضغط المطوّل والتمييز والعلامات بيشتغلوا متل العرض النصي
 *   - راس الصفحة وتذييلها وإطار السورة بيستعملهن العرض النصي كمان (reader.js)
 * يُحمَّل بعد wird.js (QuranData) و offline.js (QuranIndex.COUNTS)، وقبل reader.js (هو يلي بيرسم فيه).
 * ===================================================================== */
const Mushaf = (() => {
    const STORE = 'mudhakkir-quran-v1';
    const hasCaches = typeof caches !== 'undefined';
    const local = p => new URL('__mdk/' + p, document.baseURI).href;
    const API = (n, pg = 1) => `https://api.quran.com/api/v4/verses/by_page/${n}?words=true&word_fields=code_v1,line_number&per_page=50&page=${pg}`;
    const CDN = ['https://static.qurancdn.com', 'https://verses.quran.foundation'];
    const FONT_URLS = n => CDN.map(b => `${b}/fonts/quran/hafs/v1/woff2/p${n}.woff2`);
    const NAMES_URLS = CDN.map(b => `${b}/fonts/quran/surah-names/v1/sura_names.woff2`);
    const ar = n => Number(n).toLocaleString('ar-EG');
    const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt !== undefined) n.textContent = txt; return n; };

    // ---------- التخزين ----------
    async function fromCache(key) {
        if (!hasCaches) return null;
        try { return await (await caches.open(STORE)).match(local(key)) || null; } catch (e) { return null; }
    }
    async function toCache(key, res) {
        if (!hasCaches) return;
        try { await (await caches.open(STORE)).put(local(key), res); } catch (e) { /* المساحة ممتلئة: بنكمّل بلا حفظ */ }
    }

    // ---------- خطوط الصفحات ----------
    const fonts = new Map(); // key → Promise<family>
    function loadFont(key, family, urls) {
        if (!fonts.has(key)) fonts.set(key, (async () => {
            let res = await fromCache(key), err = null;
            if (!res) for (const u of urls) {
                try { const r = await fetch(u); if (!r.ok) throw new Error('HTTP ' + r.status); await toCache(key, r.clone()); res = r; break; } catch (e) { err = e; }
            }
            if (!res) throw err || new Error('font');
            const face = new FontFace(family, await res.arrayBuffer(), { display: 'block' });
            await face.load();
            document.fonts.add(face);
            return family;
        })().catch(e => { fonts.delete(key); throw e; }));
        return fonts.get(key);
    }
    const pageFont = n => loadFont('qcf-font/' + n, 'qcf_p' + n, FONT_URLS(n));
    const namesFont = () => loadFont('qcf-font/names', 'qcf_names', NAMES_URLS);

    // ---------- بيانات السطور ----------
    // lines[0..14] = [[رقم الآية، رمز الكلمة، 1 إذا علامة نهاية الآية], ...]
    const mem = new Map();
    async function pageData(n) {
        if (mem.has(n)) return mem.get(n);
        const key = 'qcf/' + n;
        let d = null;
        const hit = await fromCache(key);
        if (hit) { try { d = await hit.json(); } catch (e) { d = null; } }
        if (!d || d.v !== 1) {
            const verses = [];
            for (let pg = 1; pg <= 3; pg++) {
                const res = await fetch(API(n, pg));
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const j = await res.json();
                verses.push(...(j.verses || []));
                if (!j.pagination || !j.pagination.next_page) break;
            }
            if (!verses.length) throw new Error('Bad payload');
            const lines = Array.from({ length: 15 }, () => []);
            for (const v of verses) for (const w of v.words || []) {
                const L = Number(w.line_number);
                if (L >= 1 && L <= 15 && w.code_v1) lines[L - 1].push(w.char_type_name === 'end' ? [v.verse_key, w.code_v1, 1] : [v.verse_key, w.code_v1]);
            }
            d = { v: 1, lines };
            await toCache(key, new Response(JSON.stringify(d), { headers: { 'Content-Type': 'application/json' } }));
        }
        mem.set(n, d);
        if (mem.size > 16) mem.delete(mem.keys().next().value);
        return d;
    }

    // البسملة بخط المصحف: كلمات أول آية بالفاتحة من خط الصفحة ١
    let basmalaCodes = null;
    async function basmala() {
        if (basmalaCodes) return basmalaCodes;
        const d = await pageData(1);
        await pageFont(1);
        basmalaCodes = d.lines.flat().filter(w => w[0] === '1:1' && !w[2]).map(w => w[1]).join('');
        return basmalaCodes;
    }

    // ---------- شكل الصفحة ----------
    const ayahCount = s => (typeof QuranIndex !== 'undefined' && QuranIndex.COUNTS ? QuranIndex.COUNTS[s - 1] : 0);
    const split = k => k.split(':').map(Number);
    // السطور الفاضية: إطار اسم السورة والبسملة قبل أول آية من كل سورة (والفاتحة والتوبة إطار بس)
    // ملاحظة: بالطبعة الكلاسيكية بعض السور إطارها بآخر الصفحة يلي قبل (متل ص بآخر ٤٥٢) وبسملتها أول الصفحة
    function plan(d, n) {
        const kinds = d.lines.map(l => (l.length ? 'text' : 'empty'));
        const surahOf = new Array(15).fill(0);
        const used = kinds.map((k, i) => (k === 'text' ? i : -1)).filter(i => i >= 0);
        used.forEach((i, j) => {
            const first = d.lines[i][0][0], [s, a] = split(first);
            // أول سطر بالسورة: الآية ١ وما بلشت بالسطر يلي قبله
            if (a !== 1 || (j > 0 && d.lines[used[j - 1]].some(w => w[0] === first))) return;
            let gap = 0; while (i - gap - 1 >= 0 && kinds[i - gap - 1] === 'empty') gap++;
            const headerOnly = s === 1 || s === 9;
            if (gap >= 1) { kinds[i - 1] = headerOnly ? 'surah' : 'basmala'; surahOf[i - 1] = s; }
            if (gap >= 2 && !headerOnly) { kinds[i - 2] = 'surah'; surahOf[i - 2] = s; }
        });
        // سطور فاضية بآخر الصفحة: إطار السورة الجاية (لما تخلص السورة بنص الصفحة)
        const lastUsed = used[used.length - 1];
        if (lastUsed !== undefined && lastUsed < 14 && n > 2) {
            const lastKey = d.lines[lastUsed][d.lines[lastUsed].length - 1][0], [s, a] = split(lastKey);
            if (s < 114 && ayahCount(s) && a === ayahCount(s)) {
                kinds[lastUsed + 1] = 'surah'; surahOf[lastUsed + 1] = s + 1;
                if (lastUsed + 2 <= 14 && s + 1 !== 9) { kinds[lastUsed + 2] = 'basmala'; surahOf[lastUsed + 2] = s + 1; }
            }
        }
        return { kinds, surahOf };
    }

    // ---------- راس الصفحة وتذييلها (متل تطبيق آية، م١): السورة · الساعة · الجزء، وتحت ربع الحزب · رقم الصفحة ----------
    const clockText = () => new Date().toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' });
    // ربع الحزب يلي بيبلّش بهالصفحة (ما في صفحة فيها ربعين)
    function quarterLabel(n) {
        const Q = QuranData.QUARTERS;
        const i = Q.findIndex((q, idx) => idx > 0 && q[2] === n);
        if (i < 0) return '';
        const h = Math.floor(i / 4) + 1, r = i % 4;
        return r ? `${['', 'ربع', 'نصف', 'ثلاثة أرباع'][r]} الحزب ${ar(h)}` : `الحزب ${ar(h)}`;
    }
    function pageTop(n, s) {
        const top = el('div', 'pg-top'); top.setAttribute('aria-hidden', 'true');
        top.append(el('span', '', surahName(s)), el('span', 'pg-clock', clockText()), el('span', '', `الجزء ${ar(QuranData.juzOfPage(n))}`));
        return top;
    }
    function pageFoot(n) {
        const foot = el('div', 'pg-foot');
        foot.append(el('span', 'pg-q', quarterLabel(n)), el('span', 'pg-no', ar(n)), el('span'));
        foot.setAttribute('aria-label', 'صفحة ' + ar(n));
        return foot;
    }
    // الساعة براس الصفحة بتتحدّث (كل ٣٠ ثانية، بس والمصحف مفتوح)
    const tickClocks = root => root.querySelectorAll('.pg-clock').forEach(c => { c.textContent = clockText(); });

    // ---------- إطار اسم السورة (ب٣ «زمرّدي مُذكّر») ----------
    // بنرسمه بقياس الإطار الحقيقي على الشاشة، فالورود بتضل مدوّرة بأي عرض
    const BANNER = {
        light: { band: '#0f5c48', edge: '#0b3d31', orn: '#e6c879', cart: '#fbf7ec', cartEdge: '#c9a45c', dots: '#1a6e58', ink: '#0b3d31' },
        sepia: { band: '#0f5c48', edge: '#0b3d31', orn: '#e6c879', cart: '#f8eedb', cartEdge: '#c9a45c', dots: '#1a6e58', ink: '#0b3d31' },
        dark: { band: '#0f3d31', edge: '#c9a45c', orn: '#d9bb72', cart: '#07120e', cartEdge: '#c9a45c', dots: '#185744', ink: '#f1eee6' }
    };
    function bannerSVG(w, h, P) {
        const cy = h / 2, R = h * .34, r = h * .2;
        const rosette = (cx, rr) => {
            let p = '';
            for (let i = 0; i < 8; i++) p += `<ellipse cx='${cx}' cy='${cy - rr * .5}' rx='${rr * .2}' ry='${rr * .5}' transform='rotate(${i * 45} ${cx} ${cy})'/>`;
            return `<circle cx='${cx}' cy='${cy}' r='${rr}' fill='${P.cart}' stroke='${P.edge}' stroke-width='1'/><g fill='${P.orn}' opacity='.9'>${p}</g><circle cx='${cx}' cy='${cy}' r='${rr * .2}' fill='${P.cart}' stroke='${P.orn}'/>`;
        };
        const x1 = h * 2.15, x2 = w - h * 2.15, k = h * .34;
        const cart = `M${x1} ${cy}Q${x1 + h * .35} ${cy - k} ${x1 + h * .95} ${cy - k}H${x2 - h * .95}Q${x2 - h * .35} ${cy - k} ${x2} ${cy}Q${x2 - h * .35} ${cy + k} ${x2 - h * .95} ${cy + k}H${x1 + h * .95}Q${x1 + h * .35} ${cy + k} ${x1} ${cy}Z`;
        const scroll = (a, dir) => `<path d='M${a} ${cy}q${dir * h * .18} ${-h * .22} ${dir * h * .36} 0t${dir * h * .36} 0' fill='none' stroke='${P.orn}' stroke-width='1.2'/>`;
        const ps = h * .24;
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'><defs><pattern id='p' width='${ps}' height='${ps}' patternUnits='userSpaceOnUse'><circle cx='${ps / 2}' cy='${ps / 2}' r='${ps * .16}' fill='${P.dots}'/></pattern></defs><rect x='1' y='1' width='${w - 2}' height='${h - 2}' rx='${h * .14}' fill='${P.band}' stroke='${P.edge}' stroke-width='1.5'/><rect x='${h * .1}' y='${h * .1}' width='${w - h * .2}' height='${h * .8}' rx='${h * .1}' fill='url(#p)' stroke='${P.edge}' stroke-width='.8'/>${rosette(h * .62, R)}${rosette(w - h * .62, R)}${rosette(h * 1.5, r)}${rosette(w - h * 1.5, r)}${scroll(h * 1.72, 1)}${scroll(w - h * 1.72, -1)}<path d='${cart}' fill='${P.cart}' stroke='${P.cartEdge}' stroke-width='1.4'/></svg>`;
        return `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27')}")`;
    }
    function surahBanner(s) {
        const b = el('div', 'qp-surah');
        b.setAttribute('role', 'heading'); b.setAttribute('aria-level', '2');
        b.setAttribute('aria-label', 'سورة ' + surahName(s));
        const name = el('span', 'qp-surah-name', 'surah' + String(s).padStart(3, '0'));
        name.setAttribute('aria-hidden', 'true');
        name.dataset.fallback = 'سورة ' + surahName(s);
        b.append(name);
        // إذا ما تحمّل خط أسماء السور (أول مرة بلا نت): الاسم بخط أميري
        namesFont().catch(() => b.classList.add('no-names-font'));
        return b;
    }
    // ارسم كل الإطارات جوّا عنصر (بعد ما ينضبط حجمه)
    function paintBanners(root) {
        const theme = root.closest('.reader')?.dataset.theme || 'light';
        const P = BANNER[theme] || BANNER.light;
        root.querySelectorAll('.qp-surah').forEach(b => {
            const r = b.getBoundingClientRect();
            if (r.width < 40 || r.height < 8) return;
            const key = `${theme}:${Math.round(r.width)}x${Math.round(r.height)}`;
            if (b.dataset.drawn === key) return;
            b.dataset.drawn = key;
            b.style.backgroundImage = bannerSVG(Math.round(r.width), Math.round(r.height), P);
            b.style.setProperty('--ban-ink', P.ink);
        });
    }

    // ---------- صفحة مصحف المدينة كاملة (م١: بملء الشاشة بلا مربع) ----------
    async function page(n) {
        const [d, fam] = await Promise.all([pageData(n), pageFont(n)]);
        const bsml = basmala().catch(() => null);
        await namesFont().catch(() => null);
        const { kinds, surahOf } = plan(d, n);
        const card = el('article', 'qp' + (n <= 2 ? ' is-opening' : ''));
        card.dataset.page = n;
        const firstKey = (d.lines.find(l => l.length) || [[`${QuranData.surahAtPage(n)}:1`]])[0][0];
        const body = el('div', 'qp-lines'); body.style.fontFamily = `${fam}, 'Amiri Quran', serif`;
        const bsmlCodes = await bsml;
        let rows = 0;
        kinds.forEach((k, i) => {
            if (n <= 2 && k === 'empty') return; // الفاتحة وأول البقرة: السطور بالنص بلا فراغات تحت
            rows++;
            const line = el('div', 'qp-line');
            if (k === 'surah') { line.classList.add('is-banner'); line.append(surahBanner(surahOf[i])); }
            else if (k === 'basmala') {
                line.classList.add('is-basmala');
                const t = el('span', 'qp-in'); t.setAttribute('aria-label', QuranData.BASMALA);
                if (bsmlCodes) { t.textContent = bsmlCodes; t.style.fontFamily = 'qcf_p1'; } else { t.textContent = QuranData.BASMALA; t.classList.add('is-text'); }
                line.append(t);
            } else if (k === 'text') {
                const t = el('span', 'qp-in');
                let prevKey = null;
                d.lines[i].forEach(w => {
                    const sp = el('span', w[2] ? 'qw is-end' : 'qw', w[1]);
                    sp.dataset.k = w[0];
                    if (w[0] !== prevKey) {
                        // «۞» بالهامش عند أول ربع حزب
                        const [s, a] = split(w[0]);
                        const q = QuranData.quarterAt(s, a);
                        if (q > 0 && !line.querySelector('.qp-hizb') && isFirstWordOfAyah(d, i, w)) {
                            const mk = el('span', 'qp-hizb' + (q % 4 ? '' : ' is-hizb'), '۞');
                            const label = q % 4 ? `${['', 'ربع', 'نصف', 'ثلاثة أرباع'][q % 4]} الحزب ${ar(Math.floor(q / 4) + 1)}` : `بداية الحزب ${ar(q / 4 + 1)}`;
                            mk.title = label; mk.setAttribute('aria-label', label);
                            line.append(mk);
                        }
                        prevKey = w[0];
                    }
                    t.append(sp);
                });
                line.append(t);
            } else line.classList.add('is-empty');
            body.append(line);
        });
        body.style.setProperty('--rows', rows);
        card.dataset.surah = split(firstKey)[0]; // سورة أول سطر (لشريط الصفحات تحت)
        card.append(pageTop(n, split(firstKey)[0]), body, pageFoot(n));
        return card;
    }
    // أول كلمة من الآية (مو تكملة آية من السطر يلي قبل)
    function isFirstWordOfAyah(d, i, w) {
        for (let L = 0; L < i; L++) if (d.lines[L].some(x => x[0] === w[0])) return false;
        return true;
    }

    // ---------- ضبط الحجم: الكلام بياخد عرض الشاشة، والسطور الـ١٥ بتتوزّع على طولها (متل آية) ----------
    // boxW: العرض المتاح لهالصفحة، fixed: حجم ثابت (للصفحتين المتقابلتين). بترجّع الحجم
    function fit(card, boxW, fixed = 0) {
        const body = card.querySelector('.qp-lines');
        if (!body) return 0;
        const rows = Number(body.style.getPropertyValue('--rows')) || 15;
        card.style.setProperty('--qfs', '20px');
        body.classList.add('is-measuring');
        const ins = [...body.querySelectorAll('.qp-line:not(.is-banner):not(.is-basmala) > .qp-in')];
        const widths = ins.map(x => x.getBoundingClientRect().width);
        body.classList.remove('is-measuring');
        const longest = Math.max(1, ...widths), maxW = Math.max(longest / 20, 13.2);
        const padX = Math.min(26, Math.max(12, boxW * .035));
        // الارتفاع المتاح للسطور: الصفحة ناقص راسها وتذييلها
        const top = card.querySelector('.pg-top'), foot = card.querySelector('.pg-foot');
        const availH = card.clientHeight - (top ? top.offsetHeight : 0) - (foot ? foot.offsetHeight : 0) - 8;
        // الفاتحة وأول البقرة: السطور بالنص جوّا إطار (٣em زيادة بالعرض والطول)
        const opening = card.classList.contains('is-opening');
        const fsW = (boxW - padX * 2) / (maxW + (opening ? 3 : 0));
        const fsH = opening ? availH / (rows * 1.9 + 3) : availH / (rows * 1.42);
        const fs = fixed || Math.max(6, Math.min(fsW, fsH, opening ? 40 : 52));
        card.style.setProperty('--qfs', fs.toFixed(2) + 'px');
        card.style.setProperty('--qw', (maxW * fs).toFixed(1) + 'px');
        card.style.setProperty('--qpad', padX.toFixed(1) + 'px');
        // السطر الكامل بيتوزّع من الطرفين؛ القصير (آخر سورة) بيضل بالنص
        ins.forEach((x, i) => x.parentElement.classList.toggle('is-full', !opening && widths[i] >= longest * .86));
        paintBanners(card);
        return fs;
    }

    // تحميل مسبق للصفحة الجاية (بيانات + خط) بهدوء
    const prefetch = n => { if (n >= 1 && n <= 604) Promise.all([pageData(n), pageFont(n)]).catch(() => {}); };
    // هل الصفحة محفوظة بالجهاز؟ (للعمل بلا نت)
    const isStored = async n => !!(await fromCache('qcf/' + n)) && !!(await fromCache('qcf-font/' + n));
    return { page, fit, prefetch, isStored, pageData, pageTop, pageFoot, surahBanner, paintBanners, tickClocks, quarterLabel, namesFont };
})();
