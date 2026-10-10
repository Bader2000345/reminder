/* =====================================================================
 * مُذكّر — assistant.js
 * المساعد «اسأل مُذكّر»: محادثة تتذكّر ما سبق، تجيب من محتوى التطبيق (الأذكار والأحاديث والأدلة)
 * ومن خارجه عبر سيرفر مُذكّر (‎/chat ← Cloudflare Workers AI).
 * - نصوص الأذكار وأدلتها تُعرض دائمًا من بيانات التطبيق الموثّقة (وسوم [[id]] في رد المساعد) لا من النموذج.
 * - دون اتصال، أو عند نفاد الحصة اليومية: يجيب مباشرة من محتوى التطبيق (knowledge.js).
 * يحتاج قبله: knowledge.js، notifications.js (PUSH_SERVER)، reminders.js، adhkar-viewer.js، time-context.js
 * ===================================================================== */

const Assistant = (() => {
    const $ = id => document.getElementById(id);
    const KEY = 'mudhakkir-chat', DAY_KEY = 'mudhakkir-chat-day';
    const MAX_SAVED = 40, SEND_LAST = 12, DAILY = 20;
    const SUGGEST = ['عطيني ذكر عند الغضب', 'دعاء للهمّ والضيق', 'شو بقول قبل النوم؟', 'دعاء السفر', 'ما فضل آية الكرسي؟', 'كيف أضيف تذكيرًا؟'];
    const ID_RE = /\[\[([\w-]+:\d+)\]\]/g, HAS_ID = /\[\[[\w-]+:\d+\]\]/;
    const DATA_CACHE = 'mudhakkir-data';
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const ar = n => Number(n).toLocaleString('ar-EG');
    const today = () => new Date().toISOString().slice(0, 10);
    const isMobile = () => matchMedia('(max-width:700px)').matches;

    let msgs = [], busy = false, ctrl = null, ayahCtx = null, rec = null, convId = 0;
    const panel = $('ask-panel'), log = $('ask-log'), input = $('ask-input'), form = $('ask-form');

    // ---------- الحفظ في الجهاز ----------
    function load() {
        try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && Array.isArray(d.msgs)) msgs = d.msgs.filter(m => m && m.text); } catch (e) {}
    }
    function save() {
        msgs = msgs.slice(-MAX_SAVED);
        try { localStorage.setItem(KEY, JSON.stringify({ v: 1, msgs })); } catch (e) {}
    }
    function usedToday() {
        try { const d = JSON.parse(localStorage.getItem(DAY_KEY)); return d && d.d === today() ? d.n : 0; } catch (e) { return 0; }
    }
    function countUse() { try { localStorage.setItem(DAY_KEY, JSON.stringify({ d: today(), n: usedToday() + 1 })); } catch (e) {} }

    // ---------- بطاقة ذكر موثّقة من محتوى التطبيق ----------
    function card(id) {
        const it = Knowledge.get(id);
        if (!it) return null;
        const c = el('article', 'ask-card');
        const head = el('header', 'ask-card-head');
        head.append(el('span', 'ask-card-kicker', 'من محتوى التطبيق'), el('strong', '', [it.groupTitle, it.label].filter(Boolean).join(' · ')));
        const text = el('p', 'ask-card-text' + (/[﴿]/.test(it.text) ? ' is-quran' : ''), it.text);
        c.append(head, text);
        if (it.text.length > 320) {
            c.classList.add('is-long');
            const more = el('button', 'ask-more', 'عرض النص كاملًا'); more.type = 'button';
            more.addEventListener('click', () => { c.classList.remove('is-long'); more.remove(); });
            c.append(more);
        }
        const meta = [it.ref, it.count > 1 ? `يُقال ${ar(it.count)} مرات` : ''].filter(Boolean).join(' · ');
        if (meta) c.append(el('p', 'ask-card-meta', meta));
        if (it.tip) c.append(el('p', 'ask-card-tip', it.tip));
        if (it.hadith) {
            const q = el('blockquote', 'ask-card-hadith', it.hadith);
            if (it.source) q.append(el('cite', '', it.source));
            c.append(q);
        }
        const acts = el('div', 'ask-card-actions');
        const btn = (label, fn) => { const b = el('button', 'ask-chip-btn', label); b.type = 'button'; b.addEventListener('click', fn); acts.append(b); };
        btn('نسخ', async () => {
            try { await navigator.clipboard.writeText([it.text, it.hadith ? `\n${it.hadith}${it.source ? ` (${it.source})` : ''}` : ''].join('')); Toast.show('تم نسخ الذكر'); } catch (e) {}
        });
        btn('أضف تذكيرًا', () => {
            close();
            navigateTo('my-adhkar');
            setTimeout(() => Reminders.openForm({ title: it.label || it.groupTitle, text: it.text.slice(0, 500) }), 160);
        });
        if (typeof ADHKAR_DATABASE !== 'undefined' && ADHKAR_DATABASE[it.group]) {
            btn('افتح في الأذكار', () => { close(); setTimeout(() => AdhkarViewer.open(it.group, it.idx), 120); });
        }
        c.append(acts);
        return c;
    }

    // ---------- تنسيق رد المساعد: فقرات + بطاقات [[id]] ----------
    function inline(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }
    function paintAnswer(box, text, done) {
        box.replaceChildren();
        const shown = new Set();
        let list = null;
        const lines = String(text).replace(/\r/g, '').split('\n');
        lines.forEach((raw, i) => {
            const ids = [...raw.matchAll(ID_RE)].map(m => m[1]);
            const line = raw.replace(ID_RE, '').replace(/^#+\s*/, '').trim();
            // وسم لم يكتمل بعد أثناء البث
            const partial = !done && i === lines.length - 1 && /\[\[[^\]]*$/.test(line);
            const clean = partial ? line.replace(/\[\[[^\]]*$/, '').trim() : line;
            if (clean) {
                if (/^([-•*]|\d+[.)])\s+/.test(clean)) {
                    if (!list) { list = el('ul', 'ask-list'); box.append(list); }
                    const li = el('li'); li.innerHTML = inline(clean.replace(/^([-•*]|\d+[.)])\s+/, '')); list.append(li);
                } else {
                    list = null;
                    const p = el('p'); p.innerHTML = inline(clean);
                    if (/^معلومة عامة/.test(clean)) p.className = 'ask-general';
                    box.append(p);
                }
            } else if (!ids.length) list = null;
            ids.forEach(id => { if (shown.has(id) || shown.size >= 4) return; const c = card(id); if (c) { shown.add(id); box.append(c); list = null; } });
        });
        return shown.size;
    }

    function bubble(m) {
        const row = el('div', 'ask-row ' + (m.role === 'user' ? 'is-user' : 'is-bot'));
        const b = el('div', 'ask-bubble');
        if (m.role === 'user') b.textContent = m.text;
        else {
            paintAnswer(b, m.text, true);
            if (m.local) row.classList.add('is-local');
        }
        if (m.ayah && m.role === 'user') { const q = el('blockquote', 'ask-ayah', '﴿' + m.ayah.text + '﴾'); q.append(el('cite', '', m.ayah.ref)); b.prepend(q); }
        row.append(b);
        return row;
    }

    function welcome() {
        const box = el('div', 'ask-welcome');
        const name = typeof UserName !== 'undefined' ? UserName.get() : '';
        box.append(
            el('div', 'ask-welcome-mark brand-logo'),
            el('h3', '', name ? `أهلًا ${name} 👋` : 'أهلًا بك 👋'),
            el('p', '', 'اسألني عن ذكر لموقف تمرّ به، أو فضل سورة أو دعاء، أو عن طريقة استخدام التطبيق. أجيبك من أذكار التطبيق وأدلته أولًا.')
        );
        const chips = el('div', 'ask-suggest');
        SUGGEST.forEach(s => { const b = el('button', 'ask-chip', s); b.type = 'button'; b.addEventListener('click', () => send(s)); chips.append(b); });
        box.append(chips);
        return box;
    }

    function renderAll() {
        log.replaceChildren();
        if (!msgs.length) log.append(welcome());
        msgs.forEach(m => log.append(bubble(m)));
        scrollDown(true);
    }
    function scrollDown(instant) { requestAnimationFrame(() => log.scrollTo({ top: log.scrollHeight, behavior: instant ? 'auto' : 'smooth' })); }

    // ---------- الاسترجاع من محتوى التطبيق (مع سياق المحادثة) ----------
    // «غيره»، «كمان»، «واحد تاني»… = متابعة لنفس الموضوع
    const FOLLOW_UP = /(^| )(كمان|غيره|غيرو|غيرها|غيرا|تاني|ثاني|اخر|اخري|زياده|المزيد|كمل|كملي|بعد)( |$)/;
    function retrieve(q) {
        const direct = Knowledge.search(q, { limit: 6 });
        const prev = [...msgs].reverse().find(m => m.role === 'user' && m.text !== q);
        const followUp = prev && FOLLOW_UP.test(Knowledge.norm(q));
        if (!prev || (!followUp && direct.length >= 2)) return direct;
        const ctx = Knowledge.search(prev.text + ' ' + q, { limit: 6 });
        const seen = new Set();
        return (followUp ? ctx.concat(direct) : direct.concat(ctx)).filter(x => !seen.has(x.id) && seen.add(x.id)).slice(0, 6);
    }

    // إجابة من التطبيق نفسه (دون اتصال، أو نفاد الحصة، أو تعطل السيرفر)
    function localAnswer(q, items, reason) {
        const help = Knowledge.helpFor(q);
        const lead = { offline: 'أنت غير متصل بالإنترنت الآن، وهذا ما وجدته في محتوى التطبيق:', limit: 'وصلتَ للحد اليومي للمساعد الذكي (يتجدد غدًا)، وهذا ما وجدته في محتوى التطبيق:', quota: 'المساعد الذكي مشغول الآن، وهذا ما وجدته في محتوى التطبيق:', error: 'تعذّر الوصول للمساعد الذكي الآن، وهذا ما وجدته في محتوى التطبيق:' }[reason] || 'هذا ما وجدته في محتوى التطبيق:';
        if (help) return help.answer;
        // أفضل نتيجة وما معها من نفس القسم (حتى لا تظهر نتيجة بعيدة لمجرد تشابه كلمة)
        if (items.length) return lead + '\n' + items.filter(it => it.group === items[0].group).slice(0, 3).map(it => `[[${it.id}]]`).join('\n');
        return (reason === 'offline' ? 'أنت غير متصل بالإنترنت الآن، ' : '') + 'لم أجد شيئًا مطابقًا في محتوى التطبيق. جرّب كلمات أخرى مثل: الغضب، الهمّ، السفر، المطر، قبل النوم.';
    }

    // ---------- الاتصال بالسيرفر (بثّ الرد وهو يُكتب) ----------
    async function stream(res, onText) {
        const type = res.headers.get('Content-Type') || '';
        if (!type.includes('event-stream') || !res.body) {
            const j = await res.json().catch(() => null);
            const t = j && (j.response || (j.result && j.result.response)) || '';
            onText(t);
            return t;
        }
        const reader = res.body.getReader(), dec = new TextDecoder();
        let buf = '', text = '';
        for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            const lines = buf.split('\n'); buf = lines.pop();
            for (const line of lines) {
                const l = line.trim();
                if (!l.startsWith('data:')) continue;
                const payload = l.slice(5).trim();
                if (!payload || payload === '[DONE]') continue;
                try {
                    const j = JSON.parse(payload);
                    const piece = typeof j.response === 'string' ? j.response : (j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content) || '';
                    if (piece) { text += piece; onText(text); }
                } catch (e) {}
            }
        }
        return text;
    }

    async function send(question) {
        const q = String(question || input.value).trim().slice(0, 600);
        if (!q || busy) return;
        input.value = ''; autosize();
        busy = true; form.classList.add('is-busy');
        if (!msgs.length) log.replaceChildren();
        const userMsg = { role: 'user', text: q, at: Date.now() };
        if (ayahCtx) userMsg.ayah = ayahCtx;
        msgs.push(userMsg); save();
        log.append(bubble(userMsg));
        // فقاعة الرد مع مؤشر الكتابة
        const row = el('div', 'ask-row is-bot'), b = el('div', 'ask-bubble');
        b.append(el('span', 'ask-typing', '')); b.firstChild.innerHTML = '<i></i><i></i><i></i>';
        row.append(b); log.append(row); scrollDown();

        const items = retrieve(q);
        const ayah = ayahCtx; ayahCtx = null;
        let text = '', local = false, reason = '';
        if (!PUSH_SERVER) reason = 'error';
        else if (!navigator.onLine) reason = 'offline';
        else if (usedToday() >= DAILY) reason = 'limit';
        const conv = convId;
        if (!reason) {
            const my = ctrl = new AbortController();
            const timer = setTimeout(() => my.abort(), 45000);
            try {
                const history = msgs.slice(-SEND_LAST).map(m => ({ role: m.role, content: m.text }));
                const res = await fetch(PUSH_SERVER + '/chat', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: my.signal,
                    body: JSON.stringify({ messages: history, items: Knowledge.forModel(items), ayah, name: typeof UserName !== 'undefined' ? UserName.get() : '' })
                });
                if (!res.ok) {
                    const j = await res.json().catch(() => ({}));
                    reason = j.error === 'limit' ? 'limit' : j.error === 'quota' ? 'quota' : 'error';
                } else {
                    countUse();
                    let raf = 0;
                    text = await stream(res, t => {
                        if (raf) return;
                        raf = requestAnimationFrame(() => { raf = 0; paintAnswer(b, t, false); b.classList.add('is-streaming'); scrollDown(true); });
                    });
                    cancelAnimationFrame(raf);
                    if (!text.trim()) reason = 'error';
                }
            } catch (e) { reason = navigator.onLine ? 'error' : 'offline'; }
            finally { clearTimeout(timer); if (ctrl === my) ctrl = null; }
        }
        // بدأ المستخدم «محادثة جديدة» أثناء الانتظار: نتجاهل هذا الرد
        if (conv !== convId) { row.remove(); return; }
        if (reason) {
            local = true;
            text = localAnswer(q, items, reason);
            // سؤال عن آية: نعرض معناها من التفسير الميسر بدل الرد العام
            if (ayah && ayah.s && typeof Tafsir !== 'undefined') {
                try { text = `هذا معنى الآية من «التفسير الميسر»:\n${await Tafsir.get('muyassar', ayah.s, ayah.a)}\n\nولمزيد من التفصيل: اضغط مطوّلًا على الآية ← «التفسير» (المختصر وابن كثير).`; } catch (e) {}
            }
        }
        // طلب ذكرًا صراحةً ولم يذكر المساعد أي ذكر من التطبيق: نضيف أقرب نتيجة
        const direct = Knowledge.search(q, { limit: 1 })[0];
        if (!local && direct && !HAS_ID.test(text) && !Knowledge.helpFor(q) && /ذكر|دعاء|اذكار|أذكار|ادعي|أدعية|بقول|اقول|أقول|نقول/.test(q)) text += `\n[[${direct.id}]]`;
        if (conv !== convId) { row.remove(); return; }
        const botMsg = { role: 'assistant', text: text.trim(), at: Date.now() };
        if (local) botMsg.local = true;
        msgs.push(botMsg); save();
        b.classList.remove('is-streaming');
        row.replaceWith(bubble(botMsg));
        scrollDown();
        busy = false; form.classList.remove('is-busy');
        if (!isMobile()) input.focus({ preventScroll: true });
    }

    // ---------- الفتح والإغلاق ----------
    function open({ question = '', ayah = null, send: autoSend = true, focus = true } = {}) {
        if (panel.hidden) {
            panel.hidden = false;
            document.body.classList.add('ask-open');
            requestAnimationFrame(() => panel.classList.add('open'));
            if (isMobile()) Immersive.enter(panel, { onClose: close, hideAfter: 0 });
            renderAll();
        }
        if (ayah) ayahCtx = ayah;
        if (question && autoSend) send(question);
        else if (question) { input.value = question; autosize(); }
        if (focus && !isMobile()) setTimeout(() => input.focus({ preventScroll: true }), 80);
        else if (focus && !question) setTimeout(() => input.focus({ preventScroll: true }), 300);
    }
    function close(fromPop = false) {
        if (panel.hidden) return;
        try { rec && rec.stop(); } catch (e) {}
        panel.classList.remove('open');
        document.body.classList.remove('ask-open');
        if (Immersive.isOpen(panel)) Immersive.exit(panel, fromPop === true);
        setTimeout(() => { if (!panel.classList.contains('open')) panel.hidden = true; }, 320);
        $('ask-fab')?.focus({ preventScroll: true });
    }
    function reset() {
        convId++;
        if (ctrl) ctrl.abort();
        busy = false; form.classList.remove('is-busy');
        msgs = []; save(); ayahCtx = null;
        renderAll();
        Toast.show('بدأت محادثة جديدة');
    }

    // أسئلة أُجيبت من داخل الإشعار (sw.js يحفظها في __mdk/ask-inbox) تُضاف للمحادثة
    async function mergeInbox() {
        if (!('caches' in window)) return;
        try {
            const c = await caches.open(DATA_CACHE);
            const url = new URL('__mdk/ask-inbox', document.baseURI).href;
            const r = await c.match(url);
            if (!r) return;
            const list = await r.json();
            await c.delete(url);
            if (!Array.isArray(list) || !list.length) return;
            list.forEach(x => {
                if (!x || !x.q) return;
                msgs.push({ role: 'user', text: String(x.q), at: x.at || Date.now() });
                if (x.a) msgs.push({ role: 'assistant', text: String(x.a), at: x.at || Date.now(), local: !!x.local });
            });
            save();
            if (!panel.hidden) renderAll();
        } catch (e) {}
    }

    function autosize() {
        input.style.height = 'auto';
        const h = input.scrollHeight + 2; // + الحدود
        input.style.height = Math.min(h, 140) + 'px';
        input.style.overflowY = h > 140 ? 'auto' : 'hidden';
    }

    // ---------- الإدخال بالصوت (إن دعمه المتصفح) ----------
    function setupVoice() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const mic = $('ask-mic');
        if (!SR || !mic) return;
        mic.hidden = false;
        mic.addEventListener('click', () => {
            if (rec) { try { rec.stop(); } catch (e) {} return; }
            rec = new SR(); rec.lang = 'ar-SA'; rec.interimResults = true; rec.continuous = false;
            const base = input.value ? input.value + ' ' : '';
            rec.onresult = e => { input.value = base + [...e.results].map(r => r[0].transcript).join(''); autosize(); };
            rec.onerror = e => { if (e.error === 'not-allowed') Toast.show('اسمح للمتصفح باستخدام الميكروفون'); };
            rec.onend = () => { rec = null; mic.classList.remove('is-on'); if (input.value.trim()) input.focus({ preventScroll: true }); };
            try { rec.start(); mic.classList.add('is-on'); } catch (e) { rec = null; }
        });
    }

    function init() {
        if (!panel) return;
        load();
        $('ask-fab')?.addEventListener('click', () => open());
        document.querySelectorAll('[data-ask-open]').forEach(b => b.addEventListener('click', () => open()));
        $('ask-close').addEventListener('click', () => close());
        $('ask-new').addEventListener('click', reset);
        form.addEventListener('submit', e => { e.preventDefault(); send(); });
        input.addEventListener('input', autosize);
        input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !isMobile()) { e.preventDefault(); send(); } });
        document.addEventListener('keydown', e => {
            if (e.key !== 'Escape' || panel.hidden || document.querySelector('.modal.open') || (typeof QSheet !== 'undefined' && QSheet.isOpen())) return;
            e.stopImmediatePropagation(); close();
        }, true);
        setupVoice();
        // رسالة من الإشعار (الضغط على «اسأل مُذكّر») أو رد محفوظ من داخل الإشعار
        mergeInbox();
        if (SW_OK) navigator.serviceWorker.addEventListener('message', async e => {
            const d = e.data || {};
            if (d.type === 'mdk-open-ask') { await mergeInbox(); open({ question: d.q || '' }); }
        });
        // رابط مباشر: ?ask=1&q=...
        const params = new URLSearchParams(location.search);
        if (params.get('ask') === '1') {
            const q = params.get('q') || '';
            history.replaceState(history.state, '', location.pathname);
            setTimeout(() => open({ question: q }), 400);
        }
    }
    return { init, open, close, send };
})();
