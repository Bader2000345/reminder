/* =====================================================================
 * مُذكّر — assistant.js
 * المساعد «اسأل مُذكّر»: رفيق محادثة يتذكّر ما سبق، يجيب من محتوى التطبيق (الأذكار والأحاديث والأدلة
 * ودليل استخدام التطبيق) ومن خارجه عبر سيرفر مُذكّر (‎/chat ← Cloudflare Workers AI).
 * - نصوص الأذكار وأدلتها تُعرض دائمًا من بيانات التطبيق الموثّقة (وسوم [[id]]) لا من النموذج.
 * - وسوم [[help:x]] تعرض بطاقة «كيف» بخطوات جهاز المستخدم وزر ينفّذ الشيء مباشرة.
 * - يُرسل مع السؤال «حالة الجهاز» (نوعه، الإشعارات، التثبيت…) دون أي بيانات شخصية، ليجيب بدقة.
 * - التحية والشكر تُجاب فورًا محليًا، ودون اتصال أو عند نفاد الحصة يجيب من محتوى التطبيق بأسلوب إنساني.
 * يحتاج قبله: knowledge.js، notifications.js (PUSH_SERVER)، reminders.js، adhkar-viewer.js، time-context.js، install.js
 * ===================================================================== */

const Assistant = (() => {
    const $ = id => document.getElementById(id);
    const KEY = 'mudhakkir-chat', DAY_KEY = 'mudhakkir-chat-day', VERSION = 2;
    const MAX_SAVED = 40, SEND_LAST = 12, DAILY = 20;
    const ID_RE = /\[\[((?:[\w-]+:\d+)|(?:help:[a-z-]+))\]\]/g, HAS_ID = /\[\[(?:[\w-]+:\d+|help:[a-z-]+)\]\]/;
    const DATA_CACHE = 'mudhakkir-data';
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const ar = n => Number(n).toLocaleString('ar-EG');
    const today = () => new Date().toISOString().slice(0, 10);
    const isMobile = () => matchMedia('(max-width:700px)').matches;
    const pick = list => list[Math.floor(Math.random() * list.length)];
    const nameOf = () => (typeof UserName !== 'undefined' ? UserName.get() : '');
    const timeOf = t => new Date(t || Date.now()).toLocaleTimeString('ar', { hour: 'numeric', minute: '2-digit' });
    // نص «التفكير» الذي قد يرسله بعض النماذج قبل الرد
    const stripThink = t => String(t || '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<think>[\s\S]*$/i, '').replace(/^\s+/, '');

    let msgs = [], busy = false, ctrl = null, ayahCtx = null, rec = null, convId = 0;
    const panel = $('ask-panel'), log = $('ask-log'), input = $('ask-input'), form = $('ask-form');

    // ---------- الحفظ في الجهاز ----------
    function load() {
        try {
            const d = JSON.parse(localStorage.getItem(KEY));
            if (d && Array.isArray(d.msgs)) {
                msgs = d.msgs.filter(m => m && m.text);
                // الإصدار ٦ غيّر ترتيب أذكار الصلاة: بطاقات المحادثات القديمة قد تشير لذكر آخر
                if ((d.v || 1) < 2) msgs.forEach(m => { m.text = m.text.replace(/\[\[post_prayer:\d+\]\]/g, ''); });
            }
        } catch (e) {}
    }
    function save() {
        msgs = msgs.slice(-MAX_SAVED);
        try { localStorage.setItem(KEY, JSON.stringify({ v: VERSION, msgs })); } catch (e) {}
    }
    function usedToday() {
        try { const d = JSON.parse(localStorage.getItem(DAY_KEY)); return d && d.d === today() ? d.n : 0; } catch (e) { return 0; }
    }
    function countUse() { try { localStorage.setItem(DAY_KEY, JSON.stringify({ d: today(), n: usedToday() + 1 })); } catch (e) {} }

    // ---------- حالة حيّة في رأس المحادثة: متصل / يكتب… / بدون إنترنت ----------
    function setStatus(s) {
        const box = $('ask-status'); if (!box) return;
        const state = s || (navigator.onLine ? 'online' : 'offline');
        box.dataset.state = state;
        box.querySelector('span').textContent = { online: 'متصل', typing: 'يكتب…', offline: 'بدون إنترنت · بجاوبك من محتوى التطبيق' }[state];
    }

    // ---------- حالة جهاز المستخدم (تُرسل للمساعد ليجيب بدقة؛ لا بيانات شخصية) ----------
    function platform() { try { return Install.info().platform; } catch (e) { return 'android'; } }
    function deviceInfo() {
        const now = new Date();
        const safe = fn => { try { return fn(); } catch (e) { return undefined; } };
        const inf = safe(() => Install.info()) || {};
        const w = safe(() => Wird.snapshot());
        return {
            platform: inf.platform, installed: typeof inf.standalone === 'boolean' ? inf.standalone : undefined,
            notif: safe(() => Notifier.permission()), push: safe(() => PushSync.state()),
            general: safe(() => GeneralReminder.isActive()), reminders: safe(() => Reminders.list().length),
            friday: safe(() => FridayReminder.isOn()), version: safe(() => APP_BUILD),
            update: !!($('update-banner') && !$('update-banner').hidden),
            time: `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`,
            day: now.toLocaleDateString('ar', { weekday: 'long' }),
            daytime: document.documentElement.dataset.daytime,
            page: (document.querySelector('.page-view.active-page')?.id || '').replace('page-', ''),
            wird: w ? { khatma: Math.round(w.khatmaPct) || 0, today: Math.round(w.todayPct) || 0, streak: Math.round(w.streak) || 0 } : undefined
        };
    }

    // ---------- أزرار تنفّذ الشيء مباشرة (من بطاقات «كيف») ----------
    const later = (fn, ms = 180) => setTimeout(fn, ms);
    const ACTIONS = {
        install: () => Install.start(),
        update: () => { navigateTo('settings'); later(() => UpdateNotice.check(true)); },
        notifications: () => navigateTo('my-adhkar'),
        general: () => { navigateTo('my-adhkar'); later(() => $('general-reminder-card')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300); },
        reminder: () => { navigateTo('my-adhkar'); later(() => Reminders.openForm()); },
        kahf: () => FridayReminder.openKahf(),
        wird: () => navigateTo('quran'),
        reader: () => { navigateTo('free-reading'); Reader.enter(); },
        search: () => { navigateTo('free-reading'); Reader.enter(); later(() => $('rd-search-btn')?.click(), 500); },
        adhkar: () => navigateTo('adhkar'),
        situations: () => { navigateTo('adhkar'); later(() => AdhkarViewer.openSituations()); },
        tasbih: () => { navigateTo('home'); later(() => $('tasbih-orb')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300); },
        home: () => navigateTo('home'),
        settings: () => navigateTo('settings'),
        name: () => { navigateTo('settings'); later(() => { $('name-setting')?.scrollIntoView({ block: 'center', behavior: 'smooth' }); $('name-input')?.focus({ preventScroll: true }); }, 350); }
    };
    async function shareApp() {
        const text = 'مُذكّر — تطبيق القرآن والأذكار والتذكير 🤍\n' + (typeof SITE_URL !== 'undefined' ? SITE_URL : location.href);
        try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { return; }
        try { await navigator.clipboard.writeText(text); Toast.show('تم نسخ رابط التطبيق'); } catch (e) {}
    }
    function runAction(id) {
        if (id === 'share-app') return shareApp(); // المشاركة لا تغلق المحادثة
        const fn = ACTIONS[id]; if (!fn) return;
        close();
        try { fn(); } catch (e) {}
    }

    // ---------- بطاقة «كيف» من دليل التطبيق ----------
    function helpCard(it) {
        const h = it.help;
        const c = el('article', 'ask-card ask-help');
        const head = el('header', 'ask-card-head');
        head.append(el('span', 'ask-card-kicker', '🧭 دليل التطبيق'), el('strong', '', h.title));
        c.append(head);
        const steps = Knowledge.stepsFor(h, platform());
        if (steps.length) { const ol = el('ol', 'ask-steps'); steps.forEach(s => ol.append(el('li', '', s))); c.append(ol); }
        if (h.extra) {
            // ملاحظة لحالة خاصة: مطوية حتى لا تطوّل البطاقة على الجميع
            const d = el('details', 'ask-extra'), s = el('summary', '', h.extraTitle || 'ملاحظة');
            d.append(s, el('p', 'ask-card-tip', h.extra));
            c.append(d);
        }
        if (h.action) {
            const b = el('button', 'ask-action', h.action.label); b.type = 'button';
            b.addEventListener('click', () => runAction(h.action.id));
            c.append(b);
        }
        return c;
    }

    // ---------- بطاقة ذكر موثّقة من محتوى التطبيق ----------
    function dhikrCard(it) {
        const c = el('article', 'ask-card');
        const head = el('header', 'ask-card-head');
        head.append(el('span', 'ask-card-kicker', '📖 من أذكار التطبيق'), el('strong', '', [it.groupTitle, it.label].filter(Boolean).join(' · ')));
        c.append(head, el('p', 'ask-card-text' + (/[﴿]/.test(it.text) ? ' is-quran' : ''), it.text));
        if (it.text.length > 320) {
            c.classList.add('is-long');
            const more = el('button', 'ask-more', 'عرض النص كاملًا'); more.type = 'button';
            more.addEventListener('click', () => { c.classList.remove('is-long'); more.remove(); });
            c.append(more);
        }
        const meta = [it.ref, it.count > 1 ? `يُقال ${ar(it.count)} مرات` : ''].filter(Boolean).join(' · ');
        if (meta) c.append(el('p', 'ask-card-meta', meta));
        if (it.tip) c.append(el('p', 'ask-card-tip', it.tip));
        const acts = el('div', 'ask-card-actions');
        const btn = (label, fn, cls = '') => { const b = el('button', 'ask-chip-btn ' + cls, label); b.type = 'button'; b.addEventListener('click', fn); acts.append(b); return b; };
        if (it.hadith) {
            // الدليل مطوي افتراضيًا حتى تبقى المحادثة خفيفة
            const q = el('blockquote', 'ask-card-hadith', it.hadith); q.hidden = true;
            if (it.source) q.append(el('cite', '', it.source));
            const t = btn('الدليل ▾', () => { q.hidden = !q.hidden; t.textContent = q.hidden ? 'الدليل ▾' : 'إخفاء الدليل ▴'; t.setAttribute('aria-expanded', String(!q.hidden)); }, 'is-proof');
            t.setAttribute('aria-expanded', 'false');
            c.append(q);
        }
        btn('نسخ', async () => {
            try { await navigator.clipboard.writeText([it.text, it.hadith ? `\n${it.hadith}${it.source ? ` (${it.source})` : ''}` : ''].join('')); Toast.show('تم نسخ الذكر'); } catch (e) {}
        });
        btn('ذكّرني فيه', () => remindOf(it));
        if (typeof ADHKAR_DATABASE !== 'undefined' && ADHKAR_DATABASE[it.group]) {
            btn('افتح في الأذكار', () => { close(); setTimeout(() => AdhkarViewer.open(it.group, it.idx), 120); });
        }
        c.append(acts);
        return c;
    }
    function remindOf(it) {
        close();
        navigateTo('my-adhkar');
        setTimeout(() => Reminders.openForm({ title: it.label || it.groupTitle, text: it.text.slice(0, 500) }), 160);
    }
    function card(id) {
        const it = Knowledge.get(id);
        if (!it) return null;
        return it.kind === 'help' ? helpCard(it) : dhikrCard(it);
    }

    // ---------- تنسيق رد المساعد: فقرات + بطاقات [[id]] ----------
    function inline(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }
    function paintAnswer(box, text, done) {
        box.replaceChildren();
        const shown = new Set();
        let list = null;
        const lines = stripThink(text).replace(/\r/g, '').split('\n');
        lines.forEach((raw, i) => {
            const ids = [...raw.matchAll(ID_RE)].map(m => m[1]);
            const line = raw.replace(ID_RE, '').replace(/^#+\s*/, '').trim();
            // وسم لم يكتمل بعد أثناء البث
            const partial = !done && i === lines.length - 1 && /\[\[[^\]]*$/.test(line);
            const clean = partial ? line.replace(/\[\[[^\]]*$/, '').trim() : line;
            if (clean) {
                if (/^([-•*]|\d+[.)])\s+/.test(clean)) {
                    if (!list) { list = el(/^\d/.test(clean) ? 'ol' : 'ul', 'ask-list'); box.append(list); }
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
        return shown;
    }

    function bubble(m) {
        const row = el('div', 'ask-row ' + (m.role === 'user' ? 'is-user' : 'is-bot'));
        const b = el('div', 'ask-bubble');
        if (m.role === 'user') b.append(el('span', 'ask-text', m.text));
        else paintAnswer(b, m.text, true);
        if (m.ayah && m.role === 'user') { const q = el('blockquote', 'ask-ayah', '﴿' + m.ayah.text + '﴾'); q.append(el('cite', '', m.ayah.ref)); b.prepend(q); }
        const foot = el('div', 'ask-meta');
        if (m.note) foot.append(el('span', 'ask-note-line', m.note));
        foot.append(el('time', 'ask-time', timeOf(m.at)));
        b.append(foot);
        row.append(b);
        return row;
    }
    // الفقاعات المتتالية من نفس الطرف تُجمَّع (مثل تطبيقات المحادثة)
    function appendRow(row) {
        const last = log.lastElementChild;
        if (last && last.classList.contains('ask-row') && last.className.split(' ')[1] === row.className.split(' ')[1]) row.classList.add('is-cont');
        log.append(row);
    }

    // ---------- اقتراحات متابعة تحت آخر رد ----------
    function followups(m) {
        const ids = [...String(m.text).matchAll(ID_RE)].map(x => x[1]);
        const dhikr = ids.map(id => Knowledge.get(id)).filter(it => it && it.kind !== 'help');
        const help = ids.map(id => Knowledge.get(id)).find(it => it && it.kind === 'help');
        if (dhikr.length) return [
            { label: '🔔 ذكّرني فيه كل يوم', act: () => remindOf(dhikr[0]) },
            { label: 'كمان واحد', q: 'عطيني غيره' },
            { label: 'شو فضله؟', q: 'شو فضل هالذكر؟' }
        ];
        if (help) return [
            { label: 'ما زبط معي', q: 'جرّبت وما زبط معي، شو ممكن يكون السبب؟' },
            { label: 'شكرًا 🤍', q: 'شكرًا' }
        ];
        return [
            { label: 'عطيني ذكر يريّح القلب', q: 'عطيني ذكر يريّح القلب' },
            { label: 'شكرًا 🤍', q: 'شكرًا' }
        ];
    }
    function paintFollowups() {
        log.querySelectorAll('.ask-followups').forEach(n => n.remove());
        const last = msgs[msgs.length - 1];
        if (!last || last.role !== 'assistant' || busy) return;
        const box = el('div', 'ask-followups');
        followups(last).forEach(f => {
            const b = el('button', 'ask-chip', f.label); b.type = 'button';
            b.addEventListener('click', () => f.act ? f.act() : send(f.q));
            box.append(b);
        });
        log.append(box);
    }

    // ---------- الترحيب حسب الوقت والاسم ----------
    function greeting() {
        const h = new Date().getHours(), name = nameOf(), n = name ? ` يا ${name}` : '';
        if (h >= 4 && h < 12) return `صباح الخير${n} ☀️`;
        if (h >= 12 && h < 18) return `مسا الخير${n} 🌤️`;
        return `مسا النور${n} 🌙`;
    }
    function suggestions() {
        const now = new Date(), h = now.getHours(), list = [];
        if (now.getDay() === 5) list.push('شو فضل سورة الكهف يوم الجمعة؟');
        if (h >= 4 && h < 11) list.push('أذكار الصباح', 'دعاء للرزق والتوفيق');
        else if (h >= 15 && h < 21) list.push('أذكار المساء', 'دعاء للهمّ والضيق');
        else if (h >= 21 || h < 4) list.push('شو بقول قبل النوم؟', 'ما عم يجيني نوم');
        else list.push('أذكار بعد الصلاة', 'دعاء للهمّ والضيق');
        list.push('عطيني ذكر عند الغضب', 'كيف بثبّت التطبيق؟', 'ليش ما عم توصلني الإشعارات؟');
        return list.slice(0, 6);
    }
    function welcome() {
        const box = el('div', 'ask-welcome');
        box.append(
            el('div', 'ask-welcome-mark brand-logo'),
            el('h3', '', greeting()),
            el('p', '', 'أنا مُذكّر، معك بأي وقت: ذكر لموقف عم تمرّ فيه، فضل سورة أو دعاء، أو أي شي بالتطبيق. شو ببالك؟')
        );
        const chips = el('div', 'ask-suggest');
        suggestions().forEach(s => { const b = el('button', 'ask-chip', s); b.type = 'button'; b.addEventListener('click', () => send(s)); chips.append(b); });
        box.append(chips);
        return box;
    }

    function renderAll() {
        log.replaceChildren();
        if (!msgs.length) log.append(welcome());
        msgs.forEach(m => appendRow(bubble(m)));
        paintFollowups();
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

    // ---------- ردود فورية إنسانية (تحية، شكر، كيفك، مين إنت) دون استهلاك الحصة ----------
    function smallTalk(q) {
        const t = Knowledge.norm(q);
        if (t.split(' ').length > 7) return null;
        const name = nameOf(), n = name ? ` يا ${name}` : '';
        if (/(^| )(السلام عليكم|سلام عليكم|السلام عليكم ورحمه الله|سلام)( |$)/.test(t))
            return pick([`وعليكم السلام ورحمة الله وبركاته 🤍 كيفك${n}؟ شو بتحب نعمل اليوم؟`, `وعليكم السلام ورحمة الله${n} 🤍 نوّرت! كيف فيني ساعدك؟`]);
        if (/(شكرا|يسلمو|يسلموا|تسلم|مشكور|ممنون|جزاك الله|يعطيك العافيه|الله يعطيك العافيه|يعطيك الف عافيه)/.test(t))
            return pick(['العفو، الله يجزيك كل خير 🤍', `تكرم عيونك${n}! وإذا احتجت شي أنا هون.`, 'ولو، هاد واجبي 😊 الله يتقبّل منك.', 'الله يعافيك ويسعدك 🤍 لا تنساني من دعائك.']);
        if (/(كيفك|كيف حالك|شلونك|كيف الحال|شو اخبارك|كيفك اليوم|شخبارك)/.test(t))
            return pick(['الحمد لله بخير، وأحلى شي لما نتذاكر سوا 😊 وإنت كيفك؟ إن شاء الله مرتاح.', `الحمد لله على كل حال 🤍 وإنت كيفك${n}؟ في شي ببالك اليوم؟`]);
        if (/(مين انت|انت مين|شو انت|انت انسان|انت روبوت|انت بوت|شو اسمك)/.test(t))
            return 'أنا مُذكّر 🤍 مساعد جوّا التطبيق، مو إنسان، بس موجود دايمًا: بعطيك الذكر المناسب لأي موقف مع دليله، وبساعدك بأي شي بالتطبيق. شو بدك نعمل؟';
        if (/^(مرحبا|مرحبتين|اهلين|اهلا|هلا|هاي|هلو|صباح الخير|صباحو|مسا الخير|مساء الخير|مسا النور|صباح النور)( |$)/.test(t))
            return `${greeting()} أهلين فيك! كيف فيني ساعدك؟`;
        return null;
    }

    // ---------- رد من محتوى التطبيق (دون اتصال، أو نفاد الحصة، أو تعطل السيرفر) ----------
    const INTROS = ['هاد اللي لقيتلك ياه من أذكار التطبيق:', 'تفضّل، هاد الذكر المناسب 🤍', 'خذ هالذكر، إن شاء الله ينفعك:'];
    function localAnswer(q, items) {
        const nq = Knowledge.norm(q);
        const wantsDhikr = /(ذكر|اذكار|دعاء|ادعيه|فضل|حديث|بقول|اقول|نقول|شو بقول)/.test(nq);
        const dhikr = items.filter(it => it.kind !== 'help');
        const h = items.find(it => it.kind === 'help') || (() => { const x = Knowledge.helpFor(q); return x ? Knowledge.get(x.id) : null; })();
        if (h && !(wantsDhikr && dhikr.length)) return `${h.text}\n[[${h.id}]]`;
        if (dhikr.length) {
            // أفضل نتيجة وما معها من نفس القسم (حتى لا تظهر نتيجة بعيدة لمجرد تشابه كلمة)
            const top = dhikr.filter(it => it.group === dhikr[0].group).slice(0, 3);
            return (Knowledge.comfortFor(dhikr[0].group) || pick(INTROS)) + '\n' + top.map(it => `[[${it.id}]]`).join('\n');
        }
        return pick([
            'ما لقيت شي مطابق بمحتوى التطبيق 🤍 جرّب تكتبها بكلمة تانية، مثلًا: الغضب، الهمّ، السفر، قبل النوم.',
            'سامحني، ما لقيت هالشي عندي. فيك تسألني عن ذكر لموقف (غضب، همّ، سفر، مطر…) أو عن أي ميزة بالتطبيق.'
        ]);
    }
    const NOTES = { offline: 'بدون إنترنت · رد من محتوى التطبيق', limit: 'رد سريع من محتوى التطبيق · المساعد الذكي يرجع بكرة', quota: 'رد سريع من محتوى التطبيق', error: 'رد سريع من محتوى التطبيق' };

    // ---------- الاتصال بالسيرفر (بثّ الرد وهو يُكتب) ----------
    async function stream(res, onText) {
        const type = res.headers.get('Content-Type') || '';
        if (!type.includes('event-stream') || !res.body) {
            const j = await res.json().catch(() => null);
            const t = j && (j.response || (j.result && j.result.response) || (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content)) || '';
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
        log.querySelectorAll('.ask-followups').forEach(n => n.remove());
        if (!msgs.length) log.replaceChildren();
        const userMsg = { role: 'user', text: q, at: Date.now() };
        if (ayahCtx) userMsg.ayah = ayahCtx;
        msgs.push(userMsg); save();
        appendRow(bubble(userMsg));
        // فقاعة الرد مع مؤشر الكتابة
        const row = el('div', 'ask-row is-bot'), b = el('div', 'ask-bubble');
        const dots = el('span', 'ask-typing'); dots.innerHTML = '<i></i><i></i><i></i>'; b.append(dots);
        row.append(b); log.append(row); scrollDown();
        setStatus('typing');

        const conv = convId;
        const ayah = ayahCtx; ayahCtx = null;
        let text = '', local = false, reason = '';
        // تحية أو شكر: رد فوري إنساني (مع لحظة «يكتب…» قصيرة)
        const quick = !ayah && smallTalk(q);
        if (quick) { await new Promise(r => setTimeout(r, 450 + Math.random() * 350)); text = quick; }
        const items = quick ? [] : retrieve(q);
        if (!quick) {
            if (!PUSH_SERVER) reason = 'error';
            else if (!navigator.onLine) reason = 'offline';
            else if (usedToday() >= DAILY) reason = 'limit';
        }
        if (!quick && !reason) {
            const my = ctrl = new AbortController();
            const timer = setTimeout(() => my.abort(), 45000);
            try {
                const recent = msgs.slice(-SEND_LAST);
                const earlier = msgs.slice(0, -SEND_LAST).filter(m => m.role === 'user').map(m => m.text.slice(0, 80)).slice(-8);
                const plat = platform();
                const res = await fetch(PUSH_SERVER + '/chat', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: my.signal,
                    body: JSON.stringify({
                        messages: recent.map(m => ({ role: m.role, content: m.text })),
                        items: Knowledge.forModel(items, plat), ayah, name: nameOf(), device: deviceInfo(), earlier
                    })
                });
                if (!res.ok) {
                    const j = await res.json().catch(() => ({}));
                    reason = j.error === 'limit' ? 'limit' : j.error === 'quota' ? 'quota' : 'error';
                } else {
                    countUse();
                    let raf = 0;
                    text = await stream(res, t => {
                        if (raf) return;
                        raf = requestAnimationFrame(() => { raf = 0; if (stripThink(t).trim()) { paintAnswer(b, t, false); b.classList.add('is-streaming'); scrollDown(true); } });
                    });
                    cancelAnimationFrame(raf);
                    text = stripThink(text);
                    if (!text.trim()) reason = 'error';
                }
            } catch (e) { reason = navigator.onLine ? 'error' : 'offline'; }
            finally { clearTimeout(timer); if (ctrl === my) ctrl = null; }
        }
        // بدأ المستخدم «محادثة جديدة» أثناء الانتظار: نتجاهل هذا الرد
        if (conv !== convId) { row.remove(); return; }
        if (reason) {
            local = true;
            text = localAnswer(q, items);
            // سؤال عن آية: نعرض معناها من التفسير الميسر بدل الرد العام
            if (ayah && ayah.s && typeof Tafsir !== 'undefined') {
                try { text = `معنى الآية باختصار من «التفسير الميسر» 🤍\n${await Tafsir.get('muyassar', ayah.s, ayah.a)}\n\nوإذا بدك تفصيل أكتر: اضغط مطوّلًا على الآية ← «التفسير» (المختصر وابن كثير).`; } catch (e) {}
            }
        }
        // طلب ذكرًا صراحةً ولم يذكر المساعد أي ذكر من التطبيق: نضيف أقرب نتيجة
        const direct = !quick && Knowledge.search(q, { limit: 1, help: false })[0];
        if (!local && direct && !HAS_ID.test(text) && !Knowledge.helpFor(q) && /ذكر|دعاء|اذكار|أذكار|ادعي|أدعية|بقول|اقول|أقول|نقول/.test(q)) text += `\n[[${direct.id}]]`;
        if (conv !== convId) { row.remove(); return; }
        const botMsg = { role: 'assistant', text: text.trim(), at: Date.now() };
        if (local) { botMsg.local = true; botMsg.note = NOTES[reason] || NOTES.error; }
        msgs.push(botMsg); save();
        b.classList.remove('is-streaming');
        const fresh = bubble(botMsg);
        if (row.classList.contains('is-cont')) fresh.classList.add('is-cont');
        row.replaceWith(fresh);
        busy = false; form.classList.remove('is-busy');
        setStatus();
        paintFollowups();
        scrollDown();
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
            setStatus();
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
        setStatus();
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
                if (x.a) msgs.push({ role: 'assistant', text: stripThink(String(x.a)), at: x.at || Date.now(), local: !!x.local, note: x.local ? NOTES.error : undefined });
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
        addEventListener('online', () => { if (!busy) setStatus(); });
        addEventListener('offline', () => { if (!busy) setStatus(); });
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
