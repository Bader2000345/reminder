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
    // يلي بيكتبه sw.js: الغفوات (إ٢) و«أتممت» من الإشعار
    async function get(name, fallback = null) {
        if (!('caches' in window)) return fallback;
        try { const r = await (await caches.open(DATA_CACHE)).match(url(name)); return r ? await r.json() : fallback; } catch (e) { return fallback; }
    }
    return { put, get };
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
    box?.querySelector('.iar-done').addEventListener('click', () => { DailyStats.add('tasbeeh', 1); if (typeof WeekLog !== 'undefined') WeekLog.mark('a'); hide(); });
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
        // + غفوات «بعد ١٠ دقائق» من الإشعار (sw.js) حتى ما تنمسح من السيرفر لما نبعت التذكيرات
        const snoozes = (await NotifyStore.get('snoozes', [])) || [];
        const reminders = allReminders().filter(r => r.on && Sched.next(r))
            .concat(Array.isArray(snoozes) ? snoozes.filter(s => s && s.at > Date.now() - 60000) : [])
            .map(({ id, time, repeat, days, date }) => ({ id, time, repeat, days, date }));
        const need = Notifier.permission() === 'granted' && (general || reminders.length > 0);
        try {
            const reg = await navigator.serviceWorker.ready;
            let sub = await reg.pushManager.getSubscription();
            if (need) {
                const raw = atob(VAPID_PUBLIC_KEY.replace(/-/g, '+').replace(/_/g, '/'));
                const key = Uint8Array.from(raw, c => c.charCodeAt(0));
                // اشتراك قديم بمفتاح غير مفتاح السيرفر الحالي: خدمة الإشعارات بترفضه (403) للأبد، فمنجدّده
                const old = sub && sub.options && sub.options.applicationServerKey;
                if (old && (old.byteLength !== key.length || new Uint8Array(old).some((b, i) => b !== key[i]))) {
                    await post('/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
                    await sub.unsubscribe().catch(() => {});
                    try { localStorage.removeItem(SENT_KEY); } catch (e) {}
                    sub = null;
                }
                if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
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
    // إصلاح: نلغي الاشتراك القديم ونعمل واحد جديد ونبعته للسيرفر من جديد (بيحل الاشتراك المنتهي أو الملغى)
    async function reset() {
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) { await post('/unsubscribe', { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe().catch(() => {}); }
        } catch (e) {}
        try { localStorage.removeItem(SENT_KEY); } catch (e) {}
        await sync();
        return state;
    }
    return { sync, reset, post, state: () => state, onChange: f => listeners.add(f) };
})();

// التذكيرات الشخصية + تذكير الجمعة (time-context.js) + تذكير الورد (wird-intro.js)
const allReminders = () => Reminders.list()
    .concat(typeof FridayReminder !== 'undefined' ? FridayReminder.entries() : [])
    .concat(typeof WirdReminder !== 'undefined' ? WirdReminder.entries() : []);

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
        // إذا الإشعار من السيرفر شغّال، هو بيتولّى الأذكار العامة دايمًا (حتى والتطبيق مفتوح)، فما منكررها
        if (PushSync.state() === 'on') return;
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

// ===== «فحص الإشعارات»: يفحص كل حلقة بالسلسلة ويجرّب إشعار حقيقي من السيرفر (الإصدار ١٣) =====
const NotifyCheck = (() => {
    const $ = id => document.getElementById(id);
    const ua = navigator.userAgent || '';
    const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(ua);
    const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    const AR = n => Number(n).toLocaleString('ar-EG');
    const remindersLabel = n => n === 0 ? 'لا تذكيرات شخصية' : n === 1 ? 'تذكير واحد' : n === 2 ? 'تذكيران'
        : n % 100 >= 3 && n % 100 <= 10 ? `${AR(n)} تذكيرات` : n % 100 >= 11 ? `${AR(n)} تذكيرًا` : `${AR(n)} تذكير`;
    let running = false, testWaiter = null;

    const ICONS = { ok: '✓', warn: '!', fail: '✕', wait: '…' };
    function paint(steps) {
        const list = $('nc-steps'); if (!list) return;
        list.hidden = false;
        list.replaceChildren(...steps.map(s => {
            const li = document.createElement('li');
            li.className = 'nc-step is-' + s.status;
            li.innerHTML = `<span class="nc-ic" aria-hidden="true">${ICONS[s.status]}</span><span class="nc-tx"><b></b><small></small>${s.fix ? '<em></em>' : ''}</span>`;
            li.querySelector('b').textContent = s.title;
            li.querySelector('small').textContent = s.detail || '';
            if (s.fix) li.querySelector('em').textContent = s.fix;
            return li;
        }));
    }
    const fixDenied = () => isIOS ? 'من إعدادات الآيفون ← الإشعارات ← مُذكّر ← السماح بالإشعارات.'
        : isAndroid ? 'اضغط القفل بجانب رابط الموقع (أو معلومات التطبيق) ← الأذونات ← الإشعارات ← سماح، ثم أعد الفحص.'
        : 'اضغط القفل بجانب رابط الموقع ← الإشعارات ← سماح، ثم أعد الفحص.';
    const fixBackground = () => isAndroid ? 'من إعدادات الهاتف ← التطبيقات ← مُذكّر (أو Chrome) ← البطارية ← «بلا قيود»، وتأكد أن إشعاراته غير مكتومة.'
        : isIOS ? 'تأكد أن وضع «التركيز/عدم الإزعاج» متوقف، وأن إشعارات مُذكّر مسموحة من إعدادات الآيفون.'
        : 'اترك المتصفح يعمل في الخلفية، وتأكد أن إشعاراته مسموحة من إعدادات النظام.';

    // انتظار إشارة sw.js إن إشعار التجربة وصل
    function waitForTest(ms) {
        return new Promise(resolve => {
            const timer = setTimeout(() => { testWaiter = null; resolve(false); }, ms);
            testWaiter = () => { clearTimeout(timer); testWaiter = null; resolve(true); };
        });
    }
    const timeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

    async function run() {
        if (running) return;
        running = true;
        const btn = $('nc-run'); if (btn) { btn.disabled = true; btn.textContent = 'جارٍ الفحص…'; }
        $('nc-actions') && ($('nc-actions').hidden = true);
        const steps = [];
        const add = s => { steps.push(s); paint(steps); return s; };
        let canTest = true, needRepair = false;
        try {
            // ١) دعم المتصفح
            const supported = Notifier.supported && SW_OK && 'PushManager' in window;
            if (isIOS && !standalone()) { add({ status: 'fail', title: 'التطبيق غير مثبّت على الآيفون', detail: 'على الآيفون تعمل الإشعارات من التطبيق المثبّت فقط.', fix: 'افتح الموقع في Safari ← زر المشاركة ⬆️ ← «إضافة إلى الشاشة الرئيسية»، ثم افتح مُذكّر من أيقونته.' }); canTest = false; }
            else if (!supported) { add({ status: 'fail', title: 'المتصفح لا يدعم الإشعارات في الخلفية', detail: 'جرّب Chrome على أندرويد، أو Safari بعد تثبيت التطبيق على الآيفون.' }); canTest = false; }
            else add({ status: 'ok', title: 'المتصفح يدعم الإشعارات' });
            // ٢) الإذن
            if (canTest) {
                let perm = Notifier.permission();
                if (perm === 'default') perm = await Notifier.ensurePermission();
                if (perm === 'granted') add({ status: 'ok', title: 'إذن الإشعارات مسموح' });
                else { add({ status: 'fail', title: perm === 'denied' ? 'الإشعارات ممنوعة لهذا الموقع' : 'لم تسمح بالإشعارات بعد', fix: fixDenied() }); canTest = false; }
            }
            // ٣) خدمة الخلفية
            let reg = null;
            if (canTest) {
                reg = await timeout(navigator.serviceWorker.ready, 8000).catch(() => null);
                if (reg && reg.active) add({ status: 'ok', title: 'خدمة الخلفية تعمل' });
                else { add({ status: 'fail', title: 'خدمة الخلفية لم تبدأ', fix: 'أغلق التطبيق وافتحه من جديد، وإن استمرت المشكلة اضغط «إصلاح الاشتراك».' }); canTest = false; needRepair = true; }
            }
            // ٤) الاشتراك بالسيرفر (نعيد المزامنة أول شي)
            let sub = null;
            if (canTest) {
                await PushSync.sync();
                sub = await reg.pushManager.getSubscription().catch(() => null);
                const st = PushSync.state();
                if (sub && (st === 'on' || st === 'outdated')) add({ status: 'ok', title: 'الجهاز مسجّل في الخادم' });
                else if (!sub && st === 'off') { add({ status: 'warn', title: 'لا يوجد ما يُرسَل', detail: 'فعّل «أذكار عامة» أو أضف تذكيرًا، ثم أعد الفحص.' }); canTest = false; }
                else { add({ status: 'fail', title: 'تعذّر التسجيل في الخادم', detail: 'قد يكون الاتصال ضعيفًا أو الاشتراك قديمًا.', fix: 'اضغط «إصلاح الاشتراك» في الأسفل.' }); canTest = false; needRepair = true; }
            }
            // ٥) الخادم نفسه
            let server = null;
            try { server = await timeout(fetch(PUSH_SERVER + '/status', { cache: 'no-store' }).then(r => r.json()), 8000); } catch (e) {}
            if (!server) add({ status: 'warn', title: 'تعذّر الوصول إلى الخادم الآن', detail: 'تأكد من الاتصال بالإنترنت وأعد الفحص.' });
            else {
                const last = server.lastRun && Date.parse(server.lastRun.time);
                const mins = last ? Math.round((Date.now() - last) / 60000) : null;
                const step = server.lastRun && server.lastRun.step;
                if (mins === null || mins > 40) add({ status: 'fail', title: 'الخادم لم يرسل إشعارات منذ مدة', detail: mins === null ? 'لا يوجد سجل إرسال.' : `آخر إرسال قبل ${AR(mins)} دقيقة.`, fix: 'المشكلة من جهة الخادم (Cloudflare)، لا من هاتفك.' });
                else if (step > 1) add({ status: 'warn', title: 'الخادم يعمل', detail: `لكن جدوله كل ${AR(step)} دقيقة، فقد يتأخر التذكير حتى ${AR(step)} دقيقة.` });
                else add({ status: 'ok', title: 'الخادم يعمل ويرسل كل دقيقة' });
            }
            // ٦) تجربة حقيقية
            if (canTest && sub) {
                const s = add({ status: 'wait', title: 'جارٍ إرسال إشعار تجربة من الخادم…', detail: 'لا تغلق التطبيق، ثوانٍ فقط.' });
                await NotifyStore.put('test', { at: Date.now() });
                const arrived = waitForTest(25000);
                let res = null;
                try { res = await PushSync.post('/test', { endpoint: sub.endpoint }); } catch (e) {}
                const body = res ? await res.json().catch(() => ({})) : {};
                if (!res || (!res.ok && body.error !== 'limit')) {
                    await NotifyStore.put('test', null);
                    Object.assign(s, body.error === 'not-subscribed' || body.error === 'expired'
                        ? { status: 'fail', title: 'الخادم لم يجد اشتراك هذا الجهاز', detail: 'انتهى الاشتراك أو أُلغي.', fix: 'اضغط «إصلاح الاشتراك» ثم أعد الفحص.' }
                        : body.status === 401 || body.status === 403
                            ? { status: 'fail', title: 'خدمة الإشعارات رفضت رسالة الخادم', detail: `الرمز ${AR(body.status)}: توقيع الخادم أو الاشتراك غير مقبول.`, fix: 'اضغط «إصلاح الاشتراك» ثم أعد الفحص، وإن استمر فالمشكلة من إعداد الخادم.' }
                            : { status: 'fail', title: 'تعذّر على الخادم إرسال التجربة', detail: 'حاول بعد قليل.' });
                    needRepair = needRepair || body.error === 'not-subscribed' || body.error === 'expired' || body.status === 401 || body.status === 403;
                } else if (body.error === 'limit') {
                    Object.assign(s, { status: 'warn', title: 'بلغت حدّ التجارب لهذا اليوم', detail: 'حاول غدًا.' });
                } else if (await arrived) {
                    Object.assign(s, { status: 'ok', title: 'وصل إشعار التجربة ✓', detail: `كل شيء يعمل. المسجّل في الخادم: ${remindersLabel(body.reminders || 0)}${body.general ? ' + الأذكار العامة' : ''}.` });
                } else {
                    Object.assign(s, { status: 'fail', title: 'أرسل الخادم الإشعار لكنه لم يصل إلى الهاتف', fix: fixBackground() });
                    needRepair = true;
                }
                paint(steps);
            }
        } catch (e) {
            add({ status: 'fail', title: 'حدث خطأ أثناء الفحص', detail: 'أعد المحاولة.' });
        } finally {
            running = false;
            if (btn) { btn.disabled = false; btn.textContent = 'أعد الفحص'; }
            if ($('nc-actions')) $('nc-actions').hidden = !needRepair;
        }
    }

    async function repair() {
        const b = $('nc-repair'); if (b) { b.disabled = true; b.textContent = 'جارٍ الإصلاح…'; }
        const st = await PushSync.reset();
        if (b) { b.disabled = false; b.textContent = 'إصلاح الاشتراك'; }
        Toast.show(st === 'on' || st === 'outdated' ? 'تم تجديد الاشتراك ✓ أعد الفحص للتأكد' : 'تعذّر التجديد، تأكد من الاتصال وإذن الإشعارات');
        GeneralReminder.refresh();
    }

    function init() {
        $('nc-run')?.addEventListener('click', run);
        $('nc-repair')?.addEventListener('click', repair);
        if (SW_OK) navigator.serviceWorker.addEventListener('message', e => { if (e.data?.type === 'mdk-test-ok' && testWaiter) testWaiter(); });
    }
    return { init, run };
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
