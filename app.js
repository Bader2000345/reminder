/* =====================================================================
 * فريق مُذكّر — app.js  (النسخة 2؛ الأولى من معرض الفريق: ه1 ش2 د1 ت1 ر2 ف1)
 * النسخة 2 (مع مُذكّر 31): بطاقة تثبيت متل مُذكّر (بالدخول وبالرسائل وبحسابي)، و«افتح بـ Chrome» لمتصفحات الشركات،
 *   والكتابة ما بتكبّر الشاشة، والكبسات بتنحسّ، والضغط المطوّل ما بينسخ (والنسخ من زر «نسخ النص»)،
 *   والفحص بيبيّن التخزين وحد الإرسال (سيرفر 31).
 * تطبيق لحالو للفريق: كل شخص إلو رمز (XXXX-XXXX) ودور، وصاحب التطبيق بيدخل بكلمة السر (DEV_KEY).
 *   قارئ: الرسائل · مجاوب: + رد وأرشفة · مشرف: + الأرقام والإعلان والفحص · صاحب التطبيق: + الفريق والرموز
 * الدور بيقرّرو السيرفر (worker.js ← ROUTES)، وهون منخبّي يلي ما إلك بس.
 * الرمز نفسو ما بينحفظ عالجهاز: بينحفظ رمز موقّع من السيرفر (mdt-tok) مربوط بهالجهاز.
 * ===================================================================== */
