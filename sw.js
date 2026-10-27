/* مُذكّر — Service Worker
 * - التحديث بموافقة المستخدم: التطبيق يعمل من نسخته المحفوظة، والنسخة الجديدة تُنزَّل في الخلفية
 *   ولا تُستخدم إلا بعد أن يضغط المستخدم «تحديث».
 * - إشعارات الأذكار العامة (مع زرّي «اسأل مُذكّر» و«ذكر آخر») والتذكيرات الشخصية وتذكير الجمعة وإشعار التحديثات.
 * - العمل دون اتصال.
 */
// إن تعذّر تحميل أحد ملفات البيانات لا يتعطل الـ Service Worker كله
try { importScripts('general-adhkar.js'); } catch (e) {}
try { importScripts('adhkar-data.js', 'situations-adhkar.js', 'assets/js/knowledge.js'); } catch (e) {}
// نفس الرابط في assets/js/notifications.js (للرد على «اسأل مُذكّر» من داخل الإشعار)
const PUSH_SERVER = 'https://mudhakkir-push.bader-bm-2000.workers.dev';
const ADHKAR = (typeof GENERAL_ADHKAR_LIST !== 'undefined' && GENERAL_ADHKAR_LIST.length) ? GENERAL_ADHKAR_LIST : [
    'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
    'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ وَأَتُوبُ إِلَيْهِ',
    'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ'
];
// ← عند كل تحديث: زد هذا الرقم (مع APP_BUILD في assets/js/updates.js و build في version.json)
const CACHE = 'mudhakkir-v34';
const DATA = 'mudhakkir-data'; // إعدادات التذكير والنسخة المعتمدة (لا تُحذف عند التحديث)
// ملفات التطبيق التي تُخزَّن (أضف أي ملف جديد هنا)
const CSS_FILES = ['01-base', '02-reader-and-palette', '03-home-and-wird', '04-brand-and-effects', '05-viewer-reminders-picker', '06-immersive-and-mobile', '07-design', '08-quran-tools', '09-assistant', '10-atmosphere', '11-refresh', '12-pages', '13-mushaf-and-motion', '14-performance', '15-look', '16-layout', '17-mushaf', '18-screen', '19-feedback'].map(n => `./assets/css/${n}.css`);
const JS_FILES = ['preload-theme', 'splash', 'knowledge', 'core', 'adhkar-viewer', 'theme', 'prefs', 'modals-and-picker', 'wird', 'wird-intro', 'quran-tools', 'offline', 'mushaf', 'reader', 'notifications', 'reminders', 'updates', 'install', 'fx', 'tasbih', 'home', 'share', 'extras', 'screen', 'widgets', 'feedback', 'dev', 'time-context', 'atmosphere', 'motion', 'assistant', 'main'].map(n => `./assets/js/${n}.js`);
// محتوى «شاشة مُذكّر» (نفس محتوى الأدوات برّا التطبيق): بيتخزّن متل ملفات التطبيق حتى تشتغل الشاشة بلا نت
const DATA_FILES = ['./assets/data/widget-content.json'];
const CORE = ['./', './index.html', './general-adhkar.js', './adhkar-data.js', './situations-adhkar.js', './manifest.json', ...CSS_FILES, ...JS_FILES, ...DATA_FILES,
    './assets/img/logo-light.webp', './assets/img/logo-dark.webp', './assets/img/icon-192.webp', './assets/img/icon-192.png', './assets/img/favicon-64.png'];
const ICON = './assets/img/icon-192.png', BADGE = './assets/img/favicon-64.png';
// يُعرض التذكير إن تأخر وصول الإشعار حتى ساعة: السيرفر بيلقط المتأخر لحد ٣٠ دقيقة (جدول كل نص ساعة)،
// وفوقها تأخير خدمة الإشعارات نفسها (TTL نص ساعة). و«shown» بيمنع التكرار.
const DUE_WINDOW = 60 * 60 * 1000;
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
// مخازن المصحف والبحث بلا نت (wird.js و offline.js) بتضل عند التحديث
const KEEP_ALWAYS = /^mudhakkir-(quran|search)-/;
async function cleanup() {
    const keep = new Set([CACHE, DATA, await approvedCache()]);
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !keep.has(k) && !KEEP_ALWAYS.test(k)).map(k => caches.delete(k)));
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
    // صفحات الأدوات برّا التطبيق (widget/: خلفية اللابتوب، لوحة التلفزيون، كود الآيفون) من الشبكة دايمًا،
    // وإلا كان التنقّل إلها بيرجع الصفحة الرئيسية المحفوظة
    if (url.pathname.includes('/widget/')) return;
    const isApp = req.mode === 'navigate' || ['script', 'style', 'image', 'manifest', 'font'].includes(req.destination) || url.pathname.includes('/assets/data/');
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

