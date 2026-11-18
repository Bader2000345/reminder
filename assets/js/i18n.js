/* =====================================================================
 * مُذكّر — i18n.js  (الإصدار 29: الإنجليزي)
 * ليش هيك؟ التطبيق مكتوب كلو بالعربي بـ HTML و30 ملف JS. بدل ما نحط مفتاح لكل نص (ونغيّر كل الملفات)،
 * النص العربي نفسو هو المفتاح: لما تكون اللغة إنجليزي، منمشي على كل نص بالصفحة (ويلي بيطلع بعدين كمان،
 * بـ MutationObserver) ومنبدّلو بالإنجليزي إذا موجود بالقاموس.
 *   - النص يلي فيه « · » منترجم كل قطعة لحالها، والأرقام بأنماط (PATTERNS) متل «9 من 22» ← «9 of 22».
 *   - التواريخ والأوقات: منحوّل لغة Intl من العربي للإنجليزي، فبتطلع «Wednesday, November 18» لحالها.
 *   - الأذكار والقرآن والمصحف ما بتنترجم هون (بيضلّوا عربي)؛ معنى الأذكار بالإنجليزي جاي بملف لحالو.
 * اللغة: اختيار المستخدم بالإعدادات، وإلا: المستخدم القديم بيضل عربي، والجديد حسب لغة جهازو.
 * لازم يكون أول سكربت من سكربتات defer (قبل core.js) حتى التواريخ تنحسب بالإنجليزي من أولها.
 * ===================================================================== */
