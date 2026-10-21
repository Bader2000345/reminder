/* =====================================================================
 * مُذكّر — fx.js
 * المؤثرات (الإصدار ١٥: السلاسة أولًا):
 *   - الخلفية ج٥: مشربية زمرّدية بالزاوية وضو ذهبي بيتنفّس (بتنرسم مرة وحدة، بلا تغيّر وقت التمرير)
 *   - إطار نور يسري على بطاقة الذكر والمتابعة والختمة والاقتراح — بالمؤثرات الكاملة بس
 *   - البطاقات بتظهر كاملة (تلاشٍ وطلعة ٨px، ٢٠٠ms) لما تبيّن، والذكر الجديد بتلاشٍ، والعدّاد يتدحرج
 * - «تقليل الحركة» يوقف كل شيء. «خفيفة» (html.fx-lite من الإعدادات ← المؤثرات، والتلقائي على الجوال)
 *   بتشيل كل حركة دائمة والزجاج المغبّش (14-performance.css).
 * يُحمَّل قبل home.js (يستعمل FX.textIn و FX.ticker عند التشغيل)، و FX.init() من main.js.
 * ===================================================================== */

const FX = (() => {
    const root = document.documentElement;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    // «خفيفة» من الإعدادات أو تلقائيًا على الجوال (preload-theme.js بيحطّها قبل الرسم)
    const isLite = () => root.classList.contains('fx-lite') || reduce.matches;
    const born = performance.now();
    const SPLASH_MS = 500; // مدة شاشة البداية (04 + 14 css)

    // ---------- الخلفية ج٥ «مشربية وضو» (الإصدار ١٥) ----------
    // شبكة مشربية زمرّدية بزاوية الشاشة بتتلاشى، و٣ خيوط ضو ذهبي نازلة منها بتتنفّس ببطء (opacity بس).
    // الرسم كله CSS (16-layout.css)، والطبقة بتنبنى مرة وحدة وما بتتغيّر وقت التمرير.
    function pattern() {
        const amb = document.querySelector('.ambient');
        if (!amb || amb.querySelector('.mash')) return;
        const box = document.createElement('div');
        box.className = 'mash'; box.setAttribute('aria-hidden', 'true');
        box.innerHTML = '<i class="mash-ray r1"></i><i class="mash-ray r2"></i><i class="mash-ray r3"></i><div class="mash-lattice"></div>';
        amb.append(box);
        // الضو بيوقف لما التطبيق مخفي (ما في داعي يشتغل بالخلفية)
        document.addEventListener('visibilitychange', () => box.classList.toggle('is-paused', document.hidden));
    }

    // ---------- ب٢ إطار نور يسري (بالمؤثرات الكاملة بس؛ بالخفيفة مخفي من 14-performance.css) ----------
    const BEAM_HOSTS = '.dhikr-card, .progress-card, .khatma-card, .smart-card';
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

    // ---------- الذكر الجديد بيظهر كله بتلاشٍ ٢٠٠ms (الإصدار ١٥: بلا كلمة كلمة) ----------
    function textIn(el, text) {
        if (!el) return;
        el.classList.remove('fx-words', 'fx-fade');
        el.textContent = text;
        if (reduce.matches) return;
        void el.offsetWidth;
        // أول مرة: ننتظر انتهاء شاشة البداية حتى تُرى الحركة
        el.style.setProperty('--fx-wait', Math.max(0, SPLASH_MS - (performance.now() - born)) + 'ms');
        el.classList.add('fx-fade');
    }

    // ---------- ظهور البطاقات (الإصدار ١٥): كل بطاقة بتظهر كاملة ----------
    // تلاشٍ مع طلعة ٨px خلال ٢٠٠ms (14-performance.css)، ورا بعض بفرق ٤٠ms، أول ما تبيّن على الشاشة.
    // بلا تقسيم الكلام لكلمات ولا تمويه: عنصر واحد بيتحرك بالـ transform و opacity بس.
    const HEAD = ':scope > :is(.home-intro, .page-header)';
    const CARD = '.home-card:not(.dhikr-card), .smart-section, .category-card:not(.glist-row), .setting-card, .khatma-top, .quran-tiles, .glist, .shelf, .sit-chips, .tb-wrap, .wird-streak-bar, .install-card, .friday-card, .hijri-card, .section-title, .section-heading, .adhkar-detail-intro';
    const splashLeft = () => Math.max(0, SPLASH_MS - (performance.now() - born)); // أول فتح: بعد شاشة البداية
    let batch = 0, batchTimer = 0;
    function play(block, wait = splashLeft()) {
        const d = wait + Math.min(batch++, 6) * 40;
        clearTimeout(batchTimer); batchTimer = setTimeout(() => { batch = 0; }, 80);
        block.style.setProperty('--fx-card-d', d + 'ms');
        block.classList.remove('fx-card-wait', 'fx-card-in'); void block.offsetWidth; block.classList.add('fx-card-in');
        const end = e => { if (e.target !== block) return; block.classList.remove('fx-card-in'); block.removeEventListener('animationend', end); };
        block.addEventListener('animationend', end);
    }
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(e => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target); play(e.target);
    }), { threshold: .1 }) : null;
    function pageIn(page, wait = 0) {
        if (!page || reduce.matches) return;
        const head = page.querySelector(HEAD);
        if (head) play(head, wait);
        const blocks = [...page.querySelectorAll(CARD)].filter(b => !b.parentElement.closest(CARD) && !b.closest('[hidden]'));
        blocks.forEach(b => {
            if (!io) return play(b, wait);
            b.classList.remove('fx-card-in'); b.classList.add('fx-card-wait');
            io.unobserve(b); io.observe(b);
        });
        // أمان: البطاقات الظاهرة على الشاشة ما بتضل مخفية لو تأخّر المراقب
        clearTimeout(page._fxSafety);
        page._fxSafety = setTimeout(() => page.querySelectorAll('.fx-card-wait').forEach(b => {
            const r = b.getBoundingClientRect();
            if (r.bottom > 0 && r.top < innerHeight) { io && io.unobserve(b); play(b, 0); }
        }), wait + 900);
    }
    function pages() {
        const was = /(^|\s)active-page(\s|$)/;
        const mo = new MutationObserver(recs => recs.forEach(r => {
            if (r.target.classList.contains('active-page') && !was.test(r.oldValue || '')) pageIn(r.target);
        }));
        document.querySelectorAll('.page-view').forEach(p => mo.observe(p, { attributes: true, attributeFilter: ['class'], attributeOldValue: true }));
        // أول فتح للتطبيق: بعد شاشة البداية
        pageIn(document.querySelector('.page-view.active-page'), splashLeft());
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
        pattern();
        beams();
        pages();
    }
    return { init, textIn, ticker, get lite() { return isLite(); } };
})();
