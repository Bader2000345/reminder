/* =====================================================================
 * مُذكّر — motion.js
 * الحركة: ميل البطاقات بالفأرة، ظهور العناصر، التموّج، الإضاءة، حركات اللمس، الخلفية ونقاط النور.
 * يُحمَّل بالترتيب من index.html؛ الأجزاء تتشارك المتغيرات العامة فيما بينها.
 * ===================================================================== */

// ===== عمق هادئ للخلفية مع حركة المؤشر =====
// (ميلان البطاقات ثلاثي الأبعاد أُزيل في الإصدار ٧: «إطار النور» وزخرفة الخلفية تكفي)
(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const ambient = document.querySelector('.ambient');
    let frame = 0, px = 0, py = 0;
    const flush = () => { frame = 0; ambient.style.setProperty('--px', px.toFixed(3)); ambient.style.setProperty('--py', py.toFixed(3)); };
    document.addEventListener('pointermove', e => {
        if (reduce.matches || e.pointerType !== 'mouse' || !ambient || frame) return;
        px = e.clientX / innerWidth - .5; py = e.clientY / innerHeight - .5; frame = requestAnimationFrame(flush);
    }, { passive: true });
})();

// ===== حركات الظهور والتموّج =====
const Motion = (() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const REVEAL = '.category-card, .adhkar-list article, .personal-reminder, .setting-card, .khatma-card, .smart-card, .quick-card, .reader-hero, .wird-streak-bar';
    let io = null;
    function observe(root = document) {
        if (!io) return;
        root.querySelectorAll(REVEAL).forEach(n => { if (!n.dataset.revealed) { n.classList.add('reveal'); io.observe(n); } });
    }
    function ripple(e) {
        const b = e.target.closest('.primary-button, .ghost-button, .segmented button, .dk-counter, .day-chips button');
        if (!b || reduce.matches) return;
        const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 1.6;
        const dot = document.createElement('span');
        dot.className = 'ripple';
        dot.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
        b.append(dot);
        dot.addEventListener('animationend', () => dot.remove());
    }
    // الخلفية تتحرك بعمق مع التمرير، ومع إمالة الهاتف على أندرويد
    function ambientMotion() {
        const amb = document.querySelector('.ambient'); if (!amb) return;
        let frame = 0, sy = 0, gx = 0, gy = 0;
        const flush = () => { frame = 0; amb.style.setProperty('--px', gx.toFixed(3)); amb.style.setProperty('--py', (gy + sy).toFixed(3)); };
        const queue = () => { if (!frame) frame = requestAnimationFrame(flush); };
        addEventListener('scroll', () => { sy = Math.min(1.2, scrollY / innerHeight) * .6; queue(); }, { passive: true });
        if (matchMedia('(hover: none)').matches && 'DeviceOrientationEvent' in window && typeof DeviceOrientationEvent.requestPermission !== 'function') {
            addEventListener('deviceorientation', e => {
                if (e.gamma == null) return;
                gx = Math.max(-1, Math.min(1, e.gamma / 30)) * .8;
                gy = Math.max(-1, Math.min(1, (e.beta - 45) / 30)) * .5;
                queue();
            }, { passive: true });
        }
    }
    // نقاط نور (كالقناديل البعيدة) موزعة على أعماق مختلفة؛ ميلان الخلفية يُظهر عمقها الحقيقي
    function buildMotes() {
        const box = document.getElementById('motes'); if (!box || box.childElementCount) return;
        let seed = 7;
        const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        const n = matchMedia('(max-width: 700px)').matches ? 14 : 22;
        for (let i = 0; i < n; i++) {
            const m = document.createElement('i');
            m.className = 'mote' + (rnd() < .3 ? ' is-gold' : '');
            const z = Math.round(-520 + rnd() * 640);
            m.style.cssText = `left:${(rnd() * 100).toFixed(1)}%;top:${(rnd() * 100).toFixed(1)}%;--z:${z}px;--s:${(2.5 + rnd() * 4.5).toFixed(1)}px;--d:${(-rnd() * 14).toFixed(1)}s;--t:${(10 + rnd() * 12).toFixed(1)}s`;
            box.append(m);
        }
    }
    function init() {
        buildMotes();
        document.addEventListener('pointerdown', ripple, { passive: true });
        if (!reduce.matches) ambientMotion();
        if (reduce.matches || !('IntersectionObserver' in window)) return;
        io = new IntersectionObserver(entries => entries.forEach(en => {
            if (!en.isIntersecting) return;
            const n = en.target; n.dataset.revealed = '1';
            n.style.setProperty('--d', (Math.min(6, [...n.parentElement.children].indexOf(n)) * 55) + 'ms');
            n.classList.add('in');
            io.unobserve(n);
        }), { rootMargin: '0px 0px -6% 0px', threshold: .08 });
        observe();
        // عناصر تُضاف لاحقًا (التذكيرات، الأذكار العامة بعد البحث)
        new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => {
            if (n.nodeType !== 1 || !n.isConnected) return;
            if (n.matches(REVEAL)) { if (n.parentElement) observe(n.parentElement); } else observe(n);
        })))
            .observe(document.querySelector('.main-content'), { childList: true, subtree: true });
        // الشعار يميل مع المؤشر
        const logo = document.querySelector('.brand-mark');
        logo?.addEventListener('pointermove', e => {
            if (e.pointerType !== 'mouse') return;
            const r = logo.getBoundingClientRect();
            logo.style.setProperty('--ry', (((e.clientX - r.left) / r.width - .5) * 18).toFixed(1) + 'deg');
            logo.style.setProperty('--rx', ((.5 - (e.clientY - r.top) / r.height) * 14).toFixed(1) + 'deg');
        });
        logo?.addEventListener('pointerleave', () => { logo.style.removeProperty('--ry'); logo.style.removeProperty('--rx'); });
    }
    return { init };
})();