const I18n = (() => {
    const KEY = 'mudhakkir-lang';
    const read = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
    function pick() {
        const s = read();
        if (s === 'ar' || s === 'en') return s;
        let returning = false;
        try { returning = Object.keys(localStorage).some(k => k.startsWith('mudhakkir-')); } catch (e) {}
        // لهلّق (تجريبي): كل الناس عربي إلا يلي بيختار English بالإعدادات.
        // لما تكمل الترجمة (معاني الأذكار): الجديد حسب لغة جهازو، والقديم بيضل عربي ← AUTO = true
        const AUTO = false;
        if (!AUTO) return 'ar';
        const l = returning ? 'ar' : (/^ar\b/i.test(navigator.language || '') ? 'ar' : 'en');
        // منحفظ القرار أول مرة، حتى ما يتغيّر بالزيارة الجاية (لما يصير عندو بيانات)
        try { localStorage.setItem(KEY, l); } catch (e) {}
        return l;
    }
    const lang = pick();
    const isEn = lang === 'en';
    function set(l) { try { localStorage.setItem(KEY, l); } catch (e) {} location.reload(); }

    // ===== القاموس: النص العربي (بعد ضغط المسافات) ← الإنجليزي =====
    const EN = new Map([
        // التنقّل والعناوين
        ['مُذكّر | التطبيق الشامل للقرآن الكريم والأذكار', 'Mudhakkir | Quran & Adhkar'],
        ['مُذكّر', 'Mudhakkir'], ['الرئيسية', 'Home'], ['الأذكار', 'Adhkar'], ['القرآن', 'Quran'], ['التسبيح', 'Tasbih'], ['أذكاري', 'My adhkar'], ['الإعدادات', 'Settings'],
        ['التنقل الرئيسي', 'Main navigation'], ['مُذكّر – الرئيسية', 'Mudhakkir – Home'], ['شعار مُذكّر', 'Mudhakkir logo'], ['تسجيل الخروج', 'Sign out'],
        // الرئيسية
        ['لوحتك اليومية في مُذكّر', 'Your day in Mudhakkir'], ['مرحباً', 'Welcome'], ['صباح الخير', 'Good morning'], ['مساء الخير', 'Good evening'],
        ['تعديل الاسم', 'Edit name'], ['شاشة مُذكّر: الساعة وورد اليوم بملء الشاشة', 'Mudhakkir screen: clock and today’s wird, full screen'],
        ['تبديل الوضع الفاتح والداكن', 'Switch light and dark'], ['فاتح / داكن', 'Light / dark'], ['لوحة التحكم اليومية', 'Daily dashboard'],
        ['الذِكر التفاعلي التالي', 'Your next dhikr'], ['خذ لحظة للذكر', 'Take a moment for dhikr'], ['ذكر مقترح لك الآن', 'Suggested for you now'], ['ذكر مقترح', 'Suggested dhikr'],
        ['الصوت: تشغيل', 'Sound: on'], ['الصوت: إيقاف', 'Sound: off'], ['ذكر آخر ↻', 'Another dhikr ↻'], ['اضغط للتسبيح · +1', 'Tap to count · +1'], ['تسبيح سريع، اضغط للعد', 'Quick tasbih, tap to count'],
        ['ورد اليوم', 'Today’s wird'], ['وردك القرآني', 'Your Quran wird'], ['إحصائية اليوم: لم تبدأ بعد', 'Today: not started yet'], ['إحصائية اليوم: لم تبدأ بعد، تسبيحة واحدة تكفي لتبدأ', 'Today: not started yet, one tasbih is enough to begin'],
        ['إنجازك في آخر 7 أيام', 'Your last 7 days'], ['جمعة مباركة', 'Jumu‘ah Mubarak'], ['سورة الكهف والصلاة على النبي ﷺ', 'Surat al-Kahf and salawat on the Prophet ﷺ'],
        ['«من قرأ سورة الكهف يوم الجمعة أضاء له من النور ما بين الجمعتين»', '“Whoever reads Surat al-Kahf on Friday, a light will shine for him between the two Fridays.”'],
        ['رواه الحاكم والبيهقي، وصححه الألباني في صحيح الجامع (6470)', 'Reported by al-Hakim and al-Bayhaqi; graded sahih by al-Albani (Sahih al-Jami‘ 6470)'],
        ['اقرأ الكهف', 'Read al-Kahf'], ['تطبيق مُذكّر', 'The Mudhakkir app'], ['ثبّت مُذكّر على شاشتك الرئيسية', 'Install Mudhakkir on your home screen'],
        ['يفتح بلمسة كأي تطبيق، يعمل دون إنترنت، وتصلك التذكيرات حتى وهو مغلق.', 'Opens with a tap like any app, works offline, and reminders reach you even when it’s closed.'],
        ['مزايا التطبيق', 'App features'], ['فتح فوري', 'Opens instantly'], ['دون إنترنت', 'Works offline'], ['تذكيرات دائمة', 'Always-on reminders'], ['تثبيت التطبيق', 'Install app'], ['لاحقًا', 'Later'], ['الطريقة:', 'How:'],
        ['أو بالطريقة اليدوية:', 'Or manually:'],
        ['اقتراح يتكيّف مع وقتك', 'Suggested for this time'], ['الأذكار الذكية حسب الوقت', 'Adhkar for this time'], ['الآن', 'Now'], ['ابدأ يومك بذكرٍ يشرح الصدر ويمنحك سكينة.', 'Start your day with dhikr that brings peace to the heart.'],
        ['اختم يومك بذكرٍ هادئ يملأ القلب طمأنينة.', 'End your day with calm dhikr that fills the heart with peace.'], ['حصّن نفسك قبل النوم بآية الكرسي والمعوّذات وأدعية النبي ﷺ.', 'Protect yourself before sleep with Ayat al-Kursi, the Mu‘awwidhat and the Prophet’s ﷺ du‘a.'],
        ['فترة الصباح', 'Morning'], ['فترة المساء', 'Evening'],
        ['يوم الجمعة 🕌', 'It’s Friday 🕌'], ['لا تنسَ قراءة سورة الكهف، وأكثِر من الصلاة على النبي ﷺ. اللهم صلِّ وسلم على نبينا محمد.', 'Don’t forget Surat al-Kahf, and send plenty of salawat on the Prophet ﷺ.'],
        ['سيصلك تذكير الجمعة صباح كل جمعة بإذن الله', 'You’ll get the Friday reminder every Friday morning, in sha Allah'], ['تم إيقاف تذكير الجمعة', 'Friday reminder turned off'],
        ['تم حذف الاسم من التحية', 'Name removed from the greeting'],
        // الأذكار
        ['اختر حسب وقتك، واقرأ بهدوء وطمأنينة', 'Pick by your time, and read calmly'], ['ابحث في الأذكار...', 'Search adhkar…'], ['البحث في الأذكار', 'Search adhkar'],
        ['كمّل من وين وقفت', 'Continue where you stopped'], ['كمّل', 'Continue'], ['حسب وقتك', 'For your time'], ['هلّق', 'Now'],
        ['بعد الفجر', 'After Fajr'], ['بعد العصر', 'After Asr'], ['قبل النوم', 'Before sleep'], ['عند الاستيقاظ', 'On waking'],
        ['أذكار الصباح', 'Morning adhkar'], ['أذكار المساء', 'Evening adhkar'], ['أذكار النوم', 'Sleep adhkar'], ['أذكار الاستيقاظ', 'Waking adhkar'],
        ['بعد العبادات', 'After worship'], ['أذكار بعد الصلاة', 'After-prayer adhkar'], ['أذكار ودعاء بعد كل صلاة', 'Adhkar and du‘a after every prayer'], ['تسبيح واستغفار', 'Tasbih & istighfar'], ['فضل الذكر العظيم', 'The great virtue of dhikr'],
        ['المناسبات', 'Situations'], ['عند الغضب', 'When angry'], ['الهمّ والحزن', 'Worry & sadness'], ['السفر', 'Travel'], ['المطر', 'Rain'], ['المرض', 'Illness'], ['الطعام', 'Food'], ['الخروج من المنزل', 'Leaving home'],
        ['كل المناسبات ←', 'All situations →'], ['أذكار المناسبات', 'Adhkar for situations'], ['ابحث عن موقف… (غضب، سفر، مطر)', 'Search a situation… (anger, travel, rain)'], ['البحث في أذكار المناسبات', 'Search situations'],
        ['لا يوجد موقف بهذا الاسم. جرّب «اسأل مُذكّر».', 'No situation by that name. Try “Ask Mudhakkir”.'],
        ['الأقسام', 'Sections'], ['العودة للأقسام', 'Back to sections'], ['صنع بطاقة من هالذكر', 'Make a card from this dhikr'], ['الذكر السابق', 'Previous dhikr'], ['اضغط للعدّ', 'Tap to count'], ['الذكر التالي', 'Next dhikr'],
        ['اضغط على الصفحة لإظهار زر العودة · اسحب للتنقّل', 'Tap the card to count · swipe to move'], ['اكبس عالبطاقة لتعدّ · اسحب للتنقّل', 'Tap the card to count · swipe to move'],
        ['اكبس عالبطاقة أو العدّاد لتعدّ · الأسهم ← → للتنقّل · Esc للعودة', 'Tap the card or counter to count · ← → to move · Esc to go back'],
        ['أذكار وتسابيح يومية', 'Daily adhkar'], ['الأذكار العامة', 'General adhkar'], ['لا توجد أذكار مطابقة لبحثك.', 'No adhkar match your search.'], ['الدليل', 'Source'], ['نسخ الذكر', 'Copy dhikr'], ['✓ تم', '✓ Done'],
        ['ذكر واحد', '1 dhikr'], ['ذكران', '2 adhkar'], ['مرّتان', 'Twice'], ['مرة', 'Once'], ['أتممت', 'You completed'], ['— تقبّل الله منك', '— may Allah accept it from you'],
        ['أذكارك أقرب مما تتخيل', 'Your adhkar, closer than you think'],
        // القرآن
        ['ختمتك ووردك اليومي والمصحف', 'Your khatma, daily wird and mushaf'], ['ابدأ اليوم', 'Start today'], ['سلسلة الورد', 'Wird streak'], ['ورا بعض', 'in a row'],
        ['تابع الورد', 'Continue wird'], ['آية بآية', 'Ayah by ayah'], ['افتح المصحف', 'Open mushaf'], ['من الصفحة 1', 'From page 1'],
        ['استمرارية الورد تبدأ اليوم', 'Your streak starts today'], ['أتمم وردك اليوم لتحافظ على سلسلتك', 'Finish today’s wird to keep your streak'], ['وسام 7 أيام متتالية', '7-day badge'], ['وسام 30 يوماً', '30-day badge'],
        ['أسبوع كامل من الثبات — أحسنت', 'A full week of consistency, well done'], ['وسام الختمة الشهرية جاهز لك', 'Your monthly khatma badge is ready'],
        ['الورد اليومي المخصص', 'Your daily wird'], ['عرض آية بآية حسب وردك اليومي', 'Ayah by ayah, following your daily wird'], ['تقدم وردك اليوم', 'Today’s progress'], ['تقدم الورد', 'Wird progress'],
        ['الآية الحالية', 'Current ayah'], ['صفحات وردك اليوم', 'Pages today'], ['مدّة الختمة', 'Khatma length'], ['حجم خط الآية', 'Ayah font size'], ['تصغير خط الآية', 'Smaller ayah text'], ['تكبير خط الآية', 'Larger ayah text'],
        ['جارٍ تحميل الآية الكريمة...', 'Loading the ayah…'], ['تابع الورد آية بآية', 'Continue wird ayah by ayah'], ['السابقة', 'Previous'], ['التالية', 'Next'], ['أتممت هذه الآية', 'Done with this ayah'], ['أتممت هذه الآية · التالية', 'Done with this ayah · next'],
        ['أتممت الصفحة', 'Done with this page'], ['الورد بالمصحف', 'Wird in the mushaf'], ['وضع التركيز', 'Focus mode'], ['تعديل الورد', 'Edit wird'], ['ابدأ ختمة جديدة', 'Start a new khatma'], ['اكتمل الورد ✓', 'Wird complete ✓'],
        ['ختمة القرآن الكريم', 'Quran khatma'], ['ختمة مكتملة', 'Khatma complete'], ['ختمتك', 'Your khatma'], ['خطة الختمة', 'Khatma plan'], ['تعديل الورد اليومي', 'Edit daily wird'],
        ['المصحف بدون نت', 'Offline mushaf'], ['نزّل المصحف كامل مرة وحدة (حوالي 2 ميغا) ليشتغل بلا نت', 'Download the whole mushaf once (about 2 MB) to read offline'],
        ['إحصائيات الشهر', 'This month'], ['الورد والأذكار والتسبيح بكل يوم', 'Wird, adhkar and tasbih for each day'], ['مشاركة الورد', 'Share wird'], ['صورة جميلة لوردك اليوم', 'A nice image of today’s wird'],
        ['مشاركة إنجازي', 'Share my progress'], ['ورد اليوم والأذكار والتسبيح بصورة وحدة', 'Wird, adhkar and tasbih in one image'],
        ['ورد اليوم محفوظ، بتقدر تقراه بدون نت', 'Today’s wird is saved, you can read it offline'], ['✓ ورد اليوم محفوظ، بتقدر تقراه بدون نت', '✓ Today’s wird is saved, you can read it offline'],
        ['قراءة ورد اليوم آية بآية', 'Read today’s wird ayah by ayah'], ['رجوع لصفحة القرآن', 'Back to Quran'], ['أدوات الآية', 'Ayah tools'], ['صنع بطاقة من هالآية', 'Make a card from this ayah'],
        ['اكبس عالبطاقة لما تخلّص الآية · اسحب للرجوع', 'Tap the card when you finish the ayah · swipe to go back'], ['ألوان التجويد', 'Tajweed colors'], ['التفسير', 'Tafsir'], ['بطاقة', 'Card'], ['+1 آية', '+1 ayah'], ['+1 صفحة', '+1 page'],
        ['تقبّل الله طاعتك، أتممت وردك اليوم', 'May Allah accept it, you finished today’s wird'], ['ما شاء الله! أتممت الختمة، تقبّل الله منك', 'Ma sha Allah! You completed the khatma, may Allah accept it'],
        ['أتممت وردك اليوم ✓', 'You finished today’s wird ✓'], ['أتممت الختمة ✓', 'Khatma complete ✓'], ['أتممت الختمة، تقبّل الله منك', 'Khatma complete, may Allah accept it'],
        ['تعذّر تحميل الورد. تأكد من الاتصال بالإنترنت.', 'Couldn’t load the wird. Check your connection.'], ['إعادة المحاولة', 'Try again'], ['الأحزاب', 'Hizbs'],
        // التسبيح
        ['مجموع اليوم', 'Today'], ['الدورة', 'Round'], ['اضغط بأي مكان هون', 'Tap anywhere here'], ['سبّح، اضغط بأي مكان هون للعدّ', 'Tap anywhere here to count'],
        ['الذكر', 'Dhikr'], ['العدد', 'Count'], ['بلا حد', 'No limit'], ['تصفير', 'Reset'], ['ملء الشاشة', 'Full screen'], ['وضع التسبيح', 'Tasbih mode'], ['اضغط بأي مكان للتسبيح', 'Tap anywhere to count'],
        ['للخروج: اضغط مطوّلًا على ×', 'To exit: press and hold ×'], ['اضغط مطوّلًا على × للخروج', 'Press and hold × to exit'], ['للخروج: اضغط مطوّلًا، أو مفتاح Esc', 'To exit: press and hold, or Esc'],
        ['سبحان الله', 'SubhanAllah'], ['الحمد لله', 'Alhamdulillah'], ['الله أكبر', 'Allahu Akbar'], ['أستغفر الله', 'Astaghfirullah'], ['لا إله إلا الله', 'La ilaha illallah'], ['الصلاة على النبي ﷺ', 'Salawat on the Prophet ﷺ'],
        // أذكاري
        ['تذكيراتك، تصلك في وقتها', 'Your reminders, right on time'], ['اليوم', 'Today'], ['ما في تذكيرات اليوم. ضيف واحد، أو اختار من «جاهزة بضغطة» تحت.', 'No reminders today. Add one, or pick from “One-tap reminders” below.'],
        ['+ تذكير جديد', '+ New reminder'], ['＋ تذكير جديد', '＋ New reminder'], ['تذكيراتي', 'My reminders'], ['لا توجد تذكيرات شخصية بعد. أضف تذكيرًا، أو اختر واحدًا جاهزًا من الأسفل.', 'No personal reminders yet. Add one, or pick a ready one below.'],
        ['تذكيرات ثابتة', 'Built-in reminders'], ['ذكر عام كل 15 دقيقة', 'A dhikr every 15 minutes'], ['جرّب إشعارًا الآن', 'Send a test notification'], ['تذكير الجمعة', 'Friday reminder'],
        ['صباح الجمعة: سورة الكهف والصلاة على النبي ﷺ', 'Friday morning: Surat al-Kahf and salawat on the Prophet ﷺ'], ['تذكير الورد', 'Wird reminder'], ['كل يوم بالوقت يلي بتختاره', 'Every day at the time you choose'],
        ['جاهزة بضغطة', 'One-tap reminders'], ['لا تصلك الإشعارات؟', 'Not getting notifications?'], ['نفحص كل خطوة، ونرسل إشعار تجربة حقيقيًا من الخادم.', 'We check every step and send a real test notification from the server.'],
        ['افحص الإشعارات', 'Check notifications'], ['إصلاح الاشتراك', 'Repair subscription'], ['تذكيرك، بطريقتك', 'Your reminders, your way'],
        ['تفعيل أو إيقاف الإشعارات', 'Turn notifications on or off'], ['تفعيل إشعارات الأذكار العامة', 'Turn on general dhikr notifications'], ['تفعيل أو إيقاف تذكير الجمعة', 'Turn the Friday reminder on or off'], ['تفعيل تذكير الجمعة', 'Turn on the Friday reminder'],
        ['وقت تذكير الورد', 'Wird reminder time'], ['تفعيل أو إيقاف تذكير الورد', 'Turn the wird reminder on or off'], ['تفعيل تذكير الورد', 'Turn on the wird reminder'], ['تفعيل أو إيقاف التذكير', 'Turn the reminder on or off'], ['تفعيل', 'On'],
        ['تذكير واحد', '1 reminder'], ['تذكيران', '2 reminders'], ['تذكير واحد مفعّل', '1 active reminder'], ['تذكيران مفعّلان', '2 active reminders'], ['يومي', 'Daily'], ['أيام محددة', 'Some days'], ['مرة واحدة', 'Once'], ['تذكير', 'Reminder'],
        ['تعديل', 'Edit'], ['حذف', 'Delete'], ['إضافة', 'Add'], ['كل يوم', 'Every day'], ['غدًا', 'Tomorrow'],
        ['متوقف · فعّل المفتاح ليصلك هذا التذكير.', 'Off · turn it on to get this reminder.'], ['انتهى موعد هذا التذكير.', 'This reminder has passed.'],
        ['يصلك حتى والتطبيق مغلق ✓', 'Arrives even when the app is closed ✓'], ['جارٍ تفعيل الإشعار في الخلفية…', 'Turning on background notifications…'], ['تعذّر تفعيل الخلفية، يعمل والتطبيق مفتوح', 'Background failed, works while the app is open'],
        ['يعمل والتطبيق مفتوح', 'Works while the app is open'], ['يظهر داخل التطبيق فقط (المتصفح لا يدعم الإشعارات)', 'Shows inside the app only (browser has no notifications)'], ['الإشعارات محظورة، فعّلها من إعدادات المتصفح', 'Notifications are blocked, allow them in browser settings'],
        ['اضغط «جرّب إشعارًا الآن» للسماح بالإشعارات', 'Tap “Send a test notification” to allow notifications'], ['مفعّل', 'On'],
        ['حان وقت أذكار الصباح، ابدأ يومك بذكر الله.', 'Time for the morning adhkar, start your day with the remembrance of Allah.'], ['حان وقت أذكار المساء، اختم نهارك بذكر الله.', 'Time for the evening adhkar, end your day with the remembrance of Allah.'],
        ['سورة الملك', 'Surat al-Mulk'], ['اقرأ سورة الملك قبل ما تنام.', 'Read Surat al-Mulk before you sleep.'], ['قبل ما تنام: آية الكرسي والمعوّذات وأذكار النوم.', 'Before sleep: Ayat al-Kursi, the Mu‘awwidhat and the sleep adhkar.'],
        ['يوم الجمعة: أكثر من الصلاة على النبي ﷺ. اللهم صلِّ وسلّم على نبينا محمد.', 'Friday: send plenty of salawat on the Prophet ﷺ.'], ['صيام الاثنين والخميس', 'Fasting Monday & Thursday'], ['بكرا يوم صيام سنّة، انوِ الصيام من الليلة إن استطعت.', 'Tomorrow is a sunnah fast, make your intention tonight if you can.'],
        ['أضفت كل التذكيرات الجاهزة ✓ وبتقدر تعدّلها من فوق.', 'All ready reminders added ✓ You can edit them above.'], ['تعديل التذكير', 'Edit reminder'], ['حفظ التعديلات', 'Save changes'], ['اكتب عنوانًا للتذكير.', 'Write a title for the reminder.'],
        ['اكتب نص الذكر الذي تريد أن يصلك.', 'Write the dhikr you want to receive.'], ['اختر وقت التذكير.', 'Choose a time.'], ['اختر يومًا واحدًا على الأقل.', 'Choose at least one day.'], ['اختر تاريخ التذكير.', 'Choose a date.'],
        ['هذا الموعد مضى، اختر تاريخًا أو وقتًا لاحقًا.', 'That time has passed, choose a later one.'], ['تم تعديل التذكير', 'Reminder updated'], ['تم حفظ التذكير، سيصلك في موعده بإذن الله', 'Reminder saved, it will reach you on time in sha Allah'],
        ['تذكير جديد', 'New reminder'], ['عنوان التذكير', 'Title'], ['نص الذكر', 'Dhikr text'], ['التكرار', 'Repeat'], ['يوميًا', 'Daily'], ['أيام التذكير', 'Days'], ['التاريخ', 'Date'], ['وقت مقترح', 'Suggested time'], ['وقت مخصص', 'Custom time'],
        ['بعد صلاة الفجر · 5:30 ص', 'After Fajr · 5:30 AM'], ['أذكار الصباح · 7:00 ص', 'Morning adhkar · 7:00 AM'], ['أذكار المساء · 5:30 م', 'Evening adhkar · 5:30 PM'], ['قبل النوم · 9:30 م', 'Before sleep · 9:30 PM'],
        ['الوقت', 'Time'], ['حفظ التذكير', 'Save reminder'], ['مثال: أذكار بعد الصلاة', 'e.g. After-prayer adhkar'], ['اكتب الذكر الذي تريد أن يصلك', 'Write the dhikr you want to receive'], ['تكرار التذكير', 'Repeat'], ['أيام الأسبوع', 'Days of the week'],
        ['السبت', 'Saturday'], ['الأحد', 'Sunday'], ['الاثنين', 'Monday'], ['الثلاثاء', 'Tuesday'], ['الأربعاء', 'Wednesday'], ['الخميس', 'Thursday'], ['الجمعة', 'Friday'],
        ['الفجر', 'Fajr'], ['الضحى', 'Duha'], ['العصر', 'Asr'], ['المغرب', 'Maghrib'], ['النوم', 'Sleep'], ['النهار', 'Day'], ['الليل', 'Night'],
        ['وردك من القرآن 📖', 'Your Quran wird 📖'], ['حان وقت التذكير', 'Reminder time'], ['ذكرت', 'Done'],
        // الإعدادات
        ['بتنحفظ لحالها على جهازك', 'Saved automatically on your device'], ['اسمك', 'Your name'], ['يظهر في التحية بالرئيسية، ويناديك به المساعد', 'Shown in the home greeting, and used by the assistant'], ['اكتب اسمك', 'Your name'], ['حفظ', 'Save'],
        ['المظهر', 'Appearance'], ['مظهر التطبيق', 'Theme'], ['اختر المظهر المناسب لك', 'Choose what suits you'], ['فاتح', 'Light'], ['داكن', 'Dark'], ['حسب الجهاز', 'System'], ['حسب الشمس', 'By sunrise/sunset'],
        ['ألوان الوقت', 'Time colors'], ['تلقائي', 'Auto'], ['حجم الخط', 'Text size'], ['لكل التطبيق، وبيتطبّق فورًا', 'For the whole app, applied instantly'], ['صغير', 'Small'], ['عادي', 'Normal'], ['كبير', 'Large'], ['أكبر', 'Larger'],
        ['المؤثرات', 'Effects'], ['خفيفة: أسرع وأوفر للبطارية', 'Light: faster and easier on battery'], ['خفيفة', 'Light'], ['كاملة', 'Full'],
        ['التاريخ والتذكير', 'Dates & reminders'], ['التاريخ الهجري', 'Hijri date'], ['اليوم: —', 'Today: —'], ['يوم قبل', 'A day earlier'], ['أم القرى', 'Umm al-Qura'], ['يوم بعد', 'A day later'], ['تصحيح التاريخ الهجري', 'Hijri date adjustment'],
        ['متصفحك لا يدعم التقويم الهجري', 'Your browser doesn’t support the Hijri calendar'],
        ['شاشة مُذكّر', 'Mudhakkir screen'], ['الساعة والتاريخ، وورد اليوم، وذكر الوقت، وآية أو حديث اليوم بملء الشاشة. حطّها عالطاولة أو افتحها عالتلفزيون', 'Clock, date, today’s wird, the dhikr of the moment and a daily ayah or hadith, full screen. Put it on a desk or open it on a TV.'],
        ['افتح الشاشة', 'Open screen'], ['أدوات مُذكّر', 'Mudhakkir widgets'], ['ورد اليوم وذكر الوقت وآية اليوم عالشاشة الرئيسية للآيفون، وعلى خلفية اللابتوب، وعالتلفزيون، والتطبيق مسكّر', 'Today’s wird, the dhikr of the moment and a daily ayah on your iPhone home screen, laptop wallpaper and TV, even when the app is closed'],
        ['إعداد الأدوات', 'Set up widgets'], ['صنع بطاقة', 'Make a card'], ['خلفية لجوالك أو لابتوبك، أو بطاقة لآية أو ذكر تشاركها', 'A wallpaper for your phone or laptop, or a card of an ayah or dhikr to share'], ['افتح', 'Open'],
        ['التذكيرات والإشعارات', 'Reminders & notifications'], ['تذكير الجمعة والورد والأذكار العامة وتذكيراتك، وفحص الإشعارات', 'Friday, wird and general reminders, your own reminders, and a notification check'], ['أذكاري ←', 'My adhkar →'],
        ['بياناتك', 'Your data'], ['نسخ احتياطي ونقل لجهاز جديد', 'Backup & move to a new device'], ['احفظ ورودك وتذكيراتك وعلاماتك وتسبيحك وإعداداتك في ملف، واسترجعها على أي جهاز.', 'Save your wird, reminders, bookmarks, tasbih and settings to a file, and restore them on any device.'],
        ['حفظ نسخة', 'Save backup'], ['استرجاع نسخة', 'Restore backup'], ['التطبيق', 'App'], ['التحديثات', 'Updates'], ['الإصدار الحالي', 'Current version'], ['فحص التحديث', 'Check for updates'],
        ['ملاحظات وشكاوي', 'Feedback'], ['شكوى أو اقتراح أو خطأ لاحظته، بتوصل للمطوّر مباشرة', 'A complaint, idea or bug you noticed, sent straight to the developer'], ['جديد', 'New'],
        ['ثبّته ليفتح بلمسة كأي تطبيق، ويعمل دون إنترنت', 'Install it to open with a tap like any app, and work offline'], ['تثبيت', 'Install'], ['للمطوّرين', 'For developers'], ['صندوق الرسائل والأرقام والإعلان', 'Inbox, numbers and announcement'],
        ['إعداداتك محفوظة تلقائيًا', 'Your settings are saved automatically'], ['اللغة', 'Language'], ['لغة التطبيق، والأذكار والقرآن بيضلّوا بالعربي', 'App language; adhkar and Quran stay in Arabic'],
        ['جارٍ التحديث…', 'Updating…'], ['جارٍ تنزيل التحديث… سيظهر زر «تحديث» عند اكتماله', 'Downloading the update… an “Update” button will appear when ready'], ['أنت على أحدث إصدار ✓', 'You’re on the latest version ✓'], ['تم تحديث مُذكّر إلى أحدث إصدار ✓', 'Mudhakkir is updated ✓'],
        ['حسب موقعك', 'By your location'], ['تعذّر تحديد موقعك، سنعتمد على الوقت (6ص – 6م)', 'Couldn’t get your location, using the clock (6 AM – 6 PM)'], ['حسب الوقت: داكن من 6 مساءً حتى 6 صباحًا (لم يُحدَّد موقعك)', 'By time: dark from 6 PM to 6 AM (location not set)'],
        // الملاحظات
        ['بتوصل للمطوّر مباشرة، ومنقرا كل رسالة', 'Goes straight to the developer, and every message is read'], ['نوع الرسالة', 'Message type'], ['شكوى', 'Complaint'], ['اقتراح', 'Idea'], ['خطأ بالتطبيق', 'Bug'], ['شكر', 'Thanks'],
        ['قدّيش راضي عن مُذكّر؟', 'How happy are you with Mudhakkir?'], ['(اختياري)', '(optional)'], ['بنبعت معها نسخة التطبيق ونوع جهازك بس، حتى نصلّح الأخطاء أسرع. بلا اسم ولا رقم.', 'Only the app version and device type are sent with it, to fix bugs faster. No name, no number.'],
        ['إرسال', 'Send'], ['وصلت رسالتك، شكرًا إلك. إذا رد المطوّر بيطلعلك الرد هون.', 'Your message arrived, thank you. If the developer replies, you’ll see it here.'], ['رسائلك', 'Your messages'],
        ['نجمة وحدة', '1 star'], ['نجمتين', '2 stars'], ['3 نجوم', '3 stars'], ['4 نجوم', '4 stars'], ['5 نجوم', '5 stars'], ['اكتب ملاحظتك هون…', 'Write your feedback here…'], ['ملاحظتك', 'Your feedback'],
        ['وصلك رد على ملاحظتك', 'You got a reply to your feedback'], ['من المطوّر', 'From the developer'],
        ['هالصفحة لصاحب التطبيق بس.', 'This page is for the app owner only.'], ['فتح', 'Open'], ['كلمة السر', 'Password'], ['إظهار كلمة السر', 'Show password'], ['بعد 5 محاولات غلط بيتقفل ربع ساعة.', 'After 5 wrong tries it locks for 15 minutes.'],
        // صنع بطاقة
        ['اختار آية أو ذكر، وصمّم البطاقة بضغطة', 'Pick an ayah or dhikr, and design the card in a tap'], ['خلفية لجهازك بلا كتابة', 'A wallpaper without text'], ['منظر مرسوم بمقاس شاشتك بالضبط', 'Artwork sized exactly for your screen'],
        ['أضف خلفية من صورك', 'Add a background from your photos'], ['بنظبطها على مقاس شاشتك، ومعها كتابة أو بلا', 'Fitted to your screen, with or without text'], ['آياتي', 'My ayat'], ['من وين البطاقة', 'Card source'],
        ['☀ فاتح', '☀ Light'], ['☾ داكن', '☾ Dark'], ['الصورة كاملة', 'Whole photo'], ['خلفية لجهازي', 'My wallpaper'], ['ستوري', 'Story'], ['مربّع', 'Square'], ['بلا كتابة', 'No text'],
        ['رسمة تانية للخلفية', 'Another background'], ['رسمة تانية', 'Another one'], ['معاينة البطاقة', 'Card preview'], ['لون الخلفيات', 'Background tone'], ['الخلفية', 'Background'], ['شكل الصورة', 'Photo fit'], ['المقاس', 'Size'],
        // خطة الورد
        ['حسب مدة الختمة', 'By khatma length'], ['حسب الورد اليومي', 'By daily pages'], ['تحزيب الصحابة', 'The Companions’ division'], ['طريقة تحديد الورد', 'How to set the wird'],
        ['ختمة كل أسبوع، كل يوم «حزب» بحدود السور، متل ما كان الصحابة رضي الله عنهم يحزّبون القرآن:', 'A khatma every week, one portion a day by surah boundaries, as the Companions divided the Quran:'],
        ['مدة الختمة', 'Khatma length'], ['7 أيام (أسبوع)', '7 days (a week)'], ['10 أيام', '10 days'], ['15 يوماً', '15 days'], ['20 يوماً', '20 days'], ['30 يوماً', '30 days'], ['30 يوماً (شهر)', '30 days (a month)'], ['45 يوماً', '45 days'],
        ['60 يوماً (شهران)', '60 days (2 months)'], ['90 يوماً (3 أشهر)', '90 days (3 months)'], ['120 يوماً', '120 days'], ['180 يوماً (6 أشهر)', '180 days (6 months)'], ['365 يوماً (سنة)', '365 days (a year)'], ['مدة مخصصة…', 'Custom length…'],
        ['عدد الأيام (7 – 730)', 'Number of days (7 – 730)'], ['أو اختر تاريخ الختم', 'Or pick an end date'], ['الورد اليومي بالصفحات (1 – 100)', 'Daily pages (1 – 100)'], ['نقطة البداية', 'Starting point'], ['السورة', 'Surah'], ['اختيار السورة', 'Choose surah'],
        ['حفظ وتطبيق الورد', 'Save the plan'], ['أو جاوب على أسئلة الخطة من جديد', 'Or answer the plan questions again'], ['السؤال السابق', 'Previous question'],
        // المشاركة والتحديث والنوافذ
        ['مشاركة', 'Share'], ['وردي اليوم', 'My wird today'], ['إنجازاتي', 'My progress'], ['جارٍ تجهيز البطاقة…', 'Preparing the card…'], ['نص المشاركة (يمكنك تعديله)', 'Share text (you can edit it)'], ['مشاركة…', 'Share…'],
        ['واتساب', 'WhatsApp'], ['تيليجرام', 'Telegram'], ['إكس', 'X'], ['فيسبوك', 'Facebook'], ['نسخ النص', 'Copy text'], ['حفظ الصورة', 'Save image'], ['ما تريد مشاركته', 'What to share'], ['معاينة بطاقة المشاركة', 'Share card preview'],
        ['تم تنزيل تحديث جديد', 'A new update is ready'], ['حدّث من هنا لتحصل على آخر الميزات:', 'Update to get the latest:'], ['تحديث', 'Update'], ['فتح الموقع', 'Open website'], ['تم التحديث ✓', 'Updated ✓'],
        ['ما الجديد في مُذكّر', 'What’s new in Mudhakkir'], ['رابط الموقع للمشاركة:', 'Website link to share:'], ['تمام، فهمت', 'OK, got it'], ['إغلاق', 'Close'], ['رجوع', 'Back'], ['اختيار التاريخ أو الوقت', 'Choose date or time'],
        // المصحف (الأدوات، مو النص)
        ['صفحة', 'Page'], ['صفحتين', 'Two pages'], ['بطاقات', 'Cards'], ['لوحة', 'Panel'], ['هادئة', 'Calm'], ['العرض', 'View'], ['مصحف المدينة', 'Madinah mushaf'], ['نصي', 'Text'], ['الصفحات', 'Pages'],
        ['تلقائي: صفحتين عالشاشة العريضة', 'Auto: two pages on wide screens'], ['شريط الصفحات', 'Page bar'], ['أو اضغط عليه مطوّلًا', 'Or press and hold it'], ['التمرير', 'Scrolling'], ['الفواصل', 'Separators'], ['الخط', 'Font'],
        ['عثماني', 'Uthmani'], ['شهرزاد', 'Scheherazade'], ['نسخ', 'Copy'], ['دليل الألوان', 'Color guide'],
        ['مصحف المدينة: الصفحة متل الطبعة بالضبط وبتاخد حجمها من الشاشة. الخط وحجمه وألوان التجويد بالعرض النصي.', 'Madinah mushaf: the page exactly like the print, sized to your screen. Font, size and tajweed colors are in Text view.'],
        ['ورقي', 'Paper'], ['إضاءة دافئة', 'Warm light'], ['أريح للعين بالليل', 'Easier on the eyes at night'], ['بالليل', 'At night'], ['دائمًا', 'Always'], ['لا', 'No'],
        ['وضع القراءة', 'Reading mode'], ['الخروج من وضع القراءة', 'Exit reading mode'], ['البحث في القرآن', 'Search the Quran'], ['العلامات والملاحظات', 'Bookmarks & notes'], ['تنسيق المصحف', 'Mushaf style'],
        ['الانتقال إلى سورة أو جزء أو حزب أو صفحة', 'Go to a surah, juz, hizb or page'], ['الخروج من شاشة مُذكّر', 'Exit Mudhakkir screen'], ['نمط الشاشة', 'Screen style'], ['تصغير الخط', 'Smaller text'], ['تكبير الخط', 'Larger text'],
        // المساعد
        ['اسأل مُذكّر', 'Ask Mudhakkir'], ['متصل', 'Online'], ['قد يخطئ أحيانًا · نصوص الأذكار وأدلتها من التطبيق نفسه · وللفتوى ارجع لأهل العلم', 'It can make mistakes · adhkar texts and sources come from the app · for fatwa, ask scholars'],
        ['إغلاق المحادثة', 'Close chat'], ['محادثة جديدة', 'New chat'], ['تحدّث بدل الكتابة', 'Speak instead of typing'], ['اكتب شيئًا تريده…', 'Type anything…'], ['سؤالك', 'Your question'],
        // التثبيت
        ['مثبّت ✓ أنت تستخدم تطبيق مُذكّر الآن', 'Installed ✓ You’re using the Mudhakkir app'], ['تم التثبيت ✓ ستجده بين تطبيقاتك', 'Installed ✓ You’ll find it among your apps'], ['مثبّت على هذا الجهاز ✓ (التفاصيل تحت)', 'Installed on this device ✓ (details below)'],
        ['جارٍ التثبيت… سيظهر مُذكّر بين تطبيقاتك', 'Installing… Mudhakkir will appear among your apps'], ['على الآيفون والآيباد: اتبع الخطوات الظاهرة تحت الزر ↓', 'On iPhone and iPad: follow the steps below the button ↓'],
        ['مُذكّر مثبّت مسبقًا على هذا الجهاز، التفاصيل تحت ↓', 'Mudhakkir is already installed on this device, details below ↓'], ['اتبع الخطوات الظاهرة تحت الزر ↓', 'Follow the steps below the button ↓'],
        ['أنت فاتح مُذكّر كتطبيق مثبّت ✓', 'You opened Mudhakkir as an installed app ✓'], ['تم تثبيت مُذكّر ✓ ستجده بين تطبيقاتك', 'Mudhakkir installed ✓ You’ll find it among your apps'],
        // النسخ الاحتياطي
        ['تم تجهيز النسخة الاحتياطية ✓', 'Backup ready ✓'], ['تم حفظ النسخة الاحتياطية ✓', 'Backup saved ✓'], ['هذا الملف ليس نسخة احتياطية من مُذكّر', 'This file is not a Mudhakkir backup'], ['النسخة فارغة', 'The backup is empty'],
        ['تعذّر الاسترجاع: مساحة التخزين ممتلئة', 'Restore failed: storage is full'], ['تم الاسترجاع ✓ جارٍ إعادة فتح التطبيق…', 'Restored ✓ Reopening the app…'],
        // أيام مميزة
        ['بداية عام هجري جديد', 'A new Hijri year'], ['كل عام وأنت بخير، جعله الله عام طاعة وبركة.', 'May Allah make it a year of obedience and blessing.'], ['يوم تاسوعاء', 'Day of Tasu‘a'], ['يُستحب صيامه مع يوم عاشوراء غدًا.', 'It is recommended to fast it with ‘Ashura tomorrow.'],
        ['يوم عاشوراء', 'Day of ‘Ashura'], ['يُستحب صيامه، وصيامه يكفّر السنة التي قبله (صحيح مسلم).', 'Fasting it is recommended; it expiates the previous year (Sahih Muslim).'], ['رمضان مبارك', 'Ramadan Mubarak'], ['تقبّل الله منا ومنك الصيام والقيام.', 'May Allah accept our fasting and prayers.'],
        ['تحرَّ ليلة القدر في الليالي الوترية، وأكثر من: اللهم إنك عفو تحب العفو فاعفُ عني.', 'Seek Laylat al-Qadr in the odd nights, and say often: O Allah, You are Pardoning and love to pardon, so pardon me.'], ['اللهم تقبّل صيامنا وقيامنا.', 'O Allah, accept our fasting and prayers.'],
        ['عيد الفطر المبارك', 'Eid al-Fitr Mubarak'], ['تقبّل الله منا ومنكم. لا يُصام يوم العيد.', 'May Allah accept from us and you. Eid day is not a fasting day.'], ['يوم عرفة', 'Day of ‘Arafah'],
        ['صيامه لغير الحاج يكفّر السنة الماضية والباقية (صحيح مسلم)، وأكثر فيه من الدعاء.', 'For those not on Hajj, fasting it expiates the past and coming year (Sahih Muslim). Make plenty of du‘a.'], ['عيد الأضحى المبارك', 'Eid al-Adha Mubarak'], ['أيام التشريق', 'Days of Tashreeq'],
        ['أيام أكل وشرب وذكر لله، لا يُصام فيها. أكثر من التكبير.', 'Days of eating, drinking and remembering Allah, not for fasting. Say takbir often.'], ['العشر الأوائل من ذي الحجة', 'The first ten days of Dhul-Hijjah'],
        ['أفضل أيام الدنيا؛ أكثر فيها من التكبير والتهليل والتحميد والعمل الصالح.', 'The best days of the year; say takbir, tahlil and tahmid often, and do good deeds.'], ['يُستحب صيام الأيام البيض: 13 و14 و15 من كل شهر هجري.', 'Fasting the White Days is recommended: the 13th, 14th and 15th of each Hijri month.'],
        ['غدًا تبدأ الأيام البيض', 'The White Days start tomorrow'], ['يُستحب صيام 13 و14 و15 من الشهر الهجري، فانوِ من الليلة إن استطعت.', 'Fasting the 13th, 14th and 15th is recommended, make your intention tonight if you can.'],
        // الورشة الصغيرة: أشيا متفرقة
        ['ولا شي', 'Nothing'], ['عبادة', '1 worship'], ['عبادتين', '2 worships'], ['الثلاثة', 'All three'], ['السلسلة الحالية', 'Current streak'], ['أطول سلسلة', 'Longest streak'], ['لا شيء بعد', 'nothing yet'], ['أتمّ الورد', 'Finished the wird'], ['قرأ من الورد', 'Read some wird'],
        ['لكل التطبيق', 'for the whole app'], ['أ−', 'A−'], ['أ+', 'A+'],
        ['ورد اليوم محفوظ، بتقدر تقرأه بدون نت', 'Today’s wird is saved, you can read it offline'], ['✓ ورد اليوم محفوظ، بتقدر تقرأه بدون نت', '✓ Today’s wird is saved, you can read it offline'],
        ['أسرع وأوفر للبطارية، بلا حركات ثقيلة', 'faster and easier on battery, no heavy motion'], ['إطار النور على البطاقات والزجاج المغبّش', 'glowing card frames and frosted glass'],
        ['English', 'English'], ['العربية', 'العربية']
    ]);

    // أسماء السور بالإنجليزي، بنفس ترتيب SURAH_NAMES (wird.js)
    const SURAH_EN = ['Al-Fatihah', 'Al-Baqarah', 'Al Imran', 'An-Nisa', 'Al-Ma’idah', 'Al-An‘am', 'Al-A‘raf', 'Al-Anfal', 'At-Tawbah', 'Yunus', 'Hud', 'Yusuf', 'Ar-Ra‘d', 'Ibrahim', 'Al-Hijr', 'An-Nahl', 'Al-Isra', 'Al-Kahf', 'Maryam', 'Ta-Ha',
        'Al-Anbiya', 'Al-Hajj', 'Al-Mu’minun', 'An-Nur', 'Al-Furqan', 'Ash-Shu‘ara', 'An-Naml', 'Al-Qasas', 'Al-‘Ankabut', 'Ar-Rum', 'Luqman', 'As-Sajdah', 'Al-Ahzab', 'Saba', 'Fatir', 'Ya-Sin', 'As-Saffat', 'Sad', 'Az-Zumar', 'Ghafir',
        'Fussilat', 'Ash-Shura', 'Az-Zukhruf', 'Ad-Dukhan', 'Al-Jathiyah', 'Al-Ahqaf', 'Muhammad', 'Al-Fath', 'Al-Hujurat', 'Qaf', 'Adh-Dhariyat', 'At-Tur', 'An-Najm', 'Al-Qamar', 'Ar-Rahman', 'Al-Waqi‘ah', 'Al-Hadid', 'Al-Mujadilah', 'Al-Hashr', 'Al-Mumtahanah',
        'As-Saff', 'Al-Jumu‘ah', 'Al-Munafiqun', 'At-Taghabun', 'At-Talaq', 'At-Tahrim', 'Al-Mulk', 'Al-Qalam', 'Al-Haqqah', 'Al-Ma‘arij', 'Nuh', 'Al-Jinn', 'Al-Muzzammil', 'Al-Muddaththir', 'Al-Qiyamah', 'Al-Insan', 'Al-Mursalat', 'An-Naba', 'An-Nazi‘at', '‘Abasa',
        'At-Takwir', 'Al-Infitar', 'Al-Mutaffifin', 'Al-Inshiqaq', 'Al-Buruj', 'At-Tariq', 'Al-A‘la', 'Al-Ghashiyah', 'Al-Fajr', 'Al-Balad', 'Ash-Shams', 'Al-Layl', 'Ad-Duha', 'Ash-Sharh', 'At-Tin', 'Al-‘Alaq', 'Al-Qadr', 'Al-Bayyinah', 'Az-Zalzalah', 'Al-‘Adiyat',
        'Al-Qari‘ah', 'At-Takathur', 'Al-‘Asr', 'Al-Humazah', 'Al-Fil', 'Quraysh', 'Al-Ma‘un', 'Al-Kawthar', 'Al-Kafirun', 'An-Nasr', 'Al-Masad', 'Al-Ikhlas', 'Al-Falaq', 'An-Nas'];
    let surahMap = null;
    const surah = name => {
        if (!surahMap && typeof SURAH_NAMES !== 'undefined') surahMap = new Map(SURAH_NAMES.map((n, i) => [n, SURAH_EN[i]]));
        return (surahMap && surahMap.get(name)) || name;
    };
    const num = s => s; // الأرقام إنجليزية أصلًا (الإصدار 27)
    const plural = (n, one, many) => `${n} ${Number(n) === 1 ? one : many}`;

    // ===== أنماط للنصوص يلي فيها أرقام أو أسماء =====
    const PATTERNS = [
        [/^(\d+) من (\d+)$/, (m, a, b) => `${a} of ${b}`],
        [/^(\d+) من (\d+) صفحة$/, (m, a, b) => `${a} of ${b} pages`],
        [/^ختمة خلال (\d+) (?:يوم|يوماً|يومًا|أيام)$/, (m, a) => `Khatma in ${a} days`],
        [/^(خفيفة|كاملة)( \(تلقائي على هذا الجهاز\))?: (.+)$/, (m, a, b, c) => `${a === 'خفيفة' ? 'Light' : 'Full'}${b ? ' (auto on this device)' : ''}: ${tr(c) || c}`],
        [/^(\d+) \/ (\d+) صفحة$/, (m, a, b) => `${a} / ${b} pages`],
        [/^(\d+) \/ (\d+) آيات$/, (m, a, b) => `${a} / ${b} ayat`],
        [/^الجزء (\d+)$/, (m, a) => `Juz ${a}`],
        [/^الجزء (\d+) من 30$/, (m, a) => `Juz ${a} of 30`],
        [/^الصفحة (\d+)$/, (m, a) => `Page ${a}`], [/^صفحة (\d+)$/, (m, a) => `Page ${a}`],
        [/^من (?:ال)?صفحة (\d+)$/, (m, a) => `From page ${a}`],
        [/^الصفحات (\d+)\s*[–-]\s*(\d+)$/, (m, a, b) => `Pages ${a}–${b}`],
        [/^صفحة (\d+)\s*[–-]\s*(\d+)$/, (m, a, b) => `Pages ${a}–${b}`],
        [/^وردك اليوم: (\d+)\s*[–-]\s*(\d+)$/, (m, a, b) => `Today’s wird: ${a}–${b}`],
        [/^ورد اليوم: الصفحات (\d+)\s*[–-]\s*(\d+)$/, (m, a, b) => `Today’s wird: pages ${a}–${b}`],
        [/^ورد اليوم: الصفحة (\d+)$/, (m, a) => `Today’s wird: page ${a}`],
        [/^وردك اليوم · (.+)$/, (m, a) => `Today’s wird · ${tr(a) || a}`],
        [/^اليوم (\d+) من (\d+)(?: بخطّتك)?$/, (m, a, b) => `Day ${a} of ${b}`],
        [/^وصلت (\d+) من (\d+)$/, (m, a, b) => `Reached ${a} of ${b}`],
        [/^(\d+) (?:مرات|مرة)$/, (m, a) => `${a} times`],
        [/^(\d+) (?:أذكار|ذكرًا)$/, (m, a) => `${a} adhkar`],
        [/^(\d+) موقفًا$/, (m, a) => `${a} situations`],
        [/^سورة (.+)$/, (m, a) => `Surah ${surah(a)}`],
        [/^الآية (\d+)$/, (m, a) => `Ayah ${a}`],
        [/^(\d+)[٪%]$/, (m, a) => `${a}%`],
        [/^(\d+)[٪%] من الختمة$/, (m, a) => `${a}% of the khatma`],
        [/^قريت (\S+)$/, (m, a) => `Read ${a}`],
        [/^أنت مستمر منذ (\d+) يوم(?:اً)?$/, (m, a) => `${a}-day streak`],
        [/^(\d+) (?:يوم|أيام|يومين|يوماً|يومًا)$/, (m, a) => plural(a, 'day', 'days')],
        [/^الإصدار (\d+)$/, (m, a) => `Version ${a}`],
        [/^مُذكّر، الإصدار (\d+)$/, (m, a) => `Mudhakkir, version ${a}`],
        [/^(\d+) (?:تذكيرات|تذكيرًا)$/, (m, a) => `${a} reminders`],
        [/^(\d+) (?:تذكيرات مفعّلة|تذكيرًا مفعّلًا)$/, (m, a) => `${a} active reminders`],
        [/^هلّق (.+)$/, (m, a) => `Now ${a}`],
        [/^الدورة (\d+)$/, (m, a) => `Round ${a}`], [/^الهدف (\d+)$/, (m, a) => `Goal ${a}`], [/^المجموع (\d+)$/, (m, a) => `Total ${a}`],
        [/^من (\d+)$/, (m, a) => `of ${a}`],
        [/^(.+?)\s*(?:AH)?\s*هـ$/, (m, a) => `${a.trim()} AH`],
        [/^القادم (\S+) (.+)$/, (m, a, b) => `Next: ${tr(a) || a} ${b}`],
        [/^الحجم الحالي: (\S+)$/, (m, a) => `Current size: ${tr(a) || a}`],
        [/^حجم الآية: (\d+)[٪%]$/, (m, a) => `Ayah size: ${a}%`],
        [/^أهلًا (.+) — يظهر اسمك في التحية ويناديك به المساعد$/, (m, a) => `Hi ${a}. Your name shows in the greeting and the assistant uses it`],
        [/^أهلًا (.+)، تم حفظ اسمك$/, (m, a) => `Hi ${a}, your name is saved`],
        [/^فتح (أذكار .+)$/, (m, a) => `Open ${tr(a) || a}`],
        [/^اليوم: (.+)$/, (m, a) => `Today: ${tr(a) || a}`],
        [/^(\d+) صفحات?$/, (m, a) => plural(a, 'page', 'pages')],
        [/^من سورة (.+) إلى سورة (.+)$/, (m, a, b) => `From ${surah(a)} to ${surah(b)}`],
        [/^سورة (.+) \/ (.+)$/, (m, a, b) => `Surah ${surah(a)} / ${b}`],
        [/^الختمة (\d+) من (\d+)$/, (m, a, b) => `Khatma ${a} of ${b}`],
        [/^أذكاري$/, () => 'My adhkar'],
        [/^حسب موقعك: فاتح من الشروق (.+) حتى الغروب (.+)$/, (m, a, b) => `By location: light from sunrise ${a} to sunset ${b}`],
        [/^الإصدار (\d+) · يوجد تحديث جاهز للتثبيت$/, (m, a) => `Version ${a} · an update is ready`],
        [/^الإصدار (\d+) · أنت على أحدث إصدار$/, (m, a) => `Version ${a} · you’re up to date`],
        [/^انضاف «(.+)»، بيوصلك (.+)$/, (m, a, b) => `Added “${a}”, it arrives ${b}`],
        [/^حذف التذكير «(.+)»؟$/, (m, a) => `Delete the reminder “${a}”?`],
        [/^من الأيام البيض$/, () => 'One of the White Days'],
        [/^اليوم (\d+) من رمضان$/, (m, a) => `Day ${a} of Ramadan`],
        [/^العشر الأواخر من رمضان$/, () => 'Last ten nights of Ramadan'], [/^الليلة (\d+)$/, (m, a) => `Night ${a}`]
    ];

    const AR = /[؀-ۿ]/;
    function seg(p) {
        if (EN.has(p)) return EN.get(p);
        for (const [re, fn] of PATTERNS) { const m = p.match(re); if (m) return fn(...m); }
        if (surahMap === null) surah('');
        if (surahMap && surahMap.has(p)) return surahMap.get(p);
        if (p.includes('، ')) { const parts = p.split('، '); const out = parts.map(seg); if (out.some((x, i) => x !== parts[i])) return out.join(', '); }
        return p;
    }
    // ترجمة نص كامل (أو null إذا ما في ترجمة)
    function tr(s) {
        if (!s) return null;
        const k = s.replace(/\s+/g, ' ').trim();
        if (!k || !AR.test(k)) return null;
        if (EN.has(k)) return EN.get(k);
        const parts = k.split(' · ');
        const out = parts.map(seg);
        return out.some((x, i) => x !== parts[i]) ? out.join(' · ') : null;
    }
    const t = s => (isEn ? (tr(s) || s) : s);

    // ===== التواريخ والأرقام: أي لغة عربية بـ Intl بتصير إنجليزي =====
    function patchIntl() {
        const toEn = loc => {
            if (typeof loc === 'string' && /^ar(\b|-)/i.test(loc)) return loc.replace(/^ar(?:-[A-Za-z]{2})?/i, 'en-US');
            if (Array.isArray(loc)) return loc.map(toEn);
            return loc;
        };
        const D = Date.prototype;
        ['toLocaleDateString', 'toLocaleTimeString', 'toLocaleString'].forEach(m => { const o = D[m]; D[m] = function (loc, opt) { return o.call(this, toEn(loc), opt); }; });
        // الأرقام: بس يلي طالبة أرقام إنجليزية (nu-latn). الأرقام العربية (١٢٣) للقرآن والمصحف بتضل متل ما هي
        const N = Number.prototype.toLocaleString; Number.prototype.toLocaleString = function (loc, opt) { return N.call(this, typeof loc === 'string' && /nu-latn/.test(loc) ? toEn(loc) : loc, opt); };
        const DTF = Intl.DateTimeFormat;
        const Patched = function (loc, opt) { return new DTF(toEn(loc), opt); };
        Patched.prototype = DTF.prototype; Patched.supportedLocalesOf = DTF.supportedLocalesOf;
        Intl.DateTimeFormat = Patched;
    }

    // ===== ترجمة الصفحة =====
    // محتوى عربي ما منلمسو: نص الأذكار والقرآن والمصحف
    const SKIP = 'script, style, textarea, [data-no-i18n], .single-verse-content, .dk-text, .dk-seq-text, .dk-list, .dk-hadith, .dk-foot, .dk-intro, .ayah, .dhikr-copy, .tb-dz, .tm-dz, .adhkar-body > p, .proof, .reader, .qp-page, .mushaf, .verse-text, .ask-msg, #ask-log, .cm-text, .cd-text';
    const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
    function fixText(n) {
        const p = n.parentElement; if (!p || p.closest(SKIP)) return;
        const v = n.nodeValue; if (!v || !AR.test(v)) return;
        const r = tr(v); if (r === null) return;
        const lead = v.match(/^\s*/)[0], trail = v.match(/\s*$/)[0];
        n.nodeValue = lead + r + trail;
    }
    function fixAttrs(el) {
        if (el.closest(SKIP)) return;
        for (const a of ATTRS) { const v = el.getAttribute(a); if (v && AR.test(v)) { const r = tr(v); if (r !== null) el.setAttribute(a, r); } }
    }
    function walk(root) {
        if (root.nodeType === 3) { fixText(root); return; }
        if (root.nodeType !== 1) return;
        if (root.closest && root.closest(SKIP)) return;
        fixAttrs(root);
        const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
            acceptNode: n => n.nodeType === 1 && n.matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
        });
        let n; while ((n = w.nextNode())) { if (n.nodeType === 3) fixText(n); else fixAttrs(n); }
    }
    function start() {
        document.title = t(document.title);
        walk(document.body);
        new MutationObserver(ms => {
            for (const m of ms) {
                if (m.type === 'characterData') fixText(m.target);
                else if (m.type === 'attributes') fixAttrs(m.target);
                else m.addedNodes.forEach(walk);
            }
        }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    }

    // ===== خيار اللغة بالإعدادات =====
    function bindSetting() {
        document.querySelectorAll('[data-lang-opt]').forEach(b => {
            const on = b.dataset.langOpt === lang;
            b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on));
            b.addEventListener('click', () => { if (b.dataset.langOpt !== lang) set(b.dataset.langOpt); });
        });
    }

    if (isEn) {
        patchIntl();
        document.documentElement.lang = 'en'; document.documentElement.dir = 'ltr';
        const meta = document.querySelector('meta[property="og:locale"]'); if (meta) meta.content = 'en_US';
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindSetting, { once: true }); else bindSetting();

    return { lang, isEn, t, tr, set, surah };
})();
