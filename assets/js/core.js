/* =====================================================================
 * مُذكّر — core.js
 * الأساسيات: البحث في الأذكار العامة وعرضها، التنقل بين الصفحات، مؤشر شريط التنقل، والوضع الغامر (Immersive) المشترك.
 * يُحمَّل بالترتيب من index.html؛ الأجزاء تتشارك المتغيرات العامة فيما بينها.
 * ===================================================================== */

// تطبيع النص العربي للبحث (إزالة التشكيل وتوحيد الحروف)
function normalizeArabic(str) {
    return String(str)
        .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/\s+/g, ' ')
        .trim();
}

// توليد الأذكار العامة ديناميكياً وعرضها
function renderGeneralAdhkar(filterText = '') {
    const container = document.getElementById('adhkar-list');
    if (!container) return;

    container.innerHTML = '';
    const query = normalizeArabic(filterText);
    const proofs = typeof GENERAL_ADHKAR_PROOFS !== 'undefined' ? GENERAL_ADHKAR_PROOFS : [];
    const filtered = GENERAL_ADHKAR_LIST.map((text, i) => ({ text, proof: proofs[i] })).filter(item => !query || normalizeArabic(item.text).includes(query));

    if (!filtered.length) {
        const empty = document.createElement('p');
        empty.className = 'adhkar-empty';
        empty.textContent = 'لا توجد أذكار مطابقة لبحثك.';
        container.appendChild(empty);
        return;
    }

    filtered.forEach(({ text, proof }, index) => {
        const article = document.createElement('article');

        const num = document.createElement('span');
        num.textContent = index + 1;

        const p = document.createElement('div');
        p.className = 'adhkar-body';
        const line = document.createElement('p');
        line.textContent = text;
        p.append(line);
        if (proof) {
            const det = document.createElement('details');
            det.className = 'proof';
            const sum = document.createElement('summary');
            sum.textContent = 'الدليل';
            const body = document.createElement('div');
            const src = document.createElement('small');
            src.textContent = proof[1];
            body.append(document.createTextNode(proof[0]), src);
            det.append(sum, body);
            p.append(det);
        }

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'copy-button';
        btn.setAttribute('aria-label', 'نسخ الذكر');
        btn.textContent = '⧉';
        btn.addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(text); } catch (e) { return; }
            btn.classList.add('copied');
            btn.textContent = '✓ تم';
            setTimeout(() => {
                btn.classList.remove('copied');
                btn.textContent = '⧉';
            }, 1500);
        });

        article.append(num, p, btn);
        container.appendChild(article);
    });
}

// مؤشر منزلق خلف القسم النشط في شريط التنقل
function updateNavPill(instant = false) {
    const pill = document.getElementById('nav-pill');
    const link = document.querySelector('.side-link.active');
    if (!pill || !link) return;
    if (instant) pill.style.transition = 'none';
    pill.style.width = link.offsetWidth + 'px';
    pill.style.height = link.offsetHeight + 'px';
    pill.style.transform = `translate(${link.offsetLeft}px, ${link.offsetTop}px)`;
    pill.classList.add('ready');
    if (instant) { void pill.offsetWidth; pill.style.transition = ''; }
}
addEventListener('resize', () => updateNavPill(true));

