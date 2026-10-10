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

// ===== اسمك في التحية (ويناديك به المساعد) =====
const UserName = (() => {
    const KEY = 'mudhakkir-name';
    const $ = id => document.getElementById(id);
    const get = () => { try { return (localStorage.getItem(KEY) || '').trim(); } catch (e) { return ''; } };
    function paint() {
        const name = get();
        if ($('greeting-name')) { $('greeting-name').textContent = name; $('greeting-name-wrap').hidden = !name; }
        if ($('name-input') && document.activeElement !== $('name-input')) $('name-input').value = name;
        if ($('name-status')) $('name-status').textContent = name ? `أهلًا ${name} — يظهر اسمك في التحية ويناديك به المساعد` : 'يظهر في التحية بالرئيسية، ويناديك به المساعد';
    }
    function set(v) {
        v = String(v || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
        try { if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch (e) {}
        paint();
        return v;
    }
    function init() {
        paint();
        $('name-form')?.addEventListener('submit', e => {
            e.preventDefault();
            const v = set($('name-input').value);
            $('name-input').blur();
            Toast.show(v ? `أهلًا ${v}، تم حفظ اسمك` : 'تم حذف الاسم من التحية');
        });
        // الضغط على الاسم في التحية يفتح تعديله
        $('greeting-name')?.addEventListener('click', () => {
            navigateTo('settings');
            setTimeout(() => { $('name-input')?.focus({ preventScroll: true }); $('name-setting')?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 350);
        });
    }
    return { init, get, set };
})();

// ===== تذكير الجمعة: سورة الكهف والصلاة على النبي ﷺ =====
// يُرسل للسيرفر كتذكير عادي (الجمعة ٩:٠٠ بتوقيت الجهاز) فيصل حتى والتطبيق مغلق
const FridayReminder = (() => {
    const KEY = 'mudhakkir-friday', SINCE = 'mudhakkir-friday-since';
    const KAHF_PAGE = 293;
    const read = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    const write = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
    const isOn = () => read(KEY) !== '0';
    const isFriday = (d = new Date()) => d.getDay() === 5;
    function since() {
        let s = Number(read(SINCE));
        if (!s) { s = Date.now(); write(SINCE, String(s)); }
        return s;
    }
    // بنفس شكل التذكيرات الشخصية (يقرؤه sw.js و PushSync)
    function entries() {
        if (!isOn()) return [];
        return [{
            id: 'friday', on: true, title: 'يوم الجمعة 🕌',
            text: 'لا تنسَ قراءة سورة الكهف، وأكثِر من الصلاة على النبي ﷺ. اللهم صلِّ وسلم على نبينا محمد.',
            time: '09:00', repeat: 'days', days: [5], date: '', since: since(), url: './?open=kahf'
        }];
    }
    function paintCard() {
        const card = document.getElementById('friday-card');
        if (card) card.hidden = !(isOn() && isFriday());
    }
    function openKahf() {
        navigateTo('free-reading');
        if (typeof Reader !== 'undefined' && Reader.openAt) Reader.openAt(KAHF_PAGE, '18:1', true);
    }
    function init() {
        const sw = document.getElementById('friday-switch');
        if (sw) {
            sw.checked = isOn();
            sw.addEventListener('change', async () => {
                write(KEY, sw.checked ? '1' : '0');
                if (sw.checked) { write(SINCE, String(Date.now())); await Notifier.ensurePermission(); }
                paintCard();
                syncNotifications();
                Toast.show(sw.checked ? 'سيصلك تذكير الجمعة صباح كل جمعة بإذن الله' : 'تم إيقاف تذكير الجمعة');
            });
        }
        document.getElementById('friday-read')?.addEventListener('click', openKahf);
        // من إشعار الجمعة: ?open=kahf (فتح جديد) أو رسالة من sw.js (التطبيق مفتوح)
        const params = new URLSearchParams(location.search);
        if (params.get('open') === 'kahf') { history.replaceState(history.state, '', location.pathname); setTimeout(openKahf, 400); }
        if (SW_OK) navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.type === 'mdk-open-kahf') openKahf(); });
        paintCard();
        setInterval(paintCard, 10 * 60 * 1000);
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') paintCard(); });
    }
    return { init, entries, openKahf, isOn };
})();
