/* =====================================================================
 * مُذكّر — modals-and-picker.js
 * النوافذ المنبثقة (فتح/إغلاق) ومنتقي التاريخ والوقت.
 * يُحمَّل بالترتيب من index.html؛ الأجزاء تتشارك المتغيرات العامة فيما بينها.
 * ===================================================================== */

// Modal Logic
function setModalState(modal, open){ if(!modal) return; modal.classList.toggle('open',open); document.body.classList.toggle('modal-open',open); }
document.querySelectorAll('[data-open-modal]').forEach(b => {
    b.addEventListener('click', () => setModalState(document.getElementById(b.getAttribute('data-open-modal')), true));
});
document.querySelectorAll('[data-close-modal]').forEach(b => {
    b.addEventListener('click', () => setModalState(b.closest('.modal'), false));
});
document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if(e.target===m) setModalState(m,false); }));

// ===== منتقي التاريخ والوقت (تقويم بطاقات بألوان مُذكّر) =====
// أي <input type="date|time" data-picker> يتحول تلقائيًا إلى حقل يفتح هذا المنتقي، وتبقى قيمته في الحقل الأصلي
const Picker = (() => {
    const pop = document.getElementById('picker');
    const card = pop.querySelector('.picker-card');
    const body = pop.querySelector('.picker-body');
    const WEEK = [6, 0, 1, 2, 3, 4, 5];
    const WEEK_SHORT = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    const ar = n => Number(n).toLocaleString('ar-EG');
    const pad = n => String(n).padStart(2, '0');
    const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const parseKey = k => { const [y, m, d] = String(k).split('-').map(Number); return y ? new Date(y, m - 1, d) : null; };
    const ICON = {
        date: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
        time: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>'
    };
    let input = null, view = null, temp = null;

    function label(inp) {
        const v = inp.value;
        if (inp.type === 'time') {
            if (!/^\d\d:\d\d$/.test(v)) return 'اختر الوقت';
            const [h, m] = v.split(':').map(Number);
            return new Date(2000, 0, 1, h, m).toLocaleTimeString('ar', { hour: 'numeric', minute: '2-digit' });
        }
        const d = parseKey(v);
        return d ? d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'اختر التاريخ';
    }
    function sync(inp) { const p = inp && inp._picker; if (p) { p.value.textContent = label(inp); p.btn.classList.toggle('is-empty', !inp.value); } }
    function setValue(inp, v, fire = true) {
        if (!inp) return;
        inp.value = v;
        sync(inp);
        if (fire) { inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    function enhance(inp) {
        if (inp._picker) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'picker-field';
        btn.innerHTML = `<span class="pf-icon">${ICON[inp.type === 'time' ? 'time' : 'date']}</span><span class="pf-value"></span><span class="pf-caret" aria-hidden="true">▾</span>`;
        inp.classList.add('picker-native');
        inp.tabIndex = -1;
        inp.setAttribute('aria-hidden', 'true');
        inp.after(btn);
        inp._picker = { btn, value: btn.querySelector('.pf-value') };
        btn.addEventListener('click', () => open(inp));
        inp.addEventListener('change', () => sync(inp));
        sync(inp);
    }

    // ---------- التقويم ----------
    function inRange(d) {
        const k = keyOf(d);
        return !(input.min && k < input.min) && !(input.max && k > input.max);
    }
    function renderDate(dir = 0) {
        const sel = parseKey(input.value), today = keyOf(new Date());
        const first = new Date(view.getFullYear(), view.getMonth(), 1);
        const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
        const lead = WEEK.indexOf(first.getDay());
        const title = first.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
        let cells = WEEK.map(d => `<span class="pk-wd">${WEEK_SHORT[d]}</span>`).join('');
        for (let i = 0; i < lead; i++) cells += '<span class="pk-empty"></span>';
        for (let d = 1; d <= days; d++) {
            const date = new Date(view.getFullYear(), view.getMonth(), d), k = keyOf(date);
            const cls = ['pk-day', k === today ? 'is-today' : '', sel && k === keyOf(sel) ? 'is-selected' : '', [5, 6].includes(date.getDay()) ? 'is-weekend' : ''].join(' ');
            cells += `<button type="button" class="${cls}" data-key="${k}" ${inRange(date) ? '' : 'disabled'} aria-label="${date.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}">${ar(d)}</button>`;
        }
        body.innerHTML = `
            <div class="pk-head">
                <button type="button" class="pk-nav" data-step="-1" aria-label="الشهر السابق">›</button>
                <div class="pk-title"><strong>${title}</strong><span class="pk-dot"></span><small>${sel ? sel.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric' }) : 'اختر يومًا'}</small></div>
                <button type="button" class="pk-nav" data-step="1" aria-label="الشهر التالي">‹</button>
            </div>
            <div class="pk-grid ${dir > 0 ? 'slide-next' : dir < 0 ? 'slide-prev' : ''}">${cells}</div>
            <div class="pk-foot"><button type="button" class="pk-chip" data-today>اليوم</button><button type="button" class="pk-chip" data-close>إغلاق</button></div>`;
    }

    // ---------- الوقت ----------
    function renderTime() {
        const h24 = temp.h, pm = h24 >= 12, h12 = (h24 % 12) || 12;
        const hours = Array.from({ length: 12 }, (_, i) => i + 1).map(h => `<button type="button" class="pk-cell ${h === h12 ? 'is-selected' : ''}" data-h="${h}">${ar(h)}</button>`).join('');
        const mins = Array.from({ length: 12 }, (_, i) => i * 5).map(m => `<button type="button" class="pk-cell ${m === temp.m ? 'is-selected' : ''}" data-m="${m}">${ar(pad(m))}</button>`).join('');
        body.innerHTML = `
            <div class="pk-clock">
                <button type="button" class="pk-step" data-dm="-1" aria-label="دقيقة أقل">−</button>
                <div class="pk-big" aria-live="polite"><b>${ar(h12)}</b><i>:</i><b>${ar(pad(temp.m))}</b></div>
                <button type="button" class="pk-step" data-dm="1" aria-label="دقيقة أكثر">+</button>
            </div>
            <div class="segmented pk-ampm" role="group" aria-label="صباحًا أو مساءً"><button type="button" data-ap="am" class="${pm ? '' : 'active'}">صباحًا</button><button type="button" data-ap="pm" class="${pm ? 'active' : ''}">مساءً</button></div>
            <span class="pk-label">الساعة</span><div class="pk-cells">${hours}</div>
            <span class="pk-label">الدقيقة</span><div class="pk-cells">${mins}</div>
            <div class="pk-foot"><button type="button" class="pk-chip" data-close>إلغاء</button><button type="button" class="primary-button pk-ok" data-ok>تم</button></div>`;
    }

    function place(anchor) {
        if (matchMedia('(max-width: 700px)').matches) { card.style.cssText = ''; pop.classList.add('as-sheet'); return; }
        pop.classList.remove('as-sheet');
        const r = anchor.getBoundingClientRect(), w = 340, h = card.offsetHeight || 420;
        let top = r.bottom + 8;
        if (top + h > innerHeight - 10) top = Math.max(10, r.top - h - 8);
        const left = Math.min(Math.max(10, r.right - w), innerWidth - w - 10);
        card.style.cssText = `top:${top}px;left:${left}px;`;
    }
    function open(inp) {
        input = inp;
        if (inp.type === 'time') {
            const [h, m] = /^\d\d:\d\d$/.test(inp.value) ? inp.value.split(':').map(Number) : [6, 30];
            temp = { h, m }; renderTime();
        } else {
            view = parseKey(inp.value) || new Date(); view.setDate(1); renderDate();
        }
        pop.hidden = false;
        place(inp._picker.btn);
        requestAnimationFrame(() => { pop.classList.add('open'); (body.querySelector('.is-selected') || body.querySelector('button:not([disabled])'))?.focus(); });
    }
    function close() {
        if (pop.hidden) return;
        pop.classList.remove('open');
        const back = input && input._picker.btn;
        setTimeout(() => { pop.hidden = true; }, 200);
        back?.focus();
        input = null;
    }

    body.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b || !input) return;
        if (b.hasAttribute('data-close')) return close();
        if (input.type === 'time') {
            if (b.dataset.h) { const h12 = Number(b.dataset.h) % 12; temp.h = h12 + (temp.h >= 12 ? 12 : 0); }
            else if (b.dataset.m) temp.m = Number(b.dataset.m);
            else if (b.dataset.ap) temp.h = (temp.h % 12) + (b.dataset.ap === 'pm' ? 12 : 0);
            else if (b.dataset.dm) { const t = (temp.h * 60 + temp.m + Number(b.dataset.dm) + 1440) % 1440; temp = { h: Math.floor(t / 60), m: t % 60 }; }
            else if (b.hasAttribute('data-ok')) { setValue(input, `${pad(temp.h)}:${pad(temp.m)}`); return close(); }
            const focusKey = b.dataset.h ? `[data-h="${b.dataset.h}"]` : b.dataset.m ? `[data-m="${b.dataset.m}"]` : b.dataset.ap ? `[data-ap="${b.dataset.ap}"]` : b.dataset.dm ? `[data-dm="${b.dataset.dm}"]` : '';
            renderTime();
            if (focusKey) body.querySelector(focusKey)?.focus();
            return;
        }
        if (b.dataset.step) { const s = Number(b.dataset.step); view.setMonth(view.getMonth() + s); renderDate(s); body.querySelector(`[data-step="${s}"]`)?.focus(); return; }
        if (b.hasAttribute('data-today')) { const t = new Date(); if (!inRange(t)) { view = new Date(t.getFullYear(), t.getMonth(), 1); return renderDate(); } setValue(input, keyOf(t)); return close(); }
        if (b.dataset.key) { b.classList.add('is-picked'); setValue(input, b.dataset.key); setTimeout(close, 140); }
    });
    // لوحة المفاتيح: الأسهم تتنقل بين الأيام (يسار = اليوم التالي في الاتجاه العربي)
    pop.addEventListener('keydown', e => {
        if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
        const cur = e.target.closest && e.target.closest('.pk-day'); if (!cur) return;
        const step = { ArrowLeft: 1, ArrowRight: -1, ArrowDown: 7, ArrowUp: -7 }[e.key]; if (!step) return;
        e.preventDefault();
        const d = parseKey(cur.dataset.key); d.setDate(d.getDate() + step);
        if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) { view = new Date(d.getFullYear(), d.getMonth(), 1); renderDate(step > 0 ? 1 : -1); }
        body.querySelector(`[data-key="${keyOf(d)}"]`)?.focus();
    });
    pop.querySelector('.picker-backdrop').addEventListener('click', close);
    addEventListener('resize', () => { if (input) place(input._picker.btn); });

    document.querySelectorAll('input[data-picker]').forEach(enhance);
    return { enhance, setValue, sync, close };
})();
