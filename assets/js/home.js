/* =====================================================================
 * مُذكّر — home.js
 * الرئيسية: إحصائيات اليوم، المسبحة وبطاقة الذكر. (تثبيت التطبيق صار في install.js)
 * يُحمَّل بالترتيب من index.html؛ الأجزاء تتشارك المتغيرات العامة فيما بينها.
 * ===================================================================== */

// ===== إحصائيات الاستخدام اليومية =====
const DailyStats = (() => {
    const KEY = 'mudhakkir-daily-stats';
    const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    const read = () => {
        try {
            const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
            return saved.date === todayKey() ? saved : { date: todayKey(), tasbeeh: 0, wirdVerses: 0 };
        } catch (e) { return { date: todayKey(), tasbeeh: 0, wirdVerses: 0 }; }
    };
    const write = stats => { try { localStorage.setItem(KEY, JSON.stringify(stats)); } catch (e) {} };
    const get = () => read();
    const add = (field, amount = 1) => {
        const stats = read(); stats[field] = Number(stats[field] || 0) + amount; write(stats); render();
        // تقويم الأسبوع (extras.js): التسبيح، والقراءة من الورد
        if (typeof WeekLog !== 'undefined') WeekLog.mark(field === 'wirdVerses' ? 'r' : 't');
        return stats;
    };
    const render = () => {
        const line = document.getElementById('daily-stats-line'); if (!line) return;
        const stats = read(); const format = n => Number(n).toLocaleString('ar-EG-u-nu-latn');
        // العدد مع المعدود بقاعدة العربية: 1 تسبيحة · 2 تسبيحتان · 3–10 تسبيحات · 11+ تسبيحة
        const count = (n, one, two, few, many) => n === 1 ? `${one} واحدة` : n === 2 ? two
            : `<strong>${format(n)}</strong> ${n % 100 >= 3 && n % 100 <= 10 ? few : many}`;
        const parts = [];
        if (stats.tasbeeh) parts.push(count(stats.tasbeeh, 'تسبيحة', 'تسبيحتان', 'تسبيحات', 'تسبيحة'));
        if (stats.wirdVerses) parts.push(count(stats.wirdVerses, 'آية', 'آيتان', 'آيات', 'آية'));
        line.innerHTML = parts.length ? `إحصائية اليوم: ${parts.join(' · ')}` : 'إحصائية اليوم: لم تبدأ بعد، تسبيحة واحدة تكفي لتبدأ';
    };
    return { get, add, render };
})();

