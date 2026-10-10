/* =====================================================================
 * مُذكّر — notifications.js
 * الإشعارات: رابط السيرفر، التخزين المشترك مع sw.js، مواعيد التذكير، الإشعار والتنبيه داخل التطبيق، المزامنة مع السيرفر، والأذكار العامة كل ١٥ دقيقة.
 * ← رابط سيرفر Cloudflare في أول هذا الملف (PUSH_SERVER).
 * يُحمَّل بالترتيب من index.html؛ الأجزاء تتشارك المتغيرات العامة فيما بينها.
 * ===================================================================== */

// ===== الإشعارات الدورية للأذكار العامة (كل ١٥ دقيقة) =====
// ضع هنا رابط الـ Worker بعد نشره (مثال: https://mudhakkir-push.name.workers.dev) — اتركه فارغاً لتعطيل Push
const PUSH_SERVER = 'https://mudhakkir-push.bader-bm-2000.workers.dev';
const VAPID_PUBLIC_KEY = 'BHIWTXCv4Gmy6fy5fbsJ_NX4fLD0dkEo2PqyCVWzmbxaxw8xo8Ud9eMw_rZOp_qxOaDkSEThGzQbhQhSCQ6p2_8';

// هل يمكن تسجيل Service Worker هنا؟ (https أو localhost فقط)
const SW_OK = 'serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname));

// تخزين مشترك مع الـ Service Worker (Cache Storage): منه يقرأ sw.js التذكيرات حتى والتطبيق مغلق
const NotifyStore = (() => {
    const DATA_CACHE = 'mudhakkir-data';
    const url = name => new URL('__mdk/' + name, document.baseURI).href;
    async function put(name, value) {
        if (!('caches' in window)) return;
        try { const c = await caches.open(DATA_CACHE); await c.put(url(name), new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } })); } catch (e) {}
    }
    return { put };
})();

// مواعيد التذكيرات (نفس المنطق موجود في sw.js)
const Sched = (() => {
    const DUE_WINDOW = 30 * 60 * 1000; // نعرض التذكير إن تأخر وصوله حتى ٣٠ دقيقة
    const pad = n => String(n).padStart(2, '0');
    const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    function at(r, base) {
        const [h, m] = r.time.split(':').map(Number);
        const d = new Date(base); d.setHours(h, m, 0, 0);
        return d;
    }
    function matchesDay(r, d) {
        if (r.repeat === 'once') return r.date === dayKey(d);
        if (r.repeat === 'days') return (r.days || []).includes(d.getDay());
        return true;
    }
    // موعد حلّ للتو (خلال النافذة) ولم يُعرض بعد
    function occurrence(r, now = Date.now()) {
        if (!r || !r.on || !/^\d\d:\d\d$/.test(r.time)) return null;
        for (let back = 0; back <= 1; back++) {
            const base = new Date(now); base.setDate(base.getDate() - back);
            const d = at(r, base);
            if (!matchesDay(r, d)) continue;
            const diff = now - d.getTime();
            if (diff >= 0 && diff < DUE_WINDOW && d.getTime() >= (r.since || 0) - 60000) return d;
        }
        return null;
    }
    // الموعد القادم (لعرض الحالة)
    function next(r, from = new Date()) {
        if (!r || !/^\d\d:\d\d$/.test(r.time)) return null;
        for (let k = 0; k <= 8; k++) {
            const base = new Date(from); base.setDate(base.getDate() + k);
            const d = at(r, base);
            if (d > from && matchesDay(r, d)) return d;
        }
        return null;
    }
    return { occurrence, next, dayKey, pad };
})();

