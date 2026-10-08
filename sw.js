/* مُذكّر — Service Worker
 * - التحديث بموافقة المستخدم: التطبيق يعمل من نسخته المحفوظة، والنسخة الجديدة تُنزَّل في الخلفية
 *   ولا تُستخدم إلا بعد أن يضغط المستخدم «تحديث».
 * - إشعارات الأذكار العامة والتذكيرات الشخصية وإشعار التحديثات.
 * - العمل دون اتصال.
 */
// إن تعذّر تحميل general-adhkar.js لا يتعطل الـ Service Worker كله
try { importScripts('general-adhkar.js'); } catch (e) {}
const ADHKAR = (typeof GENERAL_ADHKAR_LIST !== 'undefined' && GENERAL_ADHKAR_LIST.length) ? GENERAL_ADHKAR_LIST : [
    'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
    'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ وَأَتُوبُ إِلَيْهِ',
    'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ'
];
// ← عند كل تحديث: زد هذا الرقم (مع APP_BUILD في assets/js/updates.js و build في version.json)
const CACHE = 'mudhakkir-v15';
const DATA = 'mudhakkir-data'; // إعدادات التذكير والنسخة المعتمدة (لا تُحذف عند التحديث)
// ملفات التطبيق التي تُخزَّن (أضف أي ملف جديد هنا)
const CSS_FILES = ['01-base', '02-reader-and-palette', '03-home-and-wird', '04-brand-and-effects', '05-viewer-reminders-picker', '06-immersive-and-mobile', '07-design'].map(n => `./assets/css/${n}.css`);
const JS_FILES = ['preload-theme', 'splash', 'core', 'adhkar-viewer', 'theme', 'modals-and-picker', 'wird', 'reader', 'notifications', 'reminders', 'updates', 'install', 'home', 'share', 'time-context', 'motion', 'main'].map(n => `./assets/js/${n}.js`);
const CORE = ['./', './index.html', './general-adhkar.js', './adhkar-data.js', './manifest.json', ...CSS_FILES, ...JS_FILES,
    './assets/img/logo-light.png', './assets/img/logo-dark.png', './assets/img/icon-192.png', './assets/img/icon-512.png', './assets/img/favicon-64.png', './assets/img/apple-touch-icon.png'];
const ICON = './assets/img/icon-192.png', BADGE = './assets/img/favicon-64.png';
const DUE_WINDOW = 30 * 60 * 1000; // يُعرض التذكير إن تأخر وصول الإشعار حتى ٣٠ دقيقة
const dataUrl = name => new URL('__mdk/' + name, self.registration.scope).href;

// ---------- بيانات مشتركة مع الصفحة ----------
async function getJSON(name, fallback) {
    try { const c = await caches.open(DATA); const r = await c.match(dataUrl(name)); return r ? await r.json() : fallback; } catch (e) { return fallback; }
}
async function putJSON(name, value) {
    try { const c = await caches.open(DATA); await c.put(dataUrl(name), new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } })); } catch (e) {}
}

// ---------- النسخة المعتمدة (التي يراها المستخدم) ----------
// approved = اسم مخزن النسخة التي وافق عليها المستخدم؛ CACHE = أحدث نسخة نزلت
let approvedName = null;
async function approvedCache() {
    if (!approvedName) approvedName = (await getJSON('approved', null) || {}).cache || CACHE;
    return approvedName;
}
async function setApproved(name) {
    approvedName = name;
    await putJSON('approved', { cache: name });
}
async function cleanup() {
    const keep = new Set([CACHE, DATA, await approvedCache()]);
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !keep.has(k)).map(k => caches.delete(k)));
}

