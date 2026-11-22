/* =====================================================================
 * مُذكّر — install.js
 * تثبيت التطبيق على الجوال أو الكمبيوتر:
 *   - زر «تثبيت التطبيق» يثبّت مباشرة بضغطة (أندرويد / Chrome / Edge).
 *   - تحته دائمًا الطريقة اليدوية المناسبة لجهاز المستخدم (آيفون، أندرويد، سامسونج، كمبيوتر).
 *   - داخل واتساب/إنستغرام: الزر ينسخ الرابط لفتحه في المتصفح (وبأندرويد بيفتح Chrome مباشرة).
 *   - الإصدار 31: بمتصفحات الشركات (شاومي، أوبو، فيفو، هواوي…) الزر بيصير «افتح في Chrome» لأنها ما بتثبّت،
 *     وتحت الطريقة «لم تظهر الأيقونة؟» بخطوات كل شركة (إذن «اختصارات الشاشة الرئيسية» لـ Chrome)، وشركة الجوال مفتوحة لحالها.
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
    // الإصدار 31: متصفحات الشركات (شاومي وريدمي وبوكو، أوبو وريلمي، فيفو، هواوي، تكنو وإنفينكس) وأمثالها ما بتثبّت التطبيق،
    // بتعمل اختصار لموقع بس. وهي المتصفح الأساسي بهالجوالات، فالناس بتفتح الرابط فيها. الحل: زر بيفتح الموقع بـ Chrome.
    const isOther = isAndroid && !inApp && !isSamsung && /MiuiBrowser|Mint Browser|HeyTapBrowser|OppoBrowser|RealmeBrowser|VivoBrowser|HuaweiBrowser|HONORBrowser|HiBrowser|UCBrowser|UCWEB|Quark\/|QQBrowser|baiduboxapp|SogouMobileBrowser|PHX\/|Opera Mini|Puffin/i.test(ua);
    // نفتح الموقع بـ Chrome (إذا Chrome مو موجود: صفحتو بالمتجر)
    const chromeIntent = () => {
        const u = new URL(SITE_URL);
        return `intent://${u.host}${u.pathname}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=com.android.chrome')};end`;
    };
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
        inapp: isAndroid ? ['اضغط <b>«افتح في Chrome»</b>', 'وهناك اضغط <b>«تثبيت التطبيق»</b>', 'وإن لم يُفتح: الرابط منسوخ، الصقه في Chrome']
            : ['اضغط <b>«تثبيت التطبيق»</b> لنسخ الرابط', `افتحه في <b>${isIOS ? 'Safari' : 'Chrome'}</b>`, 'واضغط «تثبيت التطبيق» هناك'],
        other: ['اضغط <b>«افتح في Chrome»</b>، فهذا المتصفح لا يثبّت التطبيقات', 'وفي Chrome اضغط <b>«تثبيت التطبيق»</b>', `لا يوجد عندك Chrome؟ من قائمة هذا المتصفح ${k(ICON.dots)} اختر «إضافة إلى الشاشة الرئيسية»`]
    };
    // الإصدار 29: الخطوات بالإنجليزي (فيها أيقونات وخط عريض، فما بتنفع ترجمة القطع لحالها)
    if (typeof I18n !== 'undefined' && I18n.isEn) Object.assign(STEPS, {
        android: [`Tap the menu ${k(ICON.dots)} at the top of Chrome`, 'Choose <b>“Install app”</b> or “Add to Home screen”', 'Tap <b>“Install”</b> and it appears with your apps'],
        samsung: [`Tap the menu ${k(ICON.lines)} at the bottom`, 'Choose <b>“Add page to”</b>', 'Then <b>“Home screen”</b>'],
        ios: ['Open the site in <b>Safari</b>', `Tap the share button ${k(ICON.share)}`, 'Choose <b>“Add to Home Screen”</b>, then “Add”'],
        desktop: [`Click the install icon ${k(ICON.install)} at the end of the address bar`, `Or from the menu ${k(ICON.dots)} choose <b>“Install Mudhakkir”</b>`, 'Click <b>“Install”</b> and it opens as its own app'],
        inapp: isAndroid ? ['Tap <b>“Open in Chrome”</b>', 'Then tap <b>“Install app”</b> there', 'If it doesn’t open: the link is copied, paste it in Chrome']
            : ['Tap <b>“Install app”</b> to copy the link', `Open it in <b>${isIOS ? 'Safari' : 'Chrome'}</b>`, 'And tap “Install app” there'],
        other: ['Tap <b>“Open in Chrome”</b>, this browser can’t install apps', 'In Chrome, tap <b>“Install app”</b>', `No Chrome? From this browser’s menu ${k(ICON.dots)} choose “Add to Home screen”`]
    });
    const platform = () => inApp ? 'inapp' : isIOS ? 'ios' : isSamsung ? 'samsung' : isOther ? 'other' : isAndroid ? 'android' : 'desktop';
    // زر «افتح في Chrome» بدل «تثبيت» (أندرويد: متصفح الشركة أو جوّا تطبيق)
    const toChrome = () => isAndroid && (isOther || inApp);

    // «لم تظهر الأيقونة؟» (الإصدار 31): بشاومي وأوبو وريلمي وفيفو وهواوي وتكنو، Chrome بيحتاج إذن «اختصارات الشاشة الرئيسية»،
    // وهو مقفول من الشركة، فالتثبيت بيقول «تم» وما بتطلع أيقونة. الشركة من اسم الجوال (Chrome بيعطيه بس إذا سألنا).
    const EN = typeof I18n !== 'undefined' && I18n.isEn;
    const BRANDS = EN ? [
        ['xiaomi', 'Xiaomi, Redmi, POCO', 'Long-press the Chrome icon → <b>App info</b> → <b>Other permissions</b> → allow <b>“Home screen shortcuts”</b>. Then go back to Chrome and tap “Install app” again.'],
        ['oppo', 'OPPO, realme, OnePlus', 'Long-press the Chrome icon → <b>App info</b> → <b>Permissions</b> → allow <b>“Create desktop shortcuts”</b> if you see it, then install again.'],
        ['vivo', 'vivo, iQOO', 'Settings → Apps → Chrome → Permissions → allow <b>“Desktop shortcuts”</b>, then install again.'],
        ['huawei', 'HUAWEI, HONOR', 'With Chrome: Settings → Apps → Chrome → Permissions → allow <b>“Create shortcuts”</b>. Without Chrome: in Huawei Browser open the menu → <b>“Add to Home screen”</b>.'],
        ['transsion', 'TECNO, Infinix, itel', 'Settings → Apps → Chrome → Permissions → allow <b>“Home screen shortcuts”</b>, then install again.'],
        ['all', 'Other phones', 'It may be in the full app list, not on the home screen: swipe up and look for it. If Chrome says “installed” but it’s missing: Chrome → Settings → Site settings → All sites → <b>bader2000345.github.io</b> → Clear & reset, then install again.']
    ] : [
        ['xiaomi', 'شاومي وريدمي وبوكو', 'اضغط مطوّلًا على أيقونة Chrome ← <b>معلومات التطبيق</b> ← <b>أذونات أخرى</b> ← اسمح بـ <b>«اختصارات الشاشة الرئيسية»</b>. ثم ارجع إلى Chrome واضغط «تثبيت التطبيق» من جديد.'],
        ['oppo', 'أوبو وريلمي وون بلس', 'اضغط مطوّلًا على أيقونة Chrome ← <b>معلومات التطبيق</b> ← <b>الأذونات</b> ← اسمح بـ <b>«إنشاء اختصارات على الشاشة الرئيسية»</b> إن وُجد، ثم ثبّت من جديد.'],
        ['vivo', 'فيفو', 'الإعدادات ← التطبيقات ← Chrome ← الأذونات ← اسمح بـ <b>«اختصارات سطح المكتب»</b>، ثم ثبّت من جديد.'],
        ['huawei', 'هواوي وهونر', 'إن كان عندك Chrome: الإعدادات ← التطبيقات ← Chrome ← الأذونات ← اسمح بـ <b>«إنشاء اختصارات»</b>. وإن لم يكن: من متصفح هواوي افتح القائمة ← <b>«إضافة إلى الشاشة الرئيسية»</b>.'],
        ['transsion', 'تكنو وإنفينكس وآيتل', 'الإعدادات ← التطبيقات ← Chrome ← الأذونات ← اسمح بـ <b>«اختصارات الشاشة الرئيسية»</b>، ثم ثبّت من جديد.'],
        ['all', 'باقي الجوالات', 'قد يكون في قائمة كل التطبيقات لا في الشاشة الرئيسية: اسحب الشاشة لأعلى وابحث عنه. وإن قال Chrome «مثبّت» ولم تجده: Chrome ← الإعدادات ← إعدادات المواقع ← كل المواقع ← <b>bader2000345.github.io</b> ← «محو وإعادة الضبط»، ثم ثبّت من جديد.']
    ];
    const RISKY = ['xiaomi', 'oppo', 'vivo', 'huawei', 'transsion'];
    let brand = '';
    const brandOf = s => /xiaomi|redmi|poco|miui|\bmi \d|^M\d{4}[A-Z0-9]+$|^2\d{6,}[A-Z0-9]*$/i.test(s) ? 'xiaomi'
        : /oppo|heytap|realme|oneplus|^RMX\d|^CPH\d|^P[C-H][A-Z]{2}\d+|^[A-Z]{2}\d{4}$/i.test(s) ? 'oppo'
        : /vivo|iqoo|^V\d{4}[A-Z]?$|^I\d{4}$/i.test(s) ? 'vivo'
        : /huawei|honor|^[A-Z]{3}-[A-Z]{1,2}\d{2}[A-Z]?$/i.test(s) ? 'huawei'
        : /tecno|infinix|itel/i.test(s) ? 'transsion' : '';
    async function detectBrand() {
        if (!isAndroid) return '';
        const m = ua.match(/Android [^;)]*;(?: [a-z]{2}[-_][a-z]{2};)? ([^;)]+?)(?: Build\/|\))/i);
        brand = brandOf(ua) || (m ? brandOf(m[1].trim()) : '');
        try {
            if (!brand && navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) brand = brandOf(((await navigator.userAgentData.getHighEntropyValues(['model'])).model || '').trim());
        } catch (e) {}
        return brand;
    }
    function helpHTML() {
        return `<summary>${EN ? 'Installed, but no icon?' : 'لم تظهر الأيقونة؟'}</summary><div class="ic-help-list">${BRANDS.map(([id, name, tip]) =>
            `<details class="ic-brand" data-brand="${id}"${id === (brand || 'all') ? ' open' : ''}><summary>${name}${id === brand ? `<i>${EN ? 'your phone' : 'جوالك'}</i>` : ''}</summary><p>${tip}</p></details>`).join('')}</div>`;
    }
    // نفتحها لحالها بعد التثبيت بجوالات الشركات يلي بتقفل الاختصارات
    const openHelp = () => $$('.ic-help').forEach(d => { d.open = true; });

    // حالة «مثبّت مسبقًا لكن لا أجده» (مشكلة شائعة بعد حذف الأيقونة فقط)
    const ALREADY_NOTE = isAndroid
        ? '<b>مُذكّر مثبّت على هذا الجهاز.</b> إن لم تجده: افتح إعدادات الجوال ← التطبيقات وابحث عنه بأيقونته (قد لا يظهر عند البحث بكلمة «مذكر» بسبب التشكيل). وإن لم يكن موجودًا فعلًا: من Chrome ← الإعدادات ← إعدادات المواقع ← كل المواقع ← <b>bader2000345.github.io</b> ← «محو وإعادة الضبط»، ثم افتح الموقع واضغط «تثبيت التطبيق».'
        : '<b>مُذكّر مثبّت على هذا الجهاز.</b> افتحه من قائمة التطبيقات، أو أزل تثبيته من المتصفح ثم ثبّته من جديد.';

    async function checkInstalledHere() {
        if (!('getInstalledRelatedApps' in navigator)) return false;
        try { return (await navigator.getInstalledRelatedApps()).length > 0; } catch (e) { return false; }
    }

    // نص الزر بلا ما نمسح الأيقونة يلي جوّاه
    function setLabel(btn, text) {
        if (!btn.dataset.label0) btn.dataset.label0 = (btn.textContent || '').trim();
        const n = [...btn.childNodes].reverse().find(x => x.nodeType === 3 && x.nodeValue.trim());
        if (n) n.nodeValue = text; else btn.append(text);
    }

    function render() {
        const standalone = isStandalone();
        const p = platform();
        const later = Number(localStorage.getItem(LATER_KEY) || 0) > Date.now();
        // بعد التثبيت بجوالات الشركات يلي بتقفل الاختصارات: البطاقة بتضل، وفيها «لم تظهر الأيقونة؟» مفتوحة
        const helpAfter = justInstalled && RISKY.includes(brand);
        const done = (justInstalled || installedHere) && !helpAfter;
        // بطاقة الرئيسية: تختفي داخل التطبيق المثبّت، أو بعد التثبيت، أو «لاحقًا»
        $$('[data-install-card]').forEach(card => { card.hidden = standalone || done || later; });
        // الإصدار 30 (معرض الرئيسية): بالمتصفح الرئيسية بتصير صفحة التثبيت بس، و«لاحقًا» بترجّع «يومك»
        document.getElementById('page-home')?.classList.toggle('is-install', !(standalone || done || later));
        document.documentElement.classList.remove('web-guess');
        $$('[data-install-steps]').forEach(ol => {
            ol.innerHTML = STEPS[p].map((s, i) => `<li style="--i:${i}"><span>${s}</span></li>`).join('');
            ol.closest('[data-install-how]').hidden = standalone || justInstalled;
        });
        $$('[data-install-how-title]').forEach(t => { t.textContent = deferred ? 'أو بالطريقة اليدوية:' : 'الطريقة:'; });
        $$('[data-install]').forEach(btn => {
            btn.hidden = standalone || justInstalled;
            btn.classList.toggle('is-ready', !!deferred);
            if (toChrome()) setLabel(btn, EN ? 'Open in Chrome' : 'افتح في Chrome');
        });
        // «لم تظهر الأيقونة؟» (أندرويد بـ Chrome): تحت الطريقة، وبتضل بعد التثبيت
        const showHelp = !standalone && p === 'android';
        $$('[data-install-box]').forEach(box => {
            let d = box.querySelector('.ic-help');
            if (!d) {
                d = document.createElement('details'); d.className = 'ic-help';
                const how = box.querySelector('[data-install-how]');
                if (how) how.after(d); else box.append(d);
            }
            if (d.dataset.brand !== brand || !d.innerHTML) { d.innerHTML = helpHTML(); d.dataset.brand = brand; }
            d.hidden = !showHelp;
            if (helpAfter) d.open = true;
        });
        $$('[data-install-note]').forEach(n => { n.hidden = !installedHere || standalone; n.innerHTML = ALREADY_NOTE; });
        $$('[data-install-status]').forEach(s => {
            s.textContent = standalone ? 'مثبّت ✓ أنت تستخدم تطبيق مُذكّر الآن'
                : justInstalled ? 'تم التثبيت ✓ ستجده بين تطبيقاتك'
                : installedHere ? 'مثبّت على هذا الجهاز ✓ (التفاصيل تحت)'
                : toChrome() ? 'افتحه في Chrome لتثبيته، فهذا المتصفح لا يثبّت التطبيقات'
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
        // 1) التثبيت المباشر بضغطة
        if (deferred) {
            const prompt = deferred; deferred = null;
            prompt.prompt();
            try {
                const { outcome } = await prompt.userChoice;
                if (outcome === 'accepted') {
                    justInstalled = true;
                    Toast.show(RISKY.includes(brand) ? 'جارٍ التثبيت… وإن لم تظهر الأيقونة خلال دقيقة، افتح «لم تظهر الأيقونة؟»' : 'جارٍ التثبيت… سيظهر مُذكّر بين تطبيقاتك');
                }
            } catch (err) {}
            render();
            return;
        }
        // 2) أندرويد بمتصفح الشركة أو جوّا تطبيق: منفتح الموقع بـ Chrome (والرابط بينسخ احتياطًا)
        if (toChrome()) {
            try { navigator.clipboard.writeText(SITE_URL).catch(() => {}); } catch (err) {}
            Toast.show('جارٍ فتح Chrome… وإن لم يُفتح، فالرابط منسوخ: الصقه في Chrome');
            highlight(btn);
            location.href = chromeIntent();
            return;
        }
        // 3) داخل واتساب/إنستغرام بالآيفون: ننسخ الرابط ليُفتح في Safari
        if (inApp) {
            try { await navigator.clipboard.writeText(SITE_URL); Toast.show(`تم نسخ الرابط، افتحه في ${isIOS ? 'Safari' : 'Chrome'} ثم اضغط «تثبيت التطبيق»`); }
            catch (err) { Toast.show(`افتح الرابط في ${isIOS ? 'Safari' : 'Chrome'}: ${SITE_URL}`); }
            highlight(btn);
            return;
        }
        // 3) آيفون: النظام لا يسمح بالتثبيت من زر، نوضح الخطوات
        if (isIOS) { Toast.show('على الآيفون والآيباد: اتبع الخطوات الظاهرة تحت الزر ↓'); highlight(btn); return; }
        // 4) أندرويد/كمبيوتر دون تثبيت مباشر: هل هو مثبّت أصلًا؟
        installedHere = await checkInstalledHere();
        render();
        if (installedHere) { Toast.show('مُذكّر مثبّت مسبقًا على هذا الجهاز، التفاصيل تحت ↓'); highlight(btn); return; }
        Toast.show('اتبع الخطوات الظاهرة تحت الزر ↓');
        highlight(btn);
    }

    // للمساعد «اسأل مُذكّر»: نوع الجهاز وحالة التثبيت، وبدء التثبيت من أي زر
    const info = () => ({ platform: platform(), standalone: isStandalone(), canPrompt: !!deferred, installedHere });
    function start() {
        if (isStandalone()) { Toast.show('أنت فاتح مُذكّر كتطبيق مثبّت ✓'); return; }
        // نستعمل زر الإعدادات حتى تظهر الخطوات تحته إن لم يكن التثبيت المباشر متاحًا
        navigateTo('settings');
        const btn = document.querySelector('.install-setting [data-install]') || document.querySelector('[data-install]');
        if (!btn) return;
        if (deferred) return onInstall({ currentTarget: btn }); // التثبيت المباشر يحتاج ضغطة المستخدم نفسها
        setTimeout(() => onInstall({ currentTarget: btn }), 350);
    }

    function init() {
        addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; installedHere = false; render(); });
        addEventListener('appinstalled', () => { deferred = null; justInstalled = true; Toast.show(RISKY.includes(brand) ? 'تم التثبيت ✓ وإن لم تظهر الأيقونة، افتح «لم تظهر الأيقونة؟»' : 'تم تثبيت مُذكّر ✓ ستجده بين تطبيقاتك'); render(); });
        detectBrand().then(b => { if (b) render(); });
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
    return { init, info, start };
})();
