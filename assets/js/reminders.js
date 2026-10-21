/* =====================================================================
 * مُذكّر — reminders.js
 * أذكاري: التذكيرات الشخصية (يومي / أيام محددة / مرة واحدة)، البطاقات، ونموذج الإضافة والتعديل،
 * و«جاهزة بضغطة» (إ١، الإصدار ١٥).
 * يُحمَّل بالترتيب من index.html؛ الأجزاء تتشارك المتغيرات العامة فيما بينها.
 * ===================================================================== */

// ===== أذكاري: تذكيرات شخصية (يومية / أيام محددة / مرة واحدة) =====
const Reminders = (() => {
    const KEY = 'mudhakkir-reminders';
    const SHOWN_KEY = 'mudhakkir-reminders-shown';
    const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5];
    const $ = id => document.getElementById(id);
    let list = [];
    try { list = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { list = []; }
    list = (Array.isArray(list) ? list : []).filter(r => r && r.id && /^\d\d:\d\d$/.test(r.time))
        .map(r => ({ repeat: 'daily', days: [], date: '', since: 0, on: true, ...r }));
    const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} };
    const fmtTime = t => { const [h, m] = t.split(':'); return new Date(2000, 0, 1, h, m).toLocaleTimeString('ar', { hour: 'numeric', minute: '2-digit' }); };
    const fmtDate = key => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }); };
    const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt !== undefined) n.textContent = txt; return n; };

    function scheduleText(r) {
        if (r.repeat === 'once') return `مرة واحدة · ${r.date ? fmtDate(r.date) : '—'} · ${fmtTime(r.time)}`;
        if (r.repeat === 'days') {
            const days = WEEK_ORDER.filter(d => (r.days || []).includes(d));
            return `${days.length === 7 ? 'كل يوم' : days.map(d => DAY_NAMES[d]).join('، ')} · ${fmtTime(r.time)}`;
        }
        return `كل يوم · ${fmtTime(r.time)}`;
    }
    function relDay(d) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - today) / 864e5);
        return diff === 0 ? 'اليوم' : diff === 1 ? 'غدًا' : DAY_NAMES[d.getDay()];
    }
    function statusText(r) {
        if (!r.on) return 'متوقف · فعّل المفتاح ليصلك هذا التذكير.';
        const n = Sched.next(r);
        if (!n) return 'انتهى موعد هذا التذكير.';
        const when = `القادم ${relDay(n)} ${fmtTime(r.time)}`;
        const perm = Notifier.permission();
        if (perm === 'unsupported') return `${when} · يظهر داخل التطبيق فقط (المتصفح لا يدعم الإشعارات)`;
        if (perm === 'denied') return `${when} · الإشعارات محظورة، فعّلها من إعدادات المتصفح`;
        if (perm !== 'granted') return `${when} · اضغط «جرّب إشعارًا الآن» للسماح بالإشعارات`;
        const bg = { on: 'يصلك حتى والتطبيق مغلق ✓', pending: 'جارٍ تفعيل الإشعار في الخلفية…', error: 'تعذّر تفعيل الخلفية، يعمل والتطبيق مفتوح', outdated: 'سيرفر الإشعارات قديم (حدّث worker.js)، يعمل والتطبيق مفتوح', unsupported: 'يعمل والتطبيق مفتوح', nourl: 'يعمل والتطبيق مفتوح', off: '' }[PushSync.state()] || '';
        return `مفعّل · ${when}${bg ? ' · ' + bg : ''}`;
    }
    const badgeText = r => ({ daily: 'يومي', days: 'أيام محددة', once: 'مرة واحدة' })[r.repeat] || 'يومي';

    function render() {
        const box = $('personal-reminders');
        box.querySelectorAll('[data-user="1"]').forEach(n => n.remove());
        const sorted = [...list].sort((a, b) => a.time.localeCompare(b.time));
        sorted.forEach((r, i) => {
            const card = el('article', 'personal-reminder is-user' + (r.on ? '' : ' is-off'));
            card.dataset.user = '1';
            card.style.setProperty('--i', i);
            const copy = el('div', 'personal-copy');
            const title = el('strong', '', r.title);
            title.append(el('span', 'lock-badge', badgeText(r)));
            const actions = el('div', 'rem-actions');
            const test = el('button', 'ghost-button', 'جرّب إشعارًا الآن'); test.type = 'button';
            test.addEventListener('click', async () => {
                if (await Notifier.ensurePermission() === 'granted') { Notifier.system(r.title, r.text, 'rem-' + r.id); syncNotifications(); }
                InAppReminder.show([r]);
                render();
            });
            const edit = el('button', 'ghost-button', 'تعديل'); edit.type = 'button';
            edit.addEventListener('click', () => openForm(r));
            const del = el('button', 'delete-reminder', 'حذف'); del.type = 'button';
            del.addEventListener('click', () => {
                if (!confirm('حذف التذكير «' + r.title + '»؟')) return;
                list = list.filter(x => x.id !== r.id); persist(); render(); syncNotifications();
            });
            actions.append(test, edit, del);
            copy.append(title, el('small', '', scheduleText(r)), el('p', 'rem-text', r.text), el('p', 'rem-status', statusText(r)), actions);
            const sw = el('label', 'switch'); sw.title = 'تفعيل أو إيقاف التذكير';
            const inp = document.createElement('input');
            inp.type = 'checkbox'; inp.checked = r.on; inp.setAttribute('aria-label', 'تفعيل ' + r.title);
            inp.addEventListener('change', async () => {
                r.on = inp.checked; r.since = Date.now(); persist();
                if (r.on) await Notifier.ensurePermission();
                render(); syncNotifications();
            });
            sw.append(inp, el('span'));
            card.append(copy, sw);
            box.insertBefore(card, $('rem-empty'));
        });
        $('rem-empty').style.display = list.length ? 'none' : 'block';
        renderTemplates();
        // سطر الوصف تحت العنوان: كم تذكير شغّال (الشخصية + الجمعة + الورد + الأذكار العامة)
        const lead = $('mine-lead');
        if (lead) {
            const n = allReminders().filter(r => r.on).length + (GeneralReminder.isActive() ? 1 : 0);
            const AR = Number(n).toLocaleString('ar-EG');
            lead.textContent = !n ? 'تذكيراتك، تصلك في وقتها' : n === 1 ? 'تذكير واحد مفعّل' : n === 2 ? 'تذكيران مفعّلان'
                : n <= 10 ? `${AR} تذكيرات مفعّلة` : `${AR} تذكيرًا مفعّلًا`;
        }
    }

    // ---------- إ١ (الإصدار ١٥): تذكيرات جاهزة بضغطة ----------
    // يلي بتضيفه بيختفي من هون (منعرفه بـ tpl)، وبتقدر تعدّله أو تحذفه متل أي تذكير
    const TEMPLATES = [
        { tpl: 'morning', title: 'أذكار الصباح', text: 'حان وقت أذكار الصباح، ابدأ يومك بذكر الله.', time: '06:00', repeat: 'daily' },
        { tpl: 'evening', title: 'أذكار المساء', text: 'حان وقت أذكار المساء، اختم نهارك بذكر الله.', time: '17:00', repeat: 'daily' },
        { tpl: 'mulk', title: 'سورة الملك', text: 'اقرأ سورة الملك قبل ما تنام.', time: '22:00', repeat: 'daily' },
        { tpl: 'sleep', title: 'أذكار النوم', text: 'قبل ما تنام: آية الكرسي والمعوّذات وأذكار النوم.', time: '23:00', repeat: 'daily' },
        { tpl: 'salat-friday', title: 'الصلاة على النبي ﷺ', text: 'يوم الجمعة: أكثر من الصلاة على النبي ﷺ. اللهم صلِّ وسلّم على نبينا محمد.', time: '12:00', repeat: 'days', days: [5] },
        { tpl: 'fast', title: 'صيام الاثنين والخميس', text: 'بكرا يوم صيام سنّة، انوِ الصيام من الليلة إن استطعت.', time: '21:00', repeat: 'days', days: [0, 3] }
    ];
    function renderTemplates() {
        const box = $('rem-templates'); if (!box) return;
        const taken = new Set(list.map(r => r.tpl).filter(Boolean));
        const free = TEMPLATES.filter(t => !taken.has(t.tpl));
        box.replaceChildren(...free.map(t => {
            const b = el('button', 'glist-row tpl-row'); b.type = 'button';
            const copy = el('span', 'tpl-copy');
            copy.append(el('strong', '', t.title), el('small', '', scheduleText({ ...t, days: t.days || [] })));
            b.append(copy, el('span', 'tpl-add', 'إضافة'));
            b.setAttribute('aria-label', `إضافة تذكير ${t.title}، ${scheduleText({ ...t, days: t.days || [] })}`);
            b.addEventListener('click', () => addPreset(t));
            return b;
        }));
        if (!free.length) box.append(el('p', 'empty-note', 'أضفت كل التذكيرات الجاهزة ✓ وبتقدر تعدّلها من فوق.'));
    }
    async function addPreset(t) {
        if (list.some(r => r.tpl === t.tpl)) return;
        list.push({ id: Date.now(), title: t.title, text: t.text, time: t.time, repeat: t.repeat, days: t.days || [], date: '', preset: t.time, on: true, since: Date.now(), tpl: t.tpl });
        persist();
        await Notifier.ensurePermission();
        render();
        syncNotifications();
        Toast.show(`انضاف «${t.title}»، بيوصلك ${scheduleText({ ...t, days: t.days || [] })}`);
    }

    // ---------- نموذج الإضافة والتعديل ----------
    let formRepeat = 'daily';
    const formDays = new Set();
    function setRepeat(v) {
        formRepeat = v;
        document.querySelectorAll('#rem-repeat [data-repeat]').forEach(b => b.classList.toggle('active', b.dataset.repeat === v));
        $('rem-days-field').hidden = v !== 'days';
        $('rem-date-field').hidden = v !== 'once';
    }
    function paintDays() {
        document.querySelectorAll('#rem-days [data-day]').forEach(b => {
            const on = formDays.has(Number(b.dataset.day));
            b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on));
        });
    }
    function showError(msg) { const e = $('rem-error'); e.textContent = msg || ''; e.hidden = !msg; }
    // r بلا id = تذكير جديد بعنوان ونص جاهزين (من المساعد مثلًا)
    function openForm(r = null) {
        showError('');
        const editing = !!(r && r.id);
        $('rem-modal-title').textContent = editing ? 'تعديل التذكير' : 'تذكير جديد';
        $('rem-submit').textContent = editing ? 'حفظ التعديلات' : 'حفظ التذكير';
        $('rem-id').value = editing ? r.id : '';
        $('rem-title').value = r ? (r.title || '') : '';
        $('rem-text').value = r ? (r.text || '') : '';
        const time = r && r.time ? r.time : '06:30';
        $('rem-preset').value = [...$('rem-preset').options].some(o => o.value === time) ? time : 'custom';
        Picker.setValue($('rem-time'), time, false);
        Picker.setValue($('rem-date'), r && r.date ? r.date : Sched.dayKey(new Date()), false);
        $('rem-date').min = Sched.dayKey(new Date());
        formDays.clear(); (r && r.days && r.days.length ? r.days : [0, 1, 2, 3, 4, 5, 6]).forEach(d => formDays.add(d)); paintDays();
        setRepeat(r && r.repeat ? r.repeat : 'daily');
        setModalState($('reminder-modal'), true);
        setTimeout(() => $('rem-title').focus(), 60);
    }

    async function submit(e) {
        e.preventDefault();
        const title = $('rem-title').value.trim();
        const text = $('rem-text').value.trim();
        const time = $('rem-time').value;
        const date = $('rem-date').value;
        if (!title) return showError('اكتب عنوانًا للتذكير.');
        if (!text) return showError('اكتب نص الذكر الذي تريد أن يصلك.');
        if (!/^\d\d:\d\d$/.test(time)) return showError('اختر وقت التذكير.');
        if (formRepeat === 'days' && !formDays.size) return showError('اختر يومًا واحدًا على الأقل.');
        if (formRepeat === 'once') {
            if (!date) return showError('اختر تاريخ التذكير.');
            const [y, m, d] = date.split('-').map(Number), [h, mi] = time.split(':').map(Number);
            if (new Date(y, m - 1, d, h, mi) <= new Date()) return showError('هذا الموعد مضى، اختر تاريخًا أو وقتًا لاحقًا.');
        }
        const data = { title, text, time, repeat: formRepeat, days: formRepeat === 'days' ? [...formDays].sort() : [], date: formRepeat === 'once' ? date : '', preset: $('rem-preset').value, on: true, since: Date.now() };
        const id = $('rem-id').value;
        const existing = id && list.find(x => String(x.id) === id);
        if (existing) Object.assign(existing, data);
        else list.push({ id: Date.now(), ...data });
        persist();
        setModalState($('reminder-modal'), false);
        await Notifier.ensurePermission();
        render();
        syncNotifications();
        Toast.show(existing ? 'تم تعديل التذكير' : 'تم حفظ التذكير، سيصلك في موعده بإذن الله');
    }

    // فحص دوري: الـ Service Worker يعرض التذكير (ويمنع التكرار)، وإن لم يتوفر نفحص هنا
    async function tick() {
        const all = allReminders(); // مع تذكير الجمعة
        if (!all.some(r => r.on)) return;
        // الـ Service Worker هو المرجع الوحيد لما عُرض (حتى لا يتكرر التذكير عند فتح التطبيق)
        if (SW_OK) {
            try {
                const reg = await navigator.serviceWorker.getRegistration();
                if (reg && reg.active) { reg.active.postMessage({ type: 'mdk-check' }); return; }
                if (reg) return; // قيد التثبيت: ننتظر الفحص التالي بدل فحص منفصل قد يكرر الإشعار
            } catch (e) {}
        }
        const now = Date.now();
        let shown = {};
        try { shown = JSON.parse(localStorage.getItem(SHOWN_KEY)) || {}; } catch (e) {}
        const fired = [];
        all.forEach(r => {
            const at = Sched.occurrence(r, now); if (!at) return;
            const k = r.id + '@' + Sched.dayKey(at);
            if (shown[k]) return;
            shown[k] = now; fired.push(r);
        });
        if (!fired.length) return;
        Object.keys(shown).forEach(k => { if (now - shown[k] > 3 * 864e5) delete shown[k]; });
        try { localStorage.setItem(SHOWN_KEY, JSON.stringify(shown)); } catch (e) {}
        fired.forEach(r => Notifier.system(r.title, r.text, 'rem-' + r.id));
        InAppReminder.show(fired);
        render();
    }

    function init() {
        $('rem-new').addEventListener('click', () => openForm());
        $('reminder-form').addEventListener('submit', submit);
        document.querySelectorAll('#rem-repeat [data-repeat]').forEach(b => b.addEventListener('click', () => setRepeat(b.dataset.repeat)));
        document.querySelectorAll('#rem-days [data-day]').forEach(b => b.addEventListener('click', () => {
            const d = Number(b.dataset.day);
            formDays.has(d) ? formDays.delete(d) : formDays.add(d); paintDays();
        }));
        $('rem-preset').addEventListener('change', e => { if (e.target.value !== 'custom') Picker.setValue($('rem-time'), e.target.value); });
        $('rem-time').addEventListener('change', () => { if ($('rem-preset').value !== $('rem-time').value) $('rem-preset').value = 'custom'; });
        PushSync.onChange(render);
        setInterval(tick, 20000);
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { tick(); render(); } });
        setInterval(render, 60000);
        render();
        tick();
    }
    return { init, render, list: () => list, openForm, addPreset, TEMPLATES };
})();
