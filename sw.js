/* مُذكّر — Service Worker: إشعارات + تخزين مؤقت بسيط للعمل دون اتصال */
// إن تعذّر تحميل general-adhkar.js لا يتعطل الـ Service Worker كله
try { importScripts('general-adhkar.js'); } catch (e) {}
const ADHKAR = (typeof GENERAL_ADHKAR_LIST !== 'undefined' && GENERAL_ADHKAR_LIST.length) ? GENERAL_ADHKAR_LIST : [
    'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
    'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ وَأَتُوبُ إِلَيْهِ',
    'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ'
];
const CACHE = 'mudhakkir-v3';
const CORE = ['./', './index.html'];

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
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// الشبكة أولًا، ثم النسخة المخزنة عند انقطاع الاتصال (للصفحات فقط)
self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET' || req.mode !== 'navigate') return;
    event.respondWith(
        fetch(req)
            .then(res => {
                const copy = res.clone();
                caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
                return res;
            })
            .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
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

// إشعار الأذكار العامة القادم من السيرفر (Web Push) — يعمل والتطبيق مغلق
let lastIdx = -1;
self.addEventListener('push', event => {
    event.waitUntil((async () => {
        const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        if (wins.some(w => w.visibilityState === 'visible')) return; // الصفحة مفتوحة وتتولى الإشعار بنفسها
        let i;
        do { i = Math.floor(Math.random() * ADHKAR.length); } while (i === lastIdx && ADHKAR.length > 1);
        lastIdx = i;
        await self.registration.showNotification('أذكار عامة', {
            body: ADHKAR[i], tag: 'general-adhkar', renotify: true, lang: 'ar', dir: 'rtl'
        });
    })());
});
