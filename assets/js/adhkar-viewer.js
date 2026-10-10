/* =====================================================================
 * مُذكّر — adhkar-viewer.js
 * عارض الأذكار: صفحة لكل ذكر مع دليله، العدّاد، تقليب الصفحات، ملاءمة الخط للشاشة، والبحث.
 * يُحمَّل بالترتيب من index.html؛ الأجزاء تتشارك المتغيرات العامة فيما بينها.
 * ===================================================================== */

// 2. عارض الأذكار: صفحة لكل ذكر مع الدليل، عدّاد، وتقليب ثلاثي الأبعاد
const AdhkarViewer = (() => {
    const $ = id => document.getElementById(id);
    const ar = n => Number(n).toLocaleString('ar-EG');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const CORNER = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M2 38V14C2 7 7 2 14 2h24" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 38V18c0-6 4-10 10-10h20" fill="none" stroke="currentColor" stroke-width=".8"/><circle cx="14" cy="14" r="2.6" fill="currentColor"/></svg>';
    let group = null, items = [], idx = 0, counts = [], busy = false, swiped = false;

    const timesLabel = n => n === 1 ? '' : n === 2 ? 'مرّتان' : n <= 10 ? `${ar(n)} مرات` : `${ar(n)} مرة`;
    const totalOf = it => it.list ? 0 : it.seq ? it.seq.reduce((s, x) => s + x.count, 0) : (it.count || 1);
    const isDone = i => totalOf(items[i]) === 0 || counts[i] >= totalOf(items[i]);
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };

    function seqState(it, c) {
        let left = c;
        for (let k = 0; k < it.seq.length; k++) { if (left < it.seq[k].count) return { k, n: left }; left -= it.seq[k].count; }
        return { k: it.seq.length, n: 0 };
    }

    function buildPage(i) {
        const it = items[i];
        const page = el('article', 'dk-page');
        page.innerHTML = `<i class="dk-corner c1">${CORNER}</i><i class="dk-corner c2">${CORNER}</i><i class="dk-corner c3">${CORNER}</i><i class="dk-corner c4">${CORNER}</i>`;
        const inner = el('div', 'dk-inner');
        if (i === 0) inner.append(el('header', 'dk-page-title', group.title));
        else if (it.label) inner.append(el('header', 'dk-page-title is-sub', it.label));
        if (it.intro) inner.append(el('p', 'dk-intro', it.intro));

        if (it.list) {
            const ol = el('ol', 'dk-list');
            it.list.forEach(t => ol.append(el('li', '', t)));
            inner.append(ol);
        } else if (it.seq) {
            const box = el('div', 'dk-seq');
            it.seq.forEach(s => { const row = el('div', 'dk-seq-row'); row.append(el('span', 'dk-seq-text', s.text), el('small', 'dk-seq-n', timesLabel(s.count) || ar(1) + ' مرة')); box.append(row); });
            inner.append(box);
        } else {
            const len = it.text.length;
            const t = el('div', 'dk-text' + (/[﴿]/.test(it.text) ? ' is-quran' : '') + (len < 70 ? ' sz-xl' : len < 200 ? ' sz-lg' : ''), it.text);
            inner.append(t);
        }

        const meta = [it.ref, timesLabel(totalOf(it) || 1)].filter(Boolean);
        if (meta.length && !it.list) inner.append(el('p', 'dk-ref', meta.join('  ·  ')));
        if (it.tip) inner.append(el('p', 'dk-tip', it.tip));

        const foot = [...(it.notes || []), ...(it.source ? [it.source] : [])];
        if (it.hadith) {
            const q = el('blockquote', 'dk-hadith', it.hadith);
            if (it.source) q.append(el('sup', '', `(${ar(foot.length)})`));
            inner.append(q);
        }
        if (foot.length) {
            const ol = el('ol', 'dk-foot');
            foot.forEach((f, k) => { const li = el('li'); li.append(el('b', '', `(${ar(k + 1)}) `), document.createTextNode(f)); ol.append(li); });
            inner.append(ol);
        }
        page.append(inner);
        if (isDone(i) && totalOf(it)) page.classList.add('is-done');
        return page;
    }

    function paintCounter() {
        const it = items[idx], total = totalOf(it), c = Math.min(counts[idx], total);
        const btn = $('dk-counter');
        btn.hidden = !total;
        if (!total) return;
        btn.classList.toggle('done', c >= total);
        $('dk-ring').style.strokeDashoffset = String(100 - (c / total) * 100);
        if (it.seq) {
            const s = seqState(it, c);
            $('dk-count').textContent = s.k >= it.seq.length ? '✓' : `${ar(s.n)}/${ar(it.seq[s.k].count)}`;
            document.querySelectorAll('#dk-book .dk-seq-row').forEach((r, k) => { r.classList.toggle('active', k === s.k); r.classList.toggle('done', k < s.k); });
        } else {
            $('dk-count').textContent = c >= total ? '✓' : `${ar(c)}/${ar(total)}`;
        }
    }

    function paintChrome() {
        $('dk-pager').textContent = `${ar(idx + 1)} / ${ar(items.length)}`;
        const done = items.reduce((s, _, i) => s + (isDone(i) ? 1 : 0), 0);
        $('dk-progress').style.width = (done / items.length * 100) + '%';
        $('dk-prev').disabled = idx === 0;
        $('dk-next').disabled = idx === items.length - 1;
    }

    // تصغير الخط تدريجيًا حتى يظهر الذكر كاملًا في الشاشة (والطويل جدًا يُمرَّر داخل الصفحة)
    function fit(page) {
        const stage = $('dk-stage');
        if (!stage.clientHeight) return;
        let k = 1;
        page.style.setProperty('--k', k);
        const cs = getComputedStyle(stage);
        const avail = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 2;
        while (page.offsetHeight > avail && k > 0.72) {
            k = Math.round((k - 0.04) * 100) / 100;
            page.style.setProperty('--k', k);
        }
    }
    // نجوم ذهبية هادئة عند إتمام القسم
    function burst() {
        if (reduce.matches) return;
        const btn = $('dk-counter'), r = btn.getBoundingClientRect();
        for (let i = 0; i < 14; i++) {
            const s = document.createElement('i');
            s.className = 'dk-spark';
            s.style.left = (r.left + r.width / 2) + 'px'; s.style.top = (r.top + r.height / 2) + 'px';
            document.body.append(s);
            const a = (i / 14) * Math.PI * 2, d = 70 + Math.random() * 60;
            const anim = s.animate([{ transform: 'translate(-50%,-50%) scale(.2) rotate(0)', opacity: 1 },
                { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(1) rotate(180deg)`, opacity: 0 }],
                { duration: 900 + Math.random() * 300, easing: 'cubic-bezier(.2,.7,.2,1)' });
            anim.finished.then(() => s.remove(), () => s.remove());
            setTimeout(() => s.remove(), 1400);
        }
    }

    // تشغيل حركة مع ضمان انتهائها حتى لو توقف المتصفح عن الرسم (تبويب في الخلفية مثلًا)
    function play(node, frames, duration, easing) {
        if (!node || !node.animate || reduce.matches) return Promise.resolve();
        const a = node.animate(frames, { duration, easing });
        return Promise.race([a.finished, new Promise(r => setTimeout(r, duration + 80))])
            .catch(() => {}).then(() => { try { a.finish(); } catch (e) {} });
    }

    async function show(next, dir = 0) {
        if (busy || next < 0 || next >= items.length) return;
        const book = $('dk-book');
        const old = book.firstElementChild;
        busy = true;
        // الصفحة التالية تُقلب من اليسار (اتجاه الكتاب العربي)
        const origin = dir > 0 ? 'left center' : 'right center';
        if (old && dir) {
            old.style.transformOrigin = origin;
            await play(old, [{ transform: 'perspective(1600px) rotateY(0)', opacity: 1 }, { transform: `perspective(1600px) rotateY(${dir > 0 ? 75 : -75}deg)`, opacity: 0 }], 260, 'cubic-bezier(.4,0,.8,.4)');
        }
        idx = next;
        const page = buildPage(idx);
        page.style.transformOrigin = origin;
        book.replaceChildren(page);
        fit(page);
        $('dk-stage').scrollTop = 0;
        paintChrome(); paintCounter();
        if (dir) play(page, [{ transform: `perspective(1600px) rotateY(${dir > 0 ? -75 : 75}deg)`, opacity: 0 }, { transform: 'perspective(1600px) rotateY(0)', opacity: 1 }], 380, 'cubic-bezier(.2,.7,.2,1)');
        busy = false;
    }

    function tap() {
        const it = items[idx], total = totalOf(it);
        if (!total || counts[idx] >= total) return;
        counts[idx]++;
        DailyStats.add('tasbeeh', 1);
        try { if (navigator.vibrate) navigator.vibrate(counts[idx] >= total ? [20, 40, 30] : 12); } catch (e) {}
        const btn = $('dk-counter');
        btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');
        paintCounter(); paintChrome();
        if (counts[idx] >= total) {
            $('dk-book').firstElementChild?.classList.add('is-done');
            if (idx < items.length - 1) setTimeout(() => show(idx + 1, 1), 520);
            else { burst(); Toast.show('أتممت ' + group.title + ' — تقبّل الله منك'); }
        }
    }

    // يُفتح بملء الشاشة (دون شريط التنقل) ويُغلق بزر «الأقسام» أو زر الرجوع في الجوال
    // start: رقم الذكر الذي يُفتح عليه (من المساعد مثلًا)
    function open(key, start = 0) {
        const data = ADHKAR_DATABASE[key]; if (!data) return;
        group = data; items = data.items; counts = items.map(() => 0); idx = 0;
        const root = $('adhkar-detail');
        $('adhkar-detail-title').textContent = data.title;
        root.dataset.group = key.startsWith('sit-') ? 'situations' : key; // جوّ خاص لكل قسم (10-atmosphere.css)
        root.hidden = false;
        Immersive.enter(root, { onClose: close });
        $('dk-book').replaceChildren();
        show(Math.min(Math.max(0, start | 0), items.length - 1));
        $('dk-counter').focus({ preventScroll: true });
    }

    // أيقونات المواقف (أسماؤها في situations-adhkar.js)
    const SIT_ICONS = {
        flame: '<path d="M12 21c-4 0-6.5-2.6-6.5-6 0-3.6 3-5.6 3.5-9 2.5 1.6 3.8 3.6 4 6 .8-.7 1.3-1.8 1.4-3 2 1.6 3.1 3.6 3.1 6 0 3.4-2.5 6-5.5 6z"/>',
        cloud: '<path d="M7 18h10a4 4 0 0 0 .4-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18z"/>',
        storm: '<path d="M7 15h10a4 4 0 0 0 .4-8A6 6 0 0 0 6 6.5 4.3 4.3 0 0 0 7 15z"/><path d="M12 15l-2 4h3l-2 3"/>',
        plane: '<path d="M10.5 13.5L3 11l1.5-1.5 8 .5 4-4.5a1.8 1.8 0 0 1 2.5 2.5l-4.5 4 .5 8L14 21.5l-2.5-7.5-3 3V20l-1.5 1-1-3.5-3.5-1 1-1.5h3z"/>',
        car: '<path d="M5 16V12l2-5h10l2 5v4"/><path d="M3 16h18v3H3zM5 12h14"/><circle cx="7.5" cy="19" r="1.5"/><circle cx="16.5" cy="19" r="1.5"/>',
        door: '<path d="M6 21V4h12v17M3 21h18"/><circle cx="14.5" cy="12.5" r=".8"/>',
        home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
        mosque: '<path d="M4 21V12a8 6 0 0 1 16 0v9M2 21h20M12 2v3M9 21v-4a3 3 0 0 1 6 0v4"/>',
        food: '<path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M16 3c-2 0-3 2.5-3 6h3v12"/>',
        rain: '<path d="M7 14h10a4 4 0 0 0 .4-8A6 6 0 0 0 6 5.5 4.3 4.3 0 0 0 7 14z"/><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3"/>',
        heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
        drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
        moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
        compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
        chat: '<path d="M4 5h16v11H9l-5 4z"/>',
        coin: '<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.5c-.5-1-1.4-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.6 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.2 0-2.1-.5-2.6-1.5M12 6.5V8M12 16v1.5"/>',
        shirt: '<path d="M8 3l-5 3 2 4 2-1v12h10V9l2 1 2-4-5-3a4 4 0 0 1-8 0z"/>',
        shield: '<path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z"/>',
        sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/>'
    };
    const sitIcon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SIT_ICONS[name] || SIT_ICONS.sparkle}</svg>`;

    // «أذكار المناسبات»: قائمة المواقف مع بحث ← العارض
    function openSituations() {
        if (typeof SITUATION_ADHKAR === 'undefined' || typeof QSheet === 'undefined') return;
        const box = el('div', 'sit-view');
        const input = el('input'); input.type = 'search'; input.placeholder = 'ابحث عن موقف… (غضب، سفر، مطر)'; input.setAttribute('aria-label', 'البحث في أذكار المناسبات');
        const grid = el('div', 'sit-grid');
        const norm = typeof Knowledge !== 'undefined' ? Knowledge.norm : s => s;
        const paint = q => {
            q = norm(q);
            grid.replaceChildren();
            const list = SITUATION_ADHKAR.filter(g => !q || norm(g.title + ' ' + g.keywords.join(' ')).includes(q));
            if (!list.length) { grid.append(el('p', 'qm-empty', 'لا يوجد موقف بهذا الاسم. جرّب «اسأل مُذكّر».')); return; }
            list.forEach(g => {
                const b = el('button', 'sit-item'); b.type = 'button';
                const ic = el('span', 'sit-icon'); ic.innerHTML = sitIcon(g.icon);
                b.append(ic, el('strong', '', g.title),el('small', '', g.items.length === 1 ? 'ذكر واحد' : g.items.length === 2 ? 'ذكران' : `${ar(g.items.length)} أذكار`));
                b.addEventListener('click', () => { QSheet.close(); open(g.key); });
                grid.append(b);
            });
        };
        input.addEventListener('input', () => paint(input.value));
        box.append(input, grid);
        paint('');
        QSheet.open('أذكار المناسبات', box);
    }
    function close(fromPop = false) {
        const root = $('adhkar-detail');
        if (root.hidden) return;
        root.hidden = true;
        Immersive.exit(root, fromPop === true);
    }

    function init() {
        // العارض طبقة مستقلة فوق كل الصفحات (يُفتح من الرئيسية أو من الأذكار)
        document.body.append($('adhkar-detail'));
        document.querySelectorAll('[data-adhkar-group]').forEach(card => {
            const data = ADHKAR_DATABASE[card.dataset.adhkarGroup];
            if (data && !card.querySelector('.cat-count')) {
                const n = data.items.filter(it => !it.list).length;
                card.append(el('em', 'cat-count', n === 1 ? 'ذكر واحد' : n === 2 ? 'ذكران' : n <= 10 ? `${ar(n)} أذكار` : `${ar(n)} ذكرًا`));
            }
            card.addEventListener('click', () => open(card.dataset.adhkarGroup));
        });
        document.querySelectorAll('[data-situations]').forEach(card => {
            if (typeof SITUATION_ADHKAR !== 'undefined' && !card.querySelector('.cat-count')) card.append(el('em', 'cat-count', `${ar(SITUATION_ADHKAR.length)} موقفًا`));
            card.addEventListener('click', openSituations);
            card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSituations(); } });
        });
        $('adhkar-back').addEventListener('click', () => close());
        Immersive.bindTap($('adhkar-detail'), $('dk-stage'), () => swiped);
        addEventListener('resize', () => { const p = $('dk-book').firstElementChild; if (p && !$('adhkar-detail').hidden) fit(p); });
        $('dk-hint').textContent = matchMedia('(hover: hover)').matches ? 'اضغط العدّاد للتسبيح · الأسهم ← → للتنقّل · Esc للعودة' : 'اضغط على الصفحة لإظهار زر العودة · اسحب للتنقّل';
        $('dk-prev').addEventListener('click', () => show(idx - 1, -1));
        $('dk-next').addEventListener('click', () => show(idx + 1, 1));
        $('dk-counter').addEventListener('click', tap);
        document.addEventListener('keydown', e => {
            if ($('adhkar-detail').hidden || e.target.closest?.('input, textarea, select') || document.querySelector('.modal.open')) return;
            if (e.key === 'ArrowLeft') show(idx + 1, 1);
            else if (e.key === 'ArrowRight') show(idx - 1, -1);
            else if (e.key === 'Escape') { e.stopImmediatePropagation(); close(); }
        });
        // السحب: إلى اليمين = الصفحة التالية (كتاب عربي)، وإلى اليسار = السابقة
        let sx = 0, sy = 0, tracking = false;
        const stage = $('dk-stage');
        stage.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; tracking = true; swiped = false; });
        stage.addEventListener('pointerup', e => {
            if (!tracking) return; tracking = false;
            const dx = e.clientX - sx, dy = e.clientY - sy;
            if (Math.abs(dx) > 10 || Math.abs(dy) > 10) swiped = true; // حركة وليست ضغطة
            if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) show(idx + (dx > 0 ? 1 : -1), dx > 0 ? 1 : -1);
        });
        stage.addEventListener('pointercancel', () => { tracking = false; });
    }
    return { init, open, close, openSituations };
})();

// البحث الفوري في الأذكار
document.getElementById('adhkar-search')?.addEventListener('input', (e) => {
    renderGeneralAdhkar(e.target.value.trim());
});
