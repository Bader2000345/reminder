/* =====================================================================
 * مُذكّر — extras.js  (الإصدار ١٤)
 *   Hijri      إ٤ التاريخ الهجري جنب التاريخ بالرئيسية (تقويم أم القرى من المتصفح نفسه، بلا نت)،
 *              مع تصحيح يوم ± من الإعدادات، وبطاقة للأيام المميزة (البيض، عاشوراء، عرفة، العشر، العيدين…)
 *   WeekLog    إ٨ تقويم آخر ٧ أيام بالرئيسية: الورد، الأذكار، التسبيح (نقاط هادية)،
 *              و«إحصائيات الشهر» (الإصدار ١٥): آخر ٣٠ يوم كشبكة + أطول سلسلة، و«أتممت» من الإشعار (sw.js) *   Backup     إ٦ حفظ نسخة من كل بيانات مُذكّر بملف، واسترجاعها بأي جهاز
 *   Shortcuts  إ٧ اختصارات أيقونة التطبيق (manifest.json): ?open=tasbih-mode | morning | evening | screen (والورد بـ wird-intro.js)
 * يُحمَّل بعد home.js و tasbih.js و adhkar-viewer.js وقبل main.js. التشغيل من main.js: Extras.init().
 * ===================================================================== */

const Hijri = (() => {
    const $ = id => document.getElementById(id);
    const ADJ_KEY = 'mudhakkir-hijri-adjust';
    const AR = n => Number(n).toLocaleString('ar-EG');
    let adj = 0;
    try { adj = Math.max(-2, Math.min(2, Number(localStorage.getItem(ADJ_KEY)) || 0)); } catch (e) {}
    // أم القرى إن دعمها المتصفح، وإلا الهجري العام
    const fmt = (() => {
        for (const cal of ['islamic-umalqura', 'islamic']) {
            try {
                const f = new Intl.DateTimeFormat('ar-SA-u-ca-' + cal + '-nu-arab', { day: 'numeric', month: 'long', year: 'numeric' });
                const n = new Intl.DateTimeFormat('en-u-ca-' + cal + '-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' });
                if (f.resolvedOptions().calendar.startsWith('islamic')) return { f, n };
            } catch (e) {}
        }
        return null;
    })();
    function today(now = new Date()) {
        if (!fmt) return null;
        const d = new Date(now.getTime() + adj * 864e5);
        const parts = Object.fromEntries(fmt.n.formatToParts(d).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
        return { day: parts.day, month: parts.month, year: parts.year, text: fmt.f.format(d).replace(/\s*هـ$/, '') + ' هـ' };
    }
    // الأيام المميزة: [عنوان، نص] — بحسب اليوم والشهر الهجري
    function special(h) {
        if (!h) return null;
        const { day: d, month: m } = h;
        if (m === 1 && d === 1) return ['بداية عام هجري جديد', 'كل عام وأنت بخير، جعله الله عام طاعة وبركة.'];
        if (m === 1 && d === 9) return ['يوم تاسوعاء', 'يُستحب صيامه مع يوم عاشوراء غدًا.'];
        if (m === 1 && d === 10) return ['يوم عاشوراء', 'يُستحب صيامه، وصيامه يكفّر السنة التي قبله (صحيح مسلم).'];
        if (m === 9 && d === 1) return ['رمضان مبارك', 'تقبّل الله منا ومنك الصيام والقيام.'];
        if (m === 9 && d >= 21) return [`العشر الأواخر من رمضان · الليلة ${AR(d)}`, 'تحرَّ ليلة القدر في الليالي الوترية، وأكثر من: اللهم إنك عفو تحب العفو فاعفُ عني.'];
        if (m === 9) return [`اليوم ${AR(d)} من رمضان`, 'اللهم تقبّل صيامنا وقيامنا.'];
        if (m === 10 && d === 1) return ['عيد الفطر المبارك', 'تقبّل الله منا ومنكم. لا يُصام يوم العيد.'];
        if (m === 12 && d === 9) return ['يوم عرفة', 'صيامه لغير الحاج يكفّر السنة الماضية والباقية (صحيح مسلم)، وأكثر فيه من الدعاء.'];
        if (m === 12 && d === 10) return ['عيد الأضحى المبارك', 'تقبّل الله منا ومنكم. لا يُصام يوم العيد.'];
        if (m === 12 && d >= 11 && d <= 13) return ['أيام التشريق', 'أيام أكل وشرب وذكر لله، لا يُصام فيها. أكثر من التكبير.'];
        if (m === 12 && d <= 8) return ['العشر الأوائل من ذي الحجة', 'أفضل أيام الدنيا؛ أكثر فيها من التكبير والتهليل والتحميد والعمل الصالح.'];
        if (d >= 13 && d <= 15) return [`من الأيام البيض · ${AR(d)} ${monthName(h)}`, 'يُستحب صيام الأيام البيض: ١٣ و١٤ و١٥ من كل شهر هجري.'];
        if (d === 12) return ['غدًا تبدأ الأيام البيض', 'يُستحب صيام ١٣ و١٤ و١٥ من الشهر الهجري، فانوِ من الليلة إن استطعت.'];
        return null;
    }
    const monthName = h => (h.text.match(/^[٠-٩]+\s+(.+?)\s+[٠-٩]+/) || [])[1] || '';
    function paint() {
        const h = today();
        const line = $('home-hijri');
        if (line) { line.hidden = !h; if (h) line.textContent = h.text; }
        const card = $('hijri-card'), sp = special(h);
        if (card) {
            card.hidden = !sp;
            if (sp) { $('hijri-card-title').textContent = sp[0]; $('hijri-card-text').textContent = sp[1]; }
        }
        // الإعدادات: معاينة التصحيح
        const prev = $('hijri-preview'); if (prev) prev.textContent = h ? `اليوم: ${h.text}` : 'متصفحك لا يدعم التقويم الهجري';
        document.querySelectorAll('#hijri-adjust [data-adj]').forEach(b => b.classList.toggle('active', Number(b.dataset.adj) === adj));
    }
    function init() {
        if (!fmt) { const s = $('hijri-setting'); if (s) s.hidden = true; }
        document.querySelectorAll('#hijri-adjust [data-adj]').forEach(b => b.addEventListener('click', () => {
            adj = Number(b.dataset.adj) || 0;
            try { localStorage.setItem(ADJ_KEY, String(adj)); } catch (e) {}
            paint();
        }));
        paint();
        setInterval(paint, 10 * 60 * 1000);
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') paint(); });
    }
    return { init, today, special, paint };
})();

