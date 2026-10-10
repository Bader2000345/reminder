/* =====================================================================
 * مُذكّر — knowledge.js
 * فهرس معرفة التطبيق والبحث فيه: كل الأذكار والأحاديث والأدلة الموجودة في الموقع
 * (أقسام الأذكار، الأذكار العامة، أذكار المناسبات) + إجابات «كيف أستخدم التطبيق».
 * - يفهم العامية والفصحى (معصّب = غضب، ما عم نام = أرق…)، ويتجاهل التشكيل.
 * - بلا DOM: يعمل في الصفحة (المساعد «اسأل مُذكّر») وفي sw.js (الرد من الإشعار).
 * يحتاج قبله: general-adhkar.js، adhkar-data.js، situations-adhkar.js
 * ===================================================================== */

const Knowledge = (() => {
    // ---------- تطبيع النص العربي ----------
    const norm = s => String(s || '')
        .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
        .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
        .replace(/[^ء-يa-z0-9\s]/gi, ' ')
        .replace(/\s+/g, ' ').trim();
    // حروف تلتصق بأول الكلمة (والغضب، بالسفر، للنوم)
    const stripPrefix = w => w.replace(/^(وال|بال|فال|كال|لل|ال|و|ف|ب|ل)(?=..)/, '');
    const STOP = new Set(['عطيني', 'اعطيني', 'بدي', 'ابي', 'ابغي', 'اريد', 'شو', 'ما', 'ماذا', 'هو', 'هي', 'في', 'على', 'عن', 'من', 'الى', 'ذكر', 'اذكار', 'الاذكار', 'الذكر', 'دعاء', 'ادعيه', 'الدعاء', 'عند', 'لما', 'وقت', 'كيف', 'هل', 'يا', 'لو', 'اذا', 'مع', 'او', 'ممكن', 'قلي', 'قولي', 'لي', 'انا', 'شي', 'شيء', 'حديث', 'احاديث', 'اقول', 'بقول', 'نقول', 'يقال', 'يقول', 'ايش', 'اي', 'هاد', 'هذا', 'هذه', 'كان', 'بس', 'كمان', 'فيه', 'فيها', 'الي', 'اللي', 'التي', 'الذي', 'شلون', 'ليش', 'منين', 'يعني', 'لازم', 'مثلا', 'واحد', 'وحده', 'غيره', 'غيرو', 'غيرها', 'تاني', 'ثاني', 'اخر', 'اخري', 'زياده', 'المزيد', 'كمل', 'كملي']);

    // كلمات أقسام الأذكار الأساسية
    const CATEGORY_WORDS = {
        morning: ['صباح', 'الصباح', 'صبح', 'الصبح', 'اصبحنا', 'الفجر', 'الصبحيه'],
        evening: ['مساء', 'المساء', 'مسا', 'المسا', 'العصر', 'امسينا', 'المغرب'],
        post_prayer: ['بعد الصلاه', 'دبر الصلاه', 'بعد الفرض', 'بعد التسليم', 'خلص الصلاه', 'خلصت صلاه'],
        sleep: ['نوم', 'النوم', 'قبل النوم', 'انام', 'نايم', 'فراش', 'الفراش', 'المنام'],
        wake: ['استيقاظ', 'الاستيقاظ', 'صحيت', 'فقت', 'فيقت', 'قمت من النوم', 'صحوت'],
        praise: ['تسبيح', 'استغفار', 'سبحان الله', 'استغفر', 'التسبيح']
    };

    // إجابات «كيف أستخدم التطبيق» (تُستخدم دون اتصال، والمساعد يعرفها أيضًا)
    const HELP = [
        { id: 'help:reminder', keys: ['تذكير', 'منبه', 'اضيف تذكير', 'اشعار', 'تنبيه', 'نبهني', 'ذكرني'], answer: 'لإضافة تذكير: افتح صفحة «أذكاري» واضغط «＋ تذكير جديد»، اكتب العنوان ونص الذكر، واختر التكرار (يوميًا، أيام محددة، أو مرة واحدة) والوقت، ثم «حفظ التذكير». يصلك الإشعار حتى والتطبيق مغلق.' },
        { id: 'help:install', keys: ['تثبيت', 'نزل التطبيق', 'تنزيل', 'ثبت', 'الشاشه الرئيسيه', 'ايقونه'], answer: 'لتثبيت مُذكّر: من الرئيسية أو الإعدادات اضغط «تثبيت التطبيق»، وتحت الزر الطريقة المناسبة لجهازك (على الآيفون من زر المشاركة في Safari ثم «إضافة إلى الشاشة الرئيسية»).' },
        { id: 'help:update', keys: ['تحديث', 'نسخه جديده', 'اصدار'], answer: 'عند صدور تحديث يظهر شريط «تم تنزيل تحديث جديد» وزر «تحديث»، ويمكنك الفحص من الإعدادات ← التحديثات.' },
        { id: 'help:wird', keys: ['ورد', 'الورد', 'ختمه', 'ختم القران', 'خطه'], answer: 'الورد اليومي في صفحة «الورد اليومي»: تختار مدة الختمة أو عدد الصفحات يوميًا من «تعديل الورد اليومي»، وتقرأ آية آية أو في المصحف، ويحفظ التطبيق موضعك وسلسلة أيامك.' },
        { id: 'help:reader', keys: ['مصحف', 'قراءه', 'اقرا القران', 'تفسير', 'تجويد', 'خط المصحف', 'حجم الخط'], answer: 'في «القراءة الحرة» اضغط «الدخول في وضع القراءة». زر «تنسيق المصحف» فيه العرض القرآني أو المصوّر والخط وحجمه وألوان التجويد والمظهر، والضغط المطوّل على أي آية يُظهر التفسير والنسخ والمشاركة والعلامات والملاحظات.' },
        { id: 'help:theme', keys: ['داكن', 'ليلي', 'فاتح', 'المظهر', 'الوان'], answer: 'المظهر من الإعدادات: فاتح، داكن، حسب الجهاز، أو حسب الشمس (يغمق بعد الغروب في موقعك)، وفي الرئيسية زر سريع للتبديل.' },
        { id: 'help:name', keys: ['اسمي', 'غير اسمي', 'التحيه'], answer: 'لكتابة اسمك في التحية: الإعدادات ← «اسمك» ثم حفظ، أو اضغط على الاسم في التحية بالرئيسية.' }
    ];

    let index = null, groupsByKey = {};
    function addItem(list, base) {
        const item = { ...base };
        item.hay = norm([item.groupTitle, item.label, item.text, item.hadith, item.tip].filter(Boolean).join(' '));
        item.titleNorm = norm([item.groupTitle, item.label].filter(Boolean).join(' '));
        list.push(item);
    }
    function build() {
        if (index) return index;
        const list = [];
        const db = typeof ADHKAR_DATABASE !== 'undefined' ? ADHKAR_DATABASE : {};
        const situations = typeof SITUATION_ADHKAR !== 'undefined' ? SITUATION_ADHKAR : [];
        const sitByKey = Object.fromEntries(situations.map(s => [s.key, s]));
        Object.entries(db).forEach(([key, group]) => {
            const sit = sitByKey[key];
            const keywords = (sit ? sit.keywords : (CATEGORY_WORDS[key] || [])).map(norm);
            groupsByKey[key] = { key, title: group.title, keywords, kind: sit ? 'situation' : 'section' };
            group.items.forEach((it, i) => {
                const text = it.seq ? it.seq.map(s => `${s.text} (${s.count})`).join('، ') : it.list ? it.list.join(' ') : it.text;
                addItem(list, {
                    id: `${key}:${i}`, group: key, idx: i, groupTitle: group.title, label: it.label || '',
                    text, count: it.seq ? it.seq.reduce((n, s) => n + s.count, 0) : (it.count || 1),
                    ref: it.ref || '', hadith: it.hadith || '', source: it.source || '', tip: it.tip || '', intro: it.intro || '',
                    kind: it.list ? 'list' : 'dhikr'
                });
            });
        });
        if (typeof GENERAL_ADHKAR_LIST !== 'undefined') {
            const proofs = typeof GENERAL_ADHKAR_PROOFS !== 'undefined' ? GENERAL_ADHKAR_PROOFS : [];
            groupsByKey.general = { key: 'general', title: 'الأذكار العامة', keywords: [], kind: 'general' };
            GENERAL_ADHKAR_LIST.forEach((text, i) => addItem(list, {
                id: `general:${i}`, group: 'general', idx: i, groupTitle: 'الأذكار العامة', label: '',
                text, count: 1, ref: '', hadith: (proofs[i] || [])[0] || '', source: (proofs[i] || [])[1] || '', tip: '', intro: '', kind: 'dhikr'
            }));
        }
        index = list;
        return index;
    }

    function tokensOf(q) {
        return norm(q).split(' ').map(stripPrefix).filter(w => w.length >= 2 && !STOP.has(w));
    }
    // هل يطابق السؤال إحدى كلمات الموقف/القسم؟ (عبارة كاملة أو كلمة)
    function keywordHit(qNorm, qTokens, kw) {
        if (!kw) return false;
        if (kw.includes(' ')) return qNorm.includes(kw);
        return qTokens.some(t => t === kw || (kw.length >= 4 && t.startsWith(kw)) || (t.length >= 4 && kw.startsWith(t)));
    }

    // أفضل العناصر لسؤال ما
    function search(query, { limit = 6 } = {}) {
        const list = build();
        const qNorm = norm(query), qTokens = tokensOf(query);
        if (!qTokens.length && !qNorm) return [];
        const groupBoost = {};
        Object.values(groupsByKey).forEach(g => {
            const hits = g.keywords.filter(kw => keywordHit(qNorm, qTokens, kw)).length;
            if (hits) groupBoost[g.key] = 10 + hits * 2 + (g.kind === 'situation' ? 2 : 0);
        });
        const scored = list.map(item => {
            let score = groupBoost[item.group] ? groupBoost[item.group] - item.idx * 0.15 : 0;
            qTokens.forEach(t => {
                if (t.length < 3) return;
                if (item.titleNorm.includes(t)) score += 3;
                if (item.hay.includes(t)) score += 2;
            });
            if (qNorm.length > 8 && item.hay.includes(qNorm)) score += 8; // جزء من نص الذكر نفسه
            return { item, score };
        }).filter(x => x.score >= 2).sort((a, b) => b.score - a.score);
        return scored.slice(0, limit).map(x => x.item);
    }

    function helpFor(query) {
        const qNorm = norm(query), qTokens = tokensOf(query);
        return HELP.find(h => h.keys.map(norm).some(kw => keywordHit(qNorm, qTokens, kw))) || null;
    }

    const get = id => build().find(it => it.id === id) || null;
    const groupTitle = key => (build(), groupsByKey[key] ? groupsByKey[key].title : '');
    // ما يُرسَل للنموذج (مختصر)
    const forModel = items => items.map(it => ({
        id: it.id, title: [it.groupTitle, it.label].filter(Boolean).join(' · '),
        text: it.text.slice(0, 700), count: it.count, hadith: it.hadith.slice(0, 500), source: it.source
    }));

    return { search, helpFor, get, groupTitle, forModel, norm, HELP };
})();