// إ٢ (الإصدار ١٥): أزرار إشعار التذكير: «أتممت» (بتنحسب بإنجاز اليوم) و«بعد ١٠ دقائق» (غفوة)
const SNOOZE_MS = 10 * 60 * 1000;
function reminderActions(r) {
    const snooze = { action: 'snooze', title: '⏰ بعد ١٠ دقائق' };
    if (r.id === 'friday' || r.kahf) return [{ action: 'kahf', title: '📖 اقرأ الكهف' }, snooze];
    if (r.id === 'wird' || r.wird) return [{ action: 'open-wird', title: '📖 افتح الورد' }, snooze];
    return [{ action: 'done', title: '✓ أتممت' }, snooze];
}
// الغفوات: تذكير «مرة واحدة» بعد ١٠ دقائق. بنحفظها هون (الصفحة ما بتعرف عنها) وبنبعتها للسيرفر حتى توصل والتطبيق مسكّر
async function liveSnoozes(now = Date.now()) {
    const list = await getJSON('snoozes', []);
    return (Array.isArray(list) ? list : []).filter(s => s && now - (s.at || 0) < DUE_WINDOW);
}
async function snooze(data, now = Date.now()) {
    const at = new Date(now + SNOOZE_MS);
    const s = {
        id: 'snz-' + at.getTime(), title: data.title || 'تذكير', text: data.text || '',
        time: `${pad(at.getHours())}:${pad(at.getMinutes())}`, repeat: 'once', days: [], date: dayKey(at), on: true, since: now, at: at.getTime(),
        kahf: data.open === 'kahf' || undefined, wird: data.id === 'wird' || data.wird || undefined, url: data.url
    };
    const list = (await liveSnoozes(now)).concat(s);
    await putJSON('snoozes', list);
    await pushServerSync(list);
}
// نبعت للسيرفر نفس يلي بتبعته الصفحة (PushSync) + الغفوات
async function pushServerSync(snoozes) {
    try {
        const sub = await self.registration.pushManager.getSubscription();
        const state = await getJSON('state', null);
        if (!sub || !state) return;
        const now = Date.now();
        const reminders = (state.reminders || []).filter(r => r && r.on).concat(snoozes.filter(s => s.at > now - 60000))
            .map(({ id, time, repeat, days, date }) => ({ id, time, repeat, days, date }));
        let tz = 'UTC'; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) {}
        await fetch(PUSH_SERVER + '/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...sub.toJSON(), general: state.general !== false, tz, reminders }) });
    } catch (e) {}
}
// «أتممت»: بتنسجّل لليوم، والصفحة بتضيفها لتقويم الأسبوع (WeekLog) أول ما تنفتح
async function markDone(now = Date.now()) {
    const d = new Date(now), list = await getJSON('weeklog-pending', []);
    list.push({ day: dayKey(d), kind: 'a' });
    await putJSON('weeklog-pending', list.slice(-30));
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    wins.forEach(w => w.postMessage({ type: 'mdk-weeklog' }));
}

