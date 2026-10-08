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
    const add = (field, amount = 1) => { const stats = read(); stats[field] = Number(stats[field] || 0) + amount; write(stats); render(); return stats; };
    const render = () => {
        const line = document.getElementById('daily-stats-line'); if (!line) return;
        const stats = read(); const format = n => Number(n).toLocaleString('ar-EG');
        line.innerHTML = `إحصائية اليوم: <strong>${format(stats.tasbeeh)}</strong> تسبيحة · <strong>${format(stats.wirdVerses)}</strong> آية`;
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
    const COUNT_KEY = 'mudhakkir-home-tasbih-count';
    const INDEX_KEY = 'mudhakkir-home-dhikr-index';
    let count = Number(localStorage.getItem(COUNT_KEY) || 0);
    let index = Number(localStorage.getItem(INDEX_KEY) || 0);
    const SOUND_KEY = 'mudhakkir-tasbih-sound';
    let soundOn = localStorage.getItem(SOUND_KEY) !== 'off';
    let audioContext = null;
    const format = n => Number(n).toLocaleString('ar-EG');
    const updateSoundButton = () => { if (!soundToggle) return; soundToggle.textContent = `الصوت: ${soundOn ? 'تشغيل' : 'إيقاف'}`; soundToggle.setAttribute('aria-pressed', String(soundOn)); };
    const playTap = () => {
        if (!soundOn) return;
        try {
            audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain();
            oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(560, audioContext.currentTime); oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + .08);
            gain.gain.setValueAtTime(.0001, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.045, audioContext.currentTime + .01); gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + .09);
            oscillator.connect(gain).connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + .1);
        } catch (e) {}
    };
    const renderCount = () => { countEl.textContent = format(count); const stat = document.getElementById('dash-stat-tasbeeh'); if (stat) stat.textContent = format(count); };
    const showDhikr = () => { if (!Array.isArray(window.GENERAL_ADHKAR_LIST) && typeof GENERAL_ADHKAR_LIST === 'undefined') return; const list = typeof GENERAL_ADHKAR_LIST !== 'undefined' ? GENERAL_ADHKAR_LIST : []; if (!list.length) return; index = (index + 1) % list.length; dhikrText.textContent = list[index]; dhikrSource.textContent = `ذكر مقترح · ${format(index + 1)} من ${format(list.length)}`; localStorage.setItem(INDEX_KEY, index); };
    renderCount(); showDhikr(); updateSoundButton(); DailyStats.render();
    orb.addEventListener('click', () => { count += 1; localStorage.setItem(COUNT_KEY, count); DailyStats.add('tasbeeh', 1); playTap(); renderCount(); orb.classList.remove('tasbih-ripple'); void orb.offsetWidth; orb.classList.add('tasbih-ripple'); floatEl.classList.remove('show'); void floatEl.offsetWidth; floatEl.classList.add('show'); });
    soundToggle?.addEventListener('click', () => { soundOn = !soundOn; localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off'); updateSoundButton(); });
    nextBtn?.addEventListener('click', showDhikr);
})();