// ===== ر2 «يومك» (الإصدار 30، معرض الرئيسية) =====
// أربع محطات باليوم: أذكار الصباح، ورد القرآن، أذكار المساء، أذكار النوم. كل وحدة بتتعلّم لما تخلص،
// والمحطة يلي وقتها هلّق بتلمع وفيها «ابدأ» أو «كمّل». اليوم بيبلّش الساعة 4 الصبح (فأذكار النوم بعد نص الليل بتنحسب لليوم يلي قبل).
// الأذكار بتتعلّم من AdhkarViewer لما يخلص القسم كلو (DayPath.mark)، والورد من Wird.snapshot().
const DayPath = (() => {
    const KEY = 'mudhakkir-day-path';
    const $ = id => document.getElementById(id);
    const pad = n => String(n).padStart(2, '0');
    const dayKey = (d = new Date(Date.now() - 4 * 3600e3)) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && v.d === dayKey() ? v : { d: dayKey(), done: {} }; } catch (e) { return { d: dayKey(), done: {} }; } };
    const ar = n => Number(n).toLocaleString('ar-EG-u-nu-latn');
    const clock = ts => new Date(ts).toLocaleTimeString('ar-EG-u-nu-latn', { hour: 'numeric', minute: '2-digit' });
    // نفس أوقات time-context.js: الصباح 4–15، المسا 15–21، النوم 21–4
    const slotNow = h => (h >= 21 || h < 4) ? 'sleep' : h >= 15 ? 'evening' : 'morning';
    const ORDER = ['morning', 'evening', 'sleep'];
    const WHEN = { morning: 'بعد الفجر', evening: 'بعد العصر', sleep: 'قبل النوم' };
    const TITLE = { morning: 'أذكار الصباح', wird: 'ورد القرآن', evening: 'أذكار المساء', sleep: 'أذكار النوم' };
    const LINES = ['يومك لسا ببدايتو', 'بداية حلوة، كمّل', 'خلّصت نص يومك، كمّل 🤍', 'باقي خطوة وحدة', 'تمّ يومك، تقبّل الله منك 🤍'];

    function mark(key) {
        if (!ORDER.includes(key)) return;
        const v = read(); if (v.done[key]) return;
        v.done[key] = Date.now();
        try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {}
        render();
    }
    function resumeOf(key) {
        try {
            const r = JSON.parse(localStorage.getItem('mudhakkir-adhkar-resume') || 'null');
            return r && r.key === key && Date.now() - r.at < 18 * 3600e3 && Array.isArray(r.counts) ? r : null;
        } catch (e) { return null; }
    }
    function steps() {
        const v = read(), slot = slotNow(new Date().getHours()), passed = ORDER.slice(0, ORDER.indexOf(slot));
        const w = typeof Wird !== 'undefined' ? Wird.snapshot() : null;
        const list = [
            { key: 'morning' },
            { key: 'wird', ok: !!(w && w.done), pct: w ? w.todayPct : 0 },
            { key: 'evening' },
            { key: 'sleep' }
        ];
        list.forEach(s => {
            if (s.key !== 'wird') s.ok = !!v.done[s.key];
            s.state = s.ok ? 'ok' : passed.includes(s.key) ? 'missed' : s.key === slot || s.key === 'wird' ? 'open' : 'later';
        });
        // هلّق: محطة الوقت إذا لسا ما خلصت، وإلا الورد
        const nowStep = list.find(s => s.key === slot && !s.ok) || list.find(s => s.key === 'wird' && !s.ok);
        list.forEach(s => {
            if (s === nowStep) s.state = 'now';
            else if (s.state === 'open') s.state = s.key === 'wird' ? 'open' : 'later';
            if (s.key === 'wird') {
                s.sub = s.ok ? 'خلّصت وردك اليوم 🤍' : `${ar(s.pct)}٪ من ورد اليوم`;
                s.go = s.pct > 0 ? 'كمّل' : 'ابدأ';
            } else {
                const data = typeof ADHKAR_DATABASE !== 'undefined' ? ADHKAR_DATABASE[s.key] : null, r = resumeOf(s.key);
                if (r && !s.ok && s.state === 'later') s.state = 'open'; // بلّش فيها بكير ووقف: «كمّل» حتى لو مو وقتها
                s.sub = s.ok ? `خلصت ${clock(v.done[s.key])}`
                    : r && data ? `وقفت عند ${ar(r.idx + 1)} من ${ar(data.items.length)}`
                    : s.state === 'missed' ? 'فاتت؟ لسا فيك تقراها'
                    : s.state === 'now' && data ? `${ar(data.items.length)} ذكر`
                    : WHEN[s.key];
                s.go = r ? 'كمّل' : s.state === 'missed' ? 'اقرأ' : 'ابدأ';
            }
        });
        return list;
    }
    function render() {
        const box = $('dp-steps'); if (!box) return;
        const list = steps(), n = list.filter(s => s.ok).length;
        $('dp-ring').style.setProperty('--p', String(n * 25));
        $('dp-count').textContent = `${ar(n)}/${ar(4)}`;
        $('dp-line').textContent = LINES[n];
        box.innerHTML = list.map(s => `<li class="dp-step is-${s.state}"><button type="button" data-step="${s.key}"${s.state === 'now' ? ' aria-current="step"' : ''}>
            <span class="dp-dot" aria-hidden="true">${s.ok ? '✓' : s.state === 'now' ? '●' : ''}</span>
            <span class="dp-txt"><b>${TITLE[s.key]}</b><small>${s.sub}</small></span>
            ${s.ok || s.state === 'later' ? '' : `<em class="dp-go">${s.go}</em>`}</button></li>`).join('');
    }
    function open(key) {
        if (key === 'wird') { navigateTo('quran'); setTimeout(() => $('q-continue')?.click(), 350); return; }
        const r = resumeOf(key);
        if (r) AdhkarViewer.open(key, r.idx, r.counts); else AdhkarViewer.open(key);
    }
    function init() {
        const box = $('dp-steps'); if (!box) return;
        box.addEventListener('click', e => { const b = e.target.closest('[data-step]'); if (b) open(b.dataset.step); });
        render();
        setInterval(render, 60000);
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') render(); });
        // كل ما ترجع عالرئيسية (بعد ما تقرا أو تكمّل الورد)
        const page = $('page-home');
        if (page) new MutationObserver(() => { if (page.classList.contains('active-page')) render(); }).observe(page, { attributes: true, attributeFilter: ['class'] });
    }
    return { init, mark, render };
})();

