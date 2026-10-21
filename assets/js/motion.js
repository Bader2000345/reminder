/* =====================================================================
 * مُذكّر — motion.js
 * الحركة: ظهور عناصر القوائم، وميل الشعار بالفأرة.
 * يُحمَّل بالترتيب من index.html؛ الأجزاء تتشارك المتغيرات العامة فيما بينها.
 * ===================================================================== */

// ===== حركات الظهور والتموّج =====
// (الإصدار ١٥: انشال عمق الخلفية مع المؤشر والتمرير والإمالة، ونقاط النور: الخلفية صارت مشربية ثابتة
//  بضو بيتنفّس (ج٥ بـ fx.js)، فما في داعي نحدّث متغيرات الخلفية مع كل تمرير — أخف بكتير عالجوال)
const Motion = (() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    // البطاقات الرئيسية بيحرّكها fx.js (ب٢: البطاقة بتطلع وكلماتها بعدها)؛ هون بس العناصر يلي ما بيلمسها
    const REVEAL = '.adhkar-list article, .smart-card';
    let io = null;
    function observe(root = document) {
        if (!io) return;
        root.querySelectorAll(REVEAL).forEach(n => { if (!n.dataset.revealed) { n.classList.add('reveal'); io.observe(n); } });
    }
    // (التموّج عند الضغط انشال بالإصدار ١٤: الضغط صار توهّج ذهبي بالـ CSS — ز٣)
    function init() {
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
