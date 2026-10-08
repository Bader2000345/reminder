/* Ù…ÙØ°ÙƒÙ‘Ø± â€” Service Worker: Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„Ø£Ø°ÙƒØ§Ø± Ø§Ù„Ø¹Ø§Ù…Ø© + Ø§Ù„ØªØ°ÙƒÙŠØ±Ø§Øª Ø§Ù„Ø´Ø®ØµÙŠØ© + ØªØ®Ø²ÙŠÙ† Ù…Ø¤Ù‚Øª Ù„Ù„Ø¹Ù…Ù„ Ø¯ÙˆÙ† Ø§ØªØµØ§Ù„ */
// Ø¥Ù† ØªØ¹Ø°Ù‘Ø± ØªØ­Ù…ÙŠÙ„ general-adhkar.js Ù„Ø§ ÙŠØªØ¹Ø·Ù„ Ø§Ù„Ù€ Service Worker ÙƒÙ„Ù‡
try { importScripts('general-adhkar.js'); } catch (e) {}
const ADHKAR = (typeof GENERAL_ADHKAR_LIST !== 'undefined' && GENERAL_ADHKAR_LIST.length) ? GENERAL_ADHKAR_LIST : [
    'Ø³ÙØ¨Ù’Ø­ÙŽØ§Ù†ÙŽ Ø§Ù„Ù„ÙŽÙ‘Ù‡Ù ÙˆÙŽØ¨ÙØ­ÙŽÙ…Ù’Ø¯ÙÙ‡ÙØŒ Ø³ÙØ¨Ù’Ø­ÙŽØ§Ù†ÙŽ Ø§Ù„Ù„ÙŽÙ‘Ù‡Ù Ø§Ù„Ù’Ø¹ÙŽØ¸ÙÙŠÙ…Ù',
    'Ø£ÙŽØ³Ù’ØªÙŽØºÙ’ÙÙØ±Ù Ø§Ù„Ù„ÙŽÙ‘Ù‡ÙŽ Ø§Ù„Ù’Ø¹ÙŽØ¸ÙÙŠÙ…ÙŽ ÙˆÙŽØ£ÙŽØªÙÙˆØ¨Ù Ø¥ÙÙ„ÙŽÙŠÙ’Ù‡Ù',
    'Ù„ÙŽØ§ Ø­ÙŽÙˆÙ’Ù„ÙŽ ÙˆÙŽÙ„ÙŽØ§ Ù‚ÙÙˆÙŽÙ‘Ø©ÙŽ Ø¥ÙÙ„ÙŽÙ‘Ø§ Ø¨ÙØ§Ù„Ù„ÙŽÙ‘Ù‡Ù'
];
const CACHE = 'mudhakkir-v10';
const DATA = 'mudhakkir-data'; // Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„ØªØ°ÙƒÙŠØ± Ø§Ù„ØªÙŠ ÙŠÙƒØªØ¨Ù‡Ø§ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ (Ù„Ø§ ØªÙØ­Ø°Ù Ø¹Ù†Ø¯ Ø§Ù„ØªØ­Ø¯ÙŠØ«)
const CORE = ['./', './index.html', './general-adhkar.js', './adhkar-data.js', './manifest.json',
    './assets/img/logo-light.png', './assets/img/logo-dark.png', './assets/img/icon-192.png', './assets/img/favicon-64.png'];
const ICON = './assets/img/icon-192.png', BADGE = './assets/img/favicon-64.png';
const DUE_WINDOW = 30 * 60 * 1000; // ÙŠÙØ¹Ø±Ø¶ Ø§Ù„ØªØ°ÙƒÙŠØ± Ø¥Ù† ØªØ£Ø®Ø± ÙˆØµÙˆÙ„ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø± Ø­ØªÙ‰ Ù£Ù  Ø¯Ù‚ÙŠÙ‚Ø©
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

// Ø§Ù„Ø´Ø¨ÙƒØ© Ø£ÙˆÙ„Ù‹Ø§ØŒ Ø«Ù… Ø§Ù„Ù†Ø³Ø®Ø© Ø§Ù„Ù…Ø®Ø²Ù†Ø© Ø¹Ù†Ø¯ Ø§Ù†Ù‚Ø·Ø§Ø¹ Ø§Ù„Ø§ØªØµØ§Ù„ (Ø§Ù„ØµÙØ­Ø§Øª ÙˆÙ…Ù„ÙØ§Øª Ø§Ù„ØªØ·Ø¨ÙŠÙ‚)
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

// ---------- Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ø´ØªØ±ÙƒØ© Ù…Ø¹ Ø§Ù„ØµÙØ­Ø© ----------
async function getJSON(name, fallback) {
    try { const c = await caches.open(DATA); const r = await c.match(dataUrl(name)); return r ? await r.json() : fallback; } catch (e) { return fallback; }
}
async function putJSON(name, value) {
    try { const c = await caches.open(DATA); await c.put(dataUrl(name), new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } })); } catch (e) {}
}

// ---------- Ù…ÙˆØ§Ø¹ÙŠØ¯ Ø§Ù„ØªØ°ÙƒÙŠØ±Ø§Øª (Ù†ÙØ³ Ù…Ù†Ø·Ù‚ Sched ÙÙŠ index.html) ----------
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

