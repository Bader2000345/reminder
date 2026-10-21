/* =====================================================================
 * مُذكّر — tasbih.js  (الإصدار ١٢)
 * المسبحة الموحّدة: عدّاد واحد تتشاركه بطاقة الرئيسية وصفحة «التسبيح» و«وضع التسبيح».
 *   - صفحة التسبيح (س٣ من الإصدار ١٥): رقم كبير هادئ وتحته شريط تقدّم رفيع، ومنطقة الضغط كبيرة،
 *     اختيار الذكر والعدد (٣٣، ١٠٠، بلا حد)، مجموع اليوم والدورة بسطر الوصف، والصوت، والتصفير.
 *   - وضع التسبيح (م٣ + خ١): زر عائم بكل صفحة فوق «اسأل مُذكّر» يفتح شاشة كاملة، أي ضغطة بتحسب.
 *     الخروج مقصود: ضغط مطوّل ثانية على × (أو Esc على الكمبيوتر). زر الرجوع بالجوال ما بيطلّع بالغلط،
 *     والشاشة ما بتطفي (Wake Lock) إن دعمها المتصفح.
 * يُحمَّل قبل home.js (الرئيسية تستعمل Tasbih)، و Tasbih.init() من main.js. يستعمل DailyStats و Immersive.
 * ===================================================================== */