async function checkReminders(now = Date.now()) {
    const state = await getJSON('state', null);
    if (!state || !Array.isArray(state.reminders)) return [];
    const shown = await getJSON('shown', {});
    const fired = [];
    for (const r of state.reminders.concat(await liveSnoozes(now))) {
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
        requireInteraction: true,
        data: { kind: 'reminder', id: r.id, title: r.title, text: r.text, url: r.url, wird: r.wird, open: r.id === 'friday' || r.kahf ? 'kahf' : undefined },
        actions: reminderActions(r)
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

// ---------- إشعار الأذكار العامة: زر «اسأل مُذكّر» (مع خانة كتابة إن دعمها المتصفح) و«ذكر آخر» ----------
const GENERAL_ACTIONS = [
    { action: 'ask', title: '✍️ اسأل مُذكّر', type: 'text', placeholder: 'اكتب ما تريد… مثلًا: ذكر عند الغضب' },
    { action: 'next', title: 'ذكر آخر ↻' }
];
let lastIdx = -1;
function showGeneral() {
    let i;
    do { i = Math.floor(Math.random() * ADHKAR.length); } while (i === lastIdx && ADHKAR.length > 1);
    lastIdx = i;
    return self.registration.showNotification('أذكار عامة', {
        body: ADHKAR[i], tag: 'general-adhkar', renotify: true, lang: 'ar', dir: 'rtl', icon: ICON, badge: BADGE,
        actions: GENERAL_ACTIONS, data: { kind: 'general' }
    });
}

// يفتح التطبيق (أو يعيد التركيز عليه) ثم يرسل له ما يجب فتحه
async function focusApp(message, path) {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of list) {
        if (!('focus' in client)) continue;
        try { await client.focus(); } catch (e) {}
        client.postMessage(message);
        return;
    }
    return self.clients.openWindow(new URL(path, self.registration.scope).href);
}

// الرد من داخل الإشعار (المتصفحات التي تدعم الكتابة في الإشعار): نسأل السيرفر ونعرض الجواب كإشعار
const stripIds = text => String(text || '').replace(/\[\[([\w-]+:\d+)\]\]/g, (m, id) => {
    const it = typeof Knowledge !== 'undefined' ? Knowledge.get(id) : null;
    return it ? `\n«${it.text.slice(0, 260)}»` : '';
}).replace(/\*\*/g, '').replace(/\n{3,}/g, '\n\n').trim();
async function readSSE(res) {
    const type = res.headers.get('Content-Type') || '';
    const raw = await res.text();
    if (!type.includes('event-stream')) { try { const j = JSON.parse(raw); return j.response || (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || ''; } catch (e) { return ''; } }
    let text = '';
    raw.split('\n').forEach(line => {
        const l = line.trim();
        if (!l.startsWith('data:')) return;
        const p = l.slice(5).trim();
        if (!p || p === '[DONE]') return;
        try { const j = JSON.parse(p); text += typeof j.response === 'string' ? j.response : (j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content) || ''; } catch (e) {}
    });
    return text;
}
async function answerFromNotification(q) {
    q = String(q).trim().slice(0, 600);
    const items = typeof Knowledge !== 'undefined' ? Knowledge.search(q, { limit: 6 }) : [];
    let a = '', local = false;
    try {
        const res = await fetch(PUSH_SERVER + '/chat', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: 'user', content: q }], items: typeof Knowledge !== 'undefined' ? Knowledge.forModel(items) : [] })
        });
        // بعض النماذج ترسل نص «تفكير» قبل الرد: نحذفه
        if (res.ok) a = (await readSSE(res)).replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<think>[\s\S]*$/i, '').trim();
    } catch (e) {}
    if (!a) {
        local = true;
        const help = typeof Knowledge !== 'undefined' ? Knowledge.helpFor(q) : null;
        a = help ? help.answer : items.length ? 'من محتوى التطبيق:\n' + items.slice(0, 2).map(it => `[[${it.id}]]`).join('\n') : 'افتح المحادثة لتكمل سؤالك مع مُذكّر.';
    }
    // نحفظ السؤال والجواب لتظهر في المحادثة عند فتح التطبيق
    const inbox = await getJSON('ask-inbox', []);
    inbox.push({ q, a, at: Date.now(), local });
    await putJSON('ask-inbox', inbox.slice(-10));
    await self.registration.showNotification('مُذكّر يجيبك', {
        body: stripIds(a).slice(0, 900), tag: 'ask-answer', lang: 'ar', dir: 'rtl', icon: ICON, badge: BADGE,
        data: { kind: 'ask-answer' }, actions: [{ action: 'open-ask', title: 'افتح المحادثة' }]
    });
}

