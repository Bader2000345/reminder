/* =====================================================================
 * مُذكّر — widgets.js  (الإصدار ١٧، معرض ١٠: أ١ ط١ ل٢ ت١)
 * «أدوات مُذكّر» برّا التطبيق، شغّالة والتطبيق مسكّر:
 *   - الآيفون: أداة الشاشة الرئيسية عبر تطبيق Scriptable (widget/mudhakkir-ios.js) بالشكل الزمرّدي
 *   - اللابتوب: النمط الهادئ على خلفية الشاشة (widget/wallpaper.html) عبر Lively Wallpaper (ويندوز) أو Plash (ماك)
 *   - التلفزيون: لوحة مُذكّر (widget/tv.html) بمتصفح التلفزيون، وشاشة التوقف بتطبيق أندرويد TV
 * كلهن بيقروا المحتوى من السيرفر (worker.js ← GET /widget). وحتى يبيّن ورد اليوم:
 *   أول ما يفتح المستخدم «أدوات مُذكّر» منعمل رمز عشوائي للجهاز (بلا اسم ولا إيميل)، ومن وقتها التطبيق
 *   بيبعت تقدّم الورد للسيرفر (POST /widget/state) بس لما يتغيّر، والأدوات بتقرا بنفس الرمز.
 *   «إيقاف الربط» بيمسح الرمز من الجهاز والسيرفر.
 * يعتمد على Wird.snapshot (wird.js) و QSheet (quran-tools.js) و PUSH_SERVER (notifications.js).
 * ===================================================================== */