// 1. Navigation SPA
const PAGE_ORDER = ['home', 'adhkar', 'quran', 'free-reading', 'my-adhkar', 'settings'];
function navigateTo(pageId) {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const current = document.querySelector('.page-view.active-page');
    const from = current ? current.id.replace('page-', '') : null;
    const swap = () => {
        document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active-page'));
        const targetPage = document.getElementById('page-' + pageId);
        if (targetPage) targetPage.classList.add('active-page');

        document.querySelectorAll('.side-link').forEach(link => {
            if (link.getAttribute('data-target') === pageId) link.classList.add('active');
            else link.classList.remove('active');
        });
        updateNavPill();
        window.scrollTo({ top: 0, behavior: 'auto' });
    };
    // انتقال ناعم بين الصفحات (المحتوى ينزلق باتجاه التنقل: لليسار للأمام في العربية)
    if (!document.startViewTransition || reduce || document.hidden || !from || from === pageId || document.body.classList.contains('immersive')) return swap();
    const html = document.documentElement;
    html.dataset.vt = PAGE_ORDER.indexOf(pageId) >= PAGE_ORDER.indexOf(from) ? 'page-fwd' : 'page-back';
    const vt = document.startViewTransition(swap);
    // احتياط: إن توقف الرسم (نافذة مخفية مثلًا) لا تبقى صورة الصفحة القديمة عالقة
    const guard = setTimeout(() => { try { vt.skipTransition(); } catch (e) {} }, 1200);
    const done = () => { clearTimeout(guard); if (html.dataset.vt && html.dataset.vt.startsWith('page')) delete html.dataset.vt; };
    vt.finished.then(done, done); vt.ready.catch(() => {});
}

document.querySelectorAll('[data-target]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.getAttribute('data-target')));
});

// الوضع الغامر: يخفي شريط التنقل، والضغط على الشاشة يُظهر الأدوات أو يخفيها، وزر الرجوع في الجوال يغلقه
const Immersive = (() => {
    const stack = [];
    let ignorePops = 0; // إشارات رجوع صادرة منا (عند الإغلاق بالزر) لا من المستخدم
    const INTERACTIVE = 'button, a, input, select, textarea, label, summary, details > div';
    function schedule(e) {
        clearTimeout(e.timer);
        if (e.hideAfter) e.timer = setTimeout(() => e.root.classList.add('chrome-hidden'), e.hideAfter);
    }
    function enter(root, { onClose, hideAfter = 2800 } = {}) {
        if (stack.some(x => x.root === root)) return;
        const e = { root, onClose, hideAfter, timer: 0 };
        stack.push(e);
        document.body.classList.add('immersive');
        root.classList.remove('chrome-hidden');
        schedule(e);
        try { history.pushState({ mdkImmersive: true }, ''); } catch (err) {}
    }
    function exit(root, fromPop = false) {
        const i = stack.findIndex(x => x.root === root); if (i < 0) return;
        const [e] = stack.splice(i, 1);
        clearTimeout(e.timer);
        root.classList.remove('chrome-hidden');
        if (!stack.length) document.body.classList.remove('immersive');
        // نرجع خطوة في السجل بأنفسنا، ونتجاهل إشارة الرجوع الناتجة عنها حتى لا تغلق وضعًا فُتح بعدها مباشرة
        if (!fromPop) { try { if (history.state && history.state.mdkImmersive) { ignorePops++; history.back(); } } catch (err) {} }
    }
    function show(root) { const e = stack.find(x => x.root === root); if (!e) return; root.classList.remove('chrome-hidden'); schedule(e); }
    function toggle(root) {
        const e = stack.find(x => x.root === root); if (!e) return;
        if (root.classList.toggle('chrome-hidden')) clearTimeout(e.timer); else schedule(e);
    }
    // ضغطة على مساحة فارغة = إظهار/إخفاء الأدوات؛ الضغط على زر يُبقيها ظاهرة
    function bindTap(root, area, isSwipe = () => false) {
        area.addEventListener('click', ev => {
            if (isSwipe()) return;
            if (ev.target.closest(INTERACTIVE)) return show(root);
            toggle(root);
        });
        root.addEventListener('pointermove', ev => { if (ev.pointerType === 'mouse') show(root); }, { passive: true });
    }
    addEventListener('popstate', () => {
        if (ignorePops > 0) { ignorePops--; return; }
        const e = stack[stack.length - 1];
        if (e && e.onClose) e.onClose(true);
    });
    return { enter, exit, show, toggle, bindTap, isOpen: root => stack.some(x => x.root === root) };
})();