// الضغط على الإشعار أو أحد أزراره
self.addEventListener('notificationclick', event => {
    const n = event.notification, data = n.data || {}, action = event.action;
    n.close();
    event.waitUntil((async () => {
        if (action === 'next') return showGeneral();
        if (action === 'snooze' && data.kind === 'reminder') return snooze(data);
        if (action === 'done' && data.kind === 'reminder') return markDone();
        if (action === 'open-wird') return focusApp({ type: 'mdk-open-wird' }, './?open=wird');
        if (action === 'ask' && typeof event.reply === 'string' && event.reply.trim()) return answerFromNotification(event.reply);
        if (action === 'ask' || action === 'open-ask' || data.kind === 'ask-answer') return focusApp({ type: 'mdk-open-ask' }, './?ask=1');
        if (action === 'kahf' || data.open === 'kahf') return focusApp({ type: 'mdk-open-kahf' }, './?open=kahf');
        if (data.kind === 'message') return data.url === './?open=inbox' ? focusApp({ type: 'mdk-open-inbox' }, './?open=inbox') : focusApp({ type: 'mdk-focus' }, './');
        const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        if (data.url) {
            const url = new URL(data.url, self.registration.scope).href;
            for (const client of list) if ('navigate' in client) return client.navigate(url).then(c => c && c.focus()).catch(() => self.clients.openWindow(url));
            return self.clients.openWindow(url);
        }
        for (const client of list) if ('focus' in client) return client.focus();
        return self.clients.openWindow('./');
    })());
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
        const build = Number(v.build) || 0, rel = v.release || '';
        // أحدث = رقم أكبر، أو نفس الرقم بتاريخ نشر جديد (الإصدار ١٤ انتشر مرتين)
        const newer = build > seen.build || (build === seen.build && !!rel && seen.release !== rel);
        const tag = rel ? `${build}|${rel}` : build;
        if (!seen.build || !newer || meta.notified === tag) return;
        meta.notified = tag;
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
// ← الإصدار ١٣: كل نبضة لازم يطلع منها إشعار، حتى والتطبيق مفتوح. على الآيفون النبضة «الصامتة» بتخلّي Safari
//   يلغي اشتراك الموقع بعد كم مرة، فبتوقف كل الإشعارات والسيرفر لسا مفكّر حاله عم يبعت.
self.addEventListener('push', event => {
    // الإصدار ٢٠: إشعار فيه نص من السيرفر (رسالة جديدة بصندوق المطوّر، إعلان من المطوّر، تجربة إشعار المطوّر).
    // التذكيرات والأذكار بتضل نبضة بلا محتوى، ونحن منقرر شو نعرض تحت.
    let msg = null;
    try { msg = event.data ? event.data.json() : null; } catch (e) {}
    if (msg && msg.mdk === 1 && msg.title) {
        event.waitUntil(self.registration.showNotification(String(msg.title).slice(0, 80), {
            body: String(msg.body || '').slice(0, 400), tag: String(msg.tag || 'mdk-msg').slice(0, 40), renotify: true,
            lang: 'ar', dir: 'rtl', icon: ICON, badge: BADGE, data: { kind: 'message', url: typeof msg.url === 'string' && msg.url.startsWith('./') ? msg.url : './' }
        }));
        return;
    }
    event.waitUntil(serial(async () => {
        const now = Date.now();
        // إشعار تجربة من «فحص الإشعارات»
        const test = await getJSON('test', null);
        if (test && now - (test.at || 0) < 3 * 60000) {
            await putJSON('test', null);
            await self.registration.showNotification('✓ الإشعارات شغّالة', {
                body: 'وصل إشعار التجربة من الخادم. ستصلك التذكيرات والأذكار حتى والتطبيق مغلق بإذن الله.',
                tag: 'notify-test', lang: 'ar', dir: 'rtl', icon: ICON, badge: BADGE, data: { kind: 'test' }
            });
            const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            wins.forEach(w => w.postMessage({ type: 'mdk-test-ok' }));
            return;
        }
        const fired = await checkReminders(now);
        await checkUpdateNotice();
        const state = await getJSON('state', null);
        const generalOn = !state || state.general !== false;
        const minute = new Date(now).getMinutes() % 15;
        const generalSlot = minute <= 3 || minute >= 13;
        // التذكير طلع، ومو وقت ذكر عام: بيكفي
        if (fired.length && !generalSlot) return;
        // الذكر العام بموعده، أو إذا وصلت نبضة بلا تذكير مستحق (حتى ما تكون النبضة صامتة)
        if (generalOn) await showGeneral();
    }));
});
