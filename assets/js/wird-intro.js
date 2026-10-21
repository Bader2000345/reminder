/* =====================================================================
 * مُذكّر — wird-intro.js  (الإصدار ١٤)
 * أسئلة خطة الورد: أول ما يفوت المستخدم على «الورد اليومي» بتطلعله ٤ أسئلة قصيرة، وبعدين ملخّص خطته:
 *   ١) كم ختمة ناوي؟   ٢) بكم يوم الختمة؟ (منها «تحزيب الصحابة»)   ٣) من وين يبلّش؟   ٤) إيمتى نذكّره؟
 * - ما بتغيّر «تعديل الورد»: هي بس طريقة لطيفة لأول مرة (وفيك تعيدها من نافذة التعديل).
 * - «لاحقًا» بتسكّرها لهالجلسة، وبترجع المرة الجاية لحد ما يكمّلها.
 * - العنوان بيظهر كلمة كلمة (FX.textIn) والخيارات بتنزل وحدة ورا التانية.
 * WirdReminder: تذكير الورد اليومي، بيُرسل للسيرفر متل تذكير الجمعة (notifications.js ← allReminders).
 * يحتاج قبله: wird.js (Wird، SURAH_NAMES، QuranData)، fx.js بيتحمّل بعده (FX يُستعمل وقت العرض فقط).
 * ===================================================================== */

const WirdReminder = (() => {
    const KEY = 'mudhakkir-wird-reminder', SINCE = 'mudhakkir-wird-reminder-since';
    const read = k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
    const write = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
    const get = () => (/^\d{2}:\d{2}$/.test(read(KEY)) ? read(KEY) : '');
    const LAST = 'mudhakkir-wird-reminder-last'; // آخر وقت اختاره، حتى يرجع إذا طفّى التذكير ورجع شغّله
    function set(time) {
        const t = /^\d{2}:\d{2}$/.test(time || '') ? time : '';
        write(KEY, t);
        if (t) write(LAST, t);
        write(SINCE, String(Date.now()));
        if (typeof syncNotifications === 'function') syncNotifications();
        paintRow();
    }
    // م٣ (الإصدار ١٥): سطر «تذكير الورد» بصفحة أذكاري (وقت + مفتاح)
    function paintRow() {
        const time = document.getElementById('wird-rem-time'), sw = document.getElementById('wird-rem-switch'), st = document.getElementById('wird-rem-status');
        if (!time || !sw) return;
        const t = get();
        sw.checked = !!t;
        time.value = t || read(LAST) || '20:00';
        time.disabled = !t;
        if (st) st.textContent = t ? 'كل يوم، بالوقت يلي جنبه' : 'مطفي. شغّله واختار الوقت';
    }
    function initRow() {
        const time = document.getElementById('wird-rem-time'), sw = document.getElementById('wird-rem-switch');
        if (!time || !sw) return;
        sw.addEventListener('change', () => set(sw.checked ? (time.value || '20:00') : ''));
        time.addEventListener('change', () => { if (sw.checked && /^\d{2}:\d{2}$/.test(time.value)) set(time.value); });
        paintRow();
    }
    // بنفس شكل التذكيرات الشخصية (يقرؤه sw.js والسيرفر)
    function entries() {
        const time = get(); if (!time) return [];
        return [{
            id: 'wird', on: true, title: 'وردك من القرآن 📖',
            text: 'حان وقت وردك اليوم، ولو صفحة. «أحبُّ الأعمال إلى الله أدومُها وإن قلّ».',
            time, repeat: 'daily', days: [], date: '', since: Number(read(SINCE)) || Date.now(), url: './?open=wird'
        }];
    }
    return { get, set, entries, initRow };
})();