// عرض الإشعار (نظام التشغيل)
const Notifier = (() => {
    const supported = 'Notification' in window;
    const permission = () => (supported ? Notification.permission : 'unsupported');
    async function ensurePermission() {
        if (supported && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch (e) {} }
        return permission();
    }
    // extra: أزرار الإشعار وبياناته (تعمل فقط عبر الـ Service Worker)
    async function system(title, body, tag, extra = null) {
        if (permission() !== 'granted') return false;
        const options = { body, tag, renotify: true, lang: 'ar', dir: 'rtl', icon: 'assets/img/icon-192.png', badge: 'assets/img/favicon-64.png' };
        try {
            if (SW_OK) {
                const reg = await navigator.serviceWorker.getRegistration();
                if (reg) { await reg.showNotification(title, { ...options, ...(extra || {}) }); return true; }
            }
            new Notification(title, options);
            return true;
        } catch (e) { return false; }
    }
    return { supported, permission, ensurePermission, system };
})();

// تنبيه داخل التطبيق عند حلول وقت التذكير والتطبيق مفتوح
const InAppReminder = (() => {
    const box = document.getElementById('inapp-reminder');
    let queue = [], showing = false, timer = 0, ctx = null;
    function chime() {
        try {
            ctx ||= new (window.AudioContext || window.webkitAudioContext)();
            [0, .16].forEach((t, i) => {
                const o = ctx.createOscillator(), g = ctx.createGain(), s = ctx.currentTime + t;
                o.type = 'sine'; o.frequency.setValueAtTime(i ? 784 : 659, s);
                g.gain.setValueAtTime(.0001, s); g.gain.exponentialRampToValueAtTime(.06, s + .02); g.gain.exponentialRampToValueAtTime(.0001, s + .45);
                o.connect(g).connect(ctx.destination); o.start(s); o.stop(s + .5);
            });
        } catch (e) {}
    }
    function next() {
        if (showing || !queue.length || !box) return;
        const r = queue.shift(); showing = true;
        box.querySelector('.iar-title').textContent = r.title;
        box.querySelector('.iar-text').textContent = r.text;
        box.hidden = false;
        requestAnimationFrame(() => box.classList.add('show'));
        try { if (navigator.vibrate) navigator.vibrate([30, 60, 30]); } catch (e) {}
        chime();
        clearTimeout(timer); timer = setTimeout(hide, 20000);
    }
    function hide() {
        if (!showing) return;
        clearTimeout(timer);
        box.classList.remove('show');
        setTimeout(() => { box.hidden = true; showing = false; next(); }, 380);
    }
    box?.querySelector('.iar-close').addEventListener('click', hide);
    box?.querySelector('.iar-done').addEventListener('click', () => { DailyStats.add('tasbeeh', 1); hide(); });
    return { show: list => { queue.push(...list); next(); } };
})();

// مزامنة الاشتراك مع سيرفر الإشعارات: يرسل وقت كل تذكير (دون نصه) ليصل الإشعار والتطبيق مغلق
const PushSync = (() => {
    const SENT_KEY = 'mudhakkir-push-sent-v2'; // مفتاح جديد: كل الأجهزة تعيد إرسال أوقاتها بعد التحديث
    let state = PUSH_SERVER ? 'pending' : 'nourl';
    let running = null, again = false;
    const listeners = new Set();
    const setState = s => { state = s; listeners.forEach(f => f(s)); };
    const tz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } };
    const post = (path, body) => fetch(PUSH_SERVER + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

    async function run() {
        if (!PUSH_SERVER) return setState('nourl');
        if (!SW_OK || !('PushManager' in window)) return setState('unsupported');
        const general = GeneralReminder.isActive();
        const reminders = allReminders().filter(r => r.on && Sched.next(r)).map(({ id, time, repeat, days, date }) => ({ id, time, repeat, days, date }));
        const need = Notifier.permission() === 'granted' && (general || reminders.length > 0);
        try {
            const reg = await navigator.serviceWorker.ready;
            let sub = await reg.pushManager.getSubscription();
            if (need) {
                if (!sub) {
                    const raw = atob(VAPID_PUBLIC_KEY.replace(/-/g, '+').replace(/_/g, '/'));
                    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(raw, c => c.charCodeAt(0)) });
                }
                const body = { ...sub.toJSON(), general, tz: tz(), reminders };
                const sig = JSON.stringify(body);
                let sent = null;
                try { sent = JSON.parse(localStorage.getItem(SENT_KEY)); } catch (e) {}
                // لا نعيد الإرسال إن لم يتغير شيء (مع تحديث يومي)
                if (sent && sent.sig === sig && Date.now() - sent.at < 864e5) return setState('on');
                const res = await post('/subscribe', body);
                if (!res.ok) return setState('error');
                // السيرفر القديم يرد بـ "ok" فقط ويتجاهل التذكيرات؛ الجديد يرد بـ v: 2
                const reply = await res.json().catch(() => null);
                if (!reply || reply.v !== 2) return setState(reminders.length ? 'outdated' : 'on');
                try { localStorage.setItem(SENT_KEY, JSON.stringify({ sig, at: Date.now() })); } catch (e) {}
                setState('on');
            } else {
                if (sub) { await post('/unsubscribe', { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); }
                try { localStorage.removeItem(SENT_KEY); } catch (e) {}
                setState('off');
            }
        } catch (e) { setState('error'); }
    }
    function sync() {
        if (running) { again = true; return running; }
        running = (async () => { do { again = false; await run(); } while (again); })().finally(() => { running = null; });
        return running;
    }
    return { sync, state: () => state, onChange: f => listeners.add(f) };
})();