const Tasbih = (() => {
    const $ = id => document.getElementById(id);
    const KEY = { count: 'mudhakkir-home-tasbih-count', dhikr: 'mudhakkir-tasbih-dhikr', goal: 'mudhakkir-tasbih-goal', sound: 'mudhakkir-tasbih-sound' };
    const store = {
        get: (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
        set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
    };
    const AR = n => Number(n).toLocaleString('ar-EG');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    // الأذكار: النص المشكول للعرض، والقصير للأزرار
    const DHIKR = [
        { id: 'subhan', text: 'سُبْحَانَ اللَّهِ', label: 'سبحان الله' },
        { id: 'hamd', text: 'الْحَمْدُ لِلَّهِ', label: 'الحمد لله' },
        { id: 'akbar', text: 'اللَّهُ أَكْبَرُ', label: 'الله أكبر' },
        { id: 'istighfar', text: 'أَسْتَغْفِرُ اللَّهَ', label: 'أستغفر الله' },
        { id: 'tahlil', text: 'لَا إِلَهَ إِلَّا اللَّهُ', label: 'لا إله إلا الله' },
        { id: 'salat', text: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ', label: 'الصلاة على النبي ﷺ' }
    ];
    const GOALS = [33, 100, 0]; // 0 = بلا حد
    const HOLD_MS = 1000;       // مدة الضغط المطوّل للخروج

    let count = Math.max(0, Number(store.get(KEY.count, 0)) || 0);
    let goal = Number(store.get(KEY.goal, 33)); if (!GOALS.includes(goal)) goal = 33;
    let dhikr = DHIKR.find(d => d.id === store.get(KEY.dhikr, 'subhan')) || DHIKR[0];
    let soundOn = store.get(KEY.sound, 'on') !== 'off';
    const listeners = new Set();

    // ---------- الحالة المشتقة ----------
    function state(extra = {}) {
        const cyc = goal || 33;               // حلقة الرئيسية تكتمل كل ٣٣ إن لم يُحدَّد عدد
        const r = count % cyc, full = count > 0 && r === 0;
        return {
            count, goal, dhikr, soundOn,
            shown: goal ? (full ? goal : r) : count,          // الرقم داخل الدائرة
            progress: full ? 1 : r / cyc,                      // نسبة الحلقة
            cycle: goal ? Math.floor(Math.max(count - 1, 0) / goal) + 1 : 0,
            today: typeof DailyStats !== 'undefined' ? DailyStats.get().tasbeeh || 0 : 0,
            ...extra
        };
    }
    const emit = extra => { const s = state(extra); listeners.forEach(fn => { try { fn(s); } catch (e) {} }); return s; };
    const onChange = fn => { listeners.add(fn); fn(state()); return () => listeners.delete(fn); };

    // ---------- الصوت والاهتزاز ----------
    let audio = null;
    function playTap() {
        if (!soundOn) return;
        try {
            audio ||= new (window.AudioContext || window.webkitAudioContext)();
            const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
            o.type = 'sine'; o.frequency.setValueAtTime(560, t); o.frequency.exponentialRampToValueAtTime(400, t + .08);
            g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.045, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + .09);
            o.connect(g).connect(audio.destination); o.start(); o.stop(t + .1);
        } catch (e) {}
    }
    const buzz = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };
    // ك٢ (الإصدار ١٤): مع كل تسبيحة موجة ذهبية بتطلع من حوالين المسبحة (الرئيسية، الصفحة، الوضع)
    function wave(el) {
        if (!el || reduce.matches) return;
        const w = document.createElement('i');
        w.className = 'tb-wave'; w.setAttribute('aria-hidden', 'true');
        el.append(w); setTimeout(() => w.remove(), 760);
    }

    // ---------- العمليات ----------
    function add({ light = false } = {}) {
        count += 1; store.set(KEY.count, count);
        if (typeof DailyStats !== 'undefined') DailyStats.add('tasbeeh', 1);
        playTap();
        const completed = count % (goal || 33) === 0;
        if (completed) buzz([18, 40, 28]); else if (light) buzz(8);
        return emit({ completed, added: true });
    }
    function reset() { count = 0; store.set(KEY.count, 0); return emit(); }
    function setGoal(g) { goal = GOALS.includes(g) ? g : 33; store.set(KEY.goal, goal); return emit(); }
    function setDhikr(id) {
        const d = DHIKR.find(x => x.id === id); if (!d || d === dhikr) return state();
        dhikr = d; store.set(KEY.dhikr, d.id);
        count = 0; store.set(KEY.count, 0); // ذكر جديد = عدّ جديد
        return emit();
    }
    function toggleSound() { soundOn = !soundOn; store.set(KEY.sound, soundOn ? 'on' : 'off'); return emit(); }

    // ---------- صفحة التسبيح ----------
    function page() {
        const orb = $('tb-orb'); if (!orb) return;
        const chips = $('tb-dhikr');
        chips.replaceChildren(...DHIKR.map(d => {
            const b = document.createElement('button');
            b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.dhikr = d.id; b.textContent = d.label;
            b.addEventListener('click', () => setDhikr(d.id));
            return b;
        }));
        // أسهم لوحة المفاتيح داخل مجموعة الأذكار
        chips.addEventListener('keydown', e => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            const i = DHIKR.indexOf(dhikr), step = e.key === 'ArrowLeft' ? 1 : -1; // RTL: اليسار = التالي
            const next = DHIKR[(i + step + DHIKR.length) % DHIKR.length];
            setDhikr(next.id); chips.querySelector(`[data-dhikr="${next.id}"]`)?.focus(); e.preventDefault();
        });
        document.querySelectorAll('#tb-goal [data-goal]').forEach(b => b.addEventListener('click', () => setGoal(Number(b.dataset.goal))));
        orb.addEventListener('click', () => {
            const s = add();
            if (reduce.matches) return;
            wave(orb);
            orb.classList.remove('is-tap'); void orb.offsetWidth; orb.classList.add('is-tap');
            if (s.completed) { orb.classList.remove('is-cycle'); void orb.offsetWidth; orb.classList.add('is-cycle'); }
        });
        $('tb-reset').addEventListener('click', reset);
        $('tb-sound').addEventListener('click', toggleSound);
        $('tb-mode-btn').addEventListener('click', Mode.open);
        onChange(s => {
            $('tb-dz').textContent = s.dhikr.text;
            $('tb-count').textContent = AR(s.shown);
            $('tb-of').textContent = s.goal ? 'من ' + AR(s.goal) : 'بلا حد';
            $('tb-ring').style.strokeDashoffset = String(100 - (s.goal ? s.progress : 0) * 100);
            // س٣ (الإصدار ١٥): شريط تقدّم رفيع تحت الرقم (transform بس، خفيف عالجوال)
            const bar = $('tb-bar'); if (bar) bar.style.transform = `scaleX(${s.goal ? s.progress : 0})`;
            $('tb-today').textContent = AR(s.today);
            $('tb-cycle').textContent = AR(s.cycle);
            $('tb-cycle-wrap').hidden = !s.goal;
            chips.querySelectorAll('[data-dhikr]').forEach(b => { const on = b.dataset.dhikr === s.dhikr.id; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
            document.querySelectorAll('#tb-goal [data-goal]').forEach(b => b.classList.toggle('active', Number(b.dataset.goal) === s.goal));
            const snd = $('tb-sound'); snd.textContent = `الصوت: ${s.soundOn ? 'تشغيل' : 'إيقاف'}`; snd.setAttribute('aria-pressed', String(s.soundOn));
        });
    }

    // ---------- وضع التسبيح ----------
    const Mode = (() => {
        let root = null, exitBtn = null, holdTimer = 0, toastTimer = 0, lock = null, isOpen = false;
        async function wake() {
            try { if ('wakeLock' in navigator && document.visibilityState === 'visible') { lock = await navigator.wakeLock.request('screen'); lock.addEventListener?.('release', () => { lock = null; }); } }
            catch (e) { lock = null; }
        }
        function sleep() { try { lock?.release(); } catch (e) {} lock = null; }
        function toast(msg) {
            const t = $('tm-toast'); if (!t) return;
            t.textContent = msg; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
            clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
        }
        function paint(s) {
            if (!root) return;
            $('tm-dz').textContent = s.dhikr.text;
            $('tm-count').textContent = AR(s.shown);
            $('tm-ring').style.strokeDashoffset = String(100 - (s.goal ? s.progress : 0) * 100);
            $('tm-chip').textContent = s.goal ? `الدورة ${AR(s.cycle)} · الهدف ${AR(s.goal)}` : `المجموع ${AR(s.count)}`;
        }
        function ripple(e) {
            if (reduce.matches) return;
            const box = root.getBoundingClientRect(), r = document.createElement('span');
            r.className = 'tm-ripple'; r.style.left = (e.clientX - box.left) + 'px'; r.style.top = (e.clientY - box.top) + 'px';
            root.append(r); setTimeout(() => r.remove(), 650);
        }
        function tap(e) {
            const s = add({ light: true });
            if (e) ripple(e);
            if (reduce.matches) return;
            wave(root.querySelector('.tm-ring-wrap'));
            const c = $('tm-count'); c.classList.remove('is-pop'); void c.offsetWidth; c.classList.add('is-pop');
            if (s.completed) { root.classList.remove('is-cycle'); void root.offsetWidth; root.classList.add('is-cycle'); }
        }
        function open() {
            if (!root || isOpen) return;
            isOpen = true;
            root.hidden = false;
            requestAnimationFrame(() => root.classList.add('open'));
            document.body.classList.add('tasbih-mode-open');
            // زر الرجوع بالجوال: ما منطلع، منذكّر بطريقة الخروج (الخروج مقصود)
            Immersive.enter(root, { hideAfter: 0, onClose: () => { try { history.pushState({ mdkImmersive: true }, ''); } catch (err) {} toast('للخروج: اضغط مطوّلًا على ×'); } });
            paint(state());
            wake();
            root.focus({ preventScroll: true });
        }
        function close() {
            if (!isOpen) return;
            isOpen = false;
            clearTimeout(holdTimer); exitBtn.classList.remove('holding');
            root.classList.remove('open');
            document.body.classList.remove('tasbih-mode-open');
            Immersive.exit(root);
            sleep();
            setTimeout(() => { if (!isOpen) root.hidden = true; }, 320);
            $('tasbih-fab')?.focus({ preventScroll: true });
        }
        function init() {
            root = $('tasbih-mode'); exitBtn = $('tm-exit');
            if (!root || !exitBtn) return;
            root.tabIndex = -1;
            onChange(paint);
            // أي ضغطة بالشاشة بتحسب (إلا زر الخروج)
            root.addEventListener('pointerdown', e => {
                if (e.button > 0 || e.target.closest('#tm-exit')) return;
                tap(e);
            });
            root.addEventListener('contextmenu', e => e.preventDefault());
            // الخروج: ضغط مطوّل ثانية على ×، والحلقة الذهبية حوله بتتعبّى
            exitBtn.addEventListener('pointerdown', e => {
                e.stopPropagation();
                exitBtn.classList.add('holding');
                clearTimeout(holdTimer);
                holdTimer = setTimeout(close, HOLD_MS);
            });
            const cancel = () => {
                if (!exitBtn.classList.contains('holding')) return;
                exitBtn.classList.remove('holding'); clearTimeout(holdTimer);
                if (isOpen) toast('اضغط مطوّلًا على × للخروج');
            };
            ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => exitBtn.addEventListener(t, cancel));
            exitBtn.addEventListener('click', e => e.preventDefault());
            // لوحة المفاتيح: المسافة أو Enter تسبّح، و Esc يطلع
            document.addEventListener('keydown', e => {
                if (!isOpen) return;
                if (e.key === 'Escape') { e.preventDefault(); close(); }
                else if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); tap(null); }
            });
            document.addEventListener('visibilitychange', () => { if (isOpen && document.visibilityState === 'visible' && !lock) wake(); });
            $('tasbih-fab')?.addEventListener('click', open);
        }
        return { init, open, close, isOpen: () => isOpen };
    })();

    // الزرّان العائمان (التسبيح والمساعد) بيتخبّوا وإنت نازل بالصفحة، وبيرجعوا أول ما تطلع لفوق،
    // حتى ما يغطّوا الأزرار والمحتوى وإنت عم تقرأ
    function tuckFabs() {
        let lastY = scrollY;
        addEventListener('scroll', () => {
            const y = scrollY, dy = y - lastY;
            if (Math.abs(dy) < 8) return;
            document.body.classList.toggle('fabs-tucked', dy > 0 && y > 120);
            lastY = y;
        }, { passive: true });
    }

    function init() { page(); Mode.init(); tuckFabs(); }
    return { init, add, reset, setGoal, setDhikr, toggleSound, onChange, state, wave, openMode: () => Mode.open(), DHIKR };
})();
