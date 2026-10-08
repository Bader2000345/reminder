/* =====================================================================
 * مُذكّر — updates.js
 * إشعار التحديثات و«ما الجديد».
 * ← عند نشر تعديل جديد: ارفع APP_BUILD هنا وحقل build في version.json بنفس الرقم.
 * يُحمَّل بالترتيب من index.html؛ الأجزاء تتشارك المتغيرات العامة فيما بينها.
 * ===================================================================== */

// ===== إشعار التحديثات =====
// عند نشر تعديل جديد: ارفع الرقم هنا وفي version.json (حقل build) بنفس القيمة
const APP_BUILD = 2;
const SITE_URL = 'https://bader2000345.github.io/reminder/';
const UpdateNotice = (() => {
    const $ = id => document.getElementById(id);
    const SEEN_KEY = 'mudhakkir-build-seen';
    const DISMISS_KEY = 'mudhakkir-update-dismissed';
    const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
    let remote = null, checking = false;
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
    // نسخة أحدث منشورة والتطبيق ما زال على القديمة
    function showBanner(v) {
        const box = $('update-banner');
        $('update-title').textContent = v.title || 'صار في تحديث جديد';
        fillNotes($('update-notes'), (v.notes || []).slice(0, 3));
        $('update-link').href = v.url || SITE_URL;
        box.hidden = false;
        requestAnimationFrame(() => box.classList.add('show'));
    }
    async function applyUpdate() {
        $('update-now').disabled = true;
        $('update-now').textContent = 'جارٍ التحديث…';
        try { const reg = SW_OK && await navigator.serviceWorker.getRegistration(); if (reg) await reg.update(); } catch (e) {}
        location.reload();
    }
    async function check() {
        if (checking || !/^https?:$/.test(location.protocol)) return;
        checking = true;
        try {
            remote = await fetchVersion();
            if (Number(remote.build) > APP_BUILD && store.get(DISMISS_KEY) !== String(remote.build)) showBanner(remote);
        } catch (e) { /* دون اتصال: نحاول لاحقًا */ }
        checking = false;
    }
    // بعد التحديث مباشرة: «ما الجديد» مرة واحدة
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
    function init() {
        $('update-now').addEventListener('click', applyUpdate);
        $('update-close').addEventListener('click', () => {
            if (remote) store.set(DISMISS_KEY, String(remote.build));
            $('update-banner').classList.remove('show');
            setTimeout(() => { $('update-banner').hidden = true; }, 400);
        });
        // المستخدم الجديد لا يرى «ما الجديد»، لكن نسجّل الإصدار
        if (!store.get(SEEN_KEY)) store.set(SEEN_KEY, String(returning ? APP_BUILD - 1 : APP_BUILD));
        setTimeout(() => { whatsNew(); check(); }, 2500);
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
        setInterval(check, 30 * 60 * 1000);
        // إن تولّى Service Worker جديد الصفحة، نعرض شريط التحديث فورًا
        if (SW_OK) navigator.serviceWorker.addEventListener('controllerchange', () => check());
    }
    return { init, check };
})();
