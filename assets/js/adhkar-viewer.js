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
    function open(key) {
        const data = ADHKAR_DATABASE[key]; if (!data) return;
        group = data; items = data.items; counts = items.map(() => 0); idx = 0;
        const root = $('adhkar-detail');
        $('adhkar-detail-title').textContent = data.title;
        root.hidden = false;
        Immersive.enter(root, { onClose: close });
        $('dk-book').replaceChildren();
        show(0);
        $('dk-counter').focus({ preventScroll: true });
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
    return { init, open, close };
})();

// البحث الفوري في الأذكار
document.getElementById('adhkar-search')?.addEventListener('input', (e) => {
    renderGeneralAdhkar(e.target.value.trim());
});
