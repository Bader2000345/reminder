/* =====================================================================
 * مُذكّر — install.js
 * تثبيت التطبيق على الجوال أو الكمبيوتر:
 *   - زر «تثبيت التطبيق» يثبّت مباشرة بضغطة (أندرويد / Chrome / Edge).
 *   - تحته دائمًا الطريقة اليدوية المناسبة لجهاز المستخدم (آيفون، أندرويد، سامسونج، كمبيوتر).
 *   - داخل واتساب/إنستغرام: الزر ينسخ الرابط لفتحه في المتصفح.
 *   - إن قال المتصفح «مثبّت مسبقًا» ولم يجده المستخدم: يشرح أين يجده أو كيف يعيد الضبط.
 * يظهر في الرئيسية (بطاقة) وفي الإعدادات تحت «التحديثات».
 * يُحمَّل بالترتيب من index.html؛ الأجزاء تتشارك المتغيرات العامة فيما بينها.
 * ===================================================================== */

const Install = (() => {
    const $$ = sel => [...document.querySelectorAll(sel)];
    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /android/i.test(ua);
    const isSamsung = /SamsungBrowser/i.test(ua);
    const inApp = /FBAN|FBAV|Instagram|WhatsApp|Line\/|Snapchat|TikTok|; wv\)/i.test(ua); // متصفحات داخل التطبيقات لا تسمح بالتثبيت
    const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    const LATER_KEY = 'mudhakkir-install-later';
    let deferred = null;          // حدث التثبيت المباشر من المتصفح (إن توفر)
    let installedHere = false;    // المتصفح يقول إن التطبيق مثبّت على هذا الجهاز
    let justInstalled = false;

    // أيقونات صغيرة داخل الخطوات
    const ICON = {
        share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/></svg>',
        install: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M12 8v6M9 11l3 3 3-3"/></svg>',
        dots: '<b class="k-dots">⋮</b>',
        lines: '<b class="k-dots">≡</b>'
    };
    const k = html => `<i class="k">${html}</i>`;
    const STEPS = {
        android: [`اضغط القائمة ${k(ICON.dots)} أعلى Chrome`, 'اختر <b>«تثبيت التطبيق»</b> أو «إضافة إلى الشاشة الرئيسية»', 'اضغط <b>«تثبيت»</b> وسيظهر بين تطبيقاتك'],
        samsung: [`اضغط القائمة ${k(ICON.lines)} أسفل المتصفح`, 'اختر <b>«إضافة صفحة إلى»</b>', 'ثم <b>«الشاشة الرئيسية»</b>'],
        ios: ['افتح الموقع في <b>Safari</b>', `اضغط زر المشاركة ${k(ICON.share)}`, 'اختر <b>«إضافة إلى الشاشة الرئيسية»</b> ثم «إضافة»'],
        desktop: [`اضغط أيقونة التثبيت ${k(ICON.install)} في آخر شريط العنوان`, `أو من القائمة ${k(ICON.dots)} اختر <b>«تثبيت مُذكّر»</b>`, 'اضغط <b>«تثبيت»</b> ويفتح كتطبيق مستقل'],
        inapp: ['اضغط <b>«تثبيت التطبيق»</b> لنسخ الرابط', `افتحه في <b>${isIOS ? 'Safari' : 'Chrome'}</b>`, 'واضغط «تثبيت التطبيق» هناك']
    };
    const platform = () => inApp ? 'inapp' : isIOS ? 'ios' : isSamsung ? 'samsung' : isAndroid ? 'android' : 'desktop';

    // حالة «مثبّت مسبقًا لكن لا أجده» (مشكلة شائعة بعد حذف الأيقونة فقط)
    const ALREADY_NOTE = isAndroid
        ? '<b>مُذكّر مثبّت على هذا الجهاز.</b> إن لم تجده: افتح إعدادات الجوال ← التطبيقات وابحث عنه بأيقونته (قد لا يظهر عند البحث بكلمة «مذكر» بسبب التشكيل). وإن لم يكن موجودًا فعلًا: من Chrome ← الإعدادات ← إعدادات المواقع ← كل المواقع ← <b>bader2000345.github.io</b> ← «محو وإعادة الضبط»، ثم افتح الموقع واضغط «تثبيت التطبيق».'
        : '<b>مُذكّر مثبّت على هذا الجهاز.</b> افتحه من قائمة التطبيقات، أو أزل تثبيته من المتصفح ثم ثبّته من جديد.';

    async function checkInstalledHere() {
        if (!('getInstalledRelatedApps' in navigator)) return false;
        try { return (await navigator.getInstalledRelatedApps()).length > 0; } catch (e) { return false; }
    }

    function render() {
        const standalone = isStandalone();
        const p = platform();
        const later = Number(localStorage.getItem(LATER_KEY) || 0) > Date.now();
        // بطاقة الرئيسية: تختفي داخل التطبيق المثبّت، أو بعد التثبيت، أو «لاحقًا»
        $$('[data-install-card]').forEach(card => { card.hidden = standalone || justInstalled || installedHere || later; });
        $$('[data-install-steps]').forEach(ol => {
            ol.innerHTML = STEPS[p].map((s, i) => `<li style="--i:${i}"><span>${s}</span></li>`).join('');
            ol.closest('[data-install-how]').hidden = standalone || justInstalled;
        });
        $$('[data-install-how-title]').forEach(t => { t.textContent = deferred ? 'أو بالطريقة اليدوية:' : 'الطريقة:'; });
        $$('[data-install]').forEach(btn => {
            btn.hidden = standalone || justInstalled;
            btn.classList.toggle('is-ready', !!deferred);
        });
        $$('[data-install-note]').forEach(n => { n.hidden = !installedHere || standalone; n.innerHTML = ALREADY_NOTE; });
        $$('[data-install-status]').forEach(s => {
            s.textContent = standalone ? 'مثبّت ✓ أنت تستخدم تطبيق مُذكّر الآن'
                : justInstalled ? 'تم التثبيت ✓ ستجده بين تطبيقاتك'
                : installedHere ? 'مثبّت على هذا الجهاز ✓ (التفاصيل تحت)'
                : 'ثبّته ليفتح بلمسة كأي تطبيق، ويعمل دون إنترنت';
        });
    }

    // تمييز الخطوات بحركة ليعرف المستخدم ماذا يفعل
    function highlight(btn) {
        const how = btn.closest('[data-install-box]')?.querySelector('[data-install-how]');
        const ol = how && how.querySelector('[data-install-steps]');
        if (!ol) return;
        ol.classList.remove('pulse'); void ol.offsetWidth; ol.classList.add('pulse');
        how.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
    }

    async function onInstall(e) {
        const btn = e.currentTarget;
        // ١) التثبيت المباشر بضغطة
        if (deferred) {
            const prompt = deferred; deferred = null;
            prompt.prompt();
            try {
                const { outcome } = await prompt.userChoice;
                if (outcome === 'accepted') { justInstalled = true; Toast.show('جارٍ التثبيت… سيظهر مُذكّر بين تطبيقاتك'); }
            } catch (err) {}
            render();
            return;
        }
        // ٢) داخل واتساب/إنستغرام: ننسخ الرابط ليُفتح في المتصفح
        if (inApp) {
            try { await navigator.clipboard.writeText(SITE_URL); Toast.show(`تم نسخ الرابط، افتحه في ${isIOS ? 'Safari' : 'Chrome'} ثم اضغط «تثبيت التطبيق»`); }
            catch (err) { Toast.show(`افتح الرابط في ${isIOS ? 'Safari' : 'Chrome'}: ${SITE_URL}`); }
            highlight(btn);
            return;
        }
        // ٣) آيفون: النظام لا يسمح بالتثبيت من زر، نوضح الخطوات
        if (isIOS) { Toast.show('على الآيفون والآيباد: اتبع الخطوات الظاهرة تحت الزر ↓'); highlight(btn); return; }
        // ٤) أندرويد/كمبيوتر دون تثبيت مباشر: هل هو مثبّت أصلًا؟
        installedHere = await checkInstalledHere();
        render();
        if (installedHere) { Toast.show('مُذكّر مثبّت مسبقًا على هذا الجهاز، التفاصيل تحت ↓'); highlight(btn); return; }
        Toast.show('اتبع الخطوات الظاهرة تحت الزر ↓');
        highlight(btn);
    }

    function init() {
        addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; installedHere = false; render(); });
        addEventListener('appinstalled', () => { deferred = null; justInstalled = true; Toast.show('تم تثبيت مُذكّر ✓ ستجده بين تطبيقاتك'); render(); });
        matchMedia('(display-mode: standalone)').addEventListener?.('change', render);
        $$('[data-install]').forEach(btn => btn.addEventListener('click', onInstall));
        $$('[data-install-later]').forEach(btn => btn.addEventListener('click', () => {
            try { localStorage.setItem(LATER_KEY, String(Date.now() + 14 * 864e5)); } catch (e) {}
            const card = btn.closest('[data-install-card]');
            card.classList.add('is-leaving');
            setTimeout(() => { card.classList.remove('is-leaving'); render(); }, 350);
        }));
        render();
        if (!isStandalone()) checkInstalledHere().then(v => { if (v && !deferred) { installedHere = true; render(); } });
    }
    return { init };
})();
