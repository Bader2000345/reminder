/* فريق مُذكّر — sw.js
 * الملفات بتنحفظ حتى يفتح التطبيق بسرعة (وبلا نت بيبين آخر شي)، والإشعار «رسالة جديدة» من السيرفر.
 * غيّر CACHE مع كل تحديث للملفات. */
const CACHE = 'mdt-v3';
const FILES = ['./', './index.html', './app.css', './app.js', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/favicon-64.png', './icons/apple-touch-icon.png', './icons/badge-96.png'];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('mdt-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// ملفات التطبيق: من النت أول (حتى التحديث يوصل)، وإذا ما في نت من المحفوظ. السيرفر والخطوط ما منلمسهن
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
    event.respondWith((async () => {
        try {
            const res = await fetch(event.request, { cache: 'no-cache' });
            if (res.ok) { const c = await caches.open(CACHE); c.put(event.request, res.clone()); }
            return res;
        } catch (e) {
            return (await caches.match(event.request, { ignoreSearch: true })) || (await caches.match('./index.html')) || Response.error();
        }
    })());
});

self.addEventListener('push', event => {
    let msg = null;
    try { msg = event.data ? event.data.json() : null; } catch (e) {}
    const title = msg && msg.title ? String(msg.title).slice(0, 80) : 'رسالة جديدة بمُذكّر';
    event.waitUntil((async () => {
        await self.registration.showNotification(title, {
            body: msg && msg.body ? String(msg.body).slice(0, 400) : '', tag: String((msg && msg.tag) || 'mdt-msg').slice(0, 40), renotify: true,
            // badge: أبيض على شفاف (النسخة 2)، الملوّنة كانت تطلع مربّع بشريط الحالة بأندرويد
            icon: './icons/icon-192.png', badge: './icons/badge-96.png', lang: 'ar', dir: 'rtl', data: { url: './' }
        });
        const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        wins.forEach(w => w.postMessage({ type: 'mdt-refresh' }));
    })());
});
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil((async () => {
        const scope = self.registration.scope;
        const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const w = wins.find(x => x.url.startsWith(scope));
        if (w) { w.postMessage({ type: 'mdt-refresh' }); return w.focus(); }
        return self.clients.openWindow(scope);
    })());
});
