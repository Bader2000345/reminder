/* =====================================================================
 * مُذكّر — time-context.js
 * التحية والأذكار الذكية حسب الوقت (صباح / مساء / نوم).
 * يُحمَّل بالترتيب من index.html؛ الأجزاء تتشارك المتغيرات العامة فيما بينها.
 * ===================================================================== */

// ===== التحية والأذكار الذكية حسب الوقت =====
const TimeContext = (() => {
    const greetingFor = hour => (hour >= 5 && hour < 12 ? 'صباح الخير' : 'مساء الخير');
    const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
    const SLOTS = {
        morning: { title: 'أذكار الصباح', desc: 'ابدأ يومك بذكرٍ يشرح الصدر ويمنحك سكينة.', ctx: 'فترة الصباح', icon: svg('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>') },
        evening: { title: 'أذكار المساء', desc: 'اختم يومك بذكرٍ هادئ يملأ القلب طمأنينة.', ctx: 'فترة المساء', icon: svg('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>') },
        sleep: { title: 'أذكار النوم', desc: 'حصّن نفسك قبل النوم بآية الكرسي والمعوّذات وأدعية النبي ﷺ.', ctx: 'قبل النوم', icon: svg('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/><path d="M16 4h3l-3 3h3"/>') }
    };
    const slotFor = h => (h >= 21 || h < 3) ? 'sleep' : (h >= 15 || h < 4) ? 'evening' : 'morning';
    const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    let slot = 'morning';
    function render() {
        const now = new Date(); slot = slotFor(now.getHours());
        const s = SLOTS[slot];
        setText('greeting-word', greetingFor(now.getHours()));
        setText('home-date-label', now.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }));
        setText('smart-title', s.title);
        setText('smart-description', s.desc);
        setText('smart-time-context', s.ctx);
        const icon = document.getElementById('smart-icon'); if (icon) icon.innerHTML = s.icon;
        const action = document.getElementById('smart-action');
        if (action) action.innerHTML = `فتح ${s.title} <span>←</span>`;
    }
    function init() {
        const action = document.getElementById('smart-action');
        if (action) { action.removeAttribute('data-target'); action.classList.remove('nav-btn'); action.addEventListener('click', () => AdhkarViewer.open(slot)); }
        render();
        setInterval(render, 60000);
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') render(); });
    }
    return { init };
})();
