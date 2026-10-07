/* مُذكّر — Service Worker: إشعارات الأذكار العامة + التذكيرات الشخصية + تخزين مؤقت للعمل دون اتصال */
// إن تعذّر تحميل general-adhkar.js لا يتعطل الـ Service Worker كله
try { importScripts('general-adhkar.js'); } catch (e) {}
const ADHKAR = (typeof GENERAL_ADHKAR_LIST !== 'undefined' && GENERAL_ADHKAR_LIST.length) ? GENERAL_ADHKAR_LIST : [
    'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
    'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ وَأَتُوبُ إِلَيْهِ',
    'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ'
];
const CACHE = 'mudhakkir-v5';
const DATA = 'mudhakkir-data'; // إعدادات التذكير التي يكتبها التطبيق (لا تُحذف عند التحديث)
const CORE = ['./', './index.html', './general-adhkar.js', './adhkar-data.js', './manifest.json',
    './assets/img/logo-light.png', './assets/img/logo-dark.png', './assets/img/icon-192.png', './assets/img/favicon-64.png'];
const ICON = './assets/img/icon-192.png', BADGE = './assets/img/favicon-64.png';
const DUE_WINDOW = 30 * 60 * 1000; // يُعرض التذكير إن تأخر وصول الإشعار حتى ٣٠ دقيقة
const dataUrl = name => new URL('__mdk/' + name, self.registration.scope).href;

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE)
            .then(cache => Promise.allSettled(CORE.map(url => cache.add(url))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== DATA).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// الشبكة أولًا، ثم النسخة المخزنة عند انقطاع الاتصال (الصفحات وملفات التطبيق)
self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    const sameOrigin = url.origin === self.location.origin;
    const isAsset = sameOrigin && ['script', 'image', 'manifest', 'style'].includes(req.destination);
    if (req.mode !== 'navigate' && !isAsset) return;
    event.respondWith(
        fetch(req)
            .then(res => {
                if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
                return res;
            })
            .catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
    );
});

// ---------- بيانات مشتركة مع الصفحة ----------
async function getJSON(name, fallback) {
    try { const c = await caches.open(DATA); const r = await c.match(dataUrl(name)); return r ? await r.json() : fallback; } catch (e) { return fallback; }
}
async function putJSON(name, value) {
    try { const c = await caches.open(DATA); await c.put(dataUrl(name), new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } })); } catch (e) {}
}

// ---------- مواعيد التذكيرات (نفس منطق Sched في index.html) ----------
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

// الصفحة المفتوحة تطلب فحصًا دوريًا
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'mdk-check') event.waitUntil(serial(() => checkReminders()));
});

// الضغط على الإشعار يفتح التطبيق أو يعيد التركيز عليه
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            for (const client of list) {
                if ('focus' in client) return client.focus();
            }
            return self.clients.openWindow('./');
        })
    );
});

// نبضة من السيرفر (Web Push) — تعمل والتطبيق مغلق
// السيرفر يرسل نبضة عند كل ربع ساعة (الأذكار العامة) وعند وقت كل تذكير شخصي، ونحن نقرر هنا ماذا نعرض
let lastIdx = -1;
self.addEventListener('push', event => {
    event.waitUntil(serial(async () => {
        const now = Date.now();
        const fired = await checkReminders(now);
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