const WeekLog = (() => {
    const $ = id => document.getElementById(id);
    const KEY = 'mudhakkir-week-log';
    const DAYS = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];
    const NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const keyOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
    // w: الورد كامل · r: قرأ من الورد · a: أذكار · t: تسبيح
    function mark(kind, k = keyOf(new Date())) {
        const log = read();
        if (log[k] && log[k][kind]) return;
        log[k] = { ...(log[k] || {}), [kind]: 1 };
        // نحتفظ بآخر ٦٠ يوم بس (بتكفي لإحصائيات الشهر)
        const keys = Object.keys(log).sort();
        keys.slice(0, Math.max(0, keys.length - 60)).forEach(x => delete log[x]);
        try { localStorage.setItem(KEY, JSON.stringify(log)); } catch (e) {}
        render();
    }
    // إ٢: «أتممت» من إشعار التذكير (sw.js بيسجّلها والتطبيق مسكّر)
    async function mergePending() {
        if (typeof NotifyStore === 'undefined') return;
        const list = await NotifyStore.get('weeklog-pending', []);
        if (!Array.isArray(list) || !list.length) return;
        await NotifyStore.put('weeklog-pending', []);
        list.forEach(x => { if (x && /^\d{4}-\d{2}-\d{2}$/.test(x.day) && ['w', 'r', 'a', 't'].includes(x.kind)) mark(x.kind, x.day); });
    }
    function render() {
        const box = $('week-log'); if (!box) return;
        const log = read(), now = new Date();
        const cols = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now); d.setDate(now.getDate() - i);
            const e = log[keyOf(d)] || {};
            const wird = e.w ? 'full' : e.r ? 'part' : '';
            const said = [e.w ? 'أتمّ الورد' : e.r ? 'قرأ من الورد' : '', e.a ? 'الأذكار' : '', e.t ? 'التسبيح' : ''].filter(Boolean);
            cols.push(`<li class="wl-day${i === 0 ? ' is-today' : ''}" aria-label="${i === 0 ? 'اليوم' : NAMES[d.getDay()]}: ${said.length ? said.join('، ') : 'لا شيء بعد'}">
                <span class="wl-dots" aria-hidden="true"><i class="wl-w ${wird}"></i><i class="wl-a ${e.a ? 'full' : ''}"></i><i class="wl-t ${e.t ? 'full' : ''}"></i></span>
                <b aria-hidden="true">${i === 0 ? 'اليوم' : DAYS[d.getDay()]}</b></li>`);
        }
        box.innerHTML = cols.join('');
    }
    // ---------- إ٨ إحصائيات الشهر (الإصدار ١٥): آخر ٣٠ يوم كشبكة، وعدد أيام كل عبادة، وأطول سلسلة ----------
    function monthView() {
        const log = read(), now = new Date(), days = [];
        for (let i = 29; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate() - i); days.push({ d, e: log[keyOf(d)] || {} }); }
        const count = f => days.filter(x => f(x.e)).length;
        const any = e => e.w || e.r || e.a || e.t;
        let best = 0, run = 0; days.forEach(x => { run = any(x.e) ? run + 1 : 0; best = Math.max(best, run); });
        let cur = 0; for (let i = days.length - 1; i >= 0 && any(days[i].e); i--) cur++;
        const AR = n => Number(n).toLocaleString('ar-EG');
        const stat = (n, label, cls) => `<div class="ms-stat ${cls}"><b>${AR(n)}</b><small>${label}</small></div>`;
        const box = document.createElement('div');
        box.className = 'month-stats';
        // أول خانة بالشبكة على يوم أسبوعها (السبت أول الأسبوع)
        const lead = (days[0].d.getDay() + 1) % 7;
        box.innerHTML = `
            <p class="ms-lead">آخر ٣٠ يوم، من ${days[0].d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })} لليوم</p>
            <div class="ms-stats">${stat(count(e => e.w), 'يوم أتممت الورد', 'w')}${stat(count(e => e.w || e.r), 'يوم قرأت', 'r')}${stat(count(e => e.a), 'يوم أذكار', 'a')}${stat(count(e => e.t), 'يوم تسبيح', 't')}</div>
            <div class="ms-grid" role="img" aria-label="${AR(count(any))} يوم فيه عبادة من آخر ٣٠ يوم">
                ${['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'].map(d => `<span class="ms-h">${d}</span>`).join('')}
                ${'<i class="ms-pad"></i>'.repeat(lead)}
                ${days.map(({ d, e }) => { const n = (e.w || e.r ? 1 : 0) + (e.a ? 1 : 0) + (e.t ? 1 : 0); return `<i class="ms-d l${n}${keyOf(d) === keyOf(now) ? ' is-today' : ''}" title="${d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}"><em>${AR(d.getDate())}</em></i>`; }).join('')}
            </div>
            <p class="ms-legend" aria-hidden="true"><i class="ms-d l0"></i>ولا شي <i class="ms-d l1"></i>عبادة <i class="ms-d l2"></i>عبادتين <i class="ms-d l3"></i>الثلاثة</p>
            <div class="ms-streak"><span>السلسلة الحالية <b>${AR(cur)}</b> يوم</span><span>أطول سلسلة <b>${AR(best)}</b> يوم</span></div>`;
        return box;
    }
    function openMonth() { if (typeof QSheet !== 'undefined') QSheet.open('إحصائيات الشهر', monthView()); }
    function init() {
        // اليوم من الإحصائيات الحالية (لو المستخدم سبّح أو قرأ قبل هالتحديث)
        if (typeof DailyStats !== 'undefined') { const s = DailyStats.get(); if (s.tasbeeh) mark('t'); if (s.wirdVerses) mark('r'); }
        render();
        mergePending();
        $('month-open')?.addEventListener('click', openMonth);
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { render(); mergePending(); } });
        if (typeof SW_OK !== 'undefined' && SW_OK) navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.type === 'mdk-weeklog') mergePending(); });
    }
    return { init, mark, render, openMonth };
})();

