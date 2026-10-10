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
        // مكان الضوء حين لا يلمس المستخدم الشاشة: دوران هادئ بطيء حول أعلى الصفحة
        function idle(t) { return [innerWidth * (.5 + .3 * Math.cos(t / 5200)), innerHeight * (.22 + .12 * Math.sin(t / 4100))]; }
        function frame(t) {
            raf = 0;
            if (document.hidden || document.body.classList.contains('immersive')) return; // يُستأنف عند الرجوع
            const [tx, ty] = t - lastPtr < 2600 ? [px, py] : idle(t);
            x += (tx - x) * .07; y += (ty - y) * .07;
            apply();
            raf = requestAnimationFrame(frame);
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
            new MutationObserver(run).observe(document.body, { attributes: true, attributeFilter: ['class'] });
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
    }
    return { init, textIn, ticker, lite };
})();
