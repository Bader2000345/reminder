/* =====================================================================
 * مُذكّر — updates.js
 * التحديثات بموافقة المستخدم:
 *   ١. التطبيق يعمل من نسخته المحفوظة ولا يتغيّر وحده.
 *   ٢. عند نشر تحديث، تُنزَّل الملفات الجديدة في الخلفية (sw.js).
 *   ٣. يظهر شريط «تم تنزيل تحديث جديد» وزر «تحديث».
 *   ٤. بعد الضغط: يُعاد فتح التطبيق على الجديد وتظهر «ما الجديد» مع رابط المشاركة.
 * ← عند نشر تعديل جديد: ارفع APP_BUILD هنا، و build في version.json، و CACHE في sw.js.
 * يُحمَّل بالترتيب من index.html؛ الأجزاء تتشارك المتغيرات العامة فيما بينها.
 * ===================================================================== */

const APP_BUILD = 3;
const SITE_URL = 'https://bader2000345.github.io/reminder/';
const UpdateNotice = (() => {
    const $ = id => document.getElementById(id);
    const SEEN_KEY = 'mudhakkir-build-seen';
    const DISMISS_KEY = 'mudhakkir-update-dismissed'; // إخفاء الشريط لهذه الجلسة فقط
    const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
    const session = { get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} } };
    const ar = n => Number(n).toLocaleString('ar-EG');
    let remote = null, checking = false, pending = null;
    // مستخدم سابق؟ (لديه بيانات محفوظة من نسخة قديمة قبل نظام الإصدارات)
    const returning = (() => { try { return Object.keys(localStorage).some(k => k.startsWith('mudhakkir-') && !['mudhakkir-theme-dark', 'mudhakkir-theme'].includes(k)); } catch (e) { return false; } })();

    async function fetchVersion() {
        const res = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) throw new Error('version');
        return res.json();
    }
    function fillNotes(list, notes) {
        list.replaceChildren(...(notes || []).map(t => { const li = document.createElement('li'); li.textContent = t; return li; }));
    }

    // نسأل الـ Service Worker: هل نزلت نسخة أحدث من المعتمدة؟
    async function swStatus() {
        if (!SW_OK) return null;
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            if (!reg || !reg.active) return null;
            return await new Promise(resolve => {
                const ch = new MessageChannel();
                const timer = setTimeout(() => resolve(null), 3000);
                ch.port1.onmessage = e => { clearTimeout(timer); resolve(e.data); };
                reg.active.postMessage({ type: 'mdk-status' }, [ch.port2]);
            });
        } catch (e) { return null; }
    }
    async function swApprove() {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg || !reg.active) return;
        await new Promise(resolve => {
            const ch = new MessageChannel();
            const timer = setTimeout(resolve, 4000);
            ch.port1.onmessage = () => { clearTimeout(timer); resolve(); };
            reg.active.postMessage({ type: 'mdk-approve' }, [ch.port2]);
        });
    }

    function showBanner(v) {
        const box = $('update-banner');
        $('update-title').textContent = 'تم تنزيل تحديث جديد';
        fillNotes($('update-notes'), ((v && v.notes) || []).slice(0, 3));
        $('update-notes').hidden = !(v && v.notes && v.notes.length);
        $('update-link').href = (v && v.url) || SITE_URL;
        box.hidden = false;
        requestAnimationFrame(() => box.classList.add('show'));
        paintSettings(true);
    }
    function hideBanner() {
        $('update-banner').classList.remove('show');
        setTimeout(() => { $('update-banner').hidden = true; }, 400);
    }
    // الضغط على «تحديث»: نعتمد النسخة الجديدة ثم نعيد فتح التطبيق عليها
    async function applyUpdate() {
        const btn = $('update-now');
        btn.disabled = true; btn.textContent = 'جارٍ التحديث…';
        try { if (pending === 'sw') await swApprove(); } catch (e) {}
        location.reload();
    }

    // manual = من زر «فحص التحديث» في الإعدادات
    async function check(manual = false) {
        if (checking || !/^https?:$/.test(location.protocol)) return;
        checking = true;
        try {
            // نطلب من المتصفح فحص sw.js؛ إن تغيّر تبدأ النسخة الجديدة بالتنزيل في الخلفية
            if (SW_OK) { try { const reg = await navigator.serviceWorker.getRegistration(); if (reg) await reg.update(); } catch (e) {} }
            try { remote = await fetchVersion(); } catch (e) { remote = null; }
            const s = await swStatus();
            if (s && s.update && s.ready) pending = 'sw';                                   // الملفات الجديدة نزلت وجاهزة
            else if (!s && remote && Number(remote.build) > APP_BUILD) pending = 'reload';   // متصفح بلا Service Worker
            else pending = null;
            if (pending && (manual || session.get(DISMISS_KEY) !== 'x')) showBanner(remote);
            else if (manual) Toast.show(s && s.update ? 'جارٍ تنزيل التحديث… سيظهر زر «تحديث» عند اكتماله' : 'أنت على أحدث إصدار ✓');
        } finally { checking = false; }
    }

    // بعد التحديث مباشرة: «ما الجديد» مرة واحدة مع رابط المشاركة
    async function whatsNew() {
        const seen = Number(store.get(SEEN_KEY) || 0);
        store.set(SEEN_KEY, String(APP_BUILD));
        NotifyStore.put('seen', { build: APP_BUILD }); // يعرف منه الـ Service Worker أن المستخدم رأى هذا الإصدار
        if (!seen || seen >= APP_BUILD) return; // أول استخدام أو لا جديد
        try {
            const v = remote || await fetchVersion();
            fillNotes($('whatsnew-notes'), v.notes);
            setModalState($('whatsnew-modal'), true);
        } catch (e) { Toast.show('تم تحديث مُذكّر إلى أحدث إصدار ✓'); }
    }

    // بطاقة «التحديثات» في الإعدادات
    function paintSettings(hasUpdate = !!pending) {
        const label = $('app-version-label'), btn = $('check-update-btn');
        if (!label || !btn) return;
        label.textContent = hasUpdate ? `الإصدار ${ar(APP_BUILD)} · يوجد تحديث جاهز للتثبيت` : `الإصدار ${ar(APP_BUILD)} · أنت على أحدث إصدار`;
        btn.textContent = hasUpdate ? 'تحديث' : 'فحص التحديث';
    }

    function init() {
        $('update-now').addEventListener('click', applyUpdate);
        $('update-close').addEventListener('click', () => { session.set(DISMISS_KEY, 'x'); hideBanner(); });
        $('check-update-btn')?.addEventListener('click', () => (pending ? applyUpdate() : check(true)));
        paintSettings(false);
        // المستخدم الجديد لا يرى «ما الجديد»، لكن نسجّل الإصدار
        if (!store.get(SEEN_KEY)) store.set(SEEN_KEY, String(returning ? APP_BUILD - 1 : APP_BUILD));
        setTimeout(() => { whatsNew(); check(); }, 2500);
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
        setInterval(check, 30 * 60 * 1000);
        // الـ Service Worker يخبرنا فور اكتمال تنزيل نسخة جديدة
        if (SW_OK) navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.type === 'mdk-update-ready') check(); });
    }
    return { init, check };
})();