// التنزيل في الخلفية: نجلب الملفات الجديدة مباشرة من السيرفر (دون ذاكرة المتصفح) ونحفظها جانبًا
self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE);
        const results = await Promise.allSettled(CORE.map(url => cache.add(new Request(url, { cache: 'reload' }))));
        await putJSON('ready-' + CACHE, { ok: results.filter(r => r.status === 'fulfilled').length, total: CORE.length });
        await self.skipWaiting(); // الكود يعمل فورًا، لكن الملفات المعروضة تبقى من النسخة المعتمدة
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const saved = await getJSON('approved', null);
        // أول تثبيت (أو اختفت النسخة القديمة): نعتمد هذه النسخة مباشرة
        if (!saved || !saved.cache || !(await caches.has(saved.cache))) await setApproved(CACHE);
        else approvedName = saved.cache;
        await cleanup();
        await self.clients.claim();
        // نخبر الصفحات المفتوحة أن تحديثًا جاهزًا للتطبيق
        if (approvedName !== CACHE) {
            const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            wins.forEach(w => w.postMessage({ type: 'mdk-update-ready' }));
        }
    })());
});

// ملفات التطبيق تُقدَّم من النسخة المعتمدة أولًا، ثم من الشبكة إن لم تكن محفوظة
self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin || url.pathname.includes('/__mdk/') || url.pathname.endsWith('/version.json')) return;
    const isApp = req.mode === 'navigate' || ['script', 'style', 'image', 'manifest', 'font'].includes(req.destination);
    if (!isApp) return;
    event.respondWith((async () => {
        const name = await approvedCache();
        const cache = await caches.open(name);
        let hit = await cache.match(req, { ignoreSearch: true });
        if (!hit && req.mode === 'navigate') hit = await cache.match('./index.html') || await cache.match('./');
        if (hit) return hit;
        try {
            const res = await fetch(req);
            // لا نخلط ملفات جديدة بالنسخة القديمة: نحفظ فقط إن كانت النسخة المعتمدة هي الأحدث
            if (res.ok && name === CACHE) cache.put(req, res.clone()).catch(() => {});
            return res;
        } catch (e) {
            return req.mode === 'navigate' ? (await cache.match('./index.html')) || Response.error() : Response.error();
        }
    })());
});

// ---------- مواعيد التذكيرات (نفس منطق Sched في notifications.js) ----------
const pad = n => String(n).padStart(2, '0');
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function occurrence(r, now) {
    if (!r || !r.on || !/^\d\d:\d\d$/.test(r.time)) return null;
    const [h, m] = r.time.split(':').map(Number);
    for (let back = 0; back <= 1; back++) {
        const d = new Date(now); d.setDate(d.getDate() - back); d.setHours(h, m, 0, 0);
        if (r.repeat === 'once' && r.date !== dayKey(d)) continue;
        if (r.repeat === 'days' && !(r.days || []).includes(d.getDay())) continue;
        const diff = now - d.getTime();
        if (diff >= 0 && diff < DUE_WINDOW && d.getTime() >= (r.since || 0) - 60000) return d;
    }
    return null;
}

// نُسلسل الفحوص حتى لا يُعرض التذكير مرتين (إشعار السيرفر + فحص الصفحة معًا)
let chain = Promise.resolve();
const serial = fn => (chain = chain.then(fn, fn));

async function checkReminders(now = Date.now()) {
    const state = await getJSON('state', null);
    if (!state || !Array.isArray(state.reminders)) return [];
    const shown = await getJSON('shown', {});
    const fired = [];
    for (const r of state.reminders) {
        const at = occurrence(r, now);
        if (!at) continue;
        const key = r.id + '@' + dayKey(at);
        if (shown[key]) continue;
        shown[key] = now;
        fired.push(r);
    }
    if (!fired.length) return fired;
    for (const k of Object.keys(shown)) if (now - shown[k] > 3 * 864e5) delete shown[k];
    await putJSON('shown', shown);
    await Promise.all(fired.map(r => self.registration.showNotification(r.title || 'تذكير', {
        body: r.text, tag: 'rem-' + r.id, renotify: true, lang: 'ar', dir: 'rtl', icon: ICON, badge: BADGE,
        requireInteraction: true, data: { kind: 'reminder', id: r.id }
    })));
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    wins.forEach(w => w.postMessage({ type: 'mdk-reminder', reminders: fired.map(({ id, title, text }) => ({ id, title, text })) }));
    return fired;
}

