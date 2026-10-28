/* =====================================================================
 * مُذكّر — feedback.js  (الإصدار ٢٠، معرض ٩)
 * «ملاحظات وشكاوي» (ل١): نوع الرسالة والنجوم والكتابة، ومعها نسخة التطبيق ونوع الجهاز بس (بلا اسم ولا رقم).
 *   رسائلك والردود تحت النموذج. الجهاز بيتعرّف برمز عشوائي (mudhakkir-fb-id) بيتولد أول ما تبعت.
 * ر٢ «وصلك رد»: بطاقة بأول الرئيسية + نقطة على «الإعدادات» بالشريط + «جديد» جنب «ملاحظات وشكاوي».
 * ع١ إعلان من المطوّر: بطاقة بأول الرئيسية بتضل لحد ما تسكّرها أو تخلص مدتها.
 * على جهاز المطوّر نفس الصفحة بتصير صندوق الرسائل (dev.js).
 * يعتمد على PUSH_SERVER (notifications.js) و APP_BUILD (updates.js) و Install و Toast و navigateTo.
 * ===================================================================== */
const Feedback = (() => {
    const $ = id => document.getElementById(id);
    const KEY_ID = 'mudhakkir-fb-id', KEY_MINE = 'mudhakkir-fb-mine', KEY_SEEN = 'mudhakkir-fb-seen', KEY_SYNC = 'mudhakkir-fb-sync', KEY_DRAFT = 'mudhakkir-fb-draft';
    const KEY_ANN = 'mudhakkir-ann', KEY_ANN_OFF = 'mudhakkir-ann-dismissed';
    const TYPES = { complaint: 'شكوى', idea: 'اقتراح', bug: 'خطأ بالتطبيق', thanks: 'شكر' };
    const ICON_FB = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5h16v10.5H10l-5 4v-4H4z"/><path d="M8.5 9.5h7M8.5 12.5h4.5"/></svg>';
    const ICON_GO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 6l-6 6 6 6"/></svg>';
    const ar = n => Number(n).toLocaleString('ar-EG', { maximumFractionDigits: 1 });
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (e) { return d; } };
    const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
    const server = () => (typeof PUSH_SERVER !== 'undefined' ? PUSH_SERVER : '');
    const isDev = () => typeof Dev !== 'undefined' && Dev.isDevice();
    let type = '', stars = 0, sending = false, wasOpen = false;

    // «قبل ٥ دقايق»، «أمس»… (بالعامية متل باقي التطبيق)
    function when(at) {
        const s = Math.max(0, (Date.now() - at) / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
        const plural = (n, one, two, few, many) => (n === 1 ? one : n === 2 ? two : `${ar(n)} ${n <= 10 ? few : many}`);
        if (m < 1) return 'هلّق';
        if (h < 1) return 'قبل ' + plural(m, 'دقيقة', 'دقيقتين', 'دقايق', 'دقيقة');
        if (d < 1) return 'قبل ' + plural(h, 'ساعة', 'ساعتين', 'ساعات', 'ساعة');
        if (d === 1) return 'أمس';
        if (d < 7) return 'قبل ' + plural(d, 'يوم', 'يومين', 'أيام', 'يوم');
        return new Date(at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
    }
    const starsHTML = n => (n ? `<span class="fb-st" aria-label="${ar(n)} من ٥">${'★'.repeat(n)}<span aria-hidden="true">${'★'.repeat(5 - n)}</span></span>` : '');
    const tagHTML = t => `<span class="fb-tag" data-t="${esc(t)}">${TYPES[t] || ''}</span>`;

    // رمز الجهاز: عشوائي، بلا أي معلومة عنك
    function fid(create = false) {
        let id = '';
        try { id = localStorage.getItem(KEY_ID) || ''; } catch (e) {}
        if (!/^[a-z0-9]{20,40}$/.test(id) && create) {
            id = [...crypto.getRandomValues(new Uint8Array(16))].map(b => (b % 36).toString(36)).join('') + Date.now().toString(36);
            try { localStorage.setItem(KEY_ID, id); } catch (e) {}
        }
        return /^[a-z0-9]{20,40}$/.test(id) ? id : '';
    }
    // معلومات الجهاز يلي بتنبعت مع الرسالة (بتساعد بتصليح الأخطاء، وما فيها شي شخصي)
    function deviceInfo() {
        const ua = navigator.userAgent || '';
        const m = re => (ua.match(re) || [])[1] || '';
        const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
        const os = ios ? 'iOS ' + m(/OS (\d+)[_.]/) : /Android/.test(ua) ? 'Android ' + m(/Android (\d+)/)
            : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
        const browser = /SamsungBrowser\//.test(ua) ? 'Samsung ' + m(/SamsungBrowser\/(\d+)/)
            : /Edg\w*\//.test(ua) ? 'Edge ' + m(/Edg\w*\/(\d+)/)
            : /(CriOS|Chrome)\//.test(ua) ? 'Chrome ' + m(/(?:CriOS|Chrome)\/(\d+)/)
            : /(FxiOS|Firefox)\//.test(ua) ? 'Firefox ' + m(/(?:FxiOS|Firefox)\/(\d+)/)
            : /Version\/\d+.*Safari/.test(ua) ? 'Safari ' + m(/Version\/(\d+)/) : ios ? 'Safari app' : '';
        const safe = fn => { try { return fn(); } catch (e) { return undefined; } };
        const inf = safe(() => Install.info()) || {};
        return {
            build: safe(() => APP_BUILD), platform: inf.platform, installed: typeof inf.standalone === 'boolean' ? inf.standalone : undefined,
            os: os.trim(), browser: browser.trim(),
            theme: document.body.classList.contains('dark-mode') ? 'dark' : 'light',
            size: document.documentElement.dataset.font || 'md',
            notif: safe(() => Notifier.permission()), push: safe(() => PushSync.state()),
            w: Math.round(innerWidth)
        };
    }

    // ---------- النموذج ----------
    function setType(t) {
        type = TYPES[t] ? t : '';
        $('fb-types').querySelectorAll('[data-type]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.type === type)));
    }
    function setStars(n) {
        stars = n;
        $('fb-stars').querySelectorAll('[data-star]').forEach(b => {
            const v = Number(b.dataset.star);
            b.classList.toggle('on', v <= n);
            b.setAttribute('aria-checked', String(v === n));
        });
    }
    function showError(text, focus) {
        const box = $('fb-error');
        box.textContent = text; box.hidden = !text;
        if (text) { $('fb-ok').hidden = true; focus?.focus(); }
    }
    async function submit(e) {
        e.preventDefault();
        if (sending) return;
        const text = $('fb-text').value.trim();
        if (!type) return showError('اختار نوع الرسالة أول.', $('fb-types').querySelector('button'));
        if (text.length < 2) return showError('اكتب ملاحظتك أول.', $('fb-text'));
        if (!server()) return showError('الإرسال مو متاح هلّق.');
        if (!navigator.onLine) return showError('ما في نت هلّق. رسالتك بتضل مكتوبة هون، ابعتها لما يرجع النت.');
        sending = true; showError('');
        const btn = $('fb-send');
        btn.disabled = true; btn.textContent = 'جارٍ الإرسال…';
        try {
            const res = await fetch(server() + '/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fid: fid(true), type, stars, text, info: deviceInfo() }) });
            const data = await res.json().catch(() => null);
            if (res.status === 429) throw new Error('limit');
            if (!res.ok || !data || !data.ok) throw new Error('send');
            const mine = read(KEY_MINE, []);
            mine.unshift({ id: data.id, type, stars, text, at: data.at || Date.now(), reply: '', replyAt: 0 });
            write(KEY_MINE, mine.slice(0, 30));
            $('fb-text').value = '';
            try { localStorage.removeItem(KEY_DRAFT); } catch (err) {}
            setType(''); setStars(0);
            $('fb-ok').hidden = false;
            renderMine();
        } catch (err) {
            showError(err.message === 'limit' ? 'بعتت رسائل كتير اليوم. جرّب بكرا إن شاء الله.' : 'ما قدرنا نبعت الرسالة. تأكد من النت وجرّب مرة تانية.');
        } finally {
            sending = false; btn.disabled = false; btn.textContent = 'إرسال';
        }
    }

    // ---------- رسائلك والردود ----------
    const latestReply = () => read(KEY_MINE, []).reduce((t, m) => Math.max(t, Number(m.replyAt) || 0), 0);
    const hasNew = () => latestReply() > read(KEY_SEEN, 0);
    function renderMine() {
        const mine = read(KEY_MINE, []), box = $('fb-mine');
        if (!box) return;
        const seen = read(KEY_SEEN, 0);
        $('fb-mine-title').hidden = !mine.length;
        box.innerHTML = mine.map(m => `<article class="fb-msg${m.replyAt > seen ? ' is-new' : ''}" data-id="${esc(m.id)}">
            <div class="fb-msg-h">${tagHTML(m.type)}${starsHTML(m.stars)}<time>${when(m.at)}</time></div>
            <p>${esc(m.text)}</p>
            ${m.reply ? `<div class="fb-reply"><b>ردّ المطوّر</b><p>${esc(m.reply)}</p></div>` : '<small class="fb-wait">لسا ما في رد</small>'}
        </article>`).join('');
    }
    async function syncMine(force = false) {
        const id = fid();
        if (!id || !server() || !navigator.onLine) return;
        if (!force && Date.now() - read(KEY_SYNC, 0) < 30 * 60e3) return;
        try {
            const res = await fetch(server() + '/feedback/mine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fid: id }) });
            const data = res.ok ? await res.json() : null;
            if (!data || !Array.isArray(data.items)) return;
            write(KEY_MINE, data.items.slice(0, 30));
            write(KEY_SYNC, Date.now());
            renderMine(); paintNotice();
        } catch (e) {}
    }
    function markSeen() {
        const t = latestReply();
        if (t > read(KEY_SEEN, 0)) write(KEY_SEEN, t);
        paintNotice();
    }

    // ---------- ر٢ «وصلك رد» + ع١ الإعلان ----------
    function liveAnnouncement() {
        const a = (read(KEY_ANN, null) || {}).a;
        if (!a || !a.id || (a.until && a.until < Date.now())) return null;
        return read(KEY_ANN_OFF, []).includes(a.id) ? null : a;
    }
    async function syncAnnouncement(force = false) {
        const c = read(KEY_ANN, null);
        if (!force && c && Date.now() - (c.at || 0) < 60 * 60e3) return;
        if (!server() || !navigator.onLine) return;
        try {
            const res = await fetch(server() + '/announce', { cache: 'no-store' }); // منقرّر نحن متى نسأل (مرة بالساعة)
            if (!res.ok) return;
            const d = await res.json();
            write(KEY_ANN, { at: Date.now(), a: (d && d.a) || null });
            renderHome();
        } catch (e) {}
    }
    function renderHome() {
        const box = $('home-notes');
        if (!box) return;
        const cards = [];
        const inbox = isDev() ? Dev.homeCard() : ''; // جهاز المطوّر: «صندوق الرسائل: ٣ رسائل جديدة»
        if (inbox) cards.push(inbox);
        if (hasNew()) {
            const m = read(KEY_MINE, []).filter(x => x.replyAt).sort((a, b) => b.replyAt - a.replyAt)[0];
            cards.push(`<button type="button" class="hn-card hn-reply" data-hn="reply"><span class="hn-ic" aria-hidden="true">${ICON_FB}</span><span class="hn-body"><b>وصلك رد على ملاحظتك</b><small>من المطوّر · ${when(m.replyAt)}</small></span><span class="hn-go" aria-hidden="true">${ICON_GO}</span></button>`);
        }
        const a = liveAnnouncement();
        if (a) cards.push(`<article class="hn-card hn-ann"><button type="button" class="hn-x" data-hn="dismiss" data-id="${esc(a.id)}" aria-label="إخفاء الإعلان">×</button><small>من المطوّر</small><b>${esc(a.title)}</b><p>${esc(a.text)}</p></article>`);
        box.innerHTML = cards.join('');
        box.hidden = !cards.length;
    }
    function paintNotice() {
        const fresh = hasNew();
        const pill = $('fb-setting-new');
        if (pill) pill.hidden = !fresh;
        const link = document.querySelector('.side-link[data-target="settings"]');
        if (link) {
            let dot = link.querySelector('.nav-dot');
            if (!dot) { dot = document.createElement('i'); dot.className = 'nav-dot'; dot.setAttribute('aria-hidden', 'true'); link.append(dot); }
            dot.hidden = !fresh;
            if (fresh) link.setAttribute('aria-label', 'الإعدادات · وصلك رد جديد'); else link.removeAttribute('aria-label');
        }
        renderHome();
    }
    function onHomeClick(e) {
        const b = e.target.closest('[data-hn]');
        if (!b) return;
        if (b.dataset.hn === 'dismiss') {
            write(KEY_ANN_OFF, [...read(KEY_ANN_OFF, []).filter(x => x !== b.dataset.id), b.dataset.id].slice(-10));
            renderHome();
            return;
        }
        navigateTo('feedback');
        if (b.dataset.hn === 'inbox') return;
        setTimeout(() => {
            const card = document.querySelector('#fb-mine .fb-msg.is-new');
            card?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        }, 350);
    }

    // ---------- عدد المستخدمين (الإصدار ٢٢) ----------
    // رمز عشوائي (مو نفس رمز الرسائل، فما بينربطوا ببعض) بينبعت مرة بالأسبوع، حتى يعرف المطوّر كم واحد عم يستعمل مُذكّر
    async function hello() {
        if (!server() || !navigator.onLine) return;
        if (Date.now() - read('mudhakkir-uid-at', 0) < 7 * 864e5) return;
        let id = '';
        try { id = localStorage.getItem('mudhakkir-uid') || ''; } catch (e) {}
        if (!/^[a-z0-9]{20,40}$/.test(id)) {
            id = [...crypto.getRandomValues(new Uint8Array(16))].map(b => (b % 36).toString(36)).join('') + Date.now().toString(36);
            try { localStorage.setItem('mudhakkir-uid', id); } catch (e) {}
        }
        try {
            const res = await fetch(server() + '/hello', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
            if (res.ok) write('mudhakkir-uid-at', Date.now());
        } catch (e) {}
    }

    // ---------- فتح الصفحة ----------
    function onShow() {
        if (isDev()) { Dev.showInbox(); return; }
        if (typeof Dev !== 'undefined') Dev.showUser();
        renderMine();
        syncMine(true);
        setTimeout(markSeen, 1200); // بعد ما يشوف الردود الجديدة مميّزة
    }
    function init() {
        const form = $('fb-form');
        if (!form) return;
        $('fb-types').addEventListener('click', e => { const b = e.target.closest('[data-type]'); if (b) { setType(b.dataset.type); showError(''); } });
        $('fb-stars').addEventListener('click', e => { const b = e.target.closest('[data-star]'); if (b) setStars(Number(b.dataset.star) === stars ? 0 : Number(b.dataset.star)); });
        form.addEventListener('submit', submit);
        const ta = $('fb-text');
        try { ta.value = localStorage.getItem(KEY_DRAFT) || ''; } catch (e) {}
        ta.addEventListener('input', () => {
            try { localStorage.setItem(KEY_DRAFT, ta.value.slice(0, 1500)); } catch (e) {}
            $('fb-ok').hidden = true;
            if (!$('fb-error').hidden) showError('');
        });
        $('home-notes')?.addEventListener('click', onHomeClick);
        const page = $('page-feedback');
        new MutationObserver(() => {
            const open = page.classList.contains('active-page');
            if (open && !wasOpen) onShow();
            wasOpen = open;
        }).observe(page, { attributes: true, attributeFilter: ['class'] });
        renderMine();
        paintNotice();
        setTimeout(() => { syncMine(); syncAnnouncement(); hello(); }, 4000);
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { syncMine(); syncAnnouncement(); } });
        addEventListener('online', () => { syncMine(); syncAnnouncement(); });
    }
    return { init, when, esc, ar, TYPES, starsHTML, tagHTML, deviceInfo, syncAnnouncement, renderHome };
})();
