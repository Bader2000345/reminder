/* =====================================================================
 * مُذكّر — fx.js
 * مؤثرات الإصدار ٧ (اختيرت من «معرض تصاميم مُذكّر»، مستوحاة من 21st.dev ومكتوبة بـ JS عادي):
 *   خ٤  زخرفة تحت الضوء   نقش النجمة الثمانية ظاهر بهدوء، أوضح بأعلى الصفحة وحول الإصبع/المؤشر،
 *                          ويتوهّج على كامل الشاشة أثناء التمرير ثم يهدأ (الإصدار ٨)
 *                          (فكرة spotlight masked backgrounds — تتحرك بالـ transform فقط، بلا إعادة رسم)
 *   ب٢  إطار نور يسري     ضوء ذهبي يدور على حافة بطاقة الذكر والمتابعة والختمة (Border Beam · Magic UI)
 *   ح١  حركة متوازنة      الذكر يظهر كلمة كلمة (Text Generate · Aceternity) — على مستوى الكلمة حتى تبقى
 *                          الحروف العربية موصولة — والعدّاد يتدحرج (Number Ticker · Magic UI)
 * - «تقليل الحركة» يوقف كل شيء، والأجهزة الضعيفة أو «توفير البيانات» تأخذ نسخة أخف (html.fx-lite).
 * يُحمَّل قبل home.js (يستعمل FX.textIn و FX.ticker عند التشغيل)، و FX.init() من main.js.
 * ===================================================================== */