const Widgets = (() => {
    const KEY = 'mudhakkir-widget-key', SENT = 'mudhakkir-widget-sent';
    const server = () => (typeof PUSH_SERVER !== 'undefined' ? PUSH_SERVER : 'https://mudhakkir-push.bader-bm-2000.workers.dev');
    const site = path => new URL(path, document.baseURI).href;
    const get = k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
    const set = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) {} };
    const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html !== undefined) n.innerHTML = html; return n; };
    let lastSend = 0, timer = 0;

    // ---------- الرمز ----------
    const key = () => (/^[a-z0-9]{20,40}$/.test(get(KEY)) ? get(KEY) : '');
    function ensureKey() {
        let k = key();
        if (!k) {
            const a = new Uint8Array(16);
            crypto.getRandomValues(a);
            k = [...a].map(b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('') + Date.now().toString(36).slice(-6);
            set(KEY, k);
        }
        return k;
    }

    // ---------- إرسال تقدّم الورد (بس لما يتغيّر، ومش أكتر من مرة بالدقيقة) ----------
    const ymd = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    function payload() {
        let w = {};
        try { w = Wird.snapshot(); } catch (e) {}
        let tz = 'UTC';
        try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) {}
        return {
            day: ymd(), tz, adj: Number(get('mudhakkir-hijri-adjust')) || 0,
            wird: { pct: w.complete ? 100 : w.todayPct || 0, from: w.from || 0, to: w.to || 0, title: w.rangeTitle || '', streak: w.streak || 0, done: !!w.done, complete: !!w.complete }
        };
    }
    function sync(force = false) {
        const k = key();
        if (!k || !navigator.onLine) return;
        const body = payload(), sig = JSON.stringify(body);
        if (!force && (sig === get(SENT) || Date.now() - lastSend < 60000)) return;
        lastSend = Date.now();
        fetch(server() + '/widget/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ k, ...body }), keepalive: true })
            .then(r => { if (r.ok) set(SENT, sig); }).catch(() => {});
    }
    function unlink() {
        const k = key();
        if (k) fetch(server() + '/widget/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ k, off: true }), keepalive: true }).catch(() => {});
        set(KEY, ''); set(SENT, '');
    }

    // ---------- «أدوات مُذكّر» ----------
    async function copy(text, btn, done) {
        const old = btn.textContent;
        try { await navigator.clipboard.writeText(text); btn.textContent = done; }
        catch (e) {
            // ما زبط النسخ: منعرض النص محدّد للنسخ اليدوي
            const ta = el('textarea', 'wg-manual'); ta.value = text; ta.readOnly = true; ta.setAttribute('aria-label', 'انسخ هالنص');
            btn.after(ta); ta.focus(); ta.select();
            btn.textContent = 'انسخ النص المحدّد';
        }
        setTimeout(() => { btn.textContent = old; }, 2200);
    }
    const links = k => ({
        wallpaper: site(`widget/wallpaper.html?k=${k}`),
        tv: site(`widget/tv.html?k=${k}`)
    });
    function view() {
        const k = ensureKey();
        sync(true); startLoop();
        const L = links(k);
        const v = el('div', 'wg-view');
        v.innerHTML = `
            <p class="wg-lead">أدوات مُذكّر بتضل ظاهرة والتطبيق مسكّر: ورد اليوم وتقدّمه، وذكر الوقت، وآية أو حديث اليوم.</p>
            <section class="wg-sec" aria-labelledby="wg-ios">
                <h4 id="wg-ios">الآيفون: أداة عالشاشة الرئيسية</h4>
                <ol class="wg-steps">
                    <li>نزّل تطبيق <b>Scriptable</b> المجاني من App Store.</li>
                    <li>اضغط «انسخ كود الآيفون» تحت.</li>
                    <li>افتح Scriptable ← <b>+</b> ← الصق ← سمّيه «مُذكّر» ← Done.</li>
                    <li>اضغط مطوّلًا عالشاشة الرئيسية ← <b>+</b> ← Scriptable ← اختار الحجم ← «إضافة الأداة».</li>
                    <li>اضغط عالأداة مطوّلًا ← «تعديل الأداة» ← Script: <b>مُذكّر</b>.</li>
                </ol>
                <div class="wg-actions"><button type="button" class="primary-button" data-wg="ios">انسخ كود الآيفون</button><a class="ghost-button" href="https://apps.apple.com/app/scriptable/id1405459188" target="_blank" rel="noopener">Scriptable بـ App Store</a></div>
            </section>
            <section class="wg-sec" aria-labelledby="wg-lap">
                <h4 id="wg-lap">اللابتوب: على خلفية الشاشة</h4>
                <ol class="wg-steps">
                    <li><b>ويندوز:</b> نزّل <b>Lively Wallpaper</b> المجاني من Microsoft Store ← <b>+</b> ← الصق الرابط ← «تطبيق».</li>
                    <li><b>ماك:</b> نزّل <b>Plash</b> المجاني من App Store ← من أيقونته بالشريط فوق «Add Website» ← الصق الرابط.</li>
                </ol>
                <div class="wg-actions"><button type="button" class="primary-button" data-wg="wallpaper">انسخ رابط الخلفية</button><a class="ghost-button" href="${L.wallpaper}" target="_blank" rel="noopener">شوف الخلفية</a></div>
            </section>
            <section class="wg-sec" aria-labelledby="wg-tv">
                <h4 id="wg-tv">التلفزيون: لوحة مُذكّر</h4>
                <ol class="wg-steps">
                    <li>افتح الرابط بمتصفح التلفزيون، وخليه مفتوح.</li>
                    <li>تطبيق شاشة التوقف لتلفزيونات أندرويد وGoogle TV جاي قريبًا.</li>
                </ol>
                <div class="wg-actions"><button type="button" class="primary-button" data-wg="tv">انسخ رابط التلفزيون</button><a class="ghost-button" href="${L.tv}" target="_blank" rel="noopener">شوف اللوحة</a></div>
            </section>
            <p class="wg-privacy">الأدوات بتعرف تقدّم وردك برمز عشوائي خاص بهالجهاز، بلا اسم ولا إيميل. <button type="button" class="link-btn" data-wg="off">إيقاف الربط</button></p>`;
        // نص كل خطوة بعنصر واحد (الخطوة صف flex، وبلاه الكلمات العريضة بتتفرّق أعمدة)
        v.querySelectorAll('.wg-steps li').forEach(li => { const s = el('span'); s.append(...li.childNodes); li.append(s); });
        v.addEventListener('click', async e => {
            const b = e.target.closest('[data-wg]'); if (!b) return;
            const what = b.dataset.wg;
            if (what === 'ios') {
                try {
                    const code = await (await fetch(site('widget/mudhakkir-ios.js'), { cache: 'no-store' })).text();
                    copy(code.replace("const KEY = '__KEY__';", `const KEY = '${key() || ensureKey()}';`), b, 'انتسخ، الصقه بـ Scriptable');
                } catch (err) { Toast.show('بدّها نت أول مرة، جرّب كمان شوي'); }
            } else if (what === 'wallpaper' || what === 'tv') copy(links(key() || ensureKey())[what], b, 'انتسخ الرابط');
            else if (what === 'off') { unlink(); QSheet.close(); Toast.show('وقف الربط، والأدوات بتضل تعرض الأذكار بلا الورد'); }
        });
        return v;
    }
    const open = () => QSheet.open('أدوات مُذكّر', view());

    // المتابعة: كل دقيقة ونص والتطبيق مفتوح، ولما يتسكّر أو يرجع النت
    function startLoop() {
        if (timer) return;
        timer = setInterval(() => { if (document.visibilityState === 'visible') sync(); }, 90 * 1000);
        document.addEventListener('visibilitychange', () => { lastSend = 0; sync(); });
        addEventListener('online', () => sync(true));
    }
    function init() {
        document.querySelectorAll('[data-open-widgets]').forEach(b => b.addEventListener('click', open));
        if (!key()) return; // الإرسال بس بعد ما يفعّل المستخدم الأدوات
        setTimeout(() => sync(true), 4000);
        startLoop();
    }
    return { init, open, sync };
})();
