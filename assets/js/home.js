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
        const stats = read(); const format = n => Number(n).toLocaleString('ar-EG');
        // العدد مع المعدود بقاعدة العربية: ١ تسبيحة · ٢ تسبيحتان · ٣–١٠ تسبيحات · ١١+ تسبيحة
        const count = (n, one, two, few, many) => n === 1 ? `${one} واحدة` : n === 2 ? two
            : `<strong>${format(n)}</strong> ${n % 100 >= 3 && n % 100 <= 10 ? few : many}`;
        const parts = [];
        if (stats.tasbeeh) parts.push(count(stats.tasbeeh, 'تسبيحة', 'تسبيحتان', 'تسبيحات', 'تسبيحة'));
        if (stats.wirdVerses) parts.push(count(stats.wirdVerses, 'آية', 'آيتان', 'آيات', 'آية'));
        line.innerHTML = parts.length ? `إحصائية اليوم: ${parts.join(' · ')}` : 'إحصائية اليوم: لم تبدأ بعد، تسبيحة واحدة تكفي لتبدأ';
    };
    return { get, add, render };
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
    const format = n => Number(n).toLocaleString('ar-EG');
    const render = s => {
        // العدّاد يتدحرج (fx.js)، وإن لم يتوفر نكتب الرقم مباشرة
        if (typeof FX !== 'undefined') FX.ticker(countEl, s.count); else countEl.textContent = format(s.count);
        orb.style.setProperty('--p', String(s.progress)); // الحلقة تكتمل مع العدد المختار (٣٣ افتراضيًا)
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