const WirdIntro = (() => {
    const $ = id => document.getElementById(id);
    const DONE_KEY = 'mudhakkir-wird-intro', LATER_KEY = 'mdk-wird-intro-later';
    const TOTAL = 604, MIN_PER_PAGE = 1.5;
    const AR = n => Number(n).toLocaleString('ar-EG');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const sv = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
    const ICON = {
        book: sv('<path d="M12 6c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-13c-3-.5-6 0-8 1.5zM12 6v13"/>'),
        books: sv('<path d="M4 5h4v14H4zM10 5h4v14h-4z"/><path d="M16 6l3.5-1 3 13.5-3.5 1z"/>'),
        plus: sv('<path d="M12 5v14M5 12h14"/>'),
        star: sv('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>'),
        cal: sv('<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
        leaf: sv('<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l7-7"/>'),
        flag: sv('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
        pin: sv('<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>'),
        list: sv('<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>'),
        sunrise: sv('<path d="M3 19h18"/><path d="M7 19a5 5 0 0 1 10 0"/><path d="M12 4v6M9.5 6.5L12 4l2.5 2.5"/>'),
        sun: sv('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>'),
        sunset: sv('<path d="M3 19h18"/><path d="M7 19a5 5 0 0 1 10 0"/><path d="M12 4v6M9.5 7.5L12 10l2.5-2.5"/>'),
        moon: sv('<path d="M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.5z"/>'),
        clock: sv('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
        off: sv('<path d="M6 16V11a6 6 0 0 1 9.5-4.9M18 11v5l1.5 2H8"/><path d="M3 3l18 18"/>'),
        check: sv('<path d="M5 12.5l4.5 4.5L19 7.5"/>')
    };
    const minutes = pages => {
        const m = Math.round(pages * MIN_PER_PAGE / 5) * 5 || 5;
        if (m < 60) return `${AR(m)} دقيقة تقريبًا`;
        const h = Math.round(m / 30) / 2;
        return h === 1 ? 'ساعة تقريبًا' : h === 2 ? 'ساعتين تقريبًا' : `${AR(h)} ساعات تقريبًا`;
    };
    const pagesFor = days => Math.ceil(TOTAL / days);
    // صفحة وحدة · صفحتين · ٣–١٠ صفحات · ١١ صفحة فما فوق
    const pagesLabel = n => (n === 1 ? 'صفحة وحدة' : n === 2 ? 'صفحتين' : n <= 10 ? `${AR(n)} صفحات` : `${AR(n)} صفحة`);

    let A = {}, step = 0, isOpen = false, lastFocus = null;
    const STEPS = 4; // + الملخّص

    // ---------- الأسئلة ----------
    function stepDef(i) {
        const info = Wird.info();
        if (i === 0) return {
            key: 'goal', title: 'كم ختمة ناوي تختم إن شاء الله؟',
            hint: 'النيّة الصادقة بتسهّل الطريق، وفيك تغيّرها بأي وقت.',
            options: [
                { v: 1, icon: 'book', label: 'ختمة وحدة', sub: 'بداية مباركة' },
                { v: 2, icon: 'books', label: 'ختمتين', sub: 'نيّة طيبة وهمّة عالية' },
                { v: 3, icon: 'books', label: '٣ ختمات', sub: 'الله يبارك بوقتك' },
                { v: 'more', icon: 'plus', label: 'أكتر', sub: 'حدّد العدد بنفسك' }
            ]
        };
        if (i === 1) return {
            key: 'pace', title: 'بكم يوم حابب تختم الختمة الوحدة؟',
            hint: 'اختار يلي بتقدر تداوم عليه، فالقليل الدايم أحسن من الكتير المنقطع.',
            options: [
                { v: 'sahaba', icon: 'star', label: 'أسبوع · تحزيب الصحابة', sub: `كل يوم حزب بحدود السور، ${minutes(86)}`, badge: 'سنّة الصحابة' },
                { v: 15, icon: 'cal', label: '١٥ يوم', sub: `${pagesLabel(pagesFor(15))} باليوم · ${minutes(pagesFor(15))}` },
                { v: 30, icon: 'cal', label: 'شهر', sub: `جزء كل يوم (${pagesLabel(pagesFor(30))}) · ${minutes(pagesFor(30))}` },
                { v: 60, icon: 'leaf', label: 'شهرين', sub: `${pagesLabel(pagesFor(60))} باليوم · ${minutes(pagesFor(60))}` },
                { v: 'daily', icon: 'list', label: 'على قدّي', sub: 'بحدّد كم صفحة باليوم' }
            ]
        };
        if (i === 2) {
            const options = [];
            if (info.hasProgress) options.push({ v: 'continue', icon: 'pin', label: 'من مكاني الحالي', sub: `سورة ${SURAH_NAMES[info.surah - 1]} · ما بيضيع شي من تقدّمك` });
            options.push({ v: 'beginning', icon: 'flag', label: 'من أول المصحف', sub: 'سورة الفاتحة' });
            options.push({ v: 'surah', icon: 'list', label: 'من سورة معيّنة', sub: 'اختار السورة' });
            return { key: 'start', title: 'من وين حابب تبلّش؟', hint: 'الورد بيمشي معك صفحة صفحة من المكان يلي بتختاره.', options };
        }
        return {
            key: 'time', title: 'إيمتى بتحب نذكّرك بوردك؟',
            hint: 'بيوصلك إشعار لطيف كل يوم، حتى والتطبيق مسكّر.',
            options: [
                { v: '06:00', icon: 'sunrise', label: 'الصبح بكّير', sub: '٦:٠٠ صباحًا' },
                { v: '09:00', icon: 'sun', label: 'الضحى', sub: '٩:٠٠ صباحًا' },
                { v: '14:00', icon: 'sun', label: 'بعد الظهر', sub: '٢:٠٠ ظهرًا' },
                { v: '19:00', icon: 'sunset', label: 'بعد المغرب', sub: '٧:٠٠ مساءً' },
                { v: '22:00', icon: 'moon', label: 'قبل النوم', sub: '١٠:٠٠ مساءً' },
                { v: 'custom', icon: 'clock', label: 'وقت تاني', sub: 'بختار الساعة بنفسي' },
                { v: 'none', icon: 'off', label: 'بلا تذكير', sub: 'بفتح الورد لحالي' }
            ]
        };
    }

    // ---------- البناء ----------
    const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html !== undefined) n.innerHTML = html; return n; };
    function dots() {
        $('wi-dots').innerHTML = Array.from({ length: STEPS }, (_, i) => `<i class="${i < step ? 'done' : i === step ? 'on' : ''}"></i>`).join('');
        $('wi-back').hidden = step === 0;
    }
    function title(node, text) {
        if (typeof FX !== 'undefined' && !reduce.matches) FX.textIn(node, text); else node.textContent = text;
    }
    function render(dir = 1) {
        const stage = $('wi-stage');
        const old = stage.querySelector('.wi-step:not(.leaving)');
        if (old) {
            old.classList.add('leaving'); old.style.setProperty('--wi-x', `${dir > 0 ? 28 : -28}px`);
            setTimeout(() => old.remove(), reduce.matches ? 0 : 260);
        }
        const node = step >= STEPS ? summary() : question(stepDef(step));
        node.classList.add('entering'); node.style.setProperty('--wi-x', `${dir > 0 ? -28 : 28}px`);
        stage.append(node);
        stage.scrollTop = 0;
        dots();
        // التركيز على أول خيار (بعد ما يبلّش ظهوره)
        setTimeout(() => node.querySelector('.wi-opt, .wi-start')?.focus({ preventScroll: true }), reduce.matches ? 0 : 320);
    }
    function question(d) {
        const node = el('div', 'wi-step');
        node.append(el('p', 'wi-eyebrow', `سؤال ${AR(step + 1)} من ${AR(STEPS)}`));
        const h = el('h2', 'wi-title'); h.id = 'wi-title'; title(h, d.title); node.append(h);
        node.append(el('p', 'wi-hint', d.hint));
        const list = el('div', 'wi-options'); list.setAttribute('role', 'group'); list.setAttribute('aria-labelledby', 'wi-title');
        d.options.forEach((o, k) => {
            const b = el('button', 'wi-opt', `<span class="wi-ic">${ICON[o.icon]}</span><span class="wi-txt"><b>${o.label}</b><small>${o.sub}</small></span>${o.badge ? `<em class="wi-badge">${o.badge}</em>` : ''}<span class="wi-check">${ICON.check}</span>`);
            b.type = 'button'; b.style.setProperty('--k', k);
            b.setAttribute('aria-pressed', String(isPicked(d.key, o.v)));
            b.addEventListener('click', () => pick(d.key, o.v, node, b));
            list.append(b);
        });
        node.append(list);
        const extra = el('div', 'wi-extra'); extra.hidden = true; node.append(extra);
        if (needsExtra(d.key, A[d.key])) showExtra(d.key, node);
        return node;
    }
    function isPicked(key, v) {
        if (key === 'goal') return A.goal === v || (v === 'more' && A.goal > 3);
        if (key === 'pace') return A.pace === v;
        if (key === 'start') return A.start === v;
        if (key === 'time') return A.time === v || (v === 'custom' && /^\d{2}:\d{2}$/.test(A.customTime || '') && A.time === 'custom');
        return false;
    }
    const needsExtra = (key, v) => (key === 'goal' && (v === 'more' || A.goal > 3)) || (key === 'pace' && v === 'daily') || (key === 'start' && v === 'surah') || (key === 'time' && v === 'custom');

    function pick(key, v, node, btn) {
        node.querySelectorAll('.wi-opt').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
        if (key === 'goal') A.goal = v === 'more' ? Math.max(4, A.goal > 3 ? A.goal : 4) : v;
        else A[key] = v;
        if (needsExtra(key, v)) { showExtra(key, node); return; }
        node.querySelector('.wi-extra').hidden = true;
        setTimeout(next, reduce.matches ? 0 : 260); // ننتقل لحالنا بعد ما يبيّن الاختيار
    }
    // خيارات إضافية: عدد الختمات، الصفحات باليوم، السورة، الساعة
    function showExtra(key, node) {
        const box = node.querySelector('.wi-extra');
        box.hidden = false; box.replaceChildren();
        if (key === 'goal') {
            const st = el('div', 'wi-stepper', `<button type="button" data-d="-1" aria-label="أقل">−</button><output aria-live="polite"></output><button type="button" data-d="1" aria-label="أكتر">+</button>`);
            const out = st.querySelector('output');
            const paint = () => { out.textContent = `${AR(A.goal)} ختمات`; };
            st.addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (!b) return; A.goal = Math.max(4, Math.min(30, A.goal + Number(b.dataset.d))); paint(); });
            paint(); box.append(st);
        } else if (key === 'pace') {
            A.pages = A.pages || 5;
            const chips = el('div', 'wi-chips');
            [2, 5, 10, 20].forEach(p => {
                const c = el('button', '', `${pagesLabel(p)}<small>${minutes(p)}</small>`); c.type = 'button';
                c.setAttribute('aria-pressed', String(A.pages === p));
                c.addEventListener('click', () => { A.pages = p; chips.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === c))); });
                chips.append(c);
            });
            box.append(el('p', 'wi-extra-label', 'كم صفحة باليوم؟'), chips);
        } else if (key === 'start') {
            const sel = el('select', 'wi-select'); sel.setAttribute('aria-label', 'اختار السورة');
            SURAH_NAMES.forEach((n, i) => sel.append(new Option(`${AR(i + 1)}. سورة ${n}`, i + 1)));
            sel.value = A.surah || Wird.info().surah || 1;
            A.surah = Number(sel.value);
            sel.addEventListener('change', () => { A.surah = Number(sel.value); });
            box.append(sel);
        } else if (key === 'time') {
            const t = el('input', 'wi-time'); t.type = 'time'; t.value = A.customTime || '20:30'; t.setAttribute('aria-label', 'ساعة التذكير');
            A.customTime = t.value;
            t.addEventListener('input', () => { A.customTime = t.value; });
            box.append(t);
        }
        const go = el('button', 'primary-button wi-next', 'التالي'); go.type = 'button';
        go.addEventListener('click', next);
        box.append(go);
        if (!reduce.matches) box.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    }

    // ---------- الملخّص ----------
    function plan() {
        const info = Wird.info();
        const pace = A.pace ?? 30;
        const f = pace === 'sahaba' ? { mode: 'sahaba', days: 7, pagesPerDay: 86 }
            : pace === 'daily' ? { mode: 'daily', days: Math.ceil(TOTAL / (A.pages || 5)), pagesPerDay: A.pages || 5 }
            : { mode: 'duration', days: Number(pace), pagesPerDay: pagesFor(Number(pace)) };
        f.start = A.start || (info.hasProgress ? 'continue' : 'beginning');
        f.surah = A.surah || 1;
        f.goal = A.goal || 1;
        return f;
    }
    function summary() {
        const f = plan(), goal = f.goal, days = f.mode === 'sahaba' ? 7 : f.days;
        const time = A.time === 'custom' ? A.customTime : A.time;
        const timeLabel = !time || time === 'none' ? 'بلا تذكير' : (() => { const [h, m] = time.split(':').map(Number); const pm = h >= 12; const hh = h % 12 || 12; return `كل يوم ${AR(hh)}:${AR(m).padStart(2, '٠')} ${pm ? 'مساءً' : 'صباحًا'}`; })();
        const startLabel = f.start === 'continue' ? 'من مكانك الحالي' : f.start === 'surah' ? `من سورة ${SURAH_NAMES[f.surah - 1]}` : 'من سورة الفاتحة';
        const paceLabel = f.mode === 'sahaba' ? 'تحزيب الصحابة: كل يوم حزب' : `${pagesLabel(f.pagesPerDay)} باليوم`;
        const each = f.mode === 'sahaba' ? minutes(86) : minutes(f.pagesPerDay);
        const total = goal > 1 ? `${AR(goal)} ختمات خلال ${AR(goal * days)} يوم تقريبًا` : `ختمة كل ${days === 7 ? 'أسبوع' : AR(days) + ' يوم'}`;
        const node = el('div', 'wi-step wi-final');
        node.append(el('p', 'wi-eyebrow', 'خطتك جاهزة'));
        const h = el('h2', 'wi-title'); h.id = 'wi-title'; title(h, 'على بركة الله، هي خطتك'); node.append(h);
        const card = el('div', 'wi-summary', `
            <div class="wi-row" style="--k:0"><span class="wi-ic">${ICON.books}</span><span><small>النيّة</small><b>${total}</b></span></div>
            <div class="wi-row" style="--k:1"><span class="wi-ic">${ICON.cal}</span><span><small>الورد</small><b>${paceLabel}</b><em>${each}</em></span></div>
            <div class="wi-row" style="--k:2"><span class="wi-ic">${ICON.flag}</span><span><small>البداية</small><b>${startLabel}</b></span></div>
            <div class="wi-row" style="--k:3"><span class="wi-ic">${ICON.clock}</span><span><small>التذكير</small><b>${timeLabel}</b></span></div>`);
        node.append(card);
        node.append(el('blockquote', 'wi-hadith', '«أحبُّ الأعمالِ إلى اللهِ أدومُها وإن قلَّ» <small>متفق عليه</small>'));
        const start = el('button', 'primary-button wi-start', 'ابدأ على بركة الله'); start.type = 'button';
        start.addEventListener('click', finish);
        node.append(start);
        node.append(el('p', 'wi-note', 'فيك تغيّر أي شي بعدين من «تعديل الورد اليومي».'));
        return node;
    }
    async function finish() {
        const f = plan();
        Wird.applyIntro(f);
        const time = A.time === 'custom' ? A.customTime : A.time;
        WirdReminder.set(time && time !== 'none' ? time : '');
        try { localStorage.setItem(DONE_KEY, 'done'); } catch (e) {}
        close(true);
        Toast.show('بدأت خطتك، الله يكتب أجرك ويثبّتك 🤍', 3200);
        // إذن الإشعارات (بنفس ضغطة الزر)، وبعدها نبعت التذكير للسيرفر
        if (time && time !== 'none' && typeof Notifier !== 'undefined' && Notifier.ensurePermission) {
            try { if (await Notifier.ensurePermission() === 'granted') syncNotifications(); } catch (e) {}
        }
    }

    // ---------- الفتح والإغلاق ----------
    function next() { step = Math.min(STEPS, step + 1); render(1); }
    function back() { if (step === 0) return; step -= 1; render(-1); }
    function open(fresh = false) {
        const root = $('wird-intro'); if (!root || isOpen) return;
        const info = Wird.info();
        A = fresh ? {} : { goal: info.goal > 1 ? info.goal : undefined };
        step = 0; isOpen = true; lastFocus = document.activeElement;
        $('wi-stage').replaceChildren();
        root.hidden = false;
        requestAnimationFrame(() => root.classList.add('open'));
        document.body.classList.add('modal-open');
        Immersive.enter(root, { hideAfter: 0, onClose: () => close(false, true) });
        render(1);
    }
    function close(done = false, fromPop = false) {
        const root = $('wird-intro'); if (!root || !isOpen) return;
        isOpen = false;
        if (!done) { try { sessionStorage.setItem(LATER_KEY, '1'); } catch (e) {} }
        root.classList.remove('open');
        document.body.classList.remove('modal-open');
        Immersive.exit(root, fromPop);
        setTimeout(() => { if (!isOpen) { root.hidden = true; $('wi-stage').replaceChildren(); } }, 300);
        lastFocus?.focus?.({ preventScroll: true });
    }
    const isDone = () => { try { return localStorage.getItem(DONE_KEY) === 'done'; } catch (e) { return true; } };
    const laterThisSession = () => { try { return sessionStorage.getItem(LATER_KEY) === '1'; } catch (e) { return false; } };
    // أول ما يبيّن تبويب «الورد اليومي»
    function maybeOpen() {
        if (isOpen || isDone() || laterThisSession()) return;
        const page = $('page-quran'), pane = $('quran-wird');
        if (!page?.classList.contains('active-page') || pane?.hidden) return;
        setTimeout(() => { if (page.classList.contains('active-page') && !pane.hidden) open(); }, 450);
    }

    function init() {
        $('wi-back')?.addEventListener('click', back);
        $('wi-later')?.addEventListener('click', () => close());
        $('wird-intro')?.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); close(); } });
        $('wird-intro-again')?.addEventListener('click', () => { setModalState($('edit-wird-modal'), false); setTimeout(() => open(true), 250); });
        const page = $('page-quran'), pane = $('quran-wird');
        if (page && pane) {
            const mo = new MutationObserver(maybeOpen);
            mo.observe(page, { attributes: true, attributeFilter: ['class'] });
            mo.observe(pane, { attributes: true, attributeFilter: ['hidden'] });
        }
        // من إشعار الورد: ?open=wird
        const params = new URLSearchParams(location.search);
        if (params.get('open') === 'wird') { history.replaceState(history.state, '', location.pathname); setTimeout(() => navigateTo('quran', 'wird-now'), 300); }
        // زر «افتح الورد» بالإشعار والتطبيق مفتوح (sw.js)
        if (typeof SW_OK !== 'undefined' && SW_OK) navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.type === 'mdk-open-wird') navigateTo('quran', 'wird-now'); });
        maybeOpen();
    }
    return { init, open, close };
})();
