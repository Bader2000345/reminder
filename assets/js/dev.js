/* =====================================================================
 * مُذكّر — dev.js  (الإصدار ٢٠، معرض ٩)
 * وضع المطوّر، ما بيبين لحدا غير صاحب التطبيق، وعلى جواله ولابتوبه بس (السيرفر بيقبل جهازين):
 *   • أول مرة على الجهاز: ٥ كبسات ورا بعض على زر «مُذكّر، الإصدار…» بآخر الإعدادات ← صفحة القفل (ق٢) ← كلمة السر.
 *   • بعدها الجهاز بيتذكّر (رمز موقّع لسنة: mudhakkir-dev-device، وما بيطلع بالنسخة الاحتياطية):
 *     بيبين «للمطوّرين» بآخر الإعدادات، و«ملاحظات وشكاوي» بتصير صندوق الرسائل (ص١) بلا كلمة سر،
 *     وبطاقة «صندوق الرسائل» بأول الرئيسية لما يكون في رسائل جديدة.
 *   • صفحة المطوّرين (ط٣) بتطلب كلمة السر كل ما ينفتح التطبيق (رمز الجلسة بالذاكرة بس، ١٢ ساعة بالأكتر).
 * كلمة السر نفسها بـ Cloudflare (Secret اسمه DEV_KEY)، ما بتنكتب بأي ملف ولا بتنحفظ عالجهاز.
 * يعتمد على Feedback (feedback.js) و PUSH_SERVER و PushSync و Notifier (notifications.js) و Toast و navigateTo.
 * ===================================================================== */