// التذكيرات الشخصية + تذكير الجمعة (time-context.js)
const allReminders = () => Reminders.list().concat(typeof FridayReminder !== 'undefined' ? FridayReminder.entries() : []);

// كل تغيير في الإعدادات: نحدّث نسخة الـ Service Worker ثم السيرفر
function syncNotifications() {
    NotifyStore.put('state', { general: GeneralReminder.isActive(), reminders: allReminders() });
    PushSync.sync();
}

const GeneralReminder = (() => {
    const INTERVAL_MS = 15 * 60 * 1000;
    const KEY_PREF = 'mudhakkir-general-notif';
    const KEY_SLOT = 'mudhakkir-general-lastslot';
    const KEY_BAG  = 'mudhakkir-general-bag';
    const TITLE = 'أذكار عامة';
    // نفس أزرار إشعار sw.js: «اسأل مُذكّر» (مع خانة كتابة إن دعمها المتصفح) و«ذكر آخر»
    const EXTRA = { data: { kind: 'general' }, actions: [
        { action: 'ask', title: '✍️ اسأل مُذكّر', type: 'text', placeholder: 'اكتب ما تريد… مثلًا: ذكر عند الغضب' },
        { action: 'next', title: 'ذكر آخر ↻' }
    ] };
    let timer = null;

    const store = {
        get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    };
    const slotOf = t => Math.floor(t / INTERVAL_MS);
    const wanted = () => store.get(KEY_PREF) !== '0';
    const isActive = () => Notifier.supported && wanted() && Notification.permission === 'granted';

    // اختيار عشوائي دون تكرار حتى تُعرض كل الأذكار (Shuffle Bag)
    function nextDhikr() {
        const total = GENERAL_ADHKAR_LIST.length;
        let bag = [];
        try { bag = JSON.parse(store.get(KEY_BAG)) || []; } catch (e) { bag = []; }
        bag = bag.filter(i => Number.isInteger(i) && i >= 0 && i < total);
        if (!bag.length) {
            bag = Array.from({ length: total }, (_, i) => i);
            for (let i = bag.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [bag[i], bag[j]] = [bag[j], bag[i]];
            }
        }
        const idx = bag.pop();
        store.set(KEY_BAG, JSON.stringify(bag));
        return GENERAL_ADHKAR_LIST[idx];
    }

    function fireIfDue() {
        if (!isActive()) return;
        // والتطبيق في الخلفية يتولى السيرفر الإشعار، فلا نكرره
        if (document.visibilityState !== 'visible' && PushSync.state() === 'on') return;
        const current = slotOf(Date.now());
        const last = parseInt(store.get(KEY_SLOT) || '0', 10);
        if (current > last) {
            store.set(KEY_SLOT, String(current));
            Notifier.system(TITLE, nextDhikr(), 'general-adhkar', EXTRA);
        }
    }

    function schedule() {
        clearTimeout(timer);
        if (isActive()) {
            const now = Date.now();
            const next = (slotOf(now) + 1) * INTERVAL_MS;
            timer = setTimeout(() => { fireIfDue(); schedule(); }, next - now + 250);
        }
        updateUI();
    }

    function updateUI() {
        const sw = document.getElementById('gr-switch');
        const status = document.getElementById('gr-status');
        if (!sw || !status) return;
        const perm = Notifier.permission();
        sw.checked = isActive();
        sw.disabled = perm === 'unsupported' || perm === 'denied';

        if (perm === 'unsupported') {
            status.textContent = 'متصفحك لا يدعم الإشعارات.';
        } else if (perm === 'denied') {
            status.textContent = 'الإشعارات محظورة لهذا الموقع. فعّلها من إعدادات المتصفح ثم أعد تحميل الصفحة.';
        } else if (isActive()) {
            const nextTime = new Date((slotOf(Date.now()) + 1) * INTERVAL_MS)
                .toLocaleTimeString('ar', { hour: 'numeric', minute: '2-digit' });
            status.textContent = `مفعّلة · الإشعار القادم ${nextTime} · ${{ on: 'تصلك حتى والتطبيق مغلق ✓', outdated: 'تصلك حتى والتطبيق مغلق ✓', pending: 'جارٍ تفعيل الإشعار في الخلفية…', error: 'تعذر تفعيل الإشعار في الخلفية، تعمل والتطبيق مفتوح فقط', unsupported: 'متصفحك لا يدعم الإشعار في الخلفية', nourl: 'تعمل طالما الموقع أو التطبيق مفتوح', off: '' }[PushSync.state()] || ''}`;
        } else {
            status.textContent = 'فعّل المفتاح لتصلك أذكار عشوائية كل ١٥ دقيقة.';
        }
    }

    async function setEnabled(on) {
        if (!Notifier.supported) return updateUI();
        if (on) {
            store.set(KEY_PREF, '1');
            if (await Notifier.ensurePermission() === 'granted') store.set(KEY_SLOT, String(slotOf(Date.now())));
        } else {
            store.set(KEY_PREF, '0');
        }
        schedule();
        syncNotifications();
    }

    async function sendTest() {
        if (!Notifier.supported) return;
        const before = Notifier.permission();
        if (await Notifier.ensurePermission() !== 'granted') return updateUI();
        if (before !== 'granted') { schedule(); syncNotifications(); }
        Notifier.system(TITLE, nextDhikr(), 'general-adhkar', EXTRA);
    }

    function init() {
        // خط الأساس: لا إشعار فوري عند فتح الصفحة، أول إشعار عند أقرب ربع ساعة
        store.set(KEY_SLOT, String(slotOf(Date.now())));

        document.getElementById('gr-switch')?.addEventListener('change', e => setEnabled(e.target.checked));
        document.getElementById('gr-test')?.addEventListener('click', sendTest);

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') { fireIfDue(); schedule(); }
        });
        window.addEventListener('focus', () => { fireIfDue(); schedule(); });
        PushSync.onChange(updateUI);
        schedule();
    }

    const nextSlotText = () => new Date((slotOf(Date.now()) + 1) * INTERVAL_MS).toLocaleTimeString('ar', { hour: 'numeric', minute: '2-digit' });
    return { init, isActive, nextSlotText, refresh: schedule };
})();

// تسجيل Service Worker (مطلوب لعمل الإشعارات على الهاتف) + استقبال تذكيراته داخل التطبيق
if (SW_OK) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
    navigator.serviceWorker.addEventListener('message', e => {
        if (e.data?.type !== 'mdk-reminder') return;
        if (document.visibilityState === 'visible') InAppReminder.show(e.data.reminders || []);
        Reminders.render();
    });
}