// رسائل الصفحة: فحص التذكيرات، حالة التحديث، والموافقة على التحديث
self.addEventListener('message', event => {
    const d = event.data || {}, port = event.ports && event.ports[0];
    if (d.type === 'mdk-check') event.waitUntil(serial(() => checkReminders()));
    if (d.type === 'mdk-status' && port) event.waitUntil((async () => {
        const approved = await approvedCache();
        const ready = await getJSON('ready-' + CACHE, null);
        port.postMessage({ approved, latest: CACHE, ready: !!ready && ready.ok === ready.total, update: approved !== CACHE });
    })());
    if (d.type === 'mdk-approve') event.waitUntil((async () => {
        await setApproved(CACHE);
        await cleanup();
        if (port) port.postMessage({ ok: true, cache: CACHE });
    })());
});

// الضغط على الإشعار يفتح التطبيق أو يعيد التركيز عليه (وإشعار التحديث يفتح الموقع)
self.addEventListener('notificationclick', event => {
    event.notification.close();
    const url = event.notification.data && event.notification.data.url;
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            if (url) {
                for (const client of list) if ('navigate' in client) return client.navigate(url).then(c => c && c.focus()).catch(() => self.clients.openWindow(url));
                return self.clients.openWindow(url);
            }
            for (const client of list) {
                if ('focus' in client) return client.focus();
            }
            return self.clients.openWindow('./');
        })
    );
});

// إشعار «تحديث جديد» لمن لم يفتح التطبيق منذ نشر إصدار أحدث (نفحص مرة كل ١٢ ساعة عند وصول نبضة)
async function checkUpdateNotice() {
    try {
        const meta = await getJSON('update-meta', {});
        if (Date.now() - (meta.checkedAt || 0) < 12 * 3600 * 1000) return;
        meta.checkedAt = Date.now();
        await putJSON('update-meta', meta);
        const res = await fetch('./version.json?t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) return;
        const v = await res.json();
        const seen = await getJSON('seen', { build: 0 });
        const build = Number(v.build) || 0;
        if (!seen.build || build <= seen.build || meta.notified === build) return;
        meta.notified = build;
        await putJSON('update-meta', meta);
        await self.registration.showNotification(v.title || 'تحديث جديد لمُذكّر', {
            body: 'صار في تحديث جديد، افتح التطبيق واضغط «تحديث».' + (v.notes && v.notes[0] ? ' ' + v.notes[0] : ''),
            tag: 'app-update', lang: 'ar', dir: 'rtl', icon: ICON, badge: BADGE,
            data: { url: v.url || self.registration.scope }
        });
    } catch (e) {}
}

// نبضة من السيرفر (Web Push) — تعمل والتطبيق مغلق
// السيرفر يرسل نبضة عند كل ربع ساعة (الأذكار العامة) وعند وقت كل تذكير شخصي، ونحن نقرر هنا ماذا نعرض
let lastIdx = -1;
self.addEventListener('push', event => {
    event.waitUntil(serial(async () => {
        const now = Date.now();
        const fired = await checkReminders(now);
        await checkUpdateNotice();
        const state = await getJSON('state', null);
        const generalOn = !state || state.general !== false;
        const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        if (wins.some(w => w.visibilityState === 'visible')) return; // الصفحة مفتوحة وتتولى الأذكار العامة بنفسها
        const minute = new Date(now).getMinutes() % 15;
        const generalSlot = minute <= 3 || minute >= 13;
        // نعرض الذكر العام في موعده، أو إن وصلت نبضة دون تذكير مستحق (حتى لا تكون النبضة صامتة)
        if (!generalOn || (fired.length && !generalSlot)) return;
        let i;
        do { i = Math.floor(Math.random() * ADHKAR.length); } while (i === lastIdx && ADHKAR.length > 1);
        lastIdx = i;
        await self.registration.showNotification('أذكار عامة', {
            body: ADHKAR[i], tag: 'general-adhkar', renotify: true, lang: 'ar', dir: 'rtl', icon: ICON, badge: BADGE
        });
    }));
});