const Dev = (() => {
    const $ = id => document.getElementById(id);
    const KEY_DEVICE = 'mudhakkir-dev-device', KEY_PUSH = 'mudhakkir-dev-push', KEY_PUSH_AT = 'mudhakkir-dev-push-at', KEY_ID = 'mudhakkir-dev-id';
    const F = Feedback, ar = Feedback.ar, esc = Feedback.esc;
    const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
    const ICON = {
        fb: svg('<path d="M4 5.5h16v10.5H10l-5 4v-4H4z"/><path d="M8.5 9.5h7M8.5 12.5h4.5"/>'),
        chart: svg('<path d="M5 20V11M11 20V5M17 20v-6M3 20h18"/>'),
        mega: svg('<path d="M4 10v4h3l7 4.5v-13L7 10z"/><path d="M17.5 9a4 4 0 0 1 0 6"/>'),
        pulse: svg('<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>'),
        bell: svg('<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'),
        devices: svg('<rect x="2.5" y="5" width="13" height="9.5" rx="1.5"/><path d="M1.5 17.5h15"/><rect x="17" y="8" width="5.5" height="11" rx="1.3"/>'),
        back: svg('<path d="M9.5 6l6 6-6 6"/>'),
        go: svg('<path d="M14.5 6l-6 6 6 6"/>')
    };
    const TITLES = { nums: 'الأرقام', ann: 'إعلان لكل المستخدمين', tools: 'أدوات الفحص', devices: 'الأجهزة المسموحة' };
    const TZ = { 'Asia/Damascus': 'دمشق', 'Asia/Riyadh': 'الرياض', 'Asia/Amman': 'عمّان', 'Asia/Beirut': 'بيروت', 'Asia/Baghdad': 'بغداد', 'Asia/Kuwait': 'الكويت', 'Asia/Qatar': 'الدوحة', 'Asia/Dubai': 'دبي', 'Asia/Bahrain': 'البحرين', 'Asia/Muscat': 'مسقط', 'Asia/Aden': 'عدن', 'Asia/Gaza': 'غزة', 'Asia/Hebron': 'الخليل', 'Africa/Cairo': 'القاهرة', 'Africa/Tripoli': 'طرابلس', 'Africa/Tunis': 'تونس', 'Africa/Algiers': 'الجزائر', 'Africa/Casablanca': 'الدار البيضاء', 'Africa/Khartoum': 'الخرطوم', 'Europe/Istanbul': 'إسطنبول', 'Europe/Berlin': 'برلين', 'Europe/Amsterdam': 'أمستردام', 'Europe/Stockholm': 'ستوكهولم', 'Europe/London': 'لندن', 'Europe/Paris': 'باريس', 'Europe/Vienna': 'فيينا', 'America/New_York': 'نيويورك', 'America/Toronto': 'تورنتو', UTC: 'UTC' };
    const tzName = t => TZ[t] || String(t).split('/').pop().replace(/_/g, ' ');
    const msgs = n => (n === 1 ? 'رسالة جديدة' : n === 2 ? 'رسالتين جداد' : `${ar(n)} ${n <= 10 ? 'رسائل جديدة' : 'رسالة جديدة'}`);
    const tries = n => (n === 1 ? 'محاولة وحدة' : n === 2 ? 'محاولتين' : `${ar(n)} محاولات`);
    const devices = n => (n === 1 ? 'جهاز واحد' : n === 2 ? 'جهازين' : `${ar(n)} أجهزة`);
    const deviceTok = () => { try { return localStorage.getItem(KEY_DEVICE) || ''; } catch (e) { return ''; } };
    const isDevice = () => !!deviceTok();
    const pushOn = () => { try { return localStorage.getItem(KEY_PUSH) === '1'; } catch (e) { return false; } };
    const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

    let session = '';  // بالذاكرة بس: بينمسح كل ما يتسكّر التطبيق
    let stats = null, health = null, devs = null, view = 'list', confirmPush = false;
    // رمز عشوائي لهالجهاز، حتى يعرف السيرفر إذا هو من جهازي المطوّر المسموحين
    function deviceId() {
        let id = '';
        try { id = localStorage.getItem(KEY_ID) || ''; } catch (e) {}
        if (!/^[a-z0-9]{20,40}$/.test(id)) {
            id = [...crypto.getRandomValues(new Uint8Array(16))].map(b => (b % 36).toString(36)).join('') + Date.now().toString(36);
            try { localStorage.setItem(KEY_ID, id); } catch (e) {}
        }
        return id;
    }
    function deviceLabel() {
        const i = F.deviceInfo();
        return [INFO.platform[i.platform] || i.os, i.browser, i.installed ? 'التطبيق المثبّت' : ''].filter(Boolean).join('، ').slice(0, 40);
    }
    const box = { items: [], counts: null, avg: 0, filter: 'all', archived: false, open: '', state: 'idle' };

    async function api(path, body) {
        try {
            const res = await fetch(PUSH_SERVER + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            return { ok: res.ok, status: res.status, data: (await res.json().catch(() => null)) || {} };
        } catch (e) { return { ok: false, status: 0, data: {} }; }
    }
    // رمز الجهاز انلغى (تغيّرت كلمة السر مثلًا): الجهاز برجع متل أي جهاز
    function deviceExpired() {
        try { localStorage.removeItem(KEY_DEVICE); localStorage.removeItem(KEY_PUSH); } catch (e) {}
        session = ''; box.items = []; box.counts = null;
        paint();
        if ($('page-feedback').classList.contains('active-page')) showUser();
        Toast.show('انتهى وضع المطوّر على هالجهاز، افتحه من جديد بكلمة السر');
    }
    function paint() {
        const dev = isDevice();
        $('dev-link').hidden = !dev;
        const unread = box.counts ? box.counts.unread : 0;
        const st = $('fb-setting-status');
        if (st) st.textContent = !dev ? 'شكوى أو اقتراح أو خطأ لاحظته، بتوصل للمطوّر مباشرة'
            : box.counts ? `صندوق الرسائل: ${unread ? msgs(unread) : 'ما في رسائل جديدة'}` : 'صندوق الرسائل';
        $('dev-link-sub').textContent = unread ? `صندوق الرسائل: ${msgs(unread)}` : 'صندوق الرسائل والأرقام والإعلان';
        F.renderHome();
    }
    // بطاقة بأول الرئيسية على جهاز المطوّر لما يكون في رسائل جديدة (feedback.js بيعرضها)
    function homeCard() {
        const unread = isDevice() && box.counts ? box.counts.unread : 0;
        if (!unread) return '';
        return `<button type="button" class="hn-card hn-reply hn-inbox" data-hn="inbox"><span class="hn-ic" aria-hidden="true">${ICON.fb}</span><span class="hn-body"><b>صندوق الرسائل: ${msgs(unread)}</b><small>اكبس لتقراها وترد</small></span><span class="hn-go" aria-hidden="true">${ICON.go}</span></button>`;
    }
    async function currentSub() {
        try {
            if (typeof SW_OK === 'undefined' || !SW_OK) return null;
            const reg = await navigator.serviceWorker.ready;
            return await reg.pushManager.getSubscription();
        } catch (e) { return null; }
    }

    // ===================== ص١ صندوق الرسائل (نفس صفحة «ملاحظات وشكاوي») =====================
    const FILTERS = [['all', 'الكل'], ['bug', 'أخطاء'], ['idea', 'اقتراحات'], ['complaint', 'شكاوي'], ['thanks', 'شكر'], ['archived', 'الأرشيف']];
    const INFO = {
        platform: { android: 'أندرويد', samsung: 'سامسونج', ios: 'آيفون أو آيباد', desktop: 'كمبيوتر', inapp: 'متصفح جوّا تطبيق' },
        theme: { light: 'فاتح', dark: 'داكن' }, size: { sm: 'خط صغير', md: 'خط عادي', lg: 'خط كبير', xl: 'خط أكبر' },
        notif: { granted: 'الإشعارات مسموحة', denied: 'الإشعارات ممنوعة', default: 'الإشعارات لسا ما انطلبت', unsupported: 'ما بيدعم الإشعارات' },
        push: { on: 'الإشعار بالخلفية شغّال', outdated: 'الإشعار بالخلفية شغّال', off: 'الإشعار بالخلفية متوقف', pending: 'الإشعار بالخلفية قيد التفعيل', error: 'الإشعار بالخلفية فيه خطأ', unsupported: 'ما بيدعم الإشعار بالخلفية' }
    };
    function infoLines(i = {}) {
        // الفاصل «،» مو «·»: النقطة جنب الأرقام العربية بتنقرا صفر
        return [
            [INFO.platform[i.platform], i.os, i.browser].filter(Boolean).join('، '),
            [i.build ? 'الإصدار ' + ar(i.build) : '', i.installed === true ? 'مثبّت' : i.installed === false ? 'من المتصفح' : '', INFO.theme[i.theme], INFO.size[i.size], i.w ? 'عرض الشاشة ' + ar(i.w) : ''].filter(Boolean).join('، '),
            [INFO.notif[i.notif], INFO.push[i.push]].filter(Boolean).join('، ')
        ].filter(Boolean);
    }
    function showUser() {
        $('fb-user').hidden = false; $('fb-inbox').hidden = true;
        $('fb-title').textContent = 'ملاحظات وشكاوي';
        $('fb-lead').textContent = 'بتوصل للمطوّر مباشرة، ومنقرا كل رسالة';
    }
    function showInbox() {
        $('fb-user').hidden = true; $('fb-inbox').hidden = false;
        $('fb-title').textContent = 'صندوق الرسائل';
        box.open = '';
        renderInbox();
        loadInbox();
    }
    async function loadInbox() {
        box.state = 'loading';
        if (!box.items.length && !$('fb-inbox').hidden) renderInbox();
        const r = await api('/dev/inbox', { tok: deviceTok(), archived: box.archived });
        if (r.status === 401) { deviceExpired(); return; }
        if (!r.ok) { box.state = 'error'; renderInbox(); return; }
        box.items = r.data.items || []; box.counts = r.data.counts || null; box.avg = r.data.avg || 0; box.state = 'ok';
        if (!$('fb-inbox').hidden) renderInbox();
        paint();
    }
    function renderInbox() {
        const root = $('fb-inbox'), c = box.counts;
        $('fb-lead').textContent = c ? `${c.unread ? msgs(c.unread) : 'ما في رسائل جديدة'}${box.avg ? `، ومتوسط التقييم ${ar(box.avg)} من ٥` : ''}`
            : box.state === 'error' ? 'تعذّر التحميل' : 'جارٍ التحميل…';
        if (box.open) return renderDetail(root);
        const sel = box.archived ? 'archived' : box.filter;
        const list = box.items.filter(m => box.archived || box.filter === 'all' || m.type === box.filter);
        const empty = box.archived ? 'الأرشيف فاضي.' : box.filter !== 'all' ? 'ما في رسائل من هالنوع.'
            : 'ما في رسائل لسا. أول ما حدا يبعت ملاحظة بتطلع هون، وإذا مفعّل «إشعار لجوالي برسالة جديدة» من صفحة المطوّرين بيوصلك إشعار.';
        root.innerHTML = `<span class="dv-badge">وضع المطوّر</span>
            <div class="fb-chips ib-filters" role="group" aria-label="تصفية الرسائل">${FILTERS.map(([k, l]) => {
                const typed = k !== 'all' && k !== 'archived';
                const n = c ? (k === 'archived' ? c.archived : c[k]) || 0 : 0;
                return `<button type="button" data-f="${k}" aria-pressed="${k === sel}"${typed ? ` data-t="${k}"` : ''}>${typed ? '<i aria-hidden="true"></i>' : ''}${l}${n ? ` <span class="n">${ar(n)}</span>` : ''}</button>`;
            }).join('')}</div>
            ${box.state === 'error' ? '<div class="ib-empty"><p>ما قدرنا نجيب الرسائل. تأكد من النت.</p><button type="button" class="ghost-button" data-ib="retry">جرّب مرة تانية</button></div>'
            : box.state === 'loading' && !box.items.length ? '<div class="ib-empty"><p>جارٍ التحميل…</p></div>'
            : !list.length ? `<div class="ib-empty"><p>${empty}</p></div>`
            : `<div class="ib-list">${list.map(m => `<button type="button" class="ib-row${m.read ? '' : ' is-new'}" data-ib="open" data-id="${esc(m.id)}">
                <span class="fb-msg-h"><i class="ib-dot" aria-hidden="true"></i>${F.tagHTML(m.type)}${F.starsHTML(m.stars)}${m.reply ? '<span class="ib-replied">رديت</span>' : ''}<time>${F.when(m.at)}</time></span>
                <span class="ib-text">${esc(m.text)}</span></button>`).join('')}</div>`}`;
    }
    function renderDetail(root) {
        const m = box.items.find(x => x.id === box.open);
        if (!m) { box.open = ''; renderInbox(); return; }
        const lines = infoLines(m.info);
        root.innerHTML = `<button type="button" class="fb-back" data-ib="back">${ICON.back}كل الرسائل</button>
            <article class="fb-card ib-detail">
                <div class="fb-msg-h">${F.tagHTML(m.type)}${F.starsHTML(m.stars)}<time>${F.when(m.at)}</time></div>
                <p class="ib-full">${esc(m.text)}</p>
                ${lines.length ? `<div class="ib-info"><b>الجهاز</b>${lines.map(l => `<span>${esc(l)}</span>`).join('')}</div>` : ''}
                ${m.reply ? `<div class="fb-reply"><b>ردّك · ${F.when(m.replyAt)}</b><p>${esc(m.reply)}</p></div>` : ''}
                <form class="ib-reply" id="ib-reply"${m.reply ? ' hidden' : ''} novalidate>
                    <textarea id="ib-reply-text" rows="3" maxlength="1000" aria-label="ردّك" placeholder="اكتب ردّك… بيوصل لصاحب الرسالة جوّا التطبيق">${m.reply ? esc(m.reply) : ''}</textarea>
                    <p class="fb-error" id="ib-reply-error" role="alert" hidden></p>
                    <button type="submit" class="primary-button">إرسال الرد</button>
                </form>
                <div class="ib-actions">
                    ${m.reply ? '<button type="button" class="ghost-button" data-ib="edit">عدّل الرد</button>' : ''}
                    <button type="button" class="ghost-button" data-ib="${m.arch ? 'unarchive' : 'archive'}">${m.arch ? 'رجّعها من الأرشيف' : 'أرشفة'}</button>
                </div>
            </article>`;
        $('ib-reply').addEventListener('submit', sendReply);
    }
    function openMsg(id) {
        const m = box.items.find(x => x.id === id);
        if (!m) return;
        if (!m.read) {
            m.read = true;
            if (box.counts) box.counts.unread = Math.max(0, box.counts.unread - 1);
            api('/dev/msg', { tok: deviceTok(), id, action: 'read' }).then(r => { if (r.status === 401) deviceExpired(); });
            paint();
        }
        box.open = id;
        renderInbox();
        window.scrollTo({ top: 0, behavior: 'auto' });
    }
    async function sendReply(e) {
        e.preventDefault();
        const area = $('ib-reply-text'), text = area.value.trim(), err = $('ib-reply-error'), btn = e.target.querySelector('[type="submit"]');
        if (text.length < 2) { err.textContent = 'اكتب الرد أول.'; err.hidden = false; area.focus(); return; }
        btn.disabled = true; btn.textContent = 'جارٍ الإرسال…';
        const r = await api('/dev/msg', { tok: deviceTok(), id: box.open, action: 'reply', text });
        if (r.status === 401) { deviceExpired(); return; }
        if (!r.ok || !r.data.item) {
            err.textContent = 'ما انبعت الرد. تأكد من النت وجرّب مرة تانية.'; err.hidden = false;
            btn.disabled = false; btn.textContent = 'إرسال الرد';
            return;
        }
        box.items = box.items.map(x => (x.id === r.data.item.id ? r.data.item : x));
        renderInbox();
        Toast.show('انبعت الرد ✓ بيشوفه أول ما يفتح التطبيق');
    }
    async function moveMsg(action) {
        const r = await api('/dev/msg', { tok: deviceTok(), id: box.open, action });
        if (r.status === 401) { deviceExpired(); return; }
        if (!r.ok) { Toast.show('ما قدرنا نحفظ التغيير، جرّب مرة تانية'); return; }
        Toast.show(action === 'archive' ? 'انتقلت للأرشيف ✓' : 'رجعت للصندوق ✓');
        box.open = '';
        loadInbox();
    }
    function onInboxClick(e) {
        const f = e.target.closest('[data-f]');
        if (f) {
            const k = f.dataset.f, wasArchived = box.archived;
            box.archived = k === 'archived';
            if (!box.archived) box.filter = k;
            if (box.archived !== wasArchived) { box.items = []; loadInbox(); } else renderInbox();
            return;
        }
        const b = e.target.closest('[data-ib]');
        if (!b) return;
        const act = b.dataset.ib;
        if (act === 'open') openMsg(b.dataset.id);
        else if (act === 'back') { box.open = ''; renderInbox(); }
        else if (act === 'retry') loadInbox();
        else if (act === 'edit') { $('ib-reply').hidden = false; b.hidden = true; $('ib-reply-text').focus(); }
        else if (act === 'archive' || act === 'unarchive') moveMsg(act);
    }

    // ===================== ق٢ القفل =====================
    function showLock(msg = '') {
        $('dv-lock').hidden = false; $('dv-main').hidden = true;
        $('page-dev').querySelector(':scope > .fb-back').hidden = false;
        const err = $('dv-lock-error');
        err.textContent = msg; err.hidden = !msg;
        if (matchMedia('(hover: hover)').matches) setTimeout(() => $('dv-key').focus({ preventScroll: true }), 250);
    }
    async function unlock(e) {
        e.preventDefault();
        const input = $('dv-key'), key = input.value, err = $('dv-lock-error'), btn = $('dv-open');
        const fail = text => { err.textContent = text; err.hidden = false; input.focus(); };
        if (!key) return fail('اكتب كلمة السر.');
        btn.disabled = true; btn.textContent = 'جارٍ الفتح…';
        const r = await api('/dev/login', { key, dev: deviceId(), label: deviceLabel() });
        input.value = ''; // ما منخلّي كلمة السر بالصفحة
        btn.disabled = false; btn.textContent = 'فتح';
        if (r.ok && r.data.device && r.data.session) {
            try { localStorage.setItem(KEY_DEVICE, r.data.device); } catch (err2) {}
            session = r.data.session;
            err.hidden = true;
            paint();
            showMain('list');
            return;
        }
        if (r.status === 403 && r.data.error === 'device') return fail('هالجهاز مو من جهازيك المسموحين. افتح صفحة المطوّرين على جوالك أو لابتوبك، ومن «الأجهزة المسموحة» شيل جهاز لتضيف هاد.');
        if (r.status === 403) return fail(r.data.left ? `كلمة السر غلط. باقيلك ${tries(r.data.left)}.` : 'كلمة السر غلط. تقفلت ربع ساعة.');
        if (r.status === 429) return fail('تقفلت بعد محاولات غلط كتير. جرّب بعد ربع ساعة.');
        if (r.status === 503) return fail('لسا ما انحطّت كلمة السر بـ Cloudflare (DEV_KEY).');
        fail('ما في اتصال بالسيرفر. تأكد من النت وجرّب مرة تانية.');
    }
    const sessionOver = () => { session = ''; showLock('انتهت الجلسة، اكتب كلمة السر من جديد.'); };

    // ===================== ط٣ صفحة المطوّرين =====================
    function showMain(v = 'list') {
        $('dv-lock').hidden = true; $('dv-main').hidden = false;
        view = v; confirmPush = false;
        renderMain(true);
        window.scrollTo({ top: 0, behavior: 'auto' });
        if (v !== 'tools' && v !== 'devices') loadStats();
        if (v === 'tools' || v === 'list') loadHealth();
        if (v === 'devices' || v === 'list') loadDevices();
        if (v === 'list' && !box.counts) loadInbox();
    }
    async function loadDevices(remove) {
        const r = await api('/dev/devices', remove ? { tok: session, remove } : { tok: session });
        if (r.status === 401) return sessionOver();
        if (r.ok) { devs = r.data; if (!$('dv-main').hidden) renderMain(); }
    }
    function devicesHTML() {
        if (!devs) return '<p class="dv-wait">جارٍ التحميل…</p>';
        const rows = devs.devices.map(d => `<div class="dv-row"><span class="dv-ic">${ICON.devices}</span><span class="dv-row-t"><b>${esc(d.label)}${d.me ? ' <span class="dv-badge is-ok">هالجهاز</span>' : ''}</b><small>آخر فتح ${F.when(d.last || d.at)}</small></span><button type="button" class="ghost-button dv-out" data-dv="dev-remove" data-id="${esc(d.id)}">شيل</button></div>`);
        const free = devs.max - devs.devices.length;
        return `<div class="dv-rows">${rows.join('')}</div>
            <p class="dv-note">${free > 0 ? `في ${free === 1 ? 'مكان واحد فاضي' : ar(free) + ' أماكن فاضية'}: أول جهاز بيفتح بكلمة السر بيتسجّل.` : 'الجهازين محجوزين: أي جهاز تالت بيترفض حتى لو كلمة السر صح. شيل واحد لتضيف غيره.'}
            إذا ضاع جوالك: غيّر كلمة السر (DEV_KEY) بـ Cloudflare، وبتنمسح القائمة كلها.</p>`;
    }
    async function loadStats() {
        const r = await api('/dev/stats', { tok: session });
        if (r.status === 401) return sessionOver();
        if (r.ok) { stats = r.data; if (!$('dv-main').hidden) renderMain(); }
    }
    async function loadHealth() {
        const [r, live] = await Promise.all([
            api('/dev/health', { tok: session }),
            fetch('./version.json?t=' + Date.now(), { cache: 'no-store' }).then(x => x.json()).catch(() => null)
        ]);
        if (r.status === 401) return sessionOver();
        if (r.ok) { health = { ...r.data, live: (live && Number(live.build)) || 0 }; if (!$('dv-main').hidden) renderMain(); }
    }
    function problems() {
        if (!health) return [];
        const mine = typeof APP_BUILD !== 'undefined' ? APP_BUILD : 0;
        return [!health.vapid, !health.ai, !health.lastRun || Date.now() - Date.parse(health.lastRun) > 2 * 3600e3, !!health.live && health.live !== mine].filter(Boolean);
    }
    function listHTML() {
        const s = stats, fb = s && s.feedback, c = box.counts || fb;
        const rows = [
            ['inbox', ICON.fb, 'صندوق الرسائل', c ? (c.unread ? msgs(c.unread) : 'ما في رسائل جديدة') : '…'],
            ['nums', ICON.chart, 'الأرقام', s ? `${s.users ? ar(s.users) + ' مستخدم بالمجموع' : 'لسا عم ينعدّوا المستخدمين'}، ${fb && fb.avg ? 'والتقييم ' + ar(fb.avg) + ' من ٥' : 'ولسا ما في تقييم'}` : '…'],
            ['ann', ICON.mega, 'إعلان لكل المستخدمين', s ? (s.announce ? `شغّال: «${s.announce.title}»` : 'ما في إعلان شغّال هلّق') : '…'],
            ['tools', ICON.pulse, 'أدوات الفحص', health ? ({ 0: 'كلشي شغّال', 1: 'في شي بدّو انتباه', 2: 'في شغلتين بدهن انتباه' }[problems().length] || `في ${ar(problems().length)} شغلات بدها انتباه`) : '…'],
            ['devices', ICON.devices, 'الأجهزة المسموحة', devs ? devs.devices.map(d => d.label).join('، ') || 'ما في أجهزة' : '…']
        ];
        return `<header class="page-header"><div><h1>للمطوّرين</h1><p class="page-lead">أرقام بلا أي بيانات شخصية</p></div></header>
            <span class="dv-badge is-ok">مفتوح على هالجهاز</span>
            <div class="dv-rows">${rows.map(([v, ic, t, sub]) => `<button type="button" class="dv-row" data-dv="${v}"><span class="dv-ic">${ic}</span><span class="dv-row-t"><b>${t}</b><small>${esc(sub)}</small></span><span class="dv-go">${ICON.go}</span></button>`).join('')}
                <div class="dv-row"><span class="dv-ic">${ICON.bell}</span><span class="dv-row-t"><b id="dv-push-l">إشعار لجوالي برسالة جديدة</b><small>أول ما حدا يبعت ملاحظة</small></span><button type="button" class="dv-switch" role="switch" aria-checked="${pushOn()}" aria-labelledby="dv-push-l" data-dv="push"></button></div>
            </div>
            <button type="button" class="ghost-button dv-out" data-dv="logout">قفل وضع المطوّر على هالجهاز</button>`;
    }
    function numsHTML() {
        const s = stats;
        if (!s) return '<p class="dv-wait">جارٍ التحميل…</p>';
        const fb = s.feedback || {};
        const tiles = [[ar(s.users || 0), 'مستخدم بالمجموع'], [ar(s.active30 || 0), 'فتحوه آخر ٣٠ يوم'],
            [ar(s.subscribers), 'مشترك بالإشعارات'], [ar(s.withReminders), 'عندهم تذكيرات'], [ar(fb.unread || 0), 'رسائل جديدة'],
            [fb.avg ? ar(fb.avg) : '—', 'متوسط التقييم'], [ar(s.widgets || 0), 'أدوات برّا التطبيق'], [s.lastRun ? F.when(Date.parse(s.lastRun)) : '—', 'آخر إرسال إشعارات']];
        const tz = s.timezones || [], max = Math.max(1, ...tz.map(t => t.n));
        return `<div class="dv-tiles">${tiles.map(([v, l]) => `<div class="dv-tile"><b>${esc(v)}</b><small>${l}</small></div>`).join('')}</div>
            ${tz.length ? `<section class="fb-card dv-tz"><h2>وين الناس <small>حسب المنطقة الزمنية</small></h2>${tz.map(t => `<div class="dv-bar"><span>${esc(tzName(t.tz))}</span><span class="dv-trk"><i style="width:${Math.round(t.n / max * 100)}%"></i></span><span>${ar(t.n)}</span></div>`).join('')}</section>` : ''}
            <p class="dv-note">الأرقام من سيرفر مُذكّر، بلا أسماء ولا إيميلات ولا أي شي بيعرّف الشخص. عدّ المستخدمين بلّش من الإصدار ٢٢: كل جهاز بيتحسب أول ما يفتح التطبيق بعد التحديث، فالرقم رح يكبر خلال كم يوم.</p>`;
    }
    function curAnnHTML(a) {
        if (!a) return '';
        const until = a.until ? ' · لحد ' + new Date(a.until).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }) : ' · لحد ما تشيله';
        return `<section class="hn-card hn-ann dv-ann-now"><small>الإعلان الشغّال هلّق${until}</small><b>${esc(a.title)}</b><p>${esc(a.text)}</p><button type="button" class="ghost-button" data-dv="ann-clear">إيقاف الإعلان</button></section>`;
    }
    function annHTML() {
        const s = stats;
        return `<div id="dv-ann-current">${curAnnHTML(s && s.announce)}</div>
            <form class="fb-card dv-ann-form" id="dv-ann-form" novalidate>
                <label class="fb-label" for="dv-ann-title">العنوان</label>
                <input id="dv-ann-title" type="text" maxlength="60" placeholder="مثلًا: تحديث جديد بمُذكّر">
                <label class="fb-label" for="dv-ann-text">النص</label>
                <textarea id="dv-ann-text" rows="4" maxlength="400" placeholder="شو بدك تقول للناس؟"></textarea>
                <span class="fb-label" id="dv-ann-days-l">بيضل ظاهر</span>
                <div class="fb-chips" id="dv-ann-days" role="radiogroup" aria-labelledby="dv-ann-days-l">
                    <button type="button" role="radio" data-days="1" aria-checked="false">يوم</button><button type="button" role="radio" data-days="7" aria-checked="true">أسبوع</button><button type="button" role="radio" data-days="0" aria-checked="false">لحد ما شيله</button>
                </div>
                <div class="dv-row dv-row-flat"><span class="dv-row-t"><b id="dv-ann-push-l">وكمان إشعار لكل المشتركين</b><small id="dv-ann-push-n">${s ? ar(s.subscribers) + ' مشترك، ' : ''}بيوصلهن خلال دقايق</small></span><button type="button" class="dv-switch" role="switch" aria-checked="false" aria-labelledby="dv-ann-push-l" id="dv-ann-push"></button></div>
                <p class="fb-error" id="dv-ann-error" role="alert" hidden></p>
                <button type="submit" class="primary-button" id="dv-ann-send">نشر الإعلان</button>
                <p class="dv-note">بيطلع للكل ببطاقة بأول الرئيسية لحد ما يسكّروها، والإعلان الجديد بيشيل القديم.</p>
            </form>`;
    }
    function toolsHTML() {
        const h = health;
        if (!h) return '<p class="dv-wait">جارٍ الفحص…</p>';
        const mine = typeof APP_BUILD !== 'undefined' ? APP_BUILD : 0;
        const recent = !!h.lastRun && Date.now() - Date.parse(h.lastRun) < 2 * 3600e3;
        const rows = [
            [h.vapid, 'الإشعارات', h.vapid ? 'شغّالة' : 'ناقص مفتاح VAPID_PRIVATE_JWK'],
            [h.ai, 'المساعد الذكي', h.ai ? 'شغّال' : 'ناقص ربط Workers AI باسم AI'],
            [true, 'التخزين', 'شغّال'],
            [recent, 'آخر إرسال إشعارات', h.lastRun ? F.when(Date.parse(h.lastRun)) + (h.lastFailed ? `، و${ar(h.lastFailed)} ما وصلوا` : '') : 'لسا ما انبعت شي'],
            [!h.live || h.live === mine, 'النسخة', h.live ? `المنشورة ${ar(h.live)}، وجهازك ${ar(mine)}${h.live > mine ? ' (في تحديث لهالجهاز)' : h.live < mine ? ' (الموقع لسا ما تحدّث)' : ''}` : `جهازك ${ar(mine)}`],
            [h.devsubs > 0, 'إشعار الرسائل لجوالك', h.devsubs ? `مفعّل على ${devices(h.devsubs)}` : 'مو مفعّل']
        ];
        return `<section class="fb-card dv-tools">${rows.map(([ok, n, s]) => `<div class="dv-tool${ok ? '' : ' is-warn'}"><i aria-hidden="true"></i><span>${n}</span><em>${esc(s)}</em></div>`).join('')}</section>
            <div class="dv-actions"><button type="button" class="ghost-button" data-dv="test">إشعار تجريبي لجهازي</button><button type="button" class="ghost-button" data-dv="refresh">افحص من جديد</button></div>`;
    }
    function renderMain(fresh = false) {
        const root = $('dv-main');
        $('page-dev').querySelector(':scope > .fb-back').hidden = view !== 'list';
        // صفحة الإعلان: ما منمسح يلي عم تكتبه، منحدّث الإعلان الحالي والعدد بس
        if (view === 'ann' && !fresh && $('dv-ann-form')) {
            $('dv-ann-current').innerHTML = curAnnHTML(stats && stats.announce);
            if (stats) $('dv-ann-push-n').textContent = `${ar(stats.subscribers)} مشترك، بيوصلهن خلال دقايق`;
            return;
        }
        root.innerHTML = view === 'list' ? listHTML()
            : `<button type="button" class="fb-back" data-dv="list">${ICON.back}للمطوّرين</button><header class="page-header"><div><h1>${TITLES[view]}</h1></div></header>${view === 'nums' ? numsHTML() : view === 'ann' ? annHTML() : view === 'devices' ? devicesHTML() : toolsHTML()}`;
        if (view === 'ann') $('dv-ann-form').addEventListener('submit', publish);
    }
    async function publish(e) {
        e.preventDefault();
        const title = $('dv-ann-title').value.trim(), text = $('dv-ann-text').value.trim(), err = $('dv-ann-error'), btn = $('dv-ann-send');
        const days = Number($('dv-ann-days').querySelector('[aria-checked="true"]')?.dataset.days ?? 7);
        const push = $('dv-ann-push').getAttribute('aria-checked') === 'true';
        const fail = t => { err.textContent = t; err.hidden = false; };
        if (title.length < 2) return fail('اكتب عنوان الإعلان.');
        if (text.length < 2) return fail('اكتب نص الإعلان.');
        err.hidden = true;
        // الإشعار لكل الناس ما بيرجع: تأكيد بكبسة تانية
        if (push && !confirmPush) {
            confirmPush = true;
            btn.textContent = `متأكد؟ اكبس مرة تانية لينبعت إشعار لـ${stats ? ar(stats.subscribers) : 'كل'} مشترك`;
            return;
        }
        btn.disabled = true; btn.textContent = 'جارٍ النشر…';
        const r = await api('/dev/announce', { tok: session, title, text, days, push });
        btn.disabled = false; btn.textContent = 'نشر الإعلان'; confirmPush = false;
        if (r.status === 401) return sessionOver();
        if (!r.ok) return fail('ما انتشر الإعلان. تأكد من النت وجرّب مرة تانية.');
        if (stats) stats.announce = r.data.announce;
        $('dv-ann-title').value = ''; $('dv-ann-text').value = '';
        $('dv-ann-push').setAttribute('aria-checked', 'false');
        renderMain();
        F.syncAnnouncement(true);
        Toast.show(push ? 'انتشر الإعلان ✓ والإشعارات عم تنبعت' : 'انتشر الإعلان ✓');
    }
    async function clearAnnouncement(btn) {
        btn.disabled = true;
        const r = await api('/dev/announce', { tok: session, clear: true });
        if (r.status === 401) return sessionOver();
        btn.disabled = false;
        if (!r.ok) { Toast.show('ما قدرنا نوقّف الإعلان، جرّب مرة تانية'); return; }
        if (stats) stats.announce = null;
        renderMain();
        F.syncAnnouncement(true);
        Toast.show('وقّفنا الإعلان');
    }
    // إشعار لجوال المطوّر برسالة جديدة: الجهاز لازم يكون مشترك بالإشعارات (PushSync بيشترك حتى بلا تذكيرات)
    async function setPush(on, sw) {
        sw.disabled = true;
        const done = ok => { sw.disabled = false; sw.setAttribute('aria-checked', String(ok ? on : !on)); };
        if (on && (await Notifier.ensurePermission()) !== 'granted') { Toast.show('لازم تسمح بالإشعارات لمُذكّر أول'); return done(false); }
        try { localStorage.setItem(KEY_PUSH, on ? '1' : '0'); } catch (e) {}
        await PushSync.sync();
        const sub = await currentSub();
        if (!sub) {
            if (on) { try { localStorage.setItem(KEY_PUSH, '0'); } catch (e) {} Toast.show('ما قدرنا نفعّل الإشعارات على هالجهاز'); return done(false); }
            return done(true);
        }
        const r = await api('/dev/notify', { tok: deviceTok(), endpoint: sub.endpoint, on });
        if (r.status === 401) { deviceExpired(); return done(false); }
        if (!r.ok) {
            if (on) try { localStorage.setItem(KEY_PUSH, '0'); } catch (e) {}
            Toast.show(r.status === 404 ? 'هالجهاز لسا ما وصل للسيرفر، جرّب بعد دقيقة' : 'ما قدرنا نحفظ الإعداد');
            return done(false);
        }
        try { localStorage.setItem(KEY_PUSH_AT, String(Date.now())); } catch (e) {}
        Toast.show(on ? 'رح يوصلك إشعار بكل رسالة جديدة ✓' : 'وقّفنا إشعار الرسائل');
        health = null;
        done(true);
    }
    async function testPush(btn) {
        const sub = await currentSub();
        if (!sub) { Toast.show('فعّل «إشعار لجوالي برسالة جديدة» أول'); return; }
        btn.disabled = true;
        const r = await api('/dev/test', { tok: deviceTok(), endpoint: sub.endpoint });
        btn.disabled = false;
        if (r.status === 401) { deviceExpired(); return; }
        Toast.show(r.ok ? 'انبعت، شوف جوالك ✓' : r.status === 404 ? 'هالجهاز مو مسجّل بالسيرفر لسا' : 'ما انبعت الإشعار');
    }
    async function logout() {
        if (pushOn()) { const sub = await currentSub(); if (sub) await api('/dev/notify', { tok: deviceTok(), endpoint: sub.endpoint, on: false }); }
        try { [KEY_DEVICE, KEY_PUSH, KEY_PUSH_AT].forEach(k => localStorage.removeItem(k)); } catch (e) {}
        session = ''; stats = null; health = null; devs = null; box.items = []; box.counts = null;
        paint();
        PushSync.sync();
        navigateTo('settings');
        Toast.show('تسكّر وضع المطوّر على هالجهاز');
    }
    function onMainClick(e) {
        const day = e.target.closest('[data-days]');
        if (day) { day.parentElement.querySelectorAll('[data-days]').forEach(b => b.setAttribute('aria-checked', String(b === day))); return; }
        if (e.target.closest('#dv-ann-push')) {
            const sw = $('dv-ann-push');
            sw.setAttribute('aria-checked', String(sw.getAttribute('aria-checked') !== 'true'));
            confirmPush = false; $('dv-ann-send').textContent = 'نشر الإعلان';
            return;
        }
        const b = e.target.closest('[data-dv]');
        if (!b) return;
        const act = b.dataset.dv;
        if (act === 'inbox') navigateTo('feedback');
        else if (act === 'list' || act === 'nums' || act === 'ann' || act === 'tools' || act === 'devices') showMain(act);
        else if (act === 'dev-remove') {
            // تأكيد بكبسة تانية: شيل هالجهاز بيسكّر وضع المطوّر عليه فورًا
            if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'متأكد؟'; return; }
            b.disabled = true;
            const me = devs && devs.devices.find(d => d.id === b.dataset.id && d.me);
            loadDevices(b.dataset.id).then(() => { if (me) { deviceExpired(); navigateTo('settings'); } });
        }
        else if (act === 'push') setPush(b.getAttribute('aria-checked') !== 'true', b);
        else if (act === 'logout') logout();
        else if (act === 'test') testPush(b);
        else if (act === 'refresh') { health = null; renderMain(); loadHealth(); }
        else if (act === 'ann-clear') clearAnnouncement(b);
    }

    // ٥ كبسات ورا بعض على زر «مُذكّر، الإصدار…» بآخر الإعدادات بتفتح صفحة القفل (متل خيارات المطوّر بالأندرويد).
    // زر حقيقي مو نص: الآيفون كان يفهم الكبس السريع عالنص تكبير أو تحديد، فما كانت تنحسب الكبسات.
    function bindTaps() {
        const chip = $('ver-chip');
        if (!chip) return;
        chip.textContent = `مُذكّر، الإصدار ${ar(typeof APP_BUILD !== 'undefined' ? APP_BUILD : 0)}`;
        let n = 0, last = 0;
        chip.addEventListener('click', () => {
            const now = Date.now();
            n = now - last < 1200 ? n + 1 : 1;
            last = now;
            if (n >= 5) { n = 0; navigateTo('dev'); }
        });
    }
    // جهاز المطوّر: عدد الرسائل الجديدة، والتأكد إن اشتراك الإشعار لسا مسجّل (مرة باليوم)
    async function refreshDevice() {
        if (!isDevice()) return;
        if (!box.counts) loadInbox();
        let at = 0;
        try { at = Number(localStorage.getItem(KEY_PUSH_AT)) || 0; } catch (e) {}
        if (!pushOn() || Date.now() - at < 864e5) return;
        const sub = await currentSub();
        if (!sub) return;
        const r = await api('/dev/notify', { tok: deviceTok(), endpoint: sub.endpoint, on: true });
        if (r.ok) try { localStorage.setItem(KEY_PUSH_AT, String(Date.now())); } catch (e) {}
    }
    function init() {
        const page = $('page-dev');
        if (!page) return;
        $('dv-lock-form').addEventListener('submit', unlock);
        $('dv-eye').addEventListener('click', () => {
            const input = $('dv-key'), show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            $('dv-eye').setAttribute('aria-pressed', String(show));
            $('dv-eye').setAttribute('aria-label', show ? 'إخفاء كلمة السر' : 'إظهار كلمة السر');
        });
        $('dv-main').addEventListener('click', onMainClick);
        $('fb-inbox').addEventListener('click', onInboxClick);
        bindTaps();
        let wasOpen = false;
        new MutationObserver(() => {
            const open = page.classList.contains('active-page');
            if (open && !wasOpen) { if (session) showMain('list'); else showLock(); }
            if (!open && wasOpen) { $('dv-key').value = ''; $('dv-key').type = 'password'; }
            wasOpen = open;
        }).observe(page, { attributes: true, attributeFilter: ['class'] });
        paint();
        setTimeout(refreshDevice, 6000);
        if (typeof SW_OK !== 'undefined' && SW_OK) navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.type === 'mdk-open-inbox') navigateTo('feedback'); });
    }
    return { init, isDevice, showInbox, showUser, homeCard };
})();