// Ù†ÙØ³Ù„Ø³Ù„ Ø§Ù„ÙØ­ÙˆØµ Ø­ØªÙ‰ Ù„Ø§ ÙŠÙØ¹Ø±Ø¶ Ø§Ù„ØªØ°ÙƒÙŠØ± Ù…Ø±ØªÙŠÙ† (Ø¥Ø´Ø¹Ø§Ø± Ø§Ù„Ø³ÙŠØ±ÙØ± + ÙØ­Øµ Ø§Ù„ØµÙØ­Ø© Ù…Ø¹Ù‹Ø§)
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
    await Promise.all(fired.map(r => self.registration.showNotification(r.title || 'ØªØ°ÙƒÙŠØ±', {
        body: r.text, tag: 'rem-' + r.id, renotify: true, lang: 'ar', dir: 'rtl', icon: ICON, badge: BADGE,
        requireInteraction: true, data: { kind: 'reminder', id: r.id }
    })));
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    wins.forEach(w => w.postMessage({ type: 'mdk-reminder', reminders: fired.map(({ id, title, text }) => ({ id, title, text })) }));
    return fired;
}

// Ø§Ù„ØµÙØ­Ø© Ø§Ù„Ù…ÙØªÙˆØ­Ø© ØªØ·Ù„Ø¨ ÙØ­ØµÙ‹Ø§ Ø¯ÙˆØ±ÙŠÙ‹Ø§
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'mdk-check') event.waitUntil(serial(() => checkReminders()));
});

// Ø§Ù„Ø¶ØºØ· Ø¹Ù„Ù‰ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø± ÙŠÙØªØ­ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ø£Ùˆ ÙŠØ¹ÙŠØ¯ Ø§Ù„ØªØ±ÙƒÙŠØ² Ø¹Ù„ÙŠÙ‡
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

// Ù†Ø¨Ø¶Ø© Ù…Ù† Ø§Ù„Ø³ÙŠØ±ÙØ± (Web Push) â€” ØªØ¹Ù…Ù„ ÙˆØ§Ù„ØªØ·Ø¨ÙŠÙ‚ Ù…ØºÙ„Ù‚
// Ø§Ù„Ø³ÙŠØ±ÙØ± ÙŠØ±Ø³Ù„ Ù†Ø¨Ø¶Ø© Ø¹Ù†Ø¯ ÙƒÙ„ Ø±Ø¨Ø¹ Ø³Ø§Ø¹Ø© (Ø§Ù„Ø£Ø°ÙƒØ§Ø± Ø§Ù„Ø¹Ø§Ù…Ø©) ÙˆØ¹Ù†Ø¯ ÙˆÙ‚Øª ÙƒÙ„ ØªØ°ÙƒÙŠØ± Ø´Ø®ØµÙŠØŒ ÙˆÙ†Ø­Ù† Ù†Ù‚Ø±Ø± Ù‡Ù†Ø§ Ù…Ø§Ø°Ø§ Ù†Ø¹Ø±Ø¶
let lastIdx = -1;
self.addEventListener('push', event => {
    event.waitUntil(serial(async () => {
        const now = Date.now();
        const fired = await checkReminders(now);
        const state = await getJSON('state', null);
        const generalOn = !state || state.general !== false;
        const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        if (wins.some(w => w.visibilityState === 'visible')) return; // Ø§Ù„ØµÙØ­Ø© Ù…ÙØªÙˆØ­Ø© ÙˆØªØªÙˆÙ„Ù‰ Ø§Ù„Ø£Ø°ÙƒØ§Ø± Ø§Ù„Ø¹Ø§Ù…Ø© Ø¨Ù†ÙØ³Ù‡Ø§
        const minute = new Date(now).getMinutes() % 15;
        const generalSlot = minute <= 3 || minute >= 13;
        // Ù†Ø¹Ø±Ø¶ Ø§Ù„Ø°ÙƒØ± Ø§Ù„Ø¹Ø§Ù… ÙÙŠ Ù…ÙˆØ¹Ø¯Ù‡ØŒ Ø£Ùˆ Ø¥Ù† ÙˆØµÙ„Øª Ù†Ø¨Ø¶Ø© Ø¯ÙˆÙ† ØªØ°ÙƒÙŠØ± Ù…Ø³ØªØ­Ù‚ (Ø­ØªÙ‰ Ù„Ø§ ØªÙƒÙˆÙ† Ø§Ù„Ù†Ø¨Ø¶Ø© ØµØ§Ù…ØªØ©)
        if (!generalOn || (fired.length && !generalSlot)) return;
        let i;
        do { i = Math.floor(Math.random() * ADHKAR.length); } while (i === lastIdx && ADHKAR.length > 1);
        lastIdx = i;
        await self.registration.showNotification('Ø£Ø°ÙƒØ§Ø± Ø¹Ø§Ù…Ø©', {
            body: ADHKAR[i], tag: 'general-adhkar', renotify: true, lang: 'ar', dir: 'rtl', icon: ICON, badge: BADGE
        });
    }));
});