(() => {
    'use strict';
    // النسخة 4 (الأمان): ما منشتغل جوّا إطار بموقع تاني (حتى ما حدا يغطّي التطبيق بصفحتو ويخلّي صاحب الرمز يكبس شي ما بدو ياه)
    if (window.top !== window.self) { document.documentElement.style.display = 'none'; return; }
    const API_LIVE = 'https://mudhakkir-push.bader-bm-2000.workers.dev';
    // للتجربة على الكمبيوتر بس: ?api=http://127.0.0.1:8787 (ما بيشتغل على الموقع الحقيقي)
    const API = (() => {
        try {
            const q = new URLSearchParams(location.search).get('api');
            if (q && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return q.replace(/\/$/, '');
        } catch (e) {}
        return API_LIVE;
    })();
    const VAPID = 'BHIWTXCv4Gmy6fy5fbsJ_NX4fLD0dkEo2PqyCVWzmbxaxw8xo8Ud9eMw_rZOp_qxOaDkSEThGzQbhQhSCQ6p2_8';
    const APP_URL = 'https://bader2000345.github.io/mudhakkir-dev/';
    const LIVE_VERSION = 'https://bader2000345.github.io/reminder/version.json';
    const VERSION = 4;
    // mudhakkir-dev-id و mudhakkir-dev-device: نفس مفاتيح صفحة المطوّر القديمة بمُذكّر (نفس الموقع)،
    // فجهاز صاحب التطبيق يلي كان مسجّل بيفوت لحالو وما بينحسب جهاز جديد
    const K = { tok: 'mdt-tok', me: 'mdt-me', push: 'mdt-push', pushAt: 'mdt-push-at', inst: 'mdt-install-hide', dev: 'mudhakkir-dev-id', legacy: 'mudhakkir-dev-device' };

    const $ = id => document.getElementById(id);
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const num = n => Number(n).toLocaleString('ar-EG-u-nu-latn', { maximumFractionDigits: 1 });
    const store = {
        get: k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
        set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
        del: k => { try { localStorage.removeItem(k); } catch (e) {} }
    };
    const ROLE_AR = { read: 'قارئ', ans: 'مجاوب', adm: 'مشرف', owner: 'صاحب التطبيق' };
    const ROLE_HINT = { read: 'بيقرا الرسائل بس', ans: 'بيقرا وبيرد وبيأرشف', adm: 'كمان الأرقام والإعلان والفحص' };
    const RANK = { read: 1, ans: 2, adm: 3, owner: 4 };
    const TYPES = { complaint: 'شكوى', idea: 'اقتراح', bug: 'خطأ بالتطبيق', thanks: 'شكر' };
    const FILTERS = [['all', 'الكل'], ['bug', 'أخطاء'], ['idea', 'اقتراحات'], ['complaint', 'شكاوي'], ['thanks', 'شكر'], ['archived', 'الأرشيف']];
    const INFO = {
        platform: { android: 'أندرويد', samsung: 'سامسونج', ios: 'آيفون أو آيباد', desktop: 'كمبيوتر', inapp: 'متصفح جوّا تطبيق', other: 'أندرويد بمتصفح الشركة' },
        theme: { light: 'فاتح', dark: 'داكن' }, size: { sm: 'خط صغير', md: 'خط عادي', lg: 'خط كبير', xl: 'خط أكبر' },
        notif: { granted: 'الإشعارات مسموحة', denied: 'الإشعارات ممنوعة', default: 'الإشعارات لسا ما انطلبت', unsupported: 'ما بيدعم الإشعارات' },
        push: { on: 'الإشعار بالخلفية شغّال', outdated: 'الإشعار بالخلفية شغّال', off: 'الإشعار بالخلفية متوقف', pending: 'الإشعار بالخلفية قيد التفعيل', error: 'الإشعار بالخلفية فيه خطأ', unsupported: 'ما بيدعم الإشعار بالخلفية' }
    };
    const TZ = { 'Asia/Damascus': 'دمشق', 'Asia/Riyadh': 'الرياض', 'Asia/Amman': 'عمّان', 'Asia/Beirut': 'بيروت', 'Asia/Baghdad': 'بغداد', 'Asia/Kuwait': 'الكويت', 'Asia/Qatar': 'الدوحة', 'Asia/Dubai': 'دبي', 'Asia/Bahrain': 'البحرين', 'Asia/Muscat': 'مسقط', 'Asia/Aden': 'عدن', 'Asia/Gaza': 'غزة', 'Asia/Hebron': 'الخليل', 'Africa/Cairo': 'القاهرة', 'Africa/Tripoli': 'طرابلس', 'Africa/Tunis': 'تونس', 'Africa/Algiers': 'الجزائر', 'Africa/Casablanca': 'الدار البيضاء', 'Africa/Khartoum': 'الخرطوم', 'Europe/Istanbul': 'إسطنبول', 'Europe/Berlin': 'برلين', 'Europe/Amsterdam': 'أمستردام', 'Europe/Stockholm': 'ستوكهولم', 'Europe/London': 'لندن', 'Europe/Paris': 'باريس', 'Europe/Vienna': 'فيينا', 'America/New_York': 'نيويورك', 'America/Toronto': 'تورنتو', UTC: 'UTC' };
    const tzName = t => TZ[t] || String(t).split('/').pop().replace(/_/g, ' ');
    const svg = p => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
    const ICON = {
        inbox: svg('<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>'),
        chart: svg('<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>'),
        mega: svg('<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>'),
        users: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
        send: svg('<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>'),
        plus: svg('<path d="M12 5v14M5 12h14"/>'),
        refresh: svg('<path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/>')
    };
    const TABS = [['inbox', 'الرسائل', 'read'], ['nums', 'الأرقام', 'adm'], ['ann', 'الإعلان', 'adm'], ['team', 'الفريق', 'owner']];
    const TITLES = { inbox: 'الرسائل', nums: 'الأرقام والفحص', ann: 'إعلان لكل المستخدمين', team: 'الفريق' };

    let tok = store.get(K.tok);
    let me = (() => { try { return JSON.parse(store.get(K.me) || 'null'); } catch (e) { return null; } })();
    const S = { tab: 'inbox', items: [], counts: null, avg: 0, filter: 'all', archived: false, open: '', state: 'idle', stats: null, health: null, live: 0, team: null, devs: null, editing: false };
    const can = role => !!me && RANK[me.role] >= RANK[role];

    // ---------- أدوات صغيرة ----------
    function when(at) {
        const s = Math.max(0, (Date.now() - at) / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
        const plural = (n, one, two, few, many) => (n === 1 ? one : n === 2 ? two : `${num(n)} ${n <= 10 ? few : many}`);
        if (m < 1) return 'هلّق';
        if (h < 1) return 'قبل ' + plural(m, 'دقيقة', 'دقيقتين', 'دقايق', 'دقيقة');
        if (d < 1) return 'قبل ' + plural(h, 'ساعة', 'ساعتين', 'ساعات', 'ساعة');
        if (d === 1) return 'أمس';
        if (d < 7) return 'قبل ' + plural(d, 'يوم', 'يومين', 'أيام', 'يوم');
        return new Date(at).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long' });
    }
    const msgs = n => (n === 1 ? 'رسالة جديدة' : n === 2 ? 'رسالتين جداد' : `${num(n)} ${n <= 10 ? 'رسائل جديدة' : 'رسالة جديدة'}`);
    const tries = n => (n === 1 ? 'محاولة وحدة' : n === 2 ? 'محاولتين' : `${num(n)} محاولات`);
    const devices = n => (n === 1 ? 'جهاز واحد' : n === 2 ? 'جهازين' : `${num(n)} ${n <= 10 ? 'أجهزة' : 'جهاز'}`);
    const starsHTML = n => (n ? `<span class="stars" aria-label="${num(n)} من 5">${'★'.repeat(n)}<span aria-hidden="true">${'★'.repeat(5 - n)}</span></span>` : '');
    const tagHTML = t => `<span class="tag" data-t="${esc(t)}">${TYPES[t] || ''}</span>`;
    const initial = name => esc(String(name || '؟').trim().charAt(0) || '؟');
    let toastT = 0;
    function toast(t) {
        const el = $('toast'); el.textContent = t; el.classList.add('show');
        clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2600);
    }
    const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

    // رمز عشوائي لهالجهاز (نفس شكل رمز مُذكّر). السيرفر بيخزّن بصمتو بس
    function deviceId() {
        let id = store.get(K.dev);
        if (!/^[a-z0-9]{20,40}$/.test(id)) {
            id = [...crypto.getRandomValues(new Uint8Array(16))].map(b => (b % 36).toString(36)).join('') + Date.now().toString(36);
            store.set(K.dev, id);
        }
        return id;
    }
    function deviceLabel() {
        const ua = navigator.userAgent || '';
        const os = isIOS() ? 'آيفون' : /Android/.test(ua) ? 'أندرويد' : /Windows/.test(ua) ? 'ويندوز' : /Mac OS X/.test(ua) ? 'ماك' : 'جهاز';
        const br = /SamsungBrowser/.test(ua) ? 'سامسونج' : /Edg/.test(ua) ? 'إيدج' : /(CriOS|Chrome)\//.test(ua) ? 'كروم' : /(FxiOS|Firefox)/.test(ua) ? 'فايرفوكس' : /Safari/.test(ua) ? 'سفاري' : '';
        return [os, br, standalone() ? 'مثبّت' : ''].filter(Boolean).join('، ');
    }

    async function api(path, body = {}) {
        try {
            const res = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tok, ...body }) });
            const data = (await res.json().catch(() => null)) || {};
            if (res.status === 401 && tok && !/\/(team|dev)\/login$/.test(path)) expired();
            return { ok: res.ok, status: res.status, data };
        } catch (e) { return { ok: false, status: 0, data: {} }; }
    }

    // ===================== الدخول (د1) =====================
    const CLEAN = v => String(v || '').toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '');
    const boxes = () => [...$('boxes').querySelectorAll('input')];
    const codeNow = () => boxes().map(i => i.value).join('');
    function codeStatus(msg = '', kind = '') {
        const st = $('code-status'); st.textContent = msg; st.className = 'status' + (kind ? ' ' + kind : '');
        $('code-go').disabled = codeNow().length !== 8;
    }
    function fillFrom(i, text) {
        const ins = boxes(), v = CLEAN(text);
        [...v].slice(0, ins.length - i).forEach((ch, k) => { ins[i + k].value = ch; });
        ins[Math.min(i + v.length, ins.length - 1)].focus();
        codeStatus(codeNow().length === 8 ? 'الرمز كامل، اكبس «دخول»' : '');
    }
    function bindBoxes() {
        boxes().forEach((inp, i, ins) => {
            inp.addEventListener('input', () => {
                const v = CLEAN(inp.value);
                if (v.length > 1) { fillFrom(i, v); return; } // اقتراح لوحة المفاتيح أو لصق
                inp.value = v;
                if (v && i < ins.length - 1) ins[i + 1].focus();
                codeStatus(codeNow().length === 8 ? 'الرمز كامل، اكبس «دخول»' : '');
            });
            inp.addEventListener('keydown', e => {
                if (e.key === 'Backspace' && !inp.value && i > 0) { e.preventDefault(); ins[i - 1].value = ''; ins[i - 1].focus(); codeStatus(); }
                else if (e.key === 'ArrowLeft' && i < ins.length - 1) { e.preventDefault(); ins[i + 1].focus(); }
                else if (e.key === 'ArrowRight' && i > 0) { e.preventDefault(); ins[i - 1].focus(); }
            });
            inp.addEventListener('paste', e => { e.preventDefault(); fillFrom(i, (e.clipboardData || window.clipboardData).getData('text')); });
            inp.addEventListener('focus', () => inp.select());
        });
        $('code-form').addEventListener('submit', async e => {
            e.preventDefault();
            const code = codeNow();
            if (code.length !== 8) return;
            $('code-go').disabled = true; codeStatus('عم نتأكد…');
            const r = await api('/team/login', { code, dev: deviceId(), label: deviceLabel() });
            if (r.ok && r.data.tok) {
                tok = r.data.tok; me = r.data.me;
                store.set(K.tok, tok); store.set(K.me, JSON.stringify(me));
                boxes().forEach(x => { x.value = ''; });
                codeStatus(); startShell(true);
                return;
            }
            const err = r.data.error;
            codeStatus(r.status === 0 ? 'ما في اتصال بالنت، جرّب كمان شوي'
                : err === 'bound' ? 'هالرمز مربوط بجهاز تاني. اطلب من صاحب التطبيق «فك الجهاز» وجرّب من جديد'
                : err === 'locked' ? 'محاولات غلط كتير. جرّب بعد ربع ساعة'
                : err === 'wrong' ? `الرمز مو صح${r.data.left ? `، بقيلك ${tries(r.data.left)}` : ''}`
                : err === 'no-key' ? 'السيرفر لسا ما انضبط (DEV_KEY)' : 'ما زبط، جرّب كمان شوي', 'err');
        });
        $('to-owner').addEventListener('click', () => { $('code-form').hidden = true; $('owner-form').hidden = false; $('owner-key').focus(); });
        $('to-code').addEventListener('click', () => { $('owner-form').hidden = true; $('code-form').hidden = false; boxes()[0].focus(); });
        $('owner-form').addEventListener('submit', async e => {
            e.preventDefault();
            const key = $('owner-key').value, st = $('owner-status');
            if (!key) return;
            $('owner-go').disabled = true; st.className = 'status'; st.textContent = 'عم نتأكد…';
            const r = await api('/dev/login', { key, dev: deviceId(), label: deviceLabel() });
            $('owner-go').disabled = false; $('owner-key').value = '';
            if (r.ok && r.data.device) {
                tok = r.data.device; store.set(K.tok, tok);
                const m = await api('/team/me');
                me = m.ok ? m.data.me : { id: 'owner', name: 'صاحب التطبيق', role: 'owner' };
                store.set(K.me, JSON.stringify(me)); st.textContent = '';
                startShell(true);
                return;
            }
            const err = r.data.error;
            st.className = 'status err';
            st.textContent = r.status === 0 ? 'ما في اتصال بالنت'
                : err === 'wrong' ? `كلمة السر غلط${r.data.left ? `، بقيلك ${tries(r.data.left)}` : ''}`
                : err === 'locked' ? 'محاولات غلط كتير. جرّب بعد ربع ساعة'
                : err === 'device' ? `في ${devices(r.data.max || 2)} مسجّلين قبل. شيل واحد من «الفريق ← أجهزتك» على جهاز منهن، أو غيّر DEV_KEY بـ Cloudflare`
                : err === 'no-key' ? 'لسا ما انحطّت كلمة السر بـ Cloudflare (DEV_KEY)' : 'ما زبط، جرّب كمان شوي';
        });
    }
    function showLogin(msg = '') {
        $('shell').hidden = true; $('login').hidden = false;
        $('login-inst').innerHTML = installHTML('login');
        $('owner-form').hidden = true; $('code-form').hidden = false;
        codeStatus(msg, msg ? 'err' : '');
        setTimeout(() => boxes()[0].focus(), 50);
    }
    // الرمز انلغى، أو انفكّ عن هالجهاز، أو تغيّرت كلمة السر
    function expired() {
        tok = ''; me = null; store.del(K.tok); store.del(K.me); store.del(K.legacy); store.del(K.push);
        closeSheet();
        showLogin('انتهى دخولك على هالجهاز. إذا لسا إلك رمز، اكتبو من جديد، أو اطلب واحد من صاحب التطبيق');
    }

    // ===================== الهيكل والتبويبات (ت1) =====================
    function startShell(fresh = false) {
        $('login').hidden = true; $('shell').hidden = false;
        $('me-btn').textContent = initial(me.name);
        const tabs = TABS.filter(t => can(t[2]));
        const nav = $('tabbar');
        nav.hidden = tabs.length < 2;
        $('shell').classList.toggle('no-tabs', nav.hidden);
        nav.innerHTML = tabs.map(([k, l]) => `<button class="tab" type="button" data-tab="${k}">${ICON[k === 'inbox' ? 'inbox' : k === 'nums' ? 'chart' : k === 'ann' ? 'mega' : 'users']}<span>${l}</span>${k === 'inbox' ? '<i class="badge" id="badge" hidden></i>' : ''}</button>`).join('');
        if (!tabs.some(t => t[0] === S.tab)) S.tab = 'inbox';
        if (fresh) { S.items = []; S.counts = null; S.team = null; S.stats = null; S.health = null; S.open = ''; toast(`أهلين ${me.name} 🤍`); }
        go(S.tab);
        if (store.get(K.push) === '1') refreshPush();
    }
    function go(tab) {
        S.tab = tab; S.open = '';
        $('tabbar').querySelectorAll('.tab').forEach(b => b.setAttribute('aria-current', b.dataset.tab === tab ? 'page' : 'false'));
        render();
        if (tab === 'inbox') loadInbox();
        if (tab === 'nums') loadNums();
        if (tab === 'ann') loadNums();
        if (tab === 'team') loadTeam();
        scrollTo(0, 0);
    }
    function render() {
        const v = $('view');
        // بالرسالة: «كل الرسائل» مكان العنوان (النوع مكتوب تحت)
        $('back').hidden = !S.open; $('title').hidden = !!S.open;
        if (S.open) { renderMsg(v); return; }
        $('title').textContent = TITLES[S.tab];
        if (S.tab === 'inbox') v.innerHTML = inboxHTML();
        else if (S.tab === 'nums') v.innerHTML = numsHTML();
        else if (S.tab === 'ann') v.innerHTML = annHTML();
        else if (S.tab === 'team') v.innerHTML = teamHTML();
        paintBadge();
    }
    function paintBadge() {
        const b = $('badge'), n = S.counts ? S.counts.unread : 0;
        if (!b) return;
        b.hidden = !n; b.textContent = n > 99 ? '99+' : num(n);
        try { if (navigator.setAppBadge) n ? navigator.setAppBadge(n) : navigator.clearAppBadge(); } catch (e) {}
    }

    // ===================== الرسائل =====================
    async function loadInbox() {
        S.state = 'loading';
        if (!S.items.length && S.tab === 'inbox' && !S.open) render();
        const r = await api('/dev/inbox', { archived: S.archived });
        if (!r.ok) { if (r.status !== 401) { S.state = 'error'; if (S.tab === 'inbox' && !S.open) render(); } return; }
        S.items = r.data.items || []; S.counts = r.data.counts || null; S.avg = r.data.avg || 0; S.state = 'ok';
        if (S.tab === 'inbox' && !S.open) render(); else paintBadge();
    }
    function replyWho(m) {
        if (!m.replyBy) return 'صاحب التطبيق'; // ردود قبل تطبيق الفريق
        return m.replyBy === me.id ? 'إنت' : (m.replyName || 'حدا من الفريق');
    }
    // ===================== التثبيت (النسخة 2، متل مُذكّر) =====================
    // زر «تثبيت التطبيق» بيثبّت بكبسة إذا المتصفح بيسمح، وتحتو الطريقة لجهازك. بمتصفحات الشركات (شاومي، أوبو، فيفو، هواوي…)
    // وجوّا التطبيقات بأندرويد الزر بيصير «افتح بـ Chrome»، لأنها ما بتعرف تثبّت. ولأندرويد «ما طلعت الأيقونة؟» بخطوات كل شركة.
    const UA = navigator.userAgent || '';
    const ANDROID = /Android/i.test(UA), SAMSUNG = /SamsungBrowser/i.test(UA);
    const IN_APP = /FBAN|FBAV|Instagram|WhatsApp|Line\/|Snapchat|TikTok|; wv\)/i.test(UA);
    const OTHER = ANDROID && !IN_APP && !SAMSUNG && /MiuiBrowser|Mint Browser|HeyTapBrowser|OppoBrowser|RealmeBrowser|VivoBrowser|HuaweiBrowser|HONORBrowser|HiBrowser|UCBrowser|UCWEB|Quark\/|QQBrowser|baiduboxapp|SogouMobileBrowser|PHX\/|Opera Mini|Puffin/i.test(UA);
    const PLAT = IN_APP ? 'inapp' : isIOS() ? 'ios' : SAMSUNG ? 'samsung' : OTHER ? 'other' : ANDROID ? 'android' : 'desktop';
    const TO_CHROME = ANDROID && (OTHER || IN_APP);
    const kb = s => `<i class="k">${s}</i>`;
    const SHARE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/></svg>';
    const STEPS = {
        android: [`اكبس القائمة ${kb('⋮')} فوق بـ Chrome`, 'اختار <b>«تثبيت التطبيق»</b> أو «إضافة إلى الشاشة الرئيسية»', 'اكبس <b>«تثبيت»</b> وبيطلع بين تطبيقاتك'],
        samsung: [`اكبس القائمة ${kb('≡')} تحت`, 'اختار <b>«إضافة صفحة إلى»</b>', 'وبعدين <b>«الشاشة الرئيسية»</b>'],
        ios: ['افتحو بـ <b>Safari</b>', `اكبس زر المشاركة ${kb(SHARE)}`, 'اختار <b>«إضافة إلى الشاشة الرئيسية»</b> وبعدين «إضافة»'],
        desktop: ['اكبس أيقونة التثبيت بآخر شريط العنوان', `أو من القائمة ${kb('⋮')} اختار <b>«تثبيت»</b>`, 'وبيفتح كتطبيق لحالو'],
        other: ['اكبس <b>«افتح بـ Chrome»</b>، هالمتصفح ما بيثبّت تطبيقات', 'وبـ Chrome اكبس <b>«تثبيت التطبيق»</b>', `ما عندك Chrome؟ من قائمة هالمتصفح ${kb('⋮')} اختار «إضافة إلى الشاشة الرئيسية»`],
        inapp: ANDROID ? ['اكبس <b>«افتح بـ Chrome»</b>', 'وهونيك اكبس <b>«تثبيت التطبيق»</b>', 'إذا ما انفتح: الرابط منسوخ، الصقو بـ Chrome']
            : ['اكبس <b>«تثبيت التطبيق»</b> لينتسخ الرابط', 'افتحو بـ <b>Safari</b>', 'وكمّل من هونيك']
    };
    const BRANDS = [
        ['xiaomi', 'شاومي وريدمي وبوكو', 'اكبس مطوّل على أيقونة Chrome ← <b>معلومات التطبيق</b> ← <b>أذونات أخرى</b> ← اسمح بـ <b>«اختصارات الشاشة الرئيسية»</b>، وارجع ثبّت من جديد.'],
        ['oppo', 'أوبو وريلمي وون بلس', 'اكبس مطوّل على أيقونة Chrome ← <b>معلومات التطبيق</b> ← <b>الأذونات</b> ← اسمح بـ <b>«إنشاء اختصارات على الشاشة الرئيسية»</b> إذا موجود، وثبّت من جديد.'],
        ['vivo', 'فيفو', 'الإعدادات ← التطبيقات ← Chrome ← الأذونات ← اسمح بـ <b>«اختصارات سطح المكتب»</b>، وثبّت من جديد.'],
        ['huawei', 'هواوي وهونر', 'إذا عندك Chrome: الإعدادات ← التطبيقات ← Chrome ← الأذونات ← اسمح بـ <b>«إنشاء اختصارات»</b>. وإذا ما عندك: من متصفح هواوي القائمة ← <b>«إضافة إلى الشاشة الرئيسية»</b>.'],
        ['transsion', 'تكنو وإنفينكس وآيتل', 'الإعدادات ← التطبيقات ← Chrome ← الأذونات ← اسمح بـ <b>«اختصارات الشاشة الرئيسية»</b>، وثبّت من جديد.'],
        ['all', 'باقي الجوالات', 'يمكن يكون بقائمة كل التطبيقات مو عالشاشة الرئيسية: اسحب لفوق ودوّر عليه.']
    ];
    let brand = '';
    const brandOf = s => /xiaomi|redmi|poco|miui|\bmi \d|^M\d{4}[A-Z0-9]+$|^2\d{6,}[A-Z0-9]*$/i.test(s) ? 'xiaomi'
        : /oppo|heytap|realme|oneplus|^RMX\d|^CPH\d|^P[C-H][A-Z]{2}\d+|^[A-Z]{2}\d{4}$/i.test(s) ? 'oppo'
        : /vivo|iqoo|^V\d{4}[A-Z]?$|^I\d{4}$/i.test(s) ? 'vivo'
        : /huawei|honor|^[A-Z]{3}-[A-Z]{1,2}\d{2}[A-Z]?$/i.test(s) ? 'huawei'
        : /tecno|infinix|itel/i.test(s) ? 'transsion' : '';
    async function detectBrand() {
        if (!ANDROID) return;
        const m = UA.match(/Android [^;)]*;(?: [a-z]{2}[-_][a-z]{2};)? ([^;)]+?)(?: Build\/|\))/i);
        brand = brandOf(UA) || (m ? brandOf(m[1].trim()) : '');
        try { if (!brand && navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) brand = brandOf(((await navigator.userAgentData.getHighEntropyValues(['model'])).model || '').trim()); } catch (e) {}
        if (brand) paintInstall();
    }
    let installed = false; // ثبّت هلّق من الزر
    const chromeIntent = () => { const u = new URL(APP_URL); return `intent://${u.host}${u.pathname}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=com.android.chrome')};end`; };
    // where: login (بشاشة الدخول) · inbox (فوق الرسائل، فيها «لاحقًا») · sheet (بحسابي)
    function installHTML(where = 'inbox') {
        if (standalone() || (where === 'inbox' && store.get(K.inst) === '1')) return '';
        const label = TO_CHROME ? 'افتح بـ Chrome' : 'تثبيت التطبيق';
        const lead = installed ? 'جارٍ التثبيت… بيطلع بين تطبيقاتك خلال ثواني'
            : TO_CHROME ? 'هالمتصفح ما بيثبّت تطبيقات، افتحو بـ Chrome وثبّتو من هونيك'
            : isIOS() ? 'بيفتح بكبسة متل أي تطبيق. عالآيفون إشعار الرسائل بيشتغل بس بعد التثبيت'
            : 'بيفتح بكبسة متل أي تطبيق، وبيوصلك إشعار بكل رسالة جديدة';
        const help = PLAT === 'android' ? `<details class="inst-help"${installed && brand ? ' open' : ''}><summary>ثبّتو وما طلعت الأيقونة؟</summary><div>${BRANDS.map(([id, name, tip]) =>
            `<details class="inst-brand"${id === (brand || 'all') ? ' open' : ''}><summary>${name}${id === brand ? '<i>جوالك</i>' : ''}</summary><p>${tip}</p></details>`).join('')}</div></details>` : '';
        return `<section class="inst" data-inst="${where}" aria-label="تثبيت التطبيق">
            <div class="inst-head"><img src="icons/icon-192.png" alt="" width="52" height="52" decoding="async"><span><b>ثبّت تطبيق الفريق</b><small>${lead}</small></span></div>
            ${installed ? '' : `<div class="inst-actions"><button class="btn inst-go${deferredInstall ? ' is-ready' : ''}" type="button" data-act="install"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/></svg>${label}</button>${where === 'inbox' ? '<button class="btn soft" type="button" data-act="install-hide">لاحقًا</button>' : ''}</div>
            <p class="inst-how">${deferredInstall ? 'أو بالطريقة اليدوية:' : 'الطريقة:'}</p>
            <ol class="inst-steps">${STEPS[PLAT].map(s => `<li><span>${s}</span></li>`).join('')}</ol>`}
            ${help}
        </section>`;
    }
    // بنرسم البطاقة من جديد وين ما كانت (لما يجهز التثبيت بكبسة، أو بعد التثبيت، أو لما نعرف الشركة)
    function paintInstall() {
        const li = $('login-inst'); if (li) li.innerHTML = installHTML('login');
        if (tok && S.tab === 'inbox' && !S.open) render();
        const sh = $('sheet-body').querySelector('[data-inst="sheet"]'); if (sh) sh.outerHTML = installHTML('sheet');
    }
    async function doInstall(btn) {
        if (deferredInstall) {
            const p = deferredInstall; deferredInstall = null;
            p.prompt();
            try { if ((await p.userChoice).outcome === 'accepted') { installed = true; toast(['xiaomi', 'oppo', 'vivo', 'huawei', 'transsion'].includes(brand) ? 'جارٍ التثبيت… إذا ما طلعت الأيقونة شوف الخطوات تحت' : 'جارٍ التثبيت… بيطلع بين تطبيقاتك'); } } catch (e) {}
            paintInstall();
            return;
        }
        if (TO_CHROME) {
            try { navigator.clipboard.writeText(APP_URL).catch(() => {}); } catch (e) {}
            toast('عم يفتح Chrome… إذا ما انفتح، الرابط منسوخ: الصقو فيه');
            location.href = chromeIntent();
            return;
        }
        if (IN_APP) {
            try { await navigator.clipboard.writeText(APP_URL); toast('انتسخ الرابط، افتحو بـ Safari وثبّتو من هونيك'); } catch (e) { toast('افتح الرابط بـ Safari: ' + APP_URL); }
        } else toast(isIOS() ? 'عالآيفون: اتبع الخطوات تحت الزر ↓' : 'اتبع الخطوات تحت الزر ↓');
        const ol = btn.closest('.inst')?.querySelector('.inst-steps');
        if (ol) { ol.classList.remove('pulse'); void ol.offsetWidth; ol.classList.add('pulse'); ol.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    }
    function inboxHTML() {
        const c = S.counts, sel = S.archived ? 'archived' : S.filter;
        const lead = c ? `${c.unread ? msgs(c.unread) : 'ما في رسائل جديدة'}${S.avg ? `، ومتوسط التقييم ${num(S.avg)} من 5` : ''}`
            : S.state === 'error' ? 'تعذّر التحميل' : 'جارٍ التحميل…';
        const list = S.items.filter(m => S.archived || S.filter === 'all' || m.type === S.filter);
        const empty = S.archived ? 'الأرشيف فاضي.' : S.filter !== 'all' ? 'ما في رسائل من هالنوع.'
            : 'ما في رسائل لسا. أول ما حدا يبعت ملاحظة من مُذكّر بتطلع هون.';
        const chips = FILTERS.map(([k, l]) => {
            const n = c ? (k === 'archived' ? c.archived : c[k]) || 0 : 0;
            return `<button class="chip" type="button" data-f="${k}" aria-pressed="${k === sel}">${l}${n ? `<span class="n">${num(n)}</span>` : ''}</button>`;
        }).join('');
        let body;
        if (S.state === 'error' && !S.items.length) body = `<div class="empty"><p>ما قدرنا نجيب الرسائل. تأكد من النت.</p><button class="btn soft" type="button" data-act="retry">جرّب مرة تانية</button></div>`;
        else if (S.state === 'loading' && !S.items.length) body = '<div class="list"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div>';
        else if (!list.length) body = `<div class="empty"><p>${empty}</p></div>`;
        else body = `<div class="list">${list.map(m => `<button class="row${m.read ? '' : ' new'}" type="button" data-open="${esc(m.id)}">
                <span class="meta">${m.read ? '' : '<i class="dot" aria-label="جديدة"></i>'}${tagHTML(m.type)}${starsHTML(m.stars)}<time>${when(m.at)}</time></span>
                <p>${esc(m.text)}</p>${m.reply ? `<span class="by">${replyWho(m) === 'إنت' ? 'ردّيت إنت' : 'ردّ ' + esc(replyWho(m))}</span>` : ''}</button>`).join('')}</div>`;
        return `${installHTML()}<p class="lead">${lead}</p><div class="chips" role="group" aria-label="تصفية الرسائل">${chips}</div>${body}`;
    }

    // ر2 الرسالة كمحادثة
    function infoLines(i = {}) {
        return [
            [INFO.platform[i.platform], i.os, i.browser].filter(Boolean).join('، '),
            [i.build ? 'الإصدار ' + num(i.build) : '', i.installed === true ? 'مثبّت' : i.installed === false ? 'من المتصفح' : '', INFO.theme[i.theme], INFO.size[i.size], i.w ? 'عرض الشاشة ' + num(i.w) : ''].filter(Boolean).join('، '),
            [INFO.notif[i.notif], INFO.push[i.push]].filter(Boolean).join('، ')
        ].filter(Boolean);
    }
    function openMsg(id) {
        const m = S.items.find(x => x.id === id);
        if (!m) return;
        S.open = id; S.editing = false;
        history.pushState({ msg: id }, '');
        if (!m.read) {
            m.read = true;
            if (S.counts && S.counts.unread) S.counts.unread--;
            api('/dev/msg', { id, action: 'read' });
        }
        render(); scrollTo(0, 0);
    }
    function closeMsg(fromPop = false) {
        if (!S.open) return;
        S.open = '';
        if (!fromPop && history.state && history.state.msg) { history.back(); return; }
        render();
    }
    function renderMsg(v) {
        const m = S.items.find(x => x.id === S.open);
        if (!m) { S.open = ''; render(); return; }
        $('title').textContent = TYPES[m.type] || 'رسالة';
        const lines = infoLines(m.info);
        const answer = can('ans');
        const reply = m.reply ? `<div class="bub t">${esc(m.reply)}<small>${esc(replyWho(m))} · ${when(m.replyAt)} · بيوصل باسم «فريق مُذكّر»</small></div>` : '';
        v.innerHTML = `<div class="meta">${tagHTML(m.type)}${starsHTML(m.stars)}<time>${when(m.at)}</time></div>
            ${lines.length ? `<details class="devinfo"><summary>الجهاز</summary><div>${lines.map(l => `<span>${esc(l)}</span>`).join('')}</div></details>` : ''}
            <div class="thread"><div class="bub u">${esc(m.text)}<small>من مستخدم بمُذكّر · ${when(m.at)}</small></div>${reply}</div>
            <div class="msg-actions"><button class="btn soft" type="button" data-act="copy-msg">نسخ النص</button>${answer ? `${m.reply && !S.editing ? '<button class="btn soft" type="button" data-act="edit">عدّل الرد</button>' : ''}<button class="btn soft" type="button" data-act="${m.arch ? 'unarchive' : 'archive'}">${m.arch ? 'رجّعها من الأرشيف' : 'أرشفة'}</button>` : ''}</div>
            ${answer ? `${!m.reply || S.editing ? `<form class="composer" id="composer" novalidate>
                <label class="vh" for="reply-text">ردّك</label>
                <textarea id="reply-text" rows="1" maxlength="1000" placeholder="${m.reply ? 'عدّل الرد… (بيبدّل القديم)' : 'اكتب ردّك… بيوصل جوّا مُذكّر'}">${S.editing ? esc(m.reply) : ''}</textarea>
                <button class="send" type="submit" aria-label="إرسال الرد" disabled>${ICON.send}</button></form>
                <p class="note">بيوصل للمستخدم باسم «فريق مُذكّر»، والفريق بيشوف إنو إنت يلي ردّيت</p>` : ''}`
            : '<p class="note">إنت «قارئ»: بتقرا الرسائل بس، والرد للمجاوب والمشرف</p>'}`;
        const f = $('composer');
        if (f) {
            const ta = $('reply-text'), send = f.querySelector('.send');
            const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; send.disabled = ta.value.trim().length < 2; };
            ta.addEventListener('input', grow); grow();
            f.addEventListener('submit', e => { e.preventDefault(); sendReply(ta.value); });
            if (S.editing) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
        }
    }
    async function sendReply(text) {
        text = text.trim();
        if (text.length < 2) return;
        const f = $('composer'); if (f) f.querySelector('.send').disabled = true;
        const r = await api('/dev/msg', { id: S.open, action: 'reply', text });
        if (!r.ok) { toast(r.status === 403 ? 'دورك ما بيسمح بالرد' : 'ما وصل الرد، جرّب كمان شوي'); if (f) f.querySelector('.send').disabled = false; return; }
        const i = S.items.findIndex(x => x.id === S.open); if (i >= 0) S.items[i] = r.data.item;
        S.editing = false; toast('وصل الرد ✓ رح يشوفو بمُذكّر'); render();
    }
    async function moveMsg(action) {
        const r = await api('/dev/msg', { id: S.open, action });
        if (!r.ok) { toast('ما زبط، جرّب كمان شوي'); return; }
        S.items = S.items.filter(x => x.id !== S.open);
        if (S.counts) { S.counts.archived += action === 'archive' ? 1 : -1; }
        toast(action === 'archive' ? 'انأرشفت' : 'رجعت للرسائل');
        closeMsg(); loadInbox();
    }

    // ===================== الأرقام والفحص =====================
    async function loadNums() {
        const [s, h, live] = await Promise.all([
            api('/dev/stats'), S.tab === 'nums' ? api('/dev/health') : Promise.resolve(null),
            S.tab === 'nums' ? fetch(LIVE_VERSION + '?t=' + Date.now(), { cache: 'no-store' }).then(x => x.json()).catch(() => null) : Promise.resolve(null)
        ]);
        if (s.ok) S.stats = s.data;
        if (h && h.ok) S.health = h.data;
        if (live) S.live = Number(live.build) || 0;
        if (!S.open && (S.tab === 'nums' || S.tab === 'ann')) {
            if (S.tab === 'ann' && $('ann-form')) { $('ann-now').innerHTML = annNowHTML(); return; } // ما منمسح يلي عم تكتبو
            render();
        }
    }
    function numsHTML() {
        const s = S.stats;
        if (!s) return '<div class="tiles"><div class="skel"></div><div class="skel"></div><div class="skel"></div><div class="skel"></div></div>';
        const fb = s.feedback || {};
        const tiles = [[num(s.users || 0), 'مستخدم بالمجموع'], [num(s.active30 || 0), 'فتحوه آخر 30 يوم'], [num(s.subscribers || 0), 'مشترك بالإشعارات'], [num(s.withReminders || 0), 'عندهم تذكيرات'],
            [num(fb.unread || 0), 'رسائل جديدة'], [fb.avg ? num(fb.avg) : '—', 'متوسط التقييم'], [num(s.widgets || 0), 'أدوات برّا التطبيق'], [s.lastRun ? when(Date.parse(s.lastRun)) : '—', 'آخر إرسال إشعارات']];
        const a = s.active || null;
        const bars = (title, sub, rows) => {
            const max = Math.max(1, ...rows.map(r => r.n));
            return `<section class="panel"><h2>${title} <small>${sub}</small></h2>${rows.map(r => `<div class="bar"><span><b>${esc(r.label)}</b><small>${devices(r.n)}</small></span><span class="trk"><i style="width:${Math.round(r.n / max * 100)}%"></i></span></div>`).join('')}</section>`;
        };
        const places = a && a.places && a.places.length ? a.places.map(p => ({ label: tzName(p.tz), n: p.n })) : (s.timezones || []).map(t => ({ label: tzName(t.tz), n: t.n }));
        const modeRows = a ? [{ label: 'مثبّتين التطبيق', n: a.mode.app }, { label: 'من الموقع بالمتصفح', n: a.mode.web }, { label: 'ما منعرف (نسخة قديمة)', n: a.mode.unknown }].filter(r => r.n) : [];
        const osRows = a ? [{ label: 'آيفون', n: a.os.ios }, { label: 'أندرويد', n: a.os.android }, { label: 'كمبيوتر', n: a.os.desktop }, { label: 'غير هيك', n: a.os.other }].filter(r => r.n) : [];
        return `<div class="tiles">${tiles.map(([v, l]) => `<div class="tile"><b>${esc(v)}</b><small>${l}</small></div>`).join('')}</div>
            ${healthHTML()}
            ${modeRows.length ? bars('مثبّت أو من الموقع', 'آخر 30 يوم', modeRows) : ''}
            ${osRows.length ? bars('الأجهزة', 'آخر 30 يوم', osRows) : ''}
            ${places.length ? bars('وين الناس', 'حسب المنطقة الزمنية', places) : ''}
            <p class="fine">الأرقام من سيرفر مُذكّر، بلا أسماء ولا إيميلات ولا أي شي بيعرّف الشخص.</p>`;
    }
    function healthHTML() {
        const h = S.health;
        if (!h) return '<section class="panel"><h2>الفحص</h2><p class="fine">جارٍ الفحص…</p></section>';
        const recent = !!h.lastRun && Date.now() - Date.parse(h.lastRun) < 2 * 3600e3;
        const rows = [
            [h.vapid, 'الإشعارات', h.vapid ? 'شغّالة' : 'ناقص مفتاح VAPID_PRIVATE_JWK'],
            [h.ai, 'المساعد الذكي', h.ai ? 'شغّال' : 'ناقص ربط Workers AI باسم AI'],
            [true, 'التخزين', 'شغّال'],
            [recent, 'آخر إرسال إشعارات', h.lastRun ? when(Date.parse(h.lastRun)) + (h.lastFailed ? `، و${num(h.lastFailed)} ما وصلوا` : '') : 'لسا ما انبعت شي'],
            [true, 'نسخة مُذكّر المنشورة', S.live ? 'الإصدار ' + num(S.live) : 'ما قدرنا نعرف'],
            [h.devsubs > 0, 'إشعار الرسائل للفريق', h.devsubs ? `مفعّل على ${devices(h.devsubs)}` : 'ولا جهاز مفعّل']
        ];
        // سيرفر 31: وين محفوظين المشتركين، وقديش بيلحق يبعت
        if (h.store) {
            const gen = h.count ? h.count.general : null;
            rows.splice(2, 1,
                [h.store === 'd1' && !h.migErr, 'التخزين', h.store === 'd1'
                    ? (h.migErr ? 'D1، بس صار خطأ بالنقل. افحص من جديد بعد دقيقة' : h.moving ? `D1، وعم ينقل المشتركين من KV (${num(h.moved)} لهلّق)` : 'D1، قاعدة البيانات الكبيرة')
                    : 'KV بس، وهاد بيتحمّل ناس قلال. فعّل D1 (الخطوات بملف السيرفر)'],
                [!h.full && !h.waiting && !(gen > h.perQuarter), 'قديش بيلحق', `${num(h.budget)} إشعار بالدقيقة، يعني الذكر العام لـ ${num(h.perQuarter)} شخص كل ربع ساعة`
                    + (gen !== null ? `، والمفعّلين هلّق ${num(gen)}` : '')
                    + (h.full || gen > h.perQuarter ? '. وصلنا للحد: في ناس الذكر العام عم يوصلهن أبطأ' : '')
                    + (h.waiting ? `، و${num(h.waiting)} تذكير تأخّر دقيقة` : '')]
            );
            if (h.err) rows.push([false, 'خطأ بآخر تشغيل', h.err]);
        }
        return `<section class="panel"><h2>الفحص</h2>${rows.map(([ok, n, s]) => `<div class="check${ok ? '' : ' warn'}"><i aria-hidden="true"></i><span>${n}</span><em>${esc(s)}</em></div>`).join('')}
            <button class="btn soft" type="button" data-act="recheck">${ICON.refresh}افحص من جديد</button></section>`;
    }

    // ===================== الإعلان =====================
    function annNowHTML() {
        const a = S.stats && S.stats.announce;
        if (!a) return S.stats ? '<p class="lead">ما في إعلان شغّال هلّق.</p>' : '<p class="lead">جارٍ التحميل…</p>';
        const until = a.until ? ' · لحد ' + new Date(a.until).toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' }) : ' · لحد ما تشيلو';
        return `<section class="ann-now"><small>الإعلان الشغّال هلّق${until}</small><b>${esc(a.title)}</b><p>${esc(a.text)}</p><button class="btn soft" type="button" data-act="ann-clear">إيقاف الإعلان</button></section>`;
    }
    function annHTML() {
        const s = S.stats;
        return `<div id="ann-now">${annNowHTML()}</div>
            <form class="form panel" id="ann-form" novalidate>
                <label for="ann-title">العنوان</label>
                <input class="field" id="ann-title" type="text" maxlength="60" placeholder="مثلًا: تحديث جديد بمُذكّر">
                <label for="ann-text">النص</label>
                <textarea class="field" id="ann-text" rows="4" maxlength="400" placeholder="شو بدك تقول للناس؟"></textarea>
                <span class="lbl" id="ann-days-l">بيضل ظاهر</span>
                <div class="seg" id="ann-days" role="radiogroup" aria-labelledby="ann-days-l">
                    <button type="button" role="radio" data-days="1" aria-checked="false">يوم</button><button type="button" role="radio" data-days="7" aria-checked="true">أسبوع</button><button type="button" role="radio" data-days="0" aria-checked="false">لحد ما شيلو</button>
                </div>
                <div class="switch-row"><span><b id="ann-push-l">وكمان إشعار لكل المشتركين</b><small>${s ? num(s.subscribers || 0) + ' مشترك، ' : ''}بيوصلهن خلال دقايق</small></span><button type="button" class="sw" role="switch" aria-checked="false" aria-labelledby="ann-push-l" id="ann-push"></button></div>
                <p class="status" id="ann-status" role="alert"></p>
                <button class="btn wide" type="submit" id="ann-send">نشر الإعلان</button>
                <p class="fine">بيطلع للكل ببطاقة بأول الرئيسية بمُذكّر لحد ما يسكّروها، والإعلان الجديد بيشيل القديم.</p>
            </form>`;
    }
    let annConfirm = false;
    async function publish() {
        const title = $('ann-title').value.trim(), text = $('ann-text').value.trim(), st = $('ann-status');
        const days = Number(($('ann-days').querySelector('[aria-checked="true"]') || {}).dataset?.days ?? 7);
        const push = $('ann-push').getAttribute('aria-checked') === 'true';
        st.className = 'status err';
        if (title.length < 2 || text.length < 2) { st.textContent = 'اكتب عنوان ونص'; return; }
        if (push && !annConfirm) { annConfirm = true; st.className = 'status'; st.textContent = 'الإشعار رح يوصل لكل المشتركين. اكبس «نشر» كمان مرة للتأكيد'; return; }
        annConfirm = false; $('ann-send').disabled = true; st.className = 'status'; st.textContent = 'عم ننشر…';
        const r = await api('/dev/announce', { title, text, days, push });
        $('ann-send').disabled = false;
        if (!r.ok) { st.className = 'status err'; st.textContent = 'ما زبط النشر، جرّب كمان شوي'; return; }
        if (S.stats) S.stats.announce = r.data.announce;
        $('ann-title').value = ''; $('ann-text').value = ''; $('ann-push').setAttribute('aria-checked', 'false');
        st.className = 'status ok'; st.textContent = push ? 'انتشر ✓ والإشعارات عم تنبعت بالدفعات' : 'انتشر ✓';
        $('ann-now').innerHTML = annNowHTML();
    }

    // ===================== الفريق (ف1) =====================
    async function loadTeam() {
        const [t, d] = await Promise.all([api('/team/list'), api('/dev/devices')]);
        if (t.ok) S.team = t.data.members || [];
        if (d.ok) S.devs = d.data;
        if (S.tab === 'team' && !S.open) render();
    }
    function personLine(m) {
        if (!m.bound) return 'لسا ما دخل';
        return [m.label, m.last ? 'آخر فتح ' + when(m.last) : '', m.replies ? `ردّ على ${num(m.replies)}` : ''].filter(Boolean).join('، ');
    }
    function teamHTML() {
        const t = S.team, d = S.devs;
        const people = !t ? '<div class="list"><div class="skel"></div><div class="skel"></div></div>'
            : !t.length ? '<div class="empty"><p>لسا ما في حدا بالفريق. اعمل رمز لأول شخص وابعتلو ياه.</p></div>'
            : `<div class="list">${t.map(m => `<div class="person"><span class="av" aria-hidden="true">${initial(m.name)}</span><span class="who"><b>${esc(m.name)}</b><span class="role ${m.role}">${ROLE_AR[m.role]}</span><small>${esc(personLine(m))}</small></span><button class="more" type="button" data-person="${esc(m.id)}" aria-label="خيارات ${esc(m.name)}">⋯</button></div>`).join('')}</div>`;
        const devs = d ? `<h2 class="section-h">أجهزتك (بكلمة السر، ${devices(d.max || 2)} بالأكتر)</h2>
            <div class="list">${d.devices.map(x => `<div class="person"><span class="av" aria-hidden="true">${x.me ? '✓' : '•'}</span><span class="who"><b>${esc(x.label)}</b><small>${x.me ? 'هالجهاز · ' : ''}آخر فتح ${when(x.last || x.at)}</small></span>${x.me ? '' : `<button class="btn soft" type="button" data-devrm="${esc(x.id)}">شيل</button>`}</div>`).join('')}</div>
            <p class="fine">إذا ضاع جوالك: غيّر DEV_KEY بـ Cloudflare، وبتنمسح أجهزتك، والفريق بيرجع يدخل بنفس رموزو.</p>` : '';
        return `<button class="btn wide" type="button" data-act="new-code">${ICON.plus}رمز جديد</button>${people}${devs}`;
    }

    // ===================== النوافذ من تحت =====================
    let sheetClose = null;
    function openSheet(html, onClose) {
        $('sheet-body').innerHTML = `<i class="grab" aria-hidden="true"></i>${html}`;
        $('sheet').hidden = false; sheetClose = onClose || null;
        const f = $('sheet-body').querySelector('input, textarea, button:not([data-close])');
        if (f) setTimeout(() => f.focus(), 60);
    }
    function closeSheet() {
        if ($('sheet').hidden) return;
        $('sheet').hidden = true; $('sheet-body').innerHTML = '';
        const c = sheetClose; sheetClose = null; if (c) c();
    }
    const roleSeg = (sel, id = 'role-seg') => `<div class="seg" id="${id}" role="radiogroup" aria-label="الدور">${['read', 'ans', 'adm'].map(r => `<button type="button" role="radio" data-role="${r}" aria-checked="${r === sel}">${ROLE_AR[r]}</button>`).join('')}</div><p class="fine" id="${id}-hint">${ROLE_HINT[sel]}</p>`;
    const pickedRole = id => ($(id).querySelector('[aria-checked="true"]') || {}).dataset?.role || 'read';
    function newCodeSheet() {
        openSheet(`<h2 id="sheet-h">رمز جديد</h2>
            <form class="form" id="new-form" novalidate>
                <label for="new-name">الاسم</label>
                <input class="field" id="new-name" maxlength="30" placeholder="مثلًا: أحمد" autocomplete="off">
                <span class="lbl">الدور</span>${roleSeg('read')}
                <p class="status" id="new-status" role="alert"></p>
                <button class="btn wide" type="submit">اعمل الرمز</button>
                <button class="btn soft wide" type="button" data-close>إلغاء</button>
            </form>`);
        $('new-form').addEventListener('submit', async e => {
            e.preventDefault();
            const name = $('new-name').value.trim(), st = $('new-status');
            if (!name) { st.className = 'status err'; st.textContent = 'اكتب اسمو'; return; }
            st.className = 'status'; st.textContent = 'عم نعمل الرمز…';
            const r = await api('/team/create', { name, role: pickedRole('role-seg') });
            if (!r.ok) { st.className = 'status err'; st.textContent = r.data.error === 'full' ? `الفريق مليان (${num(r.data.max)} بالأكتر)` : 'ما زبط، جرّب كمان شوي'; return; }
            S.team = [...(S.team || []), r.data.member]; render();
            codeSheet(r.data.member, r.data.code);
        });
    }
    function codeSheet(m, code) {
        const msg = `أهلين ${m.name}، هاد رمز دخولك لفريق مُذكّر (${ROLE_AR[m.role]}):\n${code}\n\nافتح التطبيق وثبّتو عالشاشة:\n${APP_URL}`;
        openSheet(`<h2 id="sheet-h">رمز ${esc(m.name)} جاهز</h2>
            <div class="bigcode" id="big-code">${esc(code)}</div>
            <div class="msg-actions"><button class="btn" type="button" data-act="copy-code" style="flex:1">نسخ</button>${navigator.share ? '<button class="btn soft" type="button" data-act="share-code" style="flex:1">مشاركة</button>' : ''}</div>
            <p class="note">انسخو أو شاركو هلّق: ما رح يطلع مرة تانية. بيشتغل على جهاز واحد، أول جهاز بيدخل فيه.</p>
            <button class="btn soft wide" type="button" data-close>تمام</button>`);
        $('sheet-body').dataset.code = code; $('sheet-body').dataset.msg = msg;
    }
    function personSheet(id) {
        const m = (S.team || []).find(x => x.id === id);
        if (!m) return;
        openSheet(`<h2 id="sheet-h">${esc(m.name)} <span class="role ${m.role}">${ROLE_AR[m.role]}</span></h2>
            <p class="lead">${esc(personLine(m))}</p>
            <div class="menu">
                <button type="button" data-p="role">تغيير الدور</button>
                ${m.bound ? '<button type="button" data-p="unbind">فك الجهاز (إذا غيّر جوالو)</button>' : ''}
                <button type="button" class="danger" data-p="revoke">إلغاء الرمز</button>
            </div>
            <button class="btn soft wide" type="button" data-close>رجوع</button>`);
        $('sheet-body').dataset.id = id;
    }
    function personStep(step) {
        const id = $('sheet-body').dataset.id, m = (S.team || []).find(x => x.id === id);
        if (!m) return closeSheet();
        const body = step === 'role' ? `<h2 id="sheet-h">دور ${esc(m.name)}</h2>${roleSeg(m.role)}<button class="btn wide" type="button" data-p="role-save">حفظ</button>`
            : step === 'unbind' ? `<h2 id="sheet-h">فك جهاز ${esc(m.name)}؟</h2><p class="lead">الجهاز الحالي بيطلع، وبيقدر يدخل بنفس الرمز من جهاز جديد. إذا ما عندو الرمز، الغيه واعملّو واحد جديد.</p><button class="btn wide" type="button" data-p="unbind-yes">فك الجهاز</button>`
            : `<h2 id="sheet-h">إلغاء رمز ${esc(m.name)}؟</h2><p class="lead">ما عاد يقدر يفوت أبدًا، وما بيتأثر حدا تاني بالفريق. ما فيك ترجّعو، بس فيك تعملّو رمز جديد.</p><button class="btn danger wide" type="button" data-p="revoke-yes">إلغاء الرمز</button>`;
        $('sheet-body').innerHTML = `<i class="grab" aria-hidden="true"></i>${body}<button class="btn soft wide" type="button" data-close>رجوع</button>`;
        $('sheet-body').dataset.id = id;
    }
    async function personDo(what) {
        const id = $('sheet-body').dataset.id;
        const body = what === 'role-save' ? { id, role: pickedRole('role-seg') } : what === 'unbind-yes' ? { id, unbind: true } : { id, revoke: true };
        const r = await api('/team/update', body);
        if (!r.ok) { toast('ما زبط، جرّب كمان شوي'); return; }
        S.team = r.data.members; closeSheet(); render();
        toast(what === 'role-save' ? 'تغيّر الدور ✓' : what === 'unbind-yes' ? 'انفكّ الجهاز ✓' : 'انلغى الرمز ✓');
    }

    // حسابي: الإشعار والخروج
    function meSheet() {
        const pushOn = store.get(K.push) === '1';
        openSheet(`<h2 id="sheet-h">${esc(me.name)} <span class="role ${me.role}">${ROLE_AR[me.role]}</span></h2>
            <div class="switch-row"><span><b id="push-l">إشعار برسالة جديدة</b><small>على هالجهاز${isIOS() && !standalone() ? '، وعالآيفون لازم تثبّت التطبيق أول' : ''}</small></span><button type="button" class="sw" role="switch" aria-checked="${pushOn}" aria-labelledby="push-l" data-act="push"></button></div>
            ${pushOn ? '<button class="btn soft wide" type="button" data-act="push-test">إشعار تجريبي لهالجهاز</button>' : ''}
            ${installHTML('sheet')}
            <button class="btn danger wide" type="button" data-act="logout">قفل التطبيق على هالجهاز</button>
            <p class="fine">${me.role === 'owner' ? 'بترجع تفوت بكلمة السر.' : 'بترجع تفوت بنفس رمزك على هالجهاز بس.'} · فريق مُذكّر، النسخة ${VERSION}</p>`);
    }

    // ===================== الإشعارات =====================
    const pushOK = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    const vapidKey = () => Uint8Array.from(atob(VAPID.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    async function getSub(create) {
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub && create) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey() });
        return sub;
    }
    async function setPush(on) {
        if (!pushOK()) { toast(isIOS() && !standalone() ? 'عالآيفون: ثبّت التطبيق أول (مشاركة ← إضافة إلى الشاشة الرئيسية)' : 'هالمتصفح ما بيدعم الإشعارات'); return false; }
        try {
            if (on) {
                if ((await Notification.requestPermission()) !== 'granted') { toast('لازم تسمح بالإشعارات من إعدادات المتصفح'); return false; }
                const sub = await getSub(true);
                const r = await api('/dev/notify', { sub: sub.toJSON(), on: true });
                if (!r.ok) { toast('ما زبط التفعيل، جرّب كمان شوي'); return false; }
                store.set(K.push, '1'); store.set(K.pushAt, String(Date.now()));
                toast('رح يوصلك إشعار بكل رسالة جديدة ✓');
                return true;
            }
            const sub = await getSub(false);
            if (sub) { await api('/dev/notify', { sub: sub.toJSON(), on: false }); await sub.unsubscribe().catch(() => {}); }
            store.del(K.push);
            return true;
        } catch (e) { toast('ما زبط، جرّب كمان شوي'); return false; }
    }
    // مرة باليوم منبعت الاشتراك من جديد (إذا تغيّر من المتصفح)
    async function refreshPush() {
        if (!pushOK() || Notification.permission !== 'granted' || Date.now() - Number(store.get(K.pushAt) || 0) < 864e5) return;
        try { const sub = await getSub(true); const r = await api('/dev/notify', { sub: sub.toJSON(), on: true }); if (r.ok) store.set(K.pushAt, String(Date.now())); } catch (e) {}
    }
    async function testPush() {
        try {
            const sub = await getSub(false);
            if (!sub) { toast('فعّل الإشعار أول'); return; }
            const r = await api('/dev/test', { sub: sub.toJSON() });
            toast(r.ok ? 'انبعت ✓ لازم يوصل خلال ثواني' : 'ما وصل، جرّب تطفي الإشعار وتشغّلو');
        } catch (e) { toast('ما زبط'); }
    }
    async function logout() {
        if (store.get(K.push) === '1') await setPush(false);
        tok = ''; me = null;
        [K.tok, K.me, K.legacy, K.push, K.pushAt].forEach(store.del);
        closeSheet(); S.items = []; S.counts = null; S.team = null; S.stats = null; S.tab = 'inbox';
        try { if (navigator.clearAppBadge) navigator.clearAppBadge(); } catch (e) {}
        showLogin();
    }

    // ===================== الكبسات =====================
    let deferredInstall = null;
    async function copy(text, sel = 'big-code') {
        try { await navigator.clipboard.writeText(text); toast('انتسخ ✓'); }
        catch (e) {
            const el = typeof sel === 'string' ? $(sel) : sel;
            if (el) { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
            toast('حدّدتلك ياه، انسخو من القائمة');
        }
    }
    function bindClicks() {
        $('view').addEventListener('click', async e => {
            const t = e.target.closest('button'); if (!t) return;
            if (t.dataset.open) return openMsg(t.dataset.open);
            if (t.dataset.f) {
                const was = S.archived;
                S.archived = t.dataset.f === 'archived'; if (!S.archived) S.filter = t.dataset.f;
                render();
                if (was !== S.archived) { S.items = []; loadInbox(); }
                return;
            }
            if (t.dataset.person) return personSheet(t.dataset.person);
            if (t.dataset.devrm) { const r = await api('/dev/devices', { remove: t.dataset.devrm }); if (r.ok) { S.devs = r.data; render(); toast('انشال الجهاز ✓'); } return; }
            if (t.dataset.days !== undefined) { t.parentElement.querySelectorAll('[role="radio"]').forEach(b => b.setAttribute('aria-checked', String(b === t))); return; }
            const act = t.dataset.act;
            if (act === 'retry') loadInbox();
            else if (act === 'edit') { S.editing = true; render(); }
            else if (act === 'archive' || act === 'unarchive') moveMsg(act);
            else if (act === 'recheck') { S.health = null; render(); loadNums(); }
            else if (act === 'ann-clear') { const r = await api('/dev/announce', { clear: true }); if (r.ok) { if (S.stats) S.stats.announce = null; $('ann-now').innerHTML = annNowHTML(); toast('وقف الإعلان ✓'); } }
            else if (act === 'new-code') newCodeSheet();
            else if (act === 'copy-msg') { const m = S.items.find(x => x.id === S.open); if (m) copy(m.text, document.querySelector('.bub.u')); }
            else if (t.id === 'ann-push') t.setAttribute('aria-checked', String(t.getAttribute('aria-checked') !== 'true'));
        });
        $('view').addEventListener('submit', e => { if (e.target.id === 'ann-form') { e.preventDefault(); publish(); } });
        $('tabbar').addEventListener('click', e => { const t = e.target.closest('[data-tab]'); if (t && (t.dataset.tab !== S.tab || S.open)) { if (S.open && history.state && history.state.msg) history.replaceState(null, ''); go(t.dataset.tab); } });
        $('back').addEventListener('click', () => closeMsg());
        $('me-btn').addEventListener('click', meSheet);
        $('sheet').addEventListener('click', async e => {
            if (e.target.closest('[data-close]')) return closeSheet();
            const t = e.target.closest('button'); if (!t) return;
            if (t.dataset.role) {
                t.parentElement.querySelectorAll('[role="radio"]').forEach(b => b.setAttribute('aria-checked', String(b === t)));
                const hint = $(t.parentElement.id + '-hint'); if (hint) hint.textContent = ROLE_HINT[t.dataset.role];
                return;
            }
            if (t.dataset.p === 'role' || t.dataset.p === 'unbind' || t.dataset.p === 'revoke') return personStep(t.dataset.p);
            if (t.dataset.p) return personDo(t.dataset.p);
            const act = t.dataset.act, body = $('sheet-body');
            if (act === 'copy-code') copy(body.dataset.msg || body.dataset.code);
            else if (act === 'share-code') { try { await navigator.share({ text: body.dataset.msg }); } catch (er) {} }
            else if (act === 'push') {
                const on = t.getAttribute('aria-checked') !== 'true';
                t.disabled = true;
                if (await setPush(on)) meSheet(); else t.disabled = false;
            }
            else if (act === 'push-test') testPush();
            else if (act === 'logout') logout();
        });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
        addEventListener('popstate', () => { if (!$('sheet').hidden) closeSheet(); if (S.open) closeMsg(true); });
        // التثبيت: الزر موجود بالدخول وبالرسائل وبحسابي، فمنسمع عالصفحة كلها
        document.addEventListener('click', e => {
            const t = e.target.closest('[data-act="install"], [data-act="install-hide"]'); if (!t) return;
            if (t.dataset.act === 'install') doInstall(t);
            else { store.set(K.inst, '1'); render(); }
        });
        addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; paintInstall(); });
        addEventListener('appinstalled', () => { deferredInstall = null; installed = true; paintInstall(); });
        // وقت الكتابة: الشريط تحت بيختفي حتى يضل مطرح للكتابة فوق الكيبورد
        document.addEventListener('focusin', e => { if (e.target.matches('textarea, input:not([type="checkbox"]):not([type="radio"])')) document.body.classList.add('typing'); });
        document.addEventListener('focusout', () => setTimeout(() => { if (!document.activeElement || !document.activeElement.matches('textarea, input')) document.body.classList.remove('typing'); }, 60));
        // رجعت عالتطبيق، أو إجا إشعار: منحدّث الرسائل
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && tok && S.tab === 'inbox') loadInbox(); });
        setInterval(() => { if (document.visibilityState === 'visible' && tok && S.tab === 'inbox' && !S.open) loadInbox(); }, 60000);
        if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.type === 'mdt-refresh' && tok) loadInbox(); });
    }

    // ===================== البداية =====================
    async function boot() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(() => {});
            let reloaded = false;
            const had = !!navigator.serviceWorker.controller;
            navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !reloaded) { reloaded = true; location.reload(); } });
        }
        bindBoxes(); bindClicks(); detectBrand();
        // صاحب التطبيق كان داخل من صفحة المطوّر القديمة بمُذكّر (نفس الموقع): بيفوت لحالو
        if (!tok && store.get(K.legacy)) tok = store.get(K.legacy);
        if (!tok) { showLogin(); return; }
        if (me) startShell();
        const r = await api('/team/me');
        if (r.ok) {
            const changed = !me || me.role !== r.data.me.role || me.name !== r.data.me.name;
            me = r.data.me; store.set(K.me, JSON.stringify(me)); store.set(K.tok, tok);
            if (changed) startShell();
        } else if (r.status === 0) { if (me) toast('ما في نت هلّق'); else showLogin('ما في اتصال بالنت'); }
        else if (r.status !== 401 && !me) showLogin('ما زبط، جرّب كمان شوي');
    }
    boot();
})();
