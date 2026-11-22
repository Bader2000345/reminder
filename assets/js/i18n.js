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
        ['بعد العبادات', 'After worship'], ['الصلاة والذكر', 'Prayer & dhikr'], ['أدعية الاستفتاح', 'Opening supplications'], ['أول الصلاة بعد تكبيرة الإحرام', 'Start of prayer, after the opening takbir'],['أذكار بعد الصلاة', 'After-prayer adhkar'], ['أذكار ودعاء بعد كل صلاة', 'Adhkar and du‘a after every prayer'], ['تسبيح واستغفار', 'Tasbih & istighfar'], ['فضل الذكر العظيم', 'The great virtue of dhikr'],
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
        ['تذكيرات ثابتة', 'Built-in reminders'], ['ذكر عام كل 15 دقيقة', 'A dhikr every 15 minutes'], ['جرّب إشعارًا الآن', 'Test notification'], ['تذكير الجمعة', 'Friday reminder'],
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
        ['اضغط «جرّب إشعارًا الآن» للسماح بالإشعارات', 'Tap “Test notification” to allow notifications'], ['مفعّل', 'On'],
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
        ['ملاحظات وشكاوي', 'Feedback'], ['شكوى أو اقتراح أو خطأ لاحظته، بتوصل لفريق مُذكّر مباشرة', 'A complaint, idea or bug you noticed, sent straight to the Mudhakkir team'], ['جديد', 'New'],
        ['ثبّته ليفتح بلمسة كأي تطبيق، ويعمل دون إنترنت', 'Install it to open with a tap like any app, and work offline'], ['تثبيت', 'Install'], ['للمطوّرين', 'For developers'], ['صندوق الرسائل والأرقام والإعلان', 'Inbox, numbers and announcement'],
        ['إعداداتك محفوظة تلقائيًا', 'Your settings are saved automatically'], ['اللغة', 'Language'], ['لغة التطبيق، والأذكار والقرآن بيضلّوا بالعربي', 'App language; adhkar and Quran stay in Arabic'],
        ['جارٍ التحديث…', 'Updating…'], ['جارٍ تنزيل التحديث… سيظهر زر «تحديث» عند اكتماله', 'Downloading the update… an “Update” button will appear when ready'], ['أنت على أحدث إصدار ✓', 'You’re on the latest version ✓'], ['تم تحديث مُذكّر إلى أحدث إصدار ✓', 'Mudhakkir is updated ✓'],
        ['حسب موقعك', 'By your location'], ['تعذّر تحديد موقعك، سنعتمد على الوقت (6ص – 6م)', 'Couldn’t get your location, using the clock (6 AM – 6 PM)'], ['حسب الوقت: داكن من 6 مساءً حتى 6 صباحًا (لم يُحدَّد موقعك)', 'By time: dark from 6 PM to 6 AM (location not set)'],
        // الملاحظات
        ['بتوصل لفريق مُذكّر مباشرة، ومنقرا كل رسالة', 'Goes straight to the Mudhakkir team, and every message is read'], ['نوع الرسالة', 'Message type'], ['شكوى', 'Complaint'], ['اقتراح', 'Idea'], ['خطأ بالتطبيق', 'Bug'], ['شكر', 'Thanks'],
        ['قدّيش راضي عن مُذكّر؟', 'How happy are you with Mudhakkir?'], ['(اختياري)', '(optional)'], ['بنبعت معها نسخة التطبيق ونوع جهازك بس، حتى نصلّح الأخطاء أسرع. بلا اسم ولا رقم.', 'Only the app version and device type are sent with it, to fix bugs faster. No name, no number.'],
        ['إرسال', 'Send'], ['وصلت رسالتك، شكرًا إلك. إذا ردّ فريق مُذكّر بيطلعلك الرد هون.', 'Your message arrived, thank you. If the Mudhakkir team replies, you’ll see it here.'], ['رسائلك', 'Your messages'],
        ['نجمة وحدة', '1 star'], ['نجمتين', '2 stars'], ['3 نجوم', '3 stars'], ['4 نجوم', '4 stars'], ['5 نجوم', '5 stars'], ['اكتب ملاحظتك هون…', 'Write your feedback here…'], ['ملاحظتك', 'Your feedback'],
        ['وصلك رد على ملاحظتك', 'You got a reply to your feedback'], ['من فريق مُذكّر', 'From the Mudhakkir team'], ['ردّ فريق مُذكّر', 'Reply from the Mudhakkir team'],
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
        ['افتحه في Chrome لتثبيته، فهذا المتصفح لا يثبّت التطبيقات', 'Open it in Chrome to install it, this browser can’t install apps'],
        ['جارٍ فتح Chrome… وإن لم يُفتح، فالرابط منسوخ: الصقه في Chrome', 'Opening Chrome… If it doesn’t open, the link is copied: paste it in Chrome'],
        ['جارٍ التثبيت… وإن لم تظهر الأيقونة خلال دقيقة، افتح «لم تظهر الأيقونة؟»', 'Installing… If the icon doesn’t appear within a minute, open “Installed, but no icon?”'],
        ['تم التثبيت ✓ وإن لم تظهر الأيقونة، افتح «لم تظهر الأيقونة؟»', 'Installed ✓ If the icon doesn’t appear, open “Installed, but no icon?”'],
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

    // الدفعة التانية (نصوص الملفات: المصحف، خطة الورد، الإشعارات، المساعد، صنع بطاقة، الملاحظات…)
    [
        // أدوات المصحف والتجويد والتفسير والعلامات والبحث
        ['همزة وصل', 'Hamzat wasl'], ['لا يُنطق', 'Silent'], ['لام شمسية', 'Sun-letter lam'], ['مدّ طبيعي (حركتان)', 'Natural madd (2 counts)'], ['مدّ جائز (2، 4، 6)', 'Permissible madd (2, 4, 6)'],
        ['مدّ واجب (4–5)', 'Obligatory madd (4–5)'], ['مدّ لازم (6 حركات)', 'Necessary madd (6 counts)'], ['قلقلة', 'Qalqalah'], ['غُنّة', 'Ghunnah'], ['إخفاء', 'Ikhfa’'], ['إخفاء شفوي', 'Labial ikhfa’'],
        ['إقلاب', 'Iqlab'], ['إدغام بغنّة', 'Idgham with ghunnah'], ['إدغام بلا غنّة', 'Idgham without ghunnah'], ['إدغام شفوي', 'Labial idgham'], ['إدغام متجانس', 'Homogeneous idgham'], ['إدغام متقارب', 'Close idgham'],
        ['مدّ طبيعي', 'Natural madd'], ['مدّ جائز', 'Permissible madd'], ['مدّ واجب', 'Obligatory madd'], ['مدّ لازم', 'Necessary madd'],
        ['الميسر', 'Al-Muyassar'], ['التفسير الميسر', 'Tafsir al-Muyassar'], ['المختصر', 'Al-Mukhtasar'], ['المختصر في تفسير القرآن الكريم', 'Al-Mukhtasar fi Tafsir al-Quran'],
        ['QuranEnc.com — مركز تفسير للدراسات القرآنية', 'QuranEnc.com — Tafsir Center for Quranic Studies'], ['ابن كثير', 'Ibn Kathir'], ['تفسير ابن كثير', 'Tafsir Ibn Kathir'], ['نسخ التفسير', 'Copy tafsir'], ['تم نسخ التفسير', 'Tafsir copied'],
        ['تعذّر تحميل التفسير الآن. تأكد من الاتصال بالإنترنت ثم حاول مرة أخرى.', 'Couldn’t load the tafsir now. Check your connection and try again.'],
        ['ذهبي', 'Gold'], ['أخضر', 'Green'], ['أزرق', 'Blue'], ['وردي', 'Pink'], ['تم نسخ الآية', 'Ayah copied'], ['تم نسخ الآية للمشاركة', 'Ayah copied for sharing'], ['صورة', 'Image'],
        ['إزالة العلامة', 'Remove bookmark'], ['علامة مرجعية', 'Bookmark'], ['تم حفظ العلامة', 'Bookmark saved'], ['تمت إزالة العلامة', 'Bookmark removed'], ['تمييز', 'Highlight'], ['تمييز الآية', 'Highlight ayah'],
        ['ملاحظتي', 'My note'], ['ملاحظة تدبّر', 'Reflection note'], ['تم تمييز الآية', 'Ayah highlighted'], ['إزالة التمييز', 'Remove highlight'], ['اكتب ما تدبّرته في هذه الآية…', 'Write your reflection on this ayah…'],
        ['ملاحظة على الآية', 'Note on the ayah'], ['حفظ الملاحظة', 'Save note'], ['تم حفظ الملاحظة', 'Note saved'], ['تم حذف الملاحظة', 'Note deleted'],
        ['لا توجد علامات بعد. اضغط مطوّلًا على أي آية لتضع علامة مرجعية أو تمييزًا أو ملاحظة.', 'No bookmarks yet. Press and hold any ayah to bookmark, highlight or add a note.'],
        ['نتيجة واحدة', '1 result'], ['نتيجتان', '2 results'], ['(أول 60)', '(first 60)'], ['اكتب كلمة أو جزءًا من آية (دون تشكيل)', 'Type an Arabic word or part of an ayah (no diacritics)'], ['بحث', 'Search'],
        ['مثال: الصبر، رحمة الله، إن مع العسر يسرا', 'In Arabic, e.g. الصبر، رحمة الله'], ['جارٍ تجهيز البحث أول مرة (بيشتغل بعدها بلا نت)…', 'Preparing search for the first time (works offline after)…'],
        ['لا توجد نتائج. جرّب كلمة أخرى أو اكتبها دون تشكيل.', 'No results. Try another word, or type it without diacritics.'], ['اكتب حرفين على الأقل.', 'Type at least two letters.'], ['جارٍ البحث…', 'Searching…'],
        ['خدمة البحث متوقفة مؤقتًا من مصدرها، حاول بعد قليل.', 'The search service is down at its source, try again shortly.'], ['تعذّر فتح الآية، حاول مرة أخرى', 'Couldn’t open the ayah, try again'],
        ['تعذّر البحث الآن. تأكد من الاتصال بالإنترنت.', 'Search failed. Check your connection.'], ['الآية', 'Ayah'], ['تعذّر تحميل ألوان التجويد الآن', 'Couldn’t load tajweed colors now'],
        ['جارٍ تحميل الصفحة', 'Loading page'], ['مصحف المدينة بدّه نت أول مرة لهالصفحة، عرضنالك النص', 'The Madinah mushaf needs internet the first time for this page, showing the text instead'],
        ['تعذر تحميل الصفحة. تحقق من الاتصال بالإنترنت.', 'Couldn’t load the page. Check your connection.'], ['تعذّر تحميل ألوان التجويد لهذه الصفحة', 'Couldn’t load tajweed colors for this page'], ['من صفحة', 'From page'],
        ['شريط التمرير', 'Scroll bar'], ['ما في فواصل بعد. اضغط مطوّلًا على أي آية وحطّ علامة، بتطلع هون.', 'No markers yet. Press and hold any ayah and add a bookmark, it shows here.'], ['رقم الصفحة', 'Page number'],
        ['لتغيّر النمط بسرعة: اضغط مطوّلًا على الشريط. وموجود كمان بـ«تنسيق المصحف».', 'To change the style quickly, press and hold the bar. It’s also in “Mushaf style”.'], ['نمط شريط الصفحات', 'Page bar style'],
        ['١ – ٦٠٤', '1 – 604'], ['انتقال', 'Go'], ['اكتب رقم صفحة من ١ إلى ٦٠٤', 'Type a page number from 1 to 604'], ['نوع الفهرس', 'Index type'], ['السور', 'Surahs'], ['الأجزاء', 'Juz'], ['الانتقال في المصحف', 'Navigate the mushaf'],
        ['الحزب', 'Hizb'], ['سورة', 'Surah'],
        // خطة الورد (أسئلة أول مرة وتعديل الورد)
        ['مطفي. شغّله واختار الوقت', 'Off. Turn it on and pick a time'],
        ['حان وقت وردك اليوم، ولو صفحة. «أحبُّ الأعمال إلى الله أدومُها وإن قلّ».', 'Time for today’s wird, even one page. “The most beloved deeds to Allah are the most consistent, even if small.”'],
        ['ساعة تقريبًا', 'About an hour'], ['ساعتين تقريبًا', 'About 2 hours'], ['صفحة وحدة', 'One page'], ['كم ختمة ناوي تختم إن شاء الله؟', 'How many khatmas do you intend, in sha Allah?'],
        ['النيّة الصادقة بتسهّل الطريق، وفيك تغيّرها بأي وقت.', 'A sincere intention makes the way easier, and you can change it anytime.'], ['ختمة وحدة', 'One khatma'], ['بداية مباركة', 'A blessed start'], ['ختمتين', 'Two khatmas'],
        ['نيّة طيبة وهمّة عالية', 'A good intention and high resolve'], ['3 ختمات', '3 khatmas'], ['الله يبارك بوقتك', 'May Allah bless your time'], ['أكتر', 'More'], ['حدّد العدد بنفسك', 'Set the number yourself'],
        ['بكم يوم حابب تختم الختمة الوحدة؟', 'In how many days would you like to finish one khatma?'], ['اختار يلي بتقدر تداوم عليه، فالقليل الدايم أحسن من الكتير المنقطع.', 'Choose what you can keep up: a little done consistently beats a lot done once.'],
        ['كل يوم حزب بحدود السور', 'A portion a day by surah boundaries'], ['سنّة الصحابة', 'The Companions’ way'], ['شهر', 'A month'], ['شهرين', 'Two months'], ['على قدّي', 'My own pace'], ['بحدّد كم صفحة باليوم', 'I’ll set pages per day'],
        ['من مكاني الحالي', 'From where I am now'], ['من أول المصحف', 'From the beginning'], ['من سورة معيّنة', 'From a specific surah'], ['اختار السورة', 'Choose the surah'], ['من وين حابب تبلّش؟', 'Where would you like to start?'],
        ['الورد بيمشي معك صفحة صفحة من المكان يلي بتختاره.', 'Your wird moves with you page by page from where you choose.'], ['إيمتى بتحب نذكّرك بوردك؟', 'When should we remind you of your wird?'],
        ['بيوصلك إشعار لطيف كل يوم، حتى والتطبيق مسكّر.', 'A gentle notification every day, even when the app is closed.'], ['الصبح بكّير', 'Early morning'], ['6:00 صباحًا', '6:00 AM'], ['9:00 صباحًا', '9:00 AM'],
        ['بعد الظهر', 'Afternoon'], ['2:00 ظهرًا', '2:00 PM'], ['بعد المغرب', 'After Maghrib'], ['7:00 مساءً', '7:00 PM'], ['10:00 مساءً', '10:00 PM'], ['وقت تاني', 'Another time'], ['بختار الساعة بنفسي', 'I’ll pick the time'],
        ['بلا تذكير', 'No reminder'], ['بفتح الورد لحالي', 'I’ll open the wird myself'], ['كم صفحة باليوم؟', 'How many pages a day?'], ['ساعة التذكير', 'Reminder time'], ['من مكانك الحالي', 'From where you are'],
        ['تحزيب الصحابة: كل يوم حزب', 'The Companions’ division: a portion a day'], ['خطتك جاهزة', 'Your plan is ready'], ['على بركة الله، هي خطتك', 'With Allah’s blessing, here’s your plan'],
        ['«أحبُّ الأعمالِ إلى اللهِ أدومُها وإن قلَّ»', '“The most beloved deeds to Allah are the most consistent, even if small.”'], ['متفق عليه', 'Bukhari & Muslim'], ['ابدأ على بركة الله', 'Start, with Allah’s blessing'],
        ['فيك تغيّر أي شي بعدين من «تعديل الورد اليومي».', 'You can change anything later from “Edit daily wird”.'], ['بدأت خطتك، الله يكتب أجرك ويثبّتك 🤍', 'Your plan has started. May Allah reward you and keep you steadfast 🤍'],
        ['يومان', '2 days'], ['تقبّل الله منك — ابدأ ختمة جديدة متى شئت', 'May Allah accept it. Start a new khatma whenever you like'], ['ختمة كاملة', 'A full khatma'], ['تقبّل الله منك', 'may Allah accept it'],
        ['🎉 ما شاء الله! أتممت ختمة القرآن الكريم كاملة، تقبّل الله منك.', '🎉 Ma sha Allah! You completed a full khatma of the Quran, may Allah accept it.'], ['أتممت ورد اليوم ✓', 'Finished today’s wird ✓'],
        ['كل يوم حزب (بين 72 و105 صفحات، يعني تقريبًا 4 إلى 5 أجزاء)', 'A portion a day (72 to 105 pages, about 4 to 5 juz)'], ['ختمة كل أسبوع بإذن الله.', 'A khatma every week, in sha Allah.'],
        ['متابعة من موضعي الحالي', 'Continue from where I am'], ['من بداية المصحف (سورة الفاتحة)', 'From the start (Al-Fatihah)'], ['من سورة محددة', 'From a specific surah'], ['تم حفظ خطة الورد', 'Wird plan saved'],
        ['الفاتحة – النساء', 'Al-Fatihah – An-Nisa'], ['المائدة – التوبة', 'Al-Ma’idah – At-Tawbah'], ['يونس – النحل', 'Yunus – An-Nahl'], ['الإسراء – الفرقان', 'Al-Isra – Al-Furqan'], ['الشعراء – يس', 'Ash-Shu‘ara – Ya-Sin'],
        ['الصافات – الحجرات', 'As-Saffat – Al-Hujurat'], ['ق – الناس', 'Qaf – An-Nas'],
        ['«ثلاث، وخمس، وسبع، وتسع، وإحدى عشرة، وثلاث عشرة، وحزب المفصّل وحده» — رواه أبو داود (1393) عن أوس بن حذيفة، وفي إسناده كلام. ويُحفظ بكلمة «فَمِي بِشَوْق»: أول سورة بكل حزب.', '“Three, five, seven, nine, eleven, thirteen, and the Mufassal on its own”: Abu Dawud (1393), from Aws ibn Hudhayfah; its chain has some weakness. Remembered by the word «فَمِي بِشَوْق»: the first letter of the first surah of each portion.'],
        ['ورد اليوم: —', 'Today’s wird: —'], ['الجزء', 'Juz'],
        // الإشعارات وفحصها
        ['أذكار عامة', 'General adhkar'], ['✍️ اسأل مُذكّر', '✍️ Ask Mudhakkir'], ['اكتب ما تريد… مثلًا: ذكر عند الغضب', 'Type anything… e.g. a dhikr for anger'], ['متصفحك لا يدعم الإشعارات.', 'Your browser doesn’t support notifications.'],
        ['الإشعارات محظورة لهذا الموقع. فعّلها من إعدادات المتصفح ثم أعد تحميل الصفحة.', 'Notifications are blocked for this site. Allow them in browser settings, then reload.'], ['مفعّلة', 'On'],
        ['فعّل المفتاح لتصلك أذكار عشوائية كل 15 دقيقة.', 'Turn it on to get a random dhikr every 15 minutes.'], ['لا تذكيرات شخصية', 'No personal reminders'],
        ['من إعدادات الآيفون ← الإشعارات ← مُذكّر ← السماح بالإشعارات.', 'In iPhone Settings → Notifications → Mudhakkir → Allow Notifications.'],
        ['اضغط القفل بجانب رابط الموقع (أو معلومات التطبيق) ← الأذونات ← الإشعارات ← سماح، ثم أعد الفحص.', 'Tap the lock next to the address (or App info) → Permissions → Notifications → Allow, then check again.'],
        ['اضغط القفل بجانب رابط الموقع ← الإشعارات ← سماح، ثم أعد الفحص.', 'Tap the lock next to the address → Notifications → Allow, then check again.'],
        ['من إعدادات الهاتف ← التطبيقات ← مُذكّر (أو Chrome) ← البطارية ← «بلا قيود»، وتأكد أن إشعاراته غير مكتومة.', 'In phone Settings → Apps → Mudhakkir (or Chrome) → Battery → “Unrestricted”, and make sure its notifications aren’t muted.'],
        ['تأكد أن وضع «التركيز/عدم الإزعاج» متوقف، وأن إشعارات مُذكّر مسموحة من إعدادات الآيفون.', 'Make sure Focus / Do Not Disturb is off, and Mudhakkir notifications are allowed in iPhone Settings.'],
        ['اترك المتصفح يعمل في الخلفية، وتأكد أن إشعاراته مسموحة من إعدادات النظام.', 'Let the browser run in the background, and make sure its notifications are allowed in system settings.'],
        ['جارٍ الفحص…', 'Checking…'], ['التطبيق غير مثبّت على الآيفون', 'The app isn’t installed on this iPhone'], ['على الآيفون تعمل الإشعارات من التطبيق المثبّت فقط.', 'On iPhone, notifications only work from the installed app.'],
        ['افتح الموقع في Safari ← زر المشاركة ⬆️ ← «إضافة إلى الشاشة الرئيسية»، ثم افتح مُذكّر من أيقونته.', 'Open the site in Safari → Share ⬆️ → “Add to Home Screen”, then open Mudhakkir from its icon.'],
        ['المتصفح لا يدعم الإشعارات في الخلفية', 'This browser doesn’t support background notifications'], ['جرّب Chrome على أندرويد، أو Safari بعد تثبيت التطبيق على الآيفون.', 'Try Chrome on Android, or Safari after installing the app on iPhone.'],
        ['المتصفح يدعم الإشعارات', 'The browser supports notifications'], ['إذن الإشعارات مسموح', 'Notification permission granted'], ['الإشعارات ممنوعة لهذا الموقع', 'Notifications are blocked for this site'],
        ['لم تسمح بالإشعارات بعد', 'You haven’t allowed notifications yet'], ['خدمة الخلفية تعمل', 'Background service is running'], ['خدمة الخلفية لم تبدأ', 'Background service hasn’t started'],
        ['أغلق التطبيق وافتحه من جديد، وإن استمرت المشكلة اضغط «إصلاح الاشتراك».', 'Close and reopen the app. If it continues, tap “Repair subscription”.'], ['الجهاز مسجّل في الخادم', 'This device is registered on the server'],
        ['لا يوجد ما يُرسَل', 'Nothing to send'], ['فعّل «أذكار عامة» أو أضف تذكيرًا، ثم أعد الفحص.', 'Turn on “General adhkar” or add a reminder, then check again.'], ['تعذّر التسجيل في الخادم', 'Couldn’t register on the server'],
        ['قد يكون الاتصال ضعيفًا أو الاشتراك قديمًا.', 'The connection may be weak or the subscription old.'], ['اضغط «إصلاح الاشتراك» في الأسفل.', 'Tap “Repair subscription” below.'], ['تعذّر الوصول إلى الخادم الآن', 'Can’t reach the server now'],
        ['تأكد من الاتصال بالإنترنت وأعد الفحص.', 'Check your connection and check again.'], ['الخادم لم يرسل إشعارات منذ مدة', 'The server hasn’t sent notifications for a while'], ['لا يوجد سجل إرسال.', 'No send log.'],
        ['المشكلة من جهة الخادم (Cloudflare)، لا من هاتفك.', 'The problem is on the server (Cloudflare), not your phone.'], ['الخادم يعمل', 'The server is running'], ['الخادم يعمل ويرسل كل دقيقة', 'The server is running and sends every minute'],
        ['جارٍ إرسال إشعار تجربة من الخادم…', 'Sending a test notification from the server…'], ['لا تغلق التطبيق، ثوانٍ فقط.', 'Don’t close the app, just a few seconds.'], ['الخادم لم يجد اشتراك هذا الجهاز', 'The server didn’t find this device’s subscription'],
        ['انتهى الاشتراك أو أُلغي.', 'The subscription expired or was removed.'], ['اضغط «إصلاح الاشتراك» ثم أعد الفحص.', 'Tap “Repair subscription”, then check again.'], ['خدمة الإشعارات رفضت رسالة الخادم', 'The push service rejected the server’s message'],
        ['اضغط «إصلاح الاشتراك» ثم أعد الفحص، وإن استمر فالمشكلة من إعداد الخادم.', 'Tap “Repair subscription”, then check again. If it continues, it’s a server setup issue.'], ['تعذّر على الخادم إرسال التجربة', 'The server couldn’t send the test'],
        ['حاول بعد قليل.', 'Try again shortly.'], ['بلغت حدّ التجارب لهذا اليوم', 'You’ve reached today’s test limit'], ['حاول غدًا.', 'Try tomorrow.'], ['وصل إشعار التجربة ✓', 'The test notification arrived ✓'],
        ['أرسل الخادم الإشعار لكنه لم يصل إلى الهاتف', 'The server sent it, but it didn’t reach the phone'], ['حدث خطأ أثناء الفحص', 'Something went wrong during the check'], ['أعد المحاولة.', 'Try again.'], ['أعد الفحص', 'Check again'],
        ['جارٍ الإصلاح…', 'Repairing…'], ['تم تجديد الاشتراك ✓ أعد الفحص للتأكد', 'Subscription renewed ✓ Check again to confirm'], ['تعذّر التجديد، تأكد من الاتصال وإذن الإشعارات', 'Renewal failed, check your connection and notification permission'],
        // التثبيت (الملاحظات)
        ['مُذكّر مثبّت على هذا الجهاز.', 'Mudhakkir is installed on this device.'],
        ['إن لم تجده: افتح إعدادات الجوال ← التطبيقات وابحث عنه بأيقونته (قد لا يظهر عند البحث بكلمة «مذكر» بسبب التشكيل). وإن لم يكن موجودًا فعلًا: من Chrome ← الإعدادات ← إعدادات المواقع ← كل المواقع ←', 'If you can’t find it: open phone Settings → Apps and look for its icon. If it’s really not there: Chrome → Settings → Site settings → All sites →'],
        ['← «محو وإعادة الضبط»، ثم افتح الموقع واضغط «تثبيت التطبيق».', '→ “Clear & reset”, then open the site and tap “Install app”.'], ['افتحه من قائمة التطبيقات، أو أزل تثبيته من المتصفح ثم ثبّته من جديد.', 'Open it from your app list, or uninstall it from the browser and install again.'],
        // صنع بطاقة والمشاركة
        ['ما قدرنا نفتح هالصورة', 'Couldn’t open this photo'], ['اسحب الصورة بإصبعك، وكبّر بإصبعين', 'Drag the photo with a finger, pinch to zoom'], ['ما قدرنا نفتح هالصورة، جرّب وحدة تانية', 'Couldn’t open this photo, try another one'],
        ['داكنة', 'Dark'], ['فاتحة', 'Light'], ['أضف خلفية', 'Add background'], ['خلفية من صورك', 'Background from your photos'], ['خلفية بلا كتابة', 'Background without text'], ['جارٍ التجهيز…', 'Preparing…'],
        ['انحفظت الصورة، فيك تشاركها من ملفاتك', 'Image saved, you can share it from your files'], ['تعذّرت المشاركة، جرّب «حفظ»', 'Sharing failed, try “Save”'], ['تعذّر الحفظ، جرّب مرة تانية', 'Saving failed, try again'], ['انحفظت الصورة ✓', 'Image saved ✓'],
        ['انحفظت ✓ افتحها وكبس يمين ← «تعيين كخلفية»', 'Saved ✓ Open it, right-click → “Set as background”'], ['انحفظت ✓ من الصور: مشاركة ← «استخدام كخلفية»', 'Saved ✓ In Photos: Share → “Use as Wallpaper”'], ['افتح الأذكار', 'Open adhkar'],
        ['ما في آيات معلّمة لسا. بالمصحف اضغط مطوّلًا على أي آية واختار «علامة مرجعية» أو «تمييز»، أو «صنع بطاقة» مباشرة.', 'No marked ayat yet. In the mushaf, press and hold any ayah and choose “Bookmark” or “Highlight”, or “Make a card” directly.'],
        ['علامة', 'Bookmark'], ['مميّزة', 'Highlighted'], ['فيها ملاحظة', 'Has a note'], ['في آيات ما قدرنا نجيب نصها هلّق، بتبين لما يكون في نت.', 'Some ayat couldn’t load now; they’ll show when you’re online.'],
        ['لسا ما في ورد. جهّز خطة الورد من صفحة القرآن.', 'No wird yet. Set up your wird plan on the Quran page.'], ['جارٍ تحميل آيات ورد اليوم…', 'Loading today’s wird ayat…'], ['هي آيات أول 6 صفحات من ورد اليوم.', 'These are the ayat of the first 6 pages of today’s wird.'],
        ['ما قدرنا نجيب باقي الصفحات، تأكد من النت.', 'Couldn’t load the rest of the pages, check your connection.'], ['ما قدرنا نجيب آيات ورد اليوم. تأكد من النت.', 'Couldn’t load today’s wird ayat. Check your connection.'], ['هالصفحة ما فيها ذكر لبطاقة', 'This page has no dhikr for a card'],
        ['تعذّر تجهيز الصورة، يمكنك مشاركة النص.', 'Couldn’t prepare the image, you can share the text.'], ['مشاركة الآية', 'Share ayah'], ['تعذّرت المشاركة، جرّب نسخ النص', 'Sharing failed, try copying the text'], ['تعذّر النسخ', 'Copy failed'], ['تم نسخ النص', 'Text copied'],
        // المساعد (الأزرار والردود الجاهزة؛ أجوبة الذكاء الاصطناعي ما بتنترجم هون)
        ['يكتب…', 'Typing…'], ['بدون إنترنت · بجاوبك من محتوى التطبيق', 'Offline · answering from the app’s content'], ['تم نسخ رابط التطبيق', 'App link copied'], ['🧭 دليل التطبيق', '🧭 App guide'], ['ملاحظة', 'Note'],
        ['📖 من أذكار التطبيق', '📖 From the app’s adhkar'], ['عرض النص كاملًا', 'Show full text'], ['الدليل ▾', 'Source ▾'], ['إخفاء الدليل ▴', 'Hide source ▴'], ['تم نسخ الذكر', 'Dhikr copied'], ['ذكّرني فيه', 'Remind me'],
        ['افتح في الأذكار', 'Open in adhkar'], ['🔔 ذكّرني فيه كل يوم', '🔔 Remind me daily'], ['كمان واحد', 'Another one'], ['عطيني غيره', 'Give me another'], ['شو فضله؟', 'What’s its virtue?'], ['شو فضل هالذكر؟', 'What’s the virtue of this dhikr?'],
        ['ما زبط معي', 'It didn’t work'], ['جرّبت وما زبط معي، شو ممكن يكون السبب؟', 'I tried and it didn’t work, what could be the reason?'], ['شكرًا 🤍', 'Thanks 🤍'], ['شكرًا', 'Thanks'], ['عطيني ذكر يريّح القلب', 'Give me a dhikr that eases the heart'],
        ['شو فضل سورة الكهف يوم الجمعة؟', 'What is the virtue of al-Kahf on Friday?'], ['دعاء للرزق والتوفيق', 'Du‘a for provision and success'], ['دعاء للهمّ والضيق', 'Du‘a for worry and distress'], ['شو بقول قبل النوم؟', 'What do I say before sleep?'],
        ['ما عم يجيني نوم', 'I can’t sleep'], ['عطيني ذكر عند الغضب', 'A dhikr for when I’m angry'], ['كيف بثبّت التطبيق؟', 'How do I install the app?'], ['ليش ما عم توصلني الإشعارات؟', 'Why am I not getting notifications?'],
        ['أنا مُذكّر، معك بأي وقت: ذكر لموقف عم تمرّ فيه، فضل سورة أو دعاء، أو أي شي بالتطبيق. شو ببالك؟', 'I’m Mudhakkir, here anytime: a dhikr for what you’re going through, the virtue of a surah or du‘a, or anything in the app. What’s on your mind?'],
        ['العفو، الله يجزيك كل خير 🤍', 'You’re welcome, may Allah reward you 🤍'], ['ولو، هاد واجبي 😊 الله يتقبّل منك.', 'Of course 😊 May Allah accept from you.'], ['الله يعافيك ويسعدك 🤍 لا تنساني من دعائك.', 'May Allah keep you well and happy 🤍 Remember me in your du‘a.'],
        ['الحمد لله بخير، وأحلى شي لما نتذاكر سوا 😊 وإنت كيفك؟ إن شاء الله مرتاح.', 'Alhamdulillah, well, and it’s best when we remember Allah together 😊 How are you?'],
        ['أنا مُذكّر 🤍 مساعد جوّا التطبيق، مو إنسان، بس موجود دايمًا: بعطيك الذكر المناسب لأي موقف مع دليله، وبساعدك بأي شي بالتطبيق. شو بدك نعمل؟', 'I’m Mudhakkir 🤍 an assistant inside the app, not a person, but always here: I give you the right dhikr for any situation with its source, and help with anything in the app. What shall we do?'],
        ['هاد اللي لقيتلك ياه من أذكار التطبيق:', 'Here’s what I found in the app’s adhkar:'], ['تفضّل، هاد الذكر المناسب 🤍', 'Here’s the right dhikr 🤍'], ['خذ هالذكر، إن شاء الله ينفعك:', 'Take this dhikr, may it benefit you:'],
        ['سامحني، ما لقيت هالشي عندي. فيك تسألني عن ذكر لموقف (غضب، همّ، سفر، مطر…) أو عن أي ميزة بالتطبيق.', 'Sorry, I didn’t find that. You can ask me for a dhikr for a situation (anger, worry, travel, rain…) or about any feature in the app.'],
        ['بدون إنترنت · رد من محتوى التطبيق', 'Offline · reply from the app’s content'], ['رد سريع من محتوى التطبيق', 'Quick reply from the app’s content'], ['المساعد الذكي يرجع بكرة', 'The smart assistant is back tomorrow'],
        ['بدأت محادثة جديدة', 'New chat started'], ['اسمح للمتصفح باستخدام الميكروفون', 'Allow the browser to use the microphone'],
        // الملاحظات
        ['قبل دقيقة', '1 min ago'], ['قبل دقيقتين', '2 min ago'], ['قبل ساعة', '1 h ago'], ['قبل ساعتين', '2 h ago'], ['أمس', 'Yesterday'], ['قبل يومين', '2 days ago'],
        ['اختار نوع الرسالة أول.', 'Choose a message type first.'], ['اكتب ملاحظتك أول.', 'Write your feedback first.'], ['الإرسال مو متاح هلّق.', 'Sending isn’t available right now.'],
        ['ما في نت هلّق. رسالتك بتضل مكتوبة هون، ابعتها لما يرجع النت.', 'You’re offline. Your message stays here; send it when you’re back online.'], ['جارٍ الإرسال…', 'Sending…'],
        ['بعتت رسائل كتير اليوم. جرّب بكرا إن شاء الله.', 'You sent many messages today. Try tomorrow, in sha Allah.'], ['ما قدرنا نبعت الرسالة. تأكد من النت وجرّب مرة تانية.', 'Couldn’t send the message. Check your connection and try again.'], ['لسا ما في رد', 'No reply yet'],
        // المصحف بلا نت، الشاشة، الأدوات، اختيار التاريخ
        ['محفوظ على جهازك ✓ القراءة والبحث بلا نت', 'Saved on your device ✓ Read and search offline'], ['المصحف محفوظ على جهازك ✓', 'Mushaf saved on your device ✓'], ['بدّك نت مرة وحدة لتنزيل المصحف', 'You need internet once to download the mushaf'],
        ['ما كمل التنزيل، تأكد من النت واضغط مرة تانية', 'The download didn’t finish, check your connection and tap again'], ['انحفظ المصحف كامل ✓ بتقدر تقرأ وتبحث بلا نت', 'Whole mushaf saved ✓ You can read and search offline'],
        ['من أذكار الصباح', 'From the morning adhkar'], ['من أذكار المساء', 'From the evening adhkar'], ['آية اليوم', 'Ayah of the day'], ['حديث اليوم', 'Hadith of the day'], ['الختمة كاملة، تقبّل الله', 'Khatma complete, may Allah accept it'],
        ['ورد اليوم تمّ، تقبّل الله', 'Today’s wird is done, may Allah accept it'], ['ابدأ سلسلتك اليوم', 'Start your streak today'], ['مرتين', 'Twice'],
        ['انسخ هالنص', 'Copy this text'], ['انسخ النص المحدّد', 'Copy selected text'], ['انتسخ، الصقه بـ Scriptable', 'Copied, paste it into Scriptable'], ['بدّها نت أول مرة، جرّب كمان شوي', 'Needs internet the first time, try again shortly'],
        ['انتسخ الرابط', 'Link copied'], ['وقف الربط، والأدوات بتضل تعرض الأذكار بلا الورد', 'Unlinked; widgets keep showing adhkar without the wird'],
        ['أحد', 'Sun'], ['اثنين', 'Mon'], ['ثلاثاء', 'Tue'], ['أربعاء', 'Wed'], ['خميس', 'Thu'], ['جمعة', 'Fri'], ['سبت', 'Sat'], ['اختر الوقت', 'Choose time'], ['اختر التاريخ', 'Choose date'], ['من', 'of'],
        ['تسبيحة', 'tasbih'], ['تسبيحتان', '2 tasbih'], ['تسبيحات', 'tasbih'], ['آية', 'ayah'], ['آيتان', '2 ayat'], ['آيات', 'ayat'], ['التالي', 'Next'],
        // المشاركة (النص والصورة، share.js ← T)
        ['تطبيق مُذكّر — القرآن والأذكار', 'Mudhakkir — Quran & Adhkar'], ['🎉 ختمتُ القرآن الكريم كاملاً بفضل الله، تقبّل الله منا ومنكم', '🎉 I completed the whole Quran by Allah’s grace. May Allah accept from us and you'],
        ['✅ أتممتُ وردي اليوم من القرآن الكريم', '✅ I finished my Quran wird today'], ['📖 وردي اليوم من القرآن الكريم', '📖 My Quran wird today'], ['🌙 إنجازاتي في مُذكّر', '🌙 My progress in Mudhakkir'],
        ['وقليل دائم خير من كثير منقطع', 'A little that lasts is better than a lot that stops'], ['ختمتُ القرآن الكريم', 'I completed the Quran'], ['أتممتُ وردي اليوم', 'I finished today’s wird'],
        ['تقدّم اليوم', 'Today'], ['ختمة القرآن', 'Quran khatma'], ['يوم الختمة', 'Khatma day'], ['سلسلة الورد (يوم)', 'Streak (days)'], ['إنجازاتي مع مُذكّر', 'My progress with Mudhakkir'],
        ['رحلتي مع القرآن والأذكار', 'My journey with the Quran and adhkar'], ['تسبيحة اليوم', 'Tasbih today'], ['ختمات مكتملة', 'Completed khatmas'], ['تطبيق القرآن والأذكار', 'Quran & adhkar app'],
        // ألوان الوقت (atmosphere.js)
        ['وقت الفجر', 'Dawn'], ['وقت النهار', 'Daytime'], ['وقت العصر', 'Afternoon'], ['وقت المغرب', 'Sunset'], ['وقت الليل', 'Night'],
        ['تلقائي حسب وقتك', 'Auto, follows your time of day'], ['تتغيّر الألوان مع وقت يومك، أو ثبّت الفترة التي تحبها', 'Colours follow the time of your day, or pin the one you like'],
        // إحصائية اليوم (home.js: النص مقسوم حوالين <strong>)
        ['إحصائية اليوم:', 'Today:'], ['تسبيحة واحدة', '1 tasbih'], ['آية واحدة', '1 ayah'],
        // النسخة الاحتياطية والمشاركة
        ['نسخة مُذكّر الاحتياطية', 'Mudhakkir backup'], ['ستحلّ محلّ بياناتك الحالية على هذا الجهاز (الورد، التذكيرات، العلامات، الإعدادات).', 'It will replace your current data on this device (wird, reminders, bookmarks, settings).'],
        ['من تطبيق مُذكّر:', 'From the Mudhakkir app:'],
        // تعريف الورد (wird-intro.js) والتحديثات
        ['كل يوم، بالوقت يلي جنبه', 'Every day, at the time next to it'], ['مطفي. شغّله واختار الوقت', 'Off. Turn it on and pick a time'],
        ['يوجد تحديث جاهز للتثبيت', 'an update is ready'], ['أنت على أحدث إصدار', 'you’re up to date'], ['يوم واحد', '1 day'],
        // ملاحظات الإصدار (version.json ← نافذة «شو الجديد» والتحديث)
        ['الإنجليزي صار أكمل', 'English is more complete'], ['صورة المشاركة ونصّها صاروا بالإنجليزي إذا اخترت English', 'The share image and its text are now in English when you choose English'],
        ['نوافذ «متأكد؟» وأرباع الحزب وألوان الوقت صاروا مترجمين', '“Are you sure?” dialogs, hizb quarters and time-of-day colours are now translated'],
        ['بالإنجليزي زر الإغلاق ✕ والمفاتيح صاروا بمكانهن الصح', 'In English, the ✕ close button and the switches now sit on the right side'],
        ['الردود على ملاحظاتك والإعلانات صارت باسم «فريق مُذكّر»', 'Replies to your feedback and announcements now come from “the Mudhakkir team”'],
        ['إحساس تطبيق أكتر', 'Feels more like an app'], ['«يومك» بالرئيسية', '“Your day” on the home page'],
        ['الرئيسية صارت «يومك»: أذكار الصباح، وورد القرآن، وأذكار المساء والنوم، وكل ما تخلّص شي بيتعلّم', 'The home page is now “Your day”: morning adhkar, Quran wird, evening and sleep adhkar, each ticked off when you finish'],
        ['بالمتصفح، أول صفحة صارت صفحة التثبيت', 'In the browser, the first page is now the install page'], ['الضغط المطوّل (متل التفسير بالمصحف) ما عاد بيحدّد النص ولا بينسخو', 'A long press (like tafsir in the mushaf) no longer selects or copies the text'],
        ['الصفحة بتوقف عند آخر المحتوى، بلا فراغ زيادة تحت', 'Pages now stop at the end of the content, with no extra space below'],
        // الإصدار 30: «يومك» وصفحة التثبيت بالمتصفح
        ['يومك', 'Your day'], ['محطات يومك', 'Your day’s steps'], ['يومك لسا ببدايتو', 'Your day is just starting'], ['بداية حلوة، كمّل', 'Nice start, keep going'],
        ['خلّصت نص يومك، كمّل 🤍', 'Half your day is done, keep going 🤍'], ['باقي خطوة وحدة', 'One step left'], ['تمّ يومك، تقبّل الله منك 🤍', 'Your day is complete, may Allah accept it 🤍'],
        ['ورد القرآن', 'Quran wird'], ['خلّصت وردك اليوم 🤍', 'Today’s wird is done 🤍'], ['فاتت؟ لسا فيك تقراها', 'Missed it? You can still read it'],
        ['بعد الفجر', 'After Fajr'], ['بعد العصر', 'After Asr'], ['قبل النوم', 'Before sleep'], ['ابدأ', 'Start'], ['كمّل', 'Continue'], ['اقرأ', 'Read'],
        ['القرآن والأذكار والتذكير، بمكان واحد. مجاني، بلا إعلانات، بلا حساب.', 'Quran, adhkar and reminders in one place. Free, no ads, no account.']
    ].forEach(([a, b]) => EN.set(a, b));

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
    const PHASE = { 'الفجر': 'dawn', 'النهار': 'daytime', 'العصر': 'afternoon', 'المغرب': 'sunset', 'الليل': 'night' };
    const QUARTER = { 'ربع': '¼', 'نصف': '½', 'ثلاثة أرباع': '¾' };
    const PATTERNS = [
        [/^(\d+) من (\d+)$/, (m, a, b) => `${a} of ${b}`],
        // الدفعة التانية
        [/^(\d+)[٪%] من ورد اليوم$/, (m, a) => `${a}% of today’s wird`],
        [/^خلصت (\d.+)$/, (m, a) => `Done at ${a}`],
        [/^وقفت عند (\d+) من (\d+)$/, (m, a, b) => `Stopped at ${a} of ${b}`],
        [/^(\d+) ذكر$/, (m, a) => `${a} adhkar`],
        [/^الآن (الفجر|النهار|العصر|المغرب|الليل)$/, (m, a) => `now ${PHASE[a]}`],
        [/^ثابتة على ألوان (الفجر|النهار|العصر|المغرب|الليل) طول اليوم$/, (m, a) => `Fixed on ${PHASE[a]} colours all day`],
        [/^إحصائية اليوم: (.+)$/, (m, a) => `Today: ${tr(a) || a}`],
        [/^الختمة (\d+) من (\d+)$/, (m, a, b) => `Khatma ${a} of ${b}`],
        [/^(ربع|نصف|ثلاثة أرباع) الحزب (\d+)(?:: (.+))?$/, (m, a, b, c) => `${QUARTER[a]} of hizb ${b}${c ? ': ' + (tr(c) || c) : ''}`],
        [/^ص(\d+)$/, (m, a) => `p. ${a}`],
        [/^استرجاع النسخة(?: المحفوظة في (.+))?؟$/, (m, a) => `Restore the backup${a ? ' saved on ' + a : ''}?`],
        [/^من تطبيق مُذكّر: (.+)$/, (m, a) => `From the Mudhakkir app: ${a}`],
        [/^إضافة تذكير (.+)$/, (m, a) => `Add reminder: ${tr(a) || a}`],
        [/^تقدّمي اليوم: (\d+)[٪%]$/, (m, a) => `My progress today: ${a}%`],
        [/^(📖 )?ختمة القرآن: (\d+)[٪%](?: \((\d+) من (\d+) صفحة\))?$/, (m, a, b, c, d) => `${a || ''}Quran khatma: ${b}%${c ? ` (${c} of ${d} pages)` : ''}`],
        [/^(🔥 )?سلسلة الورد: (.+)$/, (m, a, b) => `${a || ''}Wird streak: ${tr(b) || b}`],
        [/^✨ اليوم: (\d+) تسبيحة$/, (m, a) => `✨ Today: ${a} tasbih`],
        [/^(\d+) (?:آية|آيات)$/, (m, a) => `${a} ayat`],
        [/^🏅 ختمات مكتملة: (\d+)$/, (m, a) => `🏅 Completed khatmas: ${a}`],
        [/^المصدر: (.+)$/, (m, a) => `Source: ${tr(a) || a}`],
        [/^(\d+) (?:نتائج|نتيجة)$/, (m, a) => `${a} results`],
        [/^(\d+) دقيقة تقريبًا$/, (m, a) => `About ${a} min`],
        [/^(\d+) ساعات تقريبًا$/, (m, a) => `About ${a} hours`],
        [/^(\d+) (?:صفحة|صفحات)$/, (m, a) => plural(a, 'page', 'pages')],
        [/^سؤال (\d+) من (\d+)$/, (m, a, b) => `Question ${a} of ${b}`],
        [/^(\d+) ختمات$/, (m, a) => `${a} khatmas`],
        [/^(\d+)\. سورة (.+)$/, (m, a, b) => `${a}. Surah ${surah(b)}`],
        [/^كل يوم (\d.+)$/, (m, a) => `Every day at ${a}`],
        [/^من سورة (.+) إلى سورة (.+)$/, (m, a, b) => `From ${surah(a)} to ${surah(b)}`],
        [/^من سورة (.+)$/, (m, a) => `From Surah ${surah(a)}`],
        [/^(\d+) ختمات? خلال (\d+) (?:يوم|يوماً|يومًا) تقريبًا$/, (m, a, b) => `${a} khatmas in about ${b} days`],
        [/^ختمة كل (.+)$/, (m, a) => `A khatma every ${tr(a) || a}`],
        [/^جزء كل يوم \((.+)\)$/, (m, a) => `A juz a day (${tr(a) || a})`],
        [/^الإشعار القادم (.+)$/, (m, a) => `Next notification ${a}`],
        [/^(\d+) تذكير$/, (m, a) => `${a} reminders`],
        [/^آخر إرسال قبل (\d+) دقيقة\.$/, (m, a) => `Last sent ${a} min ago.`],
        [/^لكن جدوله كل (\d+) دقيقة، فقد يتأخر التذكير حتى (\d+) دقيقة\.$/, (m, a, b) => `But it runs every ${a} min, so a reminder may be up to ${b} min late.`],
        [/^الرمز (\d+): توقيع الخادم أو الاشتراك غير مقبول\.$/, (m, a) => `Code ${a}: the server signature or subscription was not accepted.`],
        [/^كل شيء يعمل\. المسجّل في الخادم: (.+)\.$/, (m, a) => `Everything works. Registered on the server: ${tr(a) || a}.`],
        [/^تم نسخ الرابط، افتحه في (\S+) ثم اضغط «تثبيت التطبيق»$/, (m, a) => `Link copied. Open it in ${a}, then tap “Install app”`],
        [/^افتح الرابط في (\S+): (.+)$/, (m, a, b) => `Open the link in ${a}: ${b}`],
        [/^الحزب (\d+): من سورة (.+) إلى سورة (.+)$/, (m, a, b, c) => `Portion ${a}: ${surah(b)} to ${surah(c)}`],
        [/^جارٍ حفظ ورد اليوم للقراءة بدون نت… (\d+) من (\d+)$/, (m, a, b) => `Saving today’s wird for offline… ${a} of ${b}`],
        [/^الجزء (\d+) – (\d+)$/, (m, a, b) => `Juz ${a}–${b}`],
        [/^ختمات مكتملة: (\d+)$/, (m, a) => `Completed khatmas: ${a}`],
        [/^قرأت (\d+) من (\d+) صفحة$/, (m, a, b) => `Read ${a} of ${b} pages`],
        [/^المتبقي (\d+)$/, (m, a) => `${a} left`],
        [/^تنتهي بإذن الله في (.+)$/, (m, a) => `Ends, in sha Allah, on ${a}`],
        [/^🎉 تقبّل الله طاعتك! أتممت وردك اليوم \((\d+) صفحة\)\.$/, (m, a) => `🎉 May Allah accept it! You finished today’s wird (${a} pages).`],
        [/^(\d+) صفحة كل يوم$/, (m, a) => `${a} pages a day`],
        [/^\(≈ (\d+) جزء\)$/, (m, a) => `(≈ ${a} juz)`],
        [/^وردك (\d+) صفحة يوميًا(?: \(≈ (\d+) جزء\))?$/, (m, a, b) => `Your wird: ${a} pages a day${b ? ` (≈ ${b} juz)` : ''}`],
        [/^تنتهي الختمة خلال (.+?) بإذن الله، في (.+)\.$/, (m, a, b) => `The khatma ends in ${tr(a) || a}, in sha Allah, on ${b}.`],
        [/^قبل (\d+) (?:دقيقة|دقايق|دقائق)$/, (m, a) => `${a} min ago`],
        [/^قبل (\d+) (?:ساعة|ساعات)$/, (m, a) => `${a} h ago`],
        [/^قبل (\d+) (?:يوم|أيام)$/, (m, a) => `${a} days ago`],
        [/^جارٍ التنزيل… (\d+) من (\d+) صفحة$/, (m, a, b) => `Downloading… ${a} of ${b} pages`],
        [/^انحفظ (\d+) من (\d+)، اضغط لتكمّل الباقي$/, (m, a, b) => `Saved ${a} of ${b}, tap to finish the rest`],
        [/^من صفحة (\d+) لـ (\d+)$/, (m, a, b) => `From page ${a} to ${b}`],
        [/^ورد اليوم (\d+)[٪%](.*)$/, (m, a, b) => `Today’s wird ${a}%${b}`],
        [/^سلسلة (\d+) (.+)$/, (m, a) => `${a}-day streak`],
        [/^يُقال (\d+) مرات$/, (m, a) => `Say it ${a} times`],
        [/^(صباح الخير|مسا الخير|مسا النور)(.*?) (☀️|🌤️|🌙)$/, (m, a, b, c) => `${a === 'صباح الخير' ? 'Good morning' : 'Good evening'}${b} ${c}`],
        [/^الحزب (\d+)$/, (m, a) => `Hizb ${a}`], [/^بداية الحزب (\d+)$/, (m, a) => `Start of hizb ${a}`],
        [/^ختمة خلال (\d+) (?:يوم|يوماً|يومًا|أيام)$/, (m, a) => `Khatma in ${a} days`],
        [/^ختمة خلال (.+)$/, (m, a) => `Khatma in ${tr(a) || a}`],
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
        [/^العشر الأواخر من رمضان$/, () => 'Last ten nights of Ramadan'], [/^الليلة (\d+)$/, (m, a) => `Night ${a}`],
        // عامّة بالآخر (حتى ما تسبق الأنماط الأدق)
        [/^(.+) باليوم$/, (m, a) => `${tr(a) || a} a day`],
        [/^من (.+) إلى (.+)$/, (m, a, b) => { surah(''); return surahMap && surahMap.has(a) && surahMap.has(b) ? `From ${surah(a)} to ${surah(b)}` : m; }],
        // «البقرة 25» و«[البقرة: 255]» (سورة ورقم آية). null = مو هاد، كمّل دوّر
        [/^(.+) (\d+)$/, (m, a, b) => { surah(''); return surahMap && surahMap.has(a) ? `${surahMap.get(a)} ${b}` : null; }],
        [/^\[(.+): (\d+)\]$/, (m, a, b) => { surah(''); return surahMap && surahMap.has(a) ? `[${surahMap.get(a)}: ${b}]` : null; }]
    ];

    const WHOLE = PATTERNS.filter(([re]) => re.source.includes(' · '));
    const AR = /[؀-ۿ]/;
    function seg(p) {
        if (EN.has(p)) return EN.get(p);
        for (const [re, fn] of PATTERNS) { const m = p.match(re); if (m) { const r = fn(...m); if (r != null) return r; } }
        if (surahMap === null) surah('');
        if (surahMap && surahMap.has(p)) return surahMap.get(p);
        if (p.includes('، ')) { const parts = p.split('، '); const out = parts.map(seg); if (out.some((x, i) => x !== parts[i])) return out.join(', '); }
        return p;
    }
    // ترجمة نص كامل (أو null إذا ما في ترجمة)
    // الأرقام العربية (٣) بنصوص الواجهة بتصير إنجليزية (3) بس إذا انترجم النص؛ نص القرآن ما بيوصل لهون (SKIP)
    const latin = s => s.replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x660).replace(/[۰-۹]/g, d => d.charCodeAt(0) - 0x6F0);
    function tr(s) {
        if (!s) return null;
        let k = latin(s.replace(/\s+/g, ' ').trim());
        if (!k || !AR.test(k)) return null;
        if (EN.has(k)) return EN.get(k);
        // «·» بأول أو آخر النص (لما ينقسم السطر حوالين <strong>): منشيلها ومنرجّعها
        let pre = '', post = '';
        if (k.startsWith('· ')) { pre = '· '; k = k.slice(2); }
        if (k.endsWith(' ·')) { post = ' ·'; k = k.slice(0, -2); }
        if ((pre || post) && EN.has(k)) return pre + EN.get(k) + post;
        // الأنماط يلي فيها « · » لازم تنجرّب عالسطر كلو قبل التقسيم
        for (const [re, fn] of WHOLE) { const m = k.match(re); if (m) { const r = fn(...m); if (r != null) return pre + r + post; } }
        const parts = k.split(' · ');
        const out = parts.map(seg);
        return out.some((x, i) => x !== parts[i]) ? pre + out.join(' · ') + post : null;
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
    // (المصحف: منستثني صفحاتو بس (.reader-stage)، وأزرارو وقوائمو بتنترجم. والمساعد: الردود الجاهزة بتنترجم، وأجوبة الذكاء ما بتلاقي ترجمة فبتضل متل ما هي)
    const SKIP = 'script, style, textarea, [data-no-i18n], .single-verse-content, .dk-text, .dk-seq-text, .dk-list, .dk-hadith, .dk-foot, .dk-intro, .ayah, .dhikr-copy, .tb-dz, .tm-dz, .adhkar-body > p, .proof, .reader-stage, .qp-page, .mushaf, .verse-text, .cm-text, .cd-text';
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
        // نوافذ التأكيد والتنبيه (confirm/alert) ما بتمرق على الصفحة: منترجم كل سطر لحالو
        ['alert', 'confirm'].forEach(k => {
            const o = window[k]; if (typeof o !== 'function') return;
            window[k] = msg => o.call(window, typeof msg === 'string' ? msg.split('\n').map(l => t(l)).join('\n') : msg);
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindSetting, { once: true }); else bindSetting();

    return { lang, isEn, t, tr, set, surah };
})();
