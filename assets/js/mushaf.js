/* =====================================================================
 * مُذكّر — mushaf.js  (الإصدار ١٥)
 * «مصحف المدينة»: صفحة المصحف متل الطبعة بالضبط — ١٥ سطر، وكل سطر بكلماته متل المصحف المطبوع،
 * بخط مجمع الملك فهد (QCF V1: لكل صفحة خطّها)، وإطار اسم السورة والبسملة مخطوطين.
 *   - البيانات: api.quran.com (كل كلمة برقم سطرها ورمزها بخط الصفحة) — بنحفظ نسخة صغيرة (٢–٣ كيلو للصفحة)
 *   - الخطوط: static.qurancdn.com (حوالي ٨٠ كيلو للصفحة)، وأسماء السور بخط الثلث (sura_names)
 *   - كلشي بينحفظ بالجهاز (Cache API، نفس مخزن المصحف) بعد أول مرة، فالصفحة يلي فتحتها بتشتغل بلا نت
 *   - الكلمات عليها data-k (رقم الآية) فالضغط المطوّل والتمييز والعلامات بيشتغلوا متل العرض النصي
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
    function plan(d, n) {
        const kinds = d.lines.map(l => (l.length ? 'text' : 'empty'));
        const surahOf = new Array(15).fill(0);
        const used = kinds.map((k, i) => (k === 'text' ? i : -1)).filter(i => i >= 0);
        used.forEach((i, j) => {
            const first = d.lines[i][0][0], [s, a] = split(first);
            // أول سطر بالسورة: الآية ١ وما بلشت بالسطر يلي قبله
            if (a !== 1 || (j > 0 && d.lines[used[j - 1]].some(w => w[0] === first))) return;
            // أول سطر بالسورة: نرجع للسطور الفاضية قبله
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

    function surahBanner(s) {
        const b = el('div', 'qp-surah');
        b.setAttribute('role', 'heading'); b.setAttribute('aria-level', '2');
        b.setAttribute('aria-label', 'سورة ' + surahName(s));
        const name = el('span', 'qp-surah-name', 'surah' + String(s).padStart(3, '0'));
        name.setAttribute('aria-hidden', 'true');
        name.dataset.fallback = 'سورة ' + surahName(s);
        b.append(name);
        return b;
    }

    // صفحة كاملة (عنصر DOM) — بيرسمها reader.js وبيضبط حجمها fit()
    async function page(n) {
        const [d, fam] = await Promise.all([pageData(n), pageFont(n)]);
        const names = namesFont().catch(() => null);
        const bsml = basmala().catch(() => null);
        const { kinds, surahOf } = plan(d, n);
        const card = el('article', 'qp' + (n <= 2 ? ' is-opening' : ''));
        card.dataset.page = n;
        const firstKey = (d.lines.find(l => l.length) || [[`${QuranData.surahAtPage(n)}:1`]])[0][0];
        const head = el('div', 'qp-top'); head.setAttribute('aria-hidden', 'true');
        head.append(el('span', '', surahName(split(firstKey)[0])), el('span', '', `الجزء ${ar(QuranData.juzOfPage(n))}`));
        const body = el('div', 'qp-lines'); body.style.fontFamily = `${fam}, 'Amiri Quran', serif`;
        const [namesOk, bsmlCodes] = await Promise.all([names, bsml]);
        kinds.forEach((k, i) => {
            if (n <= 2 && k === 'empty') return; // الفاتحة وأول البقرة: السطور بالنص بلا فراغات تحت
            const line = el('div', 'qp-line');
            if (k === 'surah') { line.classList.add('is-banner'); line.append(surahBanner(surahOf[i])); if (!namesOk) line.classList.add('no-names-font'); }
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
        const foot = el('div', 'qp-no', ar(n)); foot.setAttribute('aria-label', 'صفحة ' + ar(n));
        card.append(head, body, foot);
        return card;
    }
    // أول كلمة من الآية (مو تكملة آية من السطر يلي قبل)
    function isFirstWordOfAyah(d, i, w) {
        for (let L = 0; L < i; L++) if (d.lines[L].some(x => x[0] === w[0])) return false;
        return true;
    }

    // ---------- ضبط الحجم: الصفحة كلها بتبيّن، والسطور الكاملة مضبوطة من الطرفين ----------
    // box: {w, h} المساحة المتاحة لكل صفحة، و fixed: حجم خط ثابت (للصفحتين المتقابلتين). بترجّع الحجم
    function fit(card, box, fixed = 0) {
        const body = card.querySelector('.qp-lines');
        if (!body) return;
        card.style.setProperty('--qfs', '20px');
        body.classList.add('is-measuring');
        const ins = [...body.querySelectorAll('.qp-line:not(.is-banner) > .qp-in')];
        const widths = ins.map(x => x.getBoundingClientRect().width);
        body.classList.remove('is-measuring');
        const maxW = Math.max(1, ...widths) / 20; // عرض أطول سطر لكل 1px من حجم الخط
        const rows = body.children.length;
        // الارتفاع: السطور (1.72) + رأس وتذييل وحواف (حوالي 4.6 سطر من حجم الخط)
        const padX = Math.min(28, Math.max(14, box.w * .05));
        const fsW = (box.w - padX * 2) / maxW;
        const fsH = box.h / (rows * 1.72 + (rows < 15 ? 7 : 4.6));
        // الصفحة لازم تبيّن كلها (حتى صفحتين على جوال بالطول بتطلع صغيرة بس مرتّبة)
        const fs = fixed || Math.max(6, Math.min(fsW, fsH, 46));
        card.style.setProperty('--qfs', fs.toFixed(2) + 'px');
        card.style.setProperty('--qpad', padX.toFixed(1) + 'px');
        // عرض الصفحة: أطول سطر عادي بالمصحف (حوالي ١٤ ضعف حجم الخط) حتى الصفحتين المتقابلتين يطلعوا بنفس العرض
        card.style.width = Math.min(box.w, Math.max(maxW, 13.6) * fs + padX * 2).toFixed(1) + 'px';
        // السطر الكامل بيتوزّع من الطرفين؛ القصير (آخر سورة) بيضل بالنص
        const longest = Math.max(...widths);
        ins.forEach((x, i) => x.parentElement.classList.toggle('is-full', !card.classList.contains('is-opening') && widths[i] >= longest * .86));
        return fs;
    }

    // تحميل مسبق للصفحة الجاية (بيانات + خط) بهدوء
    const prefetch = n => { if (n >= 1 && n <= 604) Promise.all([pageData(n), pageFont(n)]).catch(() => {}); };
    // هل الصفحة محفوظة بالجهاز؟ (للعمل بلا نت)
    const isStored = async n => !!(await fromCache('qcf/' + n)) && !!(await fromCache('qcf-font/' + n));
    return { page, fit, prefetch, isStored, pageData };
})();