const Backup = (() => {
    const $ = id => document.getElementById(id);
    const SKIP = /^mudhakkir-(qp1-|push-sent|update-dismissed|mushaf-offline)/; // صفحات المصحف المخزنة (بتتنزّل من جديد) وحالات مؤقتة
    const keys = () => { try { return Object.keys(localStorage).filter(k => k.startsWith('mudhakkir-') && !SKIP.test(k)); } catch (e) { return []; } };
    async function save() {
        const data = {};
        keys().forEach(k => { data[k] = localStorage.getItem(k); });
        const d = new Date(), stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const body = JSON.stringify({ app: 'mudhakkir', v: 1, build: typeof APP_BUILD !== 'undefined' ? APP_BUILD : 0, date: d.toISOString(), data }, null, 1);
        const file = new File([body], `mudhakkir-backup-${stamp}.json`, { type: 'application/json' });
        // على الجوال: المشاركة (حفظ بالملفات أو إرسال لحالك)، وإلا تنزيل
        try {
            if (matchMedia('(hover: none)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: 'نسخة مُذكّر الاحتياطية' });
                Toast.show('تم تجهيز النسخة الاحتياطية ✓');
                return;
            }
        } catch (e) { if (e && e.name === 'AbortError') return; }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file); a.download = file.name;
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        Toast.show('تم حفظ النسخة الاحتياطية ✓');
    }
    async function restore(file) {
        if (!file) return;
        let json = null;
        try { json = JSON.parse(await file.text()); } catch (e) {}
        if (!json || json.app !== 'mudhakkir' || !json.data || typeof json.data !== 'object') { Toast.show('هذا الملف ليس نسخة احتياطية من مُذكّر'); return; }
        const entries = Object.entries(json.data).filter(([k, v]) => k.startsWith('mudhakkir-') && !SKIP.test(k) && typeof v === 'string');
        if (!entries.length) { Toast.show('النسخة فارغة'); return; }
        const when = json.date ? new Date(json.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
        if (!confirm(`استرجاع النسخة${when ? ' المحفوظة في ' + when : ''}؟\nستحلّ محلّ بياناتك الحالية على هذا الجهاز (الورد، التذكيرات، العلامات، الإعدادات).`)) return;
        try {
            keys().forEach(k => localStorage.removeItem(k));
            entries.forEach(([k, v]) => localStorage.setItem(k, v));
        } catch (e) { Toast.show('تعذّر الاسترجاع: مساحة التخزين ممتلئة'); return; }
        Toast.show('تم الاسترجاع ✓ جارٍ إعادة فتح التطبيق…');
        setTimeout(() => location.reload(), 900);
    }
    function init() {
        $('backup-save')?.addEventListener('click', save);
        const input = $('backup-file');
        $('backup-restore')?.addEventListener('click', () => input?.click());
        input?.addEventListener('change', () => { restore(input.files && input.files[0]); input.value = ''; });
    }
    return { init, save, restore };
})();

const Shortcuts = (() => {
    function init() {
        const open = new URLSearchParams(location.search).get('open');
        const act = {
            'tasbih-mode': () => { navigateTo('tasbih'); setTimeout(() => Tasbih.openMode(), 350); },
            morning: () => { navigateTo('adhkar'); setTimeout(() => AdhkarViewer.open('morning'), 300); },
            evening: () => { navigateTo('adhkar'); setTimeout(() => AdhkarViewer.open('evening'), 300); },
            screen: () => MdkScreen.open()
        }[open];
        if (!act) return;
        history.replaceState(history.state, '', location.pathname);
        setTimeout(act, 350);
    }
    return { init };
})();

const Extras = { init() { Hijri.init(); WeekLog.init(); Backup.init(); Shortcuts.init(); } };
