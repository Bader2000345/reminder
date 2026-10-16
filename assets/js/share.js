/* =====================================================================
 * مُذكّر — share.js
 * مشاركة الورد والإنجازات: رسم صورة البطاقة والنص وأزرار الشبكات.
 * يُحمَّل بالترتيب من index.html؛ الأجزاء تتشارك المتغيرات العامة فيما بينها.
 * ===================================================================== */

// ===== مشاركة الورد والإنجازات =====
const Share = (() => {
    const $ = id => document.getElementById(id);
    const fmt = n => Number(n).toLocaleString('ar-EG');
    const W = 1080, H = 1350;
    const SAMPLE = 'مذكر القرآن الكريم الورد ٠١٢٣٤٥٦٧٨٩';
    let kind = 'wird', blob = null, previewUrl = '', renderId = 0, logoImage = null, ayahData = null;

    const appUrl = () => (/^https?:$/.test(location.protocol) ? location.href.split('#')[0] : '');
    const pagesPhrase = d => (d.from === d.to ? `الصفحة ${fmt(d.from)}` : `الصفحات ${fmt(d.from)} – ${fmt(d.to)}`);
    const collect = () => ({ ...Wird.snapshot(), ...DailyStats.get() });

    function buildText(k, d) {
        const lines = [];
        if (k === 'ayah') {
            lines.push(`﴿${d.text}﴾`, `[${surahName(d.s)}: ${fmt(d.a)}]`, '', 'تطبيق مُذكّر — القرآن والأذكار');
            const url = appUrl();
            if (url) lines.push(url);
            return lines.join('\n');
        }
        if (k === 'wird') {
            lines.push(d.complete ? '🎉 ختمتُ القرآن الكريم كاملاً بفضل الله، تقبّل الله منا ومنكم'
                : d.done ? '✅ أتممتُ وردي اليوم من القرآن الكريم' : '📖 وردي اليوم من القرآن الكريم');
            lines.push(`${d.rangeTitle} · ${pagesPhrase(d)}`);
            if (!d.done) lines.push(`تقدّمي اليوم: ${fmt(d.todayPct)}٪`);
            lines.push(`ختمة القرآن: ${fmt(d.khatmaPct)}٪ · اليوم ${fmt(d.dayN)} من ${fmt(d.totalDays)}`);
            if (d.streak > 0) lines.push(`🔥 سلسلة الورد: ${daysLabel(d.streak)}`);
        } else {
            lines.push('🌙 إنجازاتي في مُذكّر');
            if (d.streak > 0) lines.push(`🔥 سلسلة الورد: ${daysLabel(d.streak)}`);
            lines.push(`📖 ختمة القرآن: ${fmt(d.khatmaPct)}٪ (${fmt(d.readPages)} من ${fmt(QuranData.TOTAL_PAGES)} صفحة)`);
            lines.push(`✨ اليوم: ${fmt(d.tasbeeh)} تسبيحة · ${fmt(d.wirdVerses)} آية`);
            if (d.khatmas > 0) lines.push(`🏅 ختمات مكتملة: ${fmt(d.khatmas)}`);
        }
        lines.push('', 'وقليل دائم خير من كثير منقطع', 'تطبيق مُذكّر — القرآن والأذكار');
        const url = appUrl();
        if (url) lines.push(url);
        return lines.join('\n');
    }

    // ---------- رسم بطاقة الصورة ----------
    async function loadFonts() {
        if (!document.fonts || !document.fonts.load) return;
        try {
            await Promise.all(['700 40px "Readex Pro"', '500 40px "Readex Pro"', '400 40px Amiri'].map(f => document.fonts.load(f, SAMPLE)));
        } catch (e) { /* نستخدم الخط الاحتياطي */ }
    }
    function getLogo() {
        if (logoImage) return Promise.resolve(logoImage);
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => { logoImage = img; resolve(img); };
            img.onerror = () => resolve(null);
            img.src = 'assets/img/logo-light.webp';
        });
    }
    function roundRect(g, x, y, w, h, r) {
        g.beginPath();
        g.moveTo(x + r, y);
        g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
        g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
        g.closePath();
    }
    function star(g, cx, cy, size, color) {
        g.save(); g.translate(cx, cy); g.strokeStyle = color; g.lineWidth = 2;
        for (const k of [1, .64, .34]) {
            const s = size * k;
            for (const rot of [0, Math.PI / 4]) { g.save(); g.rotate(rot); g.strokeRect(-s / 2, -s / 2, s, s); g.restore(); }
        }
        g.restore();
    }
    function wrapLines(g, text, maxWidth) {
        const lines = []; let line = '';
        for (const word of text.split(/[ \t\n]+/).filter(Boolean)) { // المسافة اللي ما بتنكسر (قبل «۝») بتضل لازقة
            const test = line ? `${line} ${word}` : word;
            if (g.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
        }
        if (line) lines.push(line);
        return lines;
    }
    function cardContent(k, d) {
        if (k === 'wird') {
            return {
                title: d.complete ? 'ختمتُ القرآن الكريم' : d.done ? 'أتممتُ وردي اليوم' : 'وردي اليوم',
                sub: [d.rangeTitle, pagesPhrase(d)],
                ring: d.done ? 100 : d.todayPct, ringLabel: 'تقدّم اليوم',
                stats: [[`${fmt(d.khatmaPct)}٪`, 'ختمة القرآن'], [`${fmt(d.dayN)} / ${fmt(d.totalDays)}`, 'يوم الختمة'], [fmt(d.streak), 'سلسلة الورد (يوم)']]
            };
        }
        return {
            title: 'إنجازاتي مع مُذكّر',
            sub: [d.streak > 0 ? `سلسلة الورد: ${daysLabel(d.streak)}` : 'رحلتي مع القرآن والأذكار'],
            ring: d.khatmaPct, ringLabel: 'ختمة القرآن',
            stats: [[fmt(d.tasbeeh), 'تسبيحة اليوم'], [fmt(d.wirdVerses), 'آية اليوم'], [fmt(d.khatmas), 'ختمات مكتملة']]
        };
    }
    async function drawCard(k, d) {
        await loadFonts();
        const logo = await getLogo();
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const g = c.getContext('2d');
        g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
        const content = cardContent(k, d);

        const bg = g.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#fbf8ee'); bg.addColorStop(1, '#efe7d0');
        g.fillStyle = bg; g.fillRect(0, 0, W, H);
        star(g, 130, 140, 230, 'rgba(168,132,58,.16)');
        star(g, W - 110, H - 170, 280, 'rgba(46,118,96,.12)');
        roundRect(g, 38, 38, W - 76, H - 76, 36); g.lineWidth = 3; g.strokeStyle = 'rgba(168,132,58,.55)'; g.stroke();
        roundRect(g, 54, 54, W - 108, H - 108, 28); g.lineWidth = 1.5; g.strokeStyle = 'rgba(168,132,58,.28)'; g.stroke();

        if (logo) { const lh = 270, lw = lh * logo.width / logo.height; g.drawImage(logo, (W - lw) / 2, 84, lw, lh); }
        g.fillStyle = '#a8843a'; g.font = '500 32px "Readex Pro", sans-serif';
        g.fillText('تطبيق القرآن والأذكار', W / 2, 392);

        g.fillStyle = '#1f5444'; g.font = '700 66px "Readex Pro", sans-serif';
        g.fillText(content.title, W / 2, 490);
        g.fillStyle = '#5d6b62'; g.font = '500 36px "Readex Pro", sans-serif';
        let y = 548;
        for (const text of content.sub) for (const line of wrapLines(g, text, W - 240).slice(0, 2)) { g.fillText(line, W / 2, y); y += 48; }

        const cx = W / 2, cy = 830, R = 150, frac = Math.max(0, Math.min(1, content.ring / 100));
        g.lineWidth = 30; g.lineCap = 'round';
        g.strokeStyle = '#e6dec9'; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
        if (frac > 0) {
            const grad = g.createLinearGradient(cx - R, cy, cx + R, cy);
            grad.addColorStop(0, '#2e7660'); grad.addColorStop(1, '#a8843a');
            g.strokeStyle = grad; g.beginPath(); g.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 - Math.PI * 2 * frac, true); g.stroke();
        }
        g.fillStyle = '#1f5444'; g.font = '700 92px "Readex Pro", sans-serif';
        g.fillText(`${fmt(Math.round(content.ring))}٪`, cx, cy + 22);
        g.fillStyle = '#6b7269'; g.font = '500 30px "Readex Pro", sans-serif';
        g.fillText(content.ringLabel, cx, cy + 72);

        const bw = 280, gap = 24, bx = (W - (bw * 3 + gap * 2)) / 2, by = 1030;
        content.stats.forEach(([value, label], i) => {
            const x = bx + i * (bw + gap);
            roundRect(g, x, by, bw, 150, 24); g.fillStyle = 'rgba(255,255,255,.72)'; g.fill();
            g.lineWidth = 1.5; g.strokeStyle = 'rgba(168,132,58,.4)'; g.stroke();
            g.fillStyle = '#1f5444'; g.font = '700 50px "Readex Pro", sans-serif'; g.fillText(value, x + bw / 2, by + 70);
            g.fillStyle = '#6b7269'; g.font = '500 26px "Readex Pro", sans-serif'; g.fillText(label, x + bw / 2, by + 114);
        });

        g.fillStyle = '#5d6b62'; g.font = '400 36px Amiri, serif';
        g.fillText('وقليل دائم خير من كثير منقطع', W / 2, 1245);
        return c;
    }
    // صورة الآية: ورقة مصحف بحاشية مزخرفة وإطار مزدوج (نفس شكل القراءة الحرة)، والآية بخط المصحف وعلامة «۝» برقمها
    async function drawAyah(d) {
        await loadFonts();
        try { await document.fonts?.load?.('400 60px "Amiri Quran"', d.text + QuranData.endMark(d.a)); } catch (e) {}
        const logo = await getLogo();
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const g = c.getContext('2d');
        g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
        const GOLD = '#a8843f', GOLD2 = '#c9a45c', PAPER = '#fffaf0', INK = '#1d2a24';
        // الحاشية: ورق بخطوط ذهبية مائلة
        g.fillStyle = '#f4ead2'; g.fillRect(0, 0, W, H);
        g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip();
        g.strokeStyle = 'rgba(201,164,92,.28)'; g.lineWidth = 6;
        for (let x = -H; x < W + H; x += 22) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + H, H); g.stroke(); }
        g.restore();
        // الورقة والإطار المزدوج
        const m = 46, fx = m, fy = m, fw = W - 2 * m, fh = H - 2 * m;
        roundRect(g, fx, fy, fw, fh, 14); g.fillStyle = PAPER; g.fill();
        g.lineWidth = 4; g.strokeStyle = GOLD; roundRect(g, fx + 18, fy + 18, fw - 36, fh - 36, 8); g.stroke();
        g.lineWidth = 1.5; roundRect(g, fx + 28, fy + 28, fw - 56, fh - 56, 6); g.stroke();
        // نجوم الزوايا
        g.fillStyle = GOLD; g.font = '400 34px "Amiri Quran", Amiri, serif';
        [[fx + 18, fy + 22], [fx + fw - 18, fy + 22], [fx + 18, fy + fh - 6], [fx + fw - 18, fy + fh - 6]].forEach(([x, y]) => { g.fillStyle = PAPER; g.fillRect(x - 20, y - 30, 40, 40); g.fillStyle = GOLD; g.fillText('✦', x, y); });
        // رأس الصفحة: اسم السورة بشريط مزخرف
        const bw = 520, bh = 96, bx = (W - bw) / 2, by = fy + 76;
        roundRect(g, bx, by, bw, bh, 18); g.fillStyle = 'rgba(201,164,92,.12)'; g.fill();
        g.lineWidth = 3; g.strokeStyle = GOLD2; g.stroke();
        g.fillStyle = INK; g.font = '700 50px Amiri, serif'; g.fillText('سورة ' + surahName(d.s), W / 2, by + 64);
        g.fillStyle = GOLD; g.font = '400 40px "Amiri Quran", Amiri, serif';
        g.fillText('۞', bx + 44, by + 62); g.fillText('۞', bx + bw - 44, by + 62);
        // نص الآية: أكبر خط بيساع بالمساحة
        const text = `${d.text} ${QuranData.endMark(d.a)}`;
        const top = by + bh + 60, bottom = fy + fh - 250, maxW = fw - 170;
        let size = 70, lines = [];
        for (; size >= 30; size -= 2) {
            g.font = `400 ${size}px "Amiri Quran", Amiri, serif`;
            lines = wrapLines(g, text, maxW);
            if (lines.length * size * 2.05 <= bottom - top) break;
        }
        const lh = size * 2.05, startY = top + ((bottom - top) - lines.length * lh) / 2 + size * 1.25;
        g.fillStyle = INK;
        lines.forEach((ln, i) => g.fillText(ln, W / 2, startY + i * lh));
        // التذييل: المرجع والشعار
        g.fillStyle = '#6b6455'; g.font = '500 32px "Readex Pro", sans-serif';
        g.fillText(`${surahName(d.s)} · الآية ${fmt(d.a)}`, W / 2, fy + fh - 178);
        g.strokeStyle = 'rgba(169,132,63,.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(W / 2 - 160, fy + fh - 148); g.lineTo(W / 2 + 160, fy + fh - 148); g.stroke();
        if (logo) { const lh2 = 74, lw = lh2 * logo.width / logo.height; g.drawImage(logo, (W - lw) / 2, fy + fh - 136, lw, lh2); }
        else { g.fillStyle = '#1f5444'; g.font = '700 40px "Readex Pro", sans-serif'; g.fillText('مُذكّر', W / 2, fy + fh - 84); }
        return c;
    }
    const toBlob = canvas => new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png'));

    // ---------- النافذة ----------
    function syncTabs() {
        document.querySelectorAll('#share-tabs [data-share-kind]').forEach(b => b.classList.toggle('active', b.dataset.shareKind === kind));
    }
    function setBusy(busy) {
        const box = $('share-preview');
        box.classList.toggle('ready', !busy && !!blob);
        $('share-preview-note').textContent = busy ? 'جارٍ تجهيز البطاقة…' : 'تعذّر تجهيز الصورة، يمكنك مشاركة النص.';
        $('share-download').disabled = busy || !blob;
    }
    async function render() {
        const id = ++renderId, d = kind === 'ayah' ? ayahData : collect();
        $('share-text').value = buildText(kind, d);
        blob = null; setBusy(true);
        try {
            const b = await toBlob(await (kind === 'ayah' ? drawAyah(d) : drawCard(kind, d)));
            if (id !== renderId) return;
            blob = b;
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            previewUrl = URL.createObjectURL(b);
            $('share-preview-img').src = previewUrl;
        } catch (e) { blob = null; }
        if (id === renderId) setBusy(false);
    }
    function open(k) {
        kind = k === 'achievements' ? 'achievements' : k === 'ayah' && ayahData ? 'ayah' : 'wird';
        $('share-tabs').hidden = kind === 'ayah';
        $('share-title').textContent = kind === 'ayah' ? 'مشاركة الآية' : 'مشاركة';
        syncTabs();
        $('share-native').hidden = !navigator.share;
        $('share-net-facebook').disabled = !appUrl();
        setModalState($('share-modal'), true);
        render();
    }

    // نص مختصر لمنصة X (حد الحروف): أول الأسطر ثم الرابط
    function compactText(text) {
        const url = appUrl();
        const kept = [];
        let size = url ? 24 : 0;
        for (const line of text.split('\n').filter(l => l && l !== url)) {
            if (size + line.length + 1 > 250) break;
            kept.push(line); size += line.length + 1;
        }
        if (url) kept.push(url);
        return kept.join('\n');
    }
    const NETWORKS = {
        whatsapp: t => `https://wa.me/?text=${encodeURIComponent(t)}`,
        telegram: t => `https://t.me/share/url?url=${encodeURIComponent(appUrl())}&text=${encodeURIComponent(t)}`,
        x: t => `https://twitter.com/intent/tweet?text=${encodeURIComponent(compactText(t))}`,
        facebook: t => (appUrl() ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appUrl())}&quote=${encodeURIComponent(t)}` : '')
    };
    async function nativeShare() {
        const text = $('share-text').value;
        try {
            if (blob && navigator.canShare) {
                const file = new File([blob], `mudhakkir-${kind}.png`, { type: 'image/png' });
                if (navigator.canShare({ files: [file] })) { await navigator.share({ title: 'مُذكّر', text, files: [file] }); return; }
            }
            await navigator.share({ title: 'مُذكّر', text });
        } catch (e) {
            if (!e || e.name !== 'AbortError') Toast.show('تعذّرت المشاركة، جرّب نسخ النص');
        }
    }
    async function copyText() {
        const area = $('share-text');
        try { await navigator.clipboard.writeText(area.value); }
        catch (e) { area.select(); try { document.execCommand('copy'); } catch (err) { Toast.show('تعذّر النسخ'); return; } }
        Toast.show('تم نسخ النص');
    }
    function download() {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `mudhakkir-${kind}.png`;
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }

    function init() {
        document.addEventListener('click', e => {
            const trigger = e.target.closest('[data-share]');
            if (trigger) open(trigger.dataset.share);
        });
        document.querySelectorAll('#share-tabs [data-share-kind]').forEach(b => b.addEventListener('click', () => { kind = b.dataset.shareKind; syncTabs(); render(); }));
        document.querySelectorAll('[data-net]').forEach(b => b.addEventListener('click', () => {
            const href = NETWORKS[b.dataset.net]($('share-text').value);
            if (href) window.open(href, '_blank', 'noopener');
        }));
        $('share-native').addEventListener('click', nativeShare);
        $('share-copy').addEventListener('click', copyText);
        $('share-download').addEventListener('click', download);
    }
    // من أدوات الآية: { s, a, text }
    function openAyah(ayah) { ayahData = { s: ayah.s, a: ayah.a, text: ayah.text }; open('ayah'); }
    return { init, open, openAyah };
})();
