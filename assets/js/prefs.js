/* =====================================================================
 * مُذكّر — prefs.js  (الإصدار ١٤)
 * تفضيلات القراءة:
 *   - TextSize: حجم خط التطبيق كله (صغير، عادي، كبير، أكبر) من الإعدادات. بيكبّر محتوى الصفحات
 *     بدون ما يخرّب الشريط والأزرار العائمة. preload-theme.js بيطبّقه قبل الرسم.
 *   - VerseSize: حجم خط الآية بالورد ووضع التركيز (أزرار أ− أ+)، ومحفوظ.
 * Prefs.init() من main.js.
 * ===================================================================== */

const Prefs = (() => {
    const root = document.documentElement;
    const store = {
        get: (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
        set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
    };

    // ---------- حجم خط التطبيق ----------
    const TEXT_KEY = 'mudhakkir-text-size';
    const TEXT = { sm: 'صغير', md: 'عادي', lg: 'كبير', xl: 'أكبر' };
    let text = TEXT[store.get(TEXT_KEY, 'md')] ? store.get(TEXT_KEY, 'md') : 'md';
    function applyText(size) {
        text = TEXT[size] ? size : 'md';
        if (text === 'md') delete root.dataset.font; else root.dataset.font = text;
        store.set(TEXT_KEY, text);
        document.querySelectorAll('#textsize-seg [data-size]').forEach(b => {
            const on = b.dataset.size === text;
            b.classList.toggle('active', on); b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1;
        });
        const st = document.getElementById('textsize-status');
        if (st) st.textContent = `الحجم الحالي: ${TEXT[text]} · لكل التطبيق`;
        if (typeof updateNavPill === 'function') requestAnimationFrame(() => updateNavPill(true));
    }

    // ---------- حجم خط الآية ----------
    const VERSE_KEY = 'mudhakkir-verse-scale';
    const STEPS = [0.8, 0.9, 1, 1.12, 1.25, 1.4, 1.6];
    let verse = STEPS.indexOf(Number(store.get(VERSE_KEY, 1)));
    if (verse < 0) verse = 2;
    function applyVerse(i, announce = false) {
        verse = Math.max(0, Math.min(STEPS.length - 1, i));
        root.style.setProperty('--verse-scale', String(STEPS[verse]));
        store.set(VERSE_KEY, String(STEPS[verse]));
        document.querySelectorAll('[data-verse-zoom="-1"]').forEach(b => { b.disabled = verse === 0; });
        document.querySelectorAll('[data-verse-zoom="1"]').forEach(b => { b.disabled = verse === STEPS.length - 1; });
        if (announce && typeof Toast !== 'undefined') Toast.show(`حجم الآية: ${Math.round(STEPS[verse] * 100).toLocaleString('ar-EG')}٪`, 1200);
    }

    function init() {
        applyText(text);
        applyVerse(verse);
        const seg = document.getElementById('textsize-seg');
        seg?.addEventListener('click', e => { const b = e.target.closest('[data-size]'); if (b) applyText(b.dataset.size); });
        seg?.addEventListener('keydown', e => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            e.preventDefault();
            const order = Object.keys(TEXT), next = order[(order.indexOf(text) + (e.key === 'ArrowLeft' ? 1 : -1) + order.length) % order.length]; // RTL
            applyText(next); seg.querySelector(`[data-size="${next}"]`)?.focus();
        });
        document.addEventListener('click', e => {
            const b = e.target.closest('[data-verse-zoom]'); if (!b) return;
            e.stopPropagation(); // ما يخفي أدوات وضع التركيز
            applyVerse(verse + Number(b.dataset.verseZoom), true);
        });
    }
    return { init, setText: applyText, text: () => text };
})();