// ===== تفاعلات لوحة التحكم الرئيسية =====
(() => {
    const countEl = document.getElementById('tasbih-count');
    const orb = document.getElementById('tasbih-orb');
    const floatEl = document.getElementById('tasbih-float');
    const dhikrText = document.getElementById('dhikr-card-text');
    const dhikrSource = document.getElementById('dhikr-card-source');
    const nextBtn = document.getElementById('dhikr-next-btn');
    const soundToggle = document.getElementById('tasbih-sound-toggle');
    if (!countEl || !orb) return;
    // العدّ والصوت والاهتزاز صاروا في tasbih.js: نفس العدّاد بالرئيسية وصفحة التسبيح ووضع التسبيح
    const INDEX_KEY = 'mudhakkir-home-dhikr-index';
    let index = Number(localStorage.getItem(INDEX_KEY) || 0);
    const format = n => Number(n).toLocaleString('ar-EG-u-nu-latn');
    const render = s => {
        // العدّاد يتدحرج (fx.js)، وإن لم يتوفر نكتب الرقم مباشرة
        if (typeof FX !== 'undefined') FX.ticker(countEl, s.count); else countEl.textContent = format(s.count);
        orb.style.setProperty('--p', String(s.progress)); // الحلقة تكتمل مع العدد المختار (33 افتراضيًا)
        if (soundToggle) { soundToggle.textContent = `الصوت: ${s.soundOn ? 'تشغيل' : 'إيقاف'}`; soundToggle.setAttribute('aria-pressed', String(s.soundOn)); }
    };
    const showDhikr = () => { if (!Array.isArray(window.GENERAL_ADHKAR_LIST) && typeof GENERAL_ADHKAR_LIST === 'undefined') return; const list = typeof GENERAL_ADHKAR_LIST !== 'undefined' ? GENERAL_ADHKAR_LIST : []; if (!list.length) return; index = (index + 1) % list.length; if (typeof FX !== 'undefined') FX.textIn(dhikrText, list[index]); else dhikrText.textContent = list[index]; dhikrSource.textContent = `ذكر مقترح · ${format(index + 1)} من ${format(list.length)}`; localStorage.setItem(INDEX_KEY, index); };
    Tasbih.onChange(render); showDhikr(); DailyStats.render();
    orb.addEventListener('click', () => {
        const s = Tasbih.add();
        Tasbih.wave(orb);
        orb.classList.remove('tasbih-ripple'); void orb.offsetWidth; orb.classList.add('tasbih-ripple');
        floatEl.classList.remove('show'); void floatEl.offsetWidth; floatEl.classList.add('show');
        // الرقم ينبض، وعند إتمام الدورة وميض ذهبي (والاهتزاز من tasbih.js)
        countEl.classList.remove('is-pop'); void countEl.offsetWidth; countEl.classList.add('is-pop');
        if (s.completed) { orb.classList.remove('is-cycle'); void orb.offsetWidth; orb.classList.add('is-cycle'); }
    });
    soundToggle?.addEventListener('click', () => Tasbih.toggleSound());
    nextBtn?.addEventListener('click', showDhikr);
})();