const FX = (() => {
    const root = document.documentElement;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const conn = navigator.connection || {};
    const lite = reduce.matches || (navigator.hardwareConcurrency || 8) <= 4 || !!conn.saveData;
    if (lite) root.classList.add('fx-lite');
    const born = performance.now();

    // ---------- خ٤ زخرفة تحت الضوء ----------
    const PatternLight = (() => {
        const LENS = 150; // نصف قطر بقعة الضوء
        let box = null, lens = null, inner = null, x = 0, y = 0, px = 0, py = 0, lastPtr = -1e9, raf = 0;
        function apply() {
            lens.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            inner.style.transform = `translate3d(${LENS - x}px, ${LENS - y}px, 0)`; // النقش يبقى ثابتًا مع الشاشة
        }
        // مكان الضوء حين لا يلمس المستخدم الشاشة: يرتاح بأعلى الصفحة
        // (الإصدار ١٣: بلا دوران دائم، فما في حلقة رسم شغّالة طول الوقت وهيك أخف على الجوال والبطارية)
        const rest = () => [innerWidth * .72, innerHeight * .2];
        function frame(t) {
            raf = 0;
            if (document.hidden || document.body.classList.contains('immersive')) return; // يُستأنف عند الرجوع
            const following = t - lastPtr < 2600;
            const [tx, ty] = following ? [px, py] : rest();
            x += (tx - x) * .07; y += (ty - y) * .07;
            apply();
            // بيوقف لحاله لما يوصل مكانه
            if (following || Math.abs(tx - x) > .5 || Math.abs(ty - y) > .5) raf = requestAnimationFrame(frame);
        }
        const run = () => { if (!raf && !reduce.matches && !lite) raf = requestAnimationFrame(frame); };
        // أثناء التمرير أو اللمس: الزخرفة تتوضّح أكثر (.is-awake) ثم تهدأ بعد لحظة من التوقف
        let calm = 0;
        function awake() {
            if (!box.classList.contains('is-awake')) box.classList.add('is-awake');
            clearTimeout(calm);
            calm = setTimeout(() => box.classList.remove('is-awake'), 1400);
        }
        function point(cx, cy) {
            px = cx; py = cy; lastPtr = performance.now();
            if (lite || reduce.matches) { x = cx; y = cy; apply(); } else run();
        }
        function init() {
            const amb = document.querySelector('.ambient');
            if (!amb || amb.querySelector('.fx-pattern')) return;
            box = document.createElement('div');
            box.className = 'fx-pattern'; box.setAttribute('aria-hidden', 'true');
            // fx-pat-all: النقش على كامل الشاشة، يظهر بهدوء أثناء التمرير أو اللمس ثم يخفت
            box.innerHTML = '<div class="fx-pat-all"><i class="fx-pat"></i></div><div class="fx-pat-top"><i class="fx-pat"></i></div><div class="fx-lens"><i class="fx-pat"></i></div>';
            amb.append(box);
            lens = box.querySelector('.fx-lens'); inner = lens.querySelector('.fx-pat');
            [x, y] = [innerWidth * .72, innerHeight * .2];
            apply();
            addEventListener('pointermove', e => { if (e.pointerType === 'mouse') point(e.clientX, e.clientY); }, { passive: true });
            addEventListener('pointerdown', e => { point(e.clientX, e.clientY); awake(); }, { passive: true });
            addEventListener('touchmove', e => { const t = e.touches[0]; if (t) point(t.clientX, t.clientY); awake(); }, { passive: true });
            addEventListener('scroll', awake, { passive: true, capture: true }); // capture: يلتقط تمرير أي قائمة داخلية أيضًا
            addEventListener('wheel', awake, { passive: true });
            document.addEventListener('visibilitychange', run);
            addEventListener('resize', run, { passive: true });
            run();
        }
        return { init };
    })();

    // ---------- ب٢ إطار نور يسري ----------
    const BEAM_HOSTS = '.dhikr-card, .progress-card, .khatma-card';
    function beams() {
        const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-paused', !e.isIntersecting))) : null;
        document.querySelectorAll(BEAM_HOSTS).forEach(card => {
            if (card.querySelector(':scope > .beam-ring')) return;
            card.classList.add('fx-beam-host');
            const ring = document.createElement('i');
            ring.className = 'beam-ring'; ring.setAttribute('aria-hidden', 'true');
            card.append(ring);
            if (io) io.observe(ring); // يتوقف الدوران خارج الشاشة
        });
    }

    // ---------- ح١ الذكر يظهر كلمة كلمة ----------
    // نص فيه آية (﴿) يظهر بتلاشٍ بسيط فقط، احترامًا لنص القرآن
    function textIn(el, text) {
        if (!el) return;
        el.classList.remove('fx-words', 'fx-fade');
        if (reduce.matches) { el.textContent = text; return; }
        void el.offsetWidth;
        // أول مرة: ننتظر انتهاء شاشة البداية حتى تُرى الحركة
        const wait = Math.max(0, 1150 - (performance.now() - born));
        el.style.setProperty('--fx-wait', wait + 'ms');
        if (/﴿/.test(text) || lite) { el.textContent = text; el.classList.add('fx-fade'); return; }
        el.replaceChildren();
        text.split(' ').forEach((w, i) => {
            if (i) el.append(' ');
            const s = document.createElement('span');
            s.className = 'fx-w'; s.style.setProperty('--i', i); s.textContent = w;
            el.append(s);
        });
        el.classList.add('fx-words');
    }

    // ---------- ح١ النص كلمة كلمة بكل الموقع (الإصدار ١٣) ----------
    // ١) عنوان الصفحة: أول ما تنفتح.  ٢) نصوص كل بطاقة: لما تبيّن البطاقة على الشاشة.
    // كل كلمة كاملة بعنصر لحالها (الحروف تبقى موصولة)، وما يتغيّر هو الشفافية والتمويه فقط فلا يتحرك التخطيط.
    // ما بيلمس: نص القرآن والذكر (إلهن حركتهن)، الأرقام المتغيّرة، الأزرار والحقول، والنصوص الطويلة.
    const HEAD = ':scope > :is(.home-intro, .page-header)';
    const HEAD_TEXT = '.eyebrow, h1, .page-lead';
    const CARD = '.home-card:not(.dhikr-card), .smart-section, .quick-card, .category-card, .setting-card, .personal-reminder, .khatma-card, .wird-streak-bar, .reader-hero, .install-card, .friday-card, .section-title, .section-heading, .adhkar-detail-intro';
    const CARD_TEXT = 'h2, h3, strong, small, p, .soft-label, .card-kicker, .ic-kicker, .fc-kicker, .rh-tools li, .ic-perks li';
    const SKIP = '.dhikr-card, .quran-hero, button, input, select, textarea, label, details, .fx-ticker, [hidden]';
    const HAS_NUM = /[0-9٠-٩]/;
    const MAX_LEN = 140;
    function splitWords(el) {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const nodes = [];
        // نص جديد كتبه كود آخر (مثل التحية) يُقسَّم من جديد، والمقسَّم سابقًا يُترك
        while (walker.nextNode()) { const n = walker.currentNode; if (n.nodeValue.trim() && !n.parentElement.classList.contains('fx-pw')) nodes.push(n); }
        nodes.forEach(n => {
            const frag = document.createDocumentFragment();
            n.nodeValue.split(/(\s+)/).forEach(part => {
                if (!part) return;
                if (!part.trim()) { frag.append(part); return; }
                const s = document.createElement('span');
                s.className = 'fx-pw'; s.textContent = part;
                frag.append(s);
            });
            n.replaceWith(frag);
        });
    }
    // كلمات كتلة (عنوان صفحة أو بطاقة)، بعد تقسيم نصوصها
    function wordsIn(block) {
        const words = new Set();
        block.querySelectorAll(block.matches('.home-intro, .page-header') ? HEAD_TEXT : CARD_TEXT).forEach(el => {
            const text = el.textContent;
            if (el.closest(SKIP) || HAS_NUM.test(text) || text.trim().length > MAX_LEN) return;
            splitWords(el);
            el.querySelectorAll('.fx-pw').forEach(w => words.add(w));
        });
        return [...words];
    }
    const splashLeft = () => Math.max(0, 1150 - (performance.now() - born)); // أول فتح: بعد شاشة البداية
    // ب٢ (الإصدار ١٤): البطاقة نفسها بتطلع لفوق شوي مع ظهور، ورا بعض بفرق ١١٠ جزء من الثانية،
    // وكلماتها بتبلّش بعدها بلحظة. العناوين (section-title/heading) بتطلع كلماتها بس.
    const RISE = ':not(.section-title):not(.section-heading)';
    let batch = 0, batchTimer = 0;
    function rise(block, wait) {
        if (!block.matches(RISE)) return -1;
        const d = wait + Math.min(batch++, 5) * 110;
        clearTimeout(batchTimer); batchTimer = setTimeout(() => { batch = 0; }, 80);
        block.style.setProperty('--fx-card-d', d + 'ms');
        block.classList.remove('fx-card-wait', 'fx-card-in'); void block.offsetWidth; block.classList.add('fx-card-in');
        const end = e => { if (e.target !== block) return; block.classList.remove('fx-card-in'); block.removeEventListener('animationend', end); };
        block.addEventListener('animationend', end);
        return d;
    }
    function play(block, wait = splashLeft()) {
        block.classList.remove('fx-wait');
        const d = rise(block, wait);
        const words = wordsIn(block);
        if (!words.length) return;
        words.forEach((w, i) => w.style.setProperty('--i', Math.min(i, 12))); // أطول انتظار ≈ ثلث ثانية
        block.style.setProperty('--fx-wait', (d >= 0 ? d + 140 : wait) + 'ms');
        block.classList.remove('fx-text-in'); void block.offsetWidth; block.classList.add('fx-text-in');
    }
    // البطاقة بتبلّش حركتها أول ما تبيّن على الشاشة
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(e => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target); play(e.target);
    }), { threshold: .15 }) : null;
    function pageIn(page, wait = 0) {
        if (!page || reduce.matches) return;
        const head = page.querySelector(HEAD);
        if (head) play(head, wait);
        const blocks = [...page.querySelectorAll(CARD)].filter(b => !b.parentElement.closest(CARD) && !b.closest('[hidden]'));
        blocks.forEach(b => {
            if (!io) return play(b, wait);
            const card = b.matches(RISE);
            if (!card && !wordsIn(b).length) return;
            b.classList.remove('fx-text-in', 'fx-card-in');
            if (card) b.classList.add('fx-card-wait');
            if (wordsIn(b).length) b.classList.add('fx-wait');
            io.unobserve(b); io.observe(b);
        });
        // أمان: البطاقات الظاهرة على الشاشة ما بتضل مخفية لو تأخّر المراقب
        clearTimeout(page._fxSafety);
        page._fxSafety = setTimeout(() => page.querySelectorAll('.fx-wait, .fx-card-wait').forEach(b => {
            const r = b.getBoundingClientRect();
            if (r.bottom > 0 && r.top < innerHeight) { io && io.unobserve(b); play(b, 0); }
        }), wait + 1500);
    }
    function pages() {
        const was = /(^|\s)active-page(\s|$)/;
        const mo = new MutationObserver(recs => recs.forEach(r => {
            if (r.target.classList.contains('active-page') && !was.test(r.oldValue || '')) pageIn(r.target);
        }));
        document.querySelectorAll('.page-view').forEach(p => mo.observe(p, { attributes: true, attributeFilter: ['class'], attributeOldValue: true }));
        // أول فتح للتطبيق: بعد شاشة البداية
        pageIn(document.querySelector('.page-view.active-page'), Math.max(0, 1150 - (performance.now() - born)));
    }

    // ---------- ح١ العدّاد يتدحرج ----------
    const DIGITS = '٠١٢٣٤٥٦٧٨٩';
    const column = () => `<span class="tk-col">${[...DIGITS].map(d => `<i>${d}</i>`).join('')}</span>`;
    function ticker(el, n) {
        if (!el) return;
        const s = String(Math.max(0, Math.floor(n)));
        el.setAttribute('aria-label', Number(s).toLocaleString('ar-EG'));
        if (reduce.matches) { el.textContent = Number(s).toLocaleString('ar-EG'); return; }
        if (!el.classList.contains('fx-ticker') || el.children.length !== s.length) {
            el.classList.add('fx-ticker');
            el.innerHTML = [...s].map(() => `<span class="tk" aria-hidden="true">${column()}</span>`).join('');
            // الخانات الجديدة تبدأ من ٠ ثم تتدحرج للقيمة
            void el.offsetWidth;
        }
        [...el.children].forEach((tk, i) => tk.firstElementChild.style.setProperty('--d', s[i]));
    }

    function init() {
        PatternLight.init();
        beams();
        pages();
    }
    return { init, textIn, ticker, lite };
})();
