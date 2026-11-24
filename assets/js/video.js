/* =====================================================================
 * مُذكّر — video.js  (الإصدار 36، معرض القائمة والفيديو: ف1 ف4 ف5 ك1 ش1)
 * «صنع فيديو» من «اصنع»: آيات بصوت قارئ، على خلفية، جاهز للريلز (720×1280، 30 فريم).
 *   - الآيات: سورة ومن آية لآية (أكتر شي 40 آية و3 دقايق). طول الفيديو بطول التلاوة.
 *   - الصوت: ملف لكل آية من EveryAyah (عن طريق Recite.fetchAyah، يعني من الجهاز إذا السورة محفوظة).
 *     البسملة قبل أول آية بالسورة (إلا الفاتحة والتوبة). منشيل السكوت الطويل بأول وآخر كل آية.
 *   - الخلفية: 9 مقاطع طبيعة حقيقية (assets/video/bg، من Pexels)، أو 3 مرسومة بتتحرك (ف1 سما ونجوم،
 *     ف4 زخرفة بتدور، ف5 نور ذهبي)، أو صورة أو فيديو من جهاز المستخدم.
 *   - الكتابة (ك1): كل آية بتطلع بهدوء وقت يقراها الشيخ، وتحتها السورة ورقم الآية. الآية الطويلة بتنقسم
 *     لصفحات حسب طولها. وتحت شارة مُذكّر (ش1). كلو بمنطقة بعيدة عن أزرار إنستغرام.
 *   - التسجيل بوقتو الحقيقي (المعاينة نفسها): WebCodecs (H.264 Baseline + AAC) لملف MP4 عادي (moov بالأول)،
 *     وإذا المتصفح ما بيدعمها: MediaRecorder (MP4 إذا بيقدر، وإلا WebM).
 * كلو جوّا الجهاز، ما في شي بيطلع لسيرفر.
 * يُحمَّل بعد recite.js و cardart.js، وقبل main.js. التشغيل: VideoMaker.show() لما تنفتح الصفحة (core.js).
 * ===================================================================== */
const VideoMaker = (() => {
    const $ = id => document.getElementById(id);
    const W = 720, H = 1280, FPS = 30, SR = 48000;
    const KEY = 'mudhakkir-video';
    const LEAD = 0.6, TAIL = 1.8, GAP = 0.25, MAX_SEC = 180, MAX_AYAT = 40;
    const REAL = [['sea', 'بحر'], ['mountains', 'جبال'], ['clouds', 'غيوم'], ['forest', 'غابة'], ['waterfall', 'شلال'], ['rain', 'مطر'], ['snow', 'تلج'], ['desert', 'صحرا'], ['milkyway', 'درب التبانة']];
    const DRAWN = [['stars', 'سما ونجوم'], ['pattern', 'زخرفة'], ['bokeh', 'نور ذهبي']];
    const ar = n => Number(n).toLocaleString('ar-EG-u-nu-latn');
    const arQ = n => Number(n).toLocaleString('ar-EG');
    const count = s => QuranIndex.COUNTS[s - 1] || 0;
    const needsBas = (s, a) => a === 1 && s !== 1 && s !== 9;
    const EN = typeof I18n !== 'undefined' && I18n.isEn;
    const sn = s => (EN ? I18n.surah(surahName(s)) : surahName(s));
    const st = { s: 13, from: 28, to: 28, rid: 'husary', bg: 'sea' };
    try { const o = JSON.parse(localStorage.getItem(KEY)) || {}; ['s', 'from', 'to', 'rid', 'bg'].forEach(k => { if (o[k] !== undefined) st[k] = o[k]; }); } catch (e) {}
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ ...st, bg: st.bg === 'mine' ? 'sea' : st.bg })); } catch (e) {} };
    function clampRange() {
        st.s = Math.max(1, Math.min(114, Number(st.s) || 1));
        st.from = Math.max(1, Math.min(count(st.s), Number(st.from) || 1));
        st.to = Math.max(st.from, Math.min(count(st.s), Number(st.to) || st.from, st.from + MAX_AYAT - 1));
        if (!Recite.RECITERS.some(r => r.id === st.rid)) st.rid = Recite.rid;
        if (![...REAL, ...DRAWN].some(([k]) => k === st.bg) && st.bg !== 'mine') st.bg = 'sea';
    }
    clampRange();

    let inited = false, cv = null, cx = null, audio = null, run = null, mine = null, stillTimer = 0;
    const badge = new Image(); badge.src = 'assets/img/icon-192.png';
    const posters = {}, clips = {};
    const poster = name => posters[name] || (posters[name] = Object.assign(new Image(), { src: `assets/video/bg/${name}.jpg` }));
    // المقطع كـ blob: بيلف ويرجع لأولو بلا مشاكل حتى لو السيرفر ما بيدعم القطع (Range)
    function clip(name) {
        if (clips[name]) return clips[name];
        const v = document.createElement('video');
        v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto'; v.setAttribute('playsinline', '');
        clips[name] = v;
        fetch(`assets/video/bg/${name}.mp4`).then(r => r.ok ? r.blob() : Promise.reject(new Error('HTTP ' + r.status))).then(b => { v.src = URL.createObjectURL(b); }).catch(() => { v.src = `assets/video/bg/${name}.mp4`; });
        return v;
    }

    // ---------- الخلفيات المرسومة (ف1 ف4 ف5) — نفس رسمات المعرض بمقاس الفيديو ----------
    const rand = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
    function bgStars(x, w, h, t) {
        const k = w / 270;
        const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#08142a'); g.addColorStop(.7, '#14284a'); g.addColorStop(1, '#2b3d5c'); x.fillStyle = g; x.fillRect(0, 0, w, h);
        const r = rand(7); x.fillStyle = '#fff';
        for (let i = 0; i < 160; i++) { const sx = r() * w, sy = r() * h * .86, ph = r() * 6.28, sz = (r() * 1.3 + .35) * k * .7; x.globalAlpha = .3 + .7 * Math.abs(Math.sin(t * 1.1 + ph)); x.beginPath(); x.arc(sx, sy, sz, 0, 6.28); x.fill(); }
        x.globalAlpha = 1;
        const mx = w * .74, my = h * .13, mr = 20 * k;
        const gl = x.createRadialGradient(mx, my, mr * .6, mx, my, mr * 4); gl.addColorStop(0, 'rgba(243,227,179,.22)'); gl.addColorStop(1, 'rgba(243,227,179,0)'); x.fillStyle = gl; x.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
        x.fillStyle = '#f3e3b3'; x.beginPath(); x.arc(mx, my, mr, 0, 6.28); x.fill();
        x.fillStyle = '#0a1730'; x.beginPath(); x.arc(mx + mr * .42, my - mr * .22, mr * .9, 0, 6.28); x.fill();
    }
    function bgPattern(x, w, h, t) {
        const k = w / 270;
        x.fillStyle = '#123b30'; x.fillRect(0, 0, w, h);
        x.save(); x.translate(w / 2, h / 2); x.rotate(t * .08); x.lineWidth = 1.4 * k * .7;
        for (let ring = 0; ring < 8; ring++) {
            const R = (40 + ring * 46) * k;
            x.strokeStyle = ring % 2 ? 'rgba(210,176,98,.55)' : 'rgba(157,197,170,.35)';
            for (let j = 0; j < 2; j++) { x.save(); x.rotate(j * Math.PI / 4 + ring * .2); x.strokeRect(-R / 2, -R / 2, R, R); x.restore(); }
        }
        x.restore();
        const g = x.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, h * .7); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    }
    function bgBokeh(x, w, h, t) {
        const k = w / 270;
        const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#1b1410'); g.addColorStop(1, '#3a2614'); x.fillStyle = g; x.fillRect(0, 0, w, h);
        const r = rand(11);
        for (let i = 0; i < 30; i++) {
            const bx = r() * w, by = ((r() * h - t * (6 + r() * 10) * k) % h + h) % h, R = (8 + r() * 26) * k, a = .25 + r() * .3;
            const gg = x.createRadialGradient(bx, by, 0, bx, by, R); gg.addColorStop(0, `rgba(240,200,120,${a})`); gg.addColorStop(1, 'rgba(240,200,120,0)');
            x.fillStyle = gg; x.beginPath(); x.arc(bx, by, R, 0, 6.28); x.fill();
        }
    }
    const DRAW = { stars: bgStars, pattern: bgPattern, bokeh: bgBokeh };

    // صورة أو فيديو بملء الإطار (cover)، والصورة بتقرّب على مهل
    function cover(x, src, sw, sh, zoom = 1) {
        if (!sw || !sh) return false;
        const s = Math.max(W / sw, H / sh) * zoom, dw = sw * s, dh = sh * s;
        x.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
        return true;
    }
    function drawBg(x, t, dur, live) {
        if (DRAW[st.bg]) { DRAW[st.bg](x, W, H, t); return; }
        let ok = false;
        if (st.bg === 'mine' && mine) {
            if (mine.kind === 'image') ok = cover(x, mine.el, mine.el.naturalWidth, mine.el.naturalHeight, 1 + .1 * Math.min(1, t / Math.max(1, dur || 20)));
            else if (mine.el.readyState >= 2) ok = cover(x, mine.el, mine.el.videoWidth, mine.el.videoHeight);
        } else if (live) {
            const v = clip(st.bg);
            if (v.readyState >= 2) ok = cover(x, v, v.videoWidth, v.videoHeight);
        }
        if (!ok && st.bg !== 'mine') { const p = poster(st.bg); if (p.complete && p.naturalWidth) ok = cover(x, p, p.naturalWidth, p.naturalHeight); }
        if (!ok) { x.fillStyle = '#0f2a22'; x.fillRect(0, 0, W, H); }
        // تغميق خفيف حتى تنقرا الكتابة فوق أي منظر
        x.fillStyle = 'rgba(0,0,0,.16)'; x.fillRect(0, 0, W, H);
    }

    // ---------- الكتابة (ك1) والشارة (ش1) ----------
    // منطقة الكتابة: فوق اسم الحساب والوصف، وبعيدة عن أزرار الإعجاب يمين (متل بطاقة الريلز)
    const Z = { x: W * .14, y: H * .19, w: W * .72, h: H * .4 };
    const QFONT = '"Amiri Quran", "Amiri", serif';
    function wrap(x, text, maxW) { const words = text.split(/\s+/), lines = []; let line = ''; for (const wd of words) { const tt = line ? line + ' ' + wd : wd; if (line && x.measureText(tt).width > maxW) { lines.push(line); line = wd; } else line = tt; } if (line) lines.push(line); return lines; }
    // كل آية ← «بطاقة» أو أكتر (الآية الطويلة بتنقسم)، وكل وحدة إلها وقت ظهور حسب طولها
    function layoutCards(segs) {
        const m = document.createElement('canvas').getContext('2d');
        const cards = [];
        segs.forEach(sg => {
            let size = 52, lines = [], lh = 0;
            for (; size >= 32; size -= 2) { m.font = `${size}px ${QFONT}`; lines = wrap(m, sg.text, Z.w); lh = size * 1.9; if (lines.length * lh <= Z.h) break; }
            if (size < 32) { size = 32; m.font = `${size}px ${QFONT}`; lines = wrap(m, sg.text, Z.w); lh = size * 1.9; }
            const per = Math.max(1, Math.floor(Z.h / lh)), parts = [];
            for (let i = 0; i < lines.length; i += per) parts.push(lines.slice(i, i + per));
            const chars = parts.reduce((n, p) => n + p.join(' ').length, 0) || 1;
            let acc = sg.start;
            parts.forEach((p, j) => {
                const d = (sg.end - sg.start) * p.join(' ').length / chars;
                cards.push({ lines: p, size, lh, ref: sg.ref, from: j ? acc : sg.start - .15, more: parts.length > 1 ? `${ar(j + 1)}/${ar(parts.length)}` : '' });
                acc += d;
            });
        });
        cards.forEach((c, i) => { c.to = i + 1 < cards.length ? cards[i + 1].from : Infinity; });
        if (cards[0]) cards[0].from = Math.min(cards[0].from, LEAD - .25);
        return cards;
    }
    function drawCard(x, c, alpha) {
        if (!c || alpha <= 0) return;
        const refH = c.ref ? 64 : 0, blockH = c.lines.length * c.lh + refH;
        const top = Z.y + (Z.h - blockH) / 2 + (1 - alpha) * 14, cxm = W / 2;
        x.save();
        // ظل ناعم ورا الكتابة
        const cy = top + blockH / 2, R = Math.max(Z.w * .78, blockH * .9);
        const g = x.createRadialGradient(cxm, cy, 0, cxm, cy, R); g.addColorStop(0, `rgba(0,0,0,${.42 * alpha})`); g.addColorStop(.6, `rgba(0,0,0,${.2 * alpha})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g; x.fillRect(cxm - R, cy - R, R * 2, R * 2);
        x.globalAlpha = alpha; x.direction = 'rtl'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
        x.font = `${c.size}px ${QFONT}`; x.fillStyle = '#ffffff';
        x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 18;
        c.lines.forEach((ln, i) => x.fillText(ln, cxm, top + c.lh * i + c.size * 1.22));
        x.shadowBlur = 0;
        if (c.ref) {
            const y = top + c.lines.length * c.lh + 30;
            x.strokeStyle = 'rgba(236,202,120,.85)'; x.lineWidth = 2;
            x.beginPath(); x.moveTo(cxm - 90, y); x.lineTo(cxm - 14, y); x.moveTo(cxm + 14, y); x.lineTo(cxm + 90, y); x.stroke();
            x.fillStyle = 'rgba(236,202,120,.95)'; x.beginPath(); x.moveTo(cxm, y - 7); x.lineTo(cxm + 7, y); x.lineTo(cxm, y + 7); x.lineTo(cxm - 7, y); x.closePath(); x.fill();
            x.font = '500 26px "Readex Pro", sans-serif'; x.fillStyle = 'rgba(255,255,255,.9)';
            x.fillText(c.ref + (c.more ? `  (${c.more})` : ''), cxm, y + 42);
        }
        x.restore();
    }
    // شارة مُذكّر: أيقونة التطبيق واسمو بكبسولة تحت الكتابة
    function drawBadge(x, alpha = 1) {
        x.save(); x.globalAlpha = alpha;
        const bs = 52, pad = 14, gap = 14;
        x.font = '700 28px "Noto Kufi Arabic", "Readex Pro", sans-serif';
        const tw = x.measureText('مُذكّر').width, bw = pad + bs + gap + tw + pad * 1.6, bh = bs + pad * 1.1;
        const bx = (W - bw) / 2, by = H * .655;
        x.fillStyle = 'rgba(10,20,16,.48)'; x.beginPath(); x.roundRect(bx, by, bw, bh, bh / 2); x.fill();
        const ix = bx + bw - pad - bs, iy = by + (bh - bs) / 2;
        if (badge.complete && badge.naturalWidth) { x.save(); x.beginPath(); x.roundRect(ix, iy, bs, bs, bs * .24); x.clip(); x.drawImage(badge, ix, iy, bs, bs); x.restore(); }
        x.direction = 'rtl'; x.textAlign = 'right'; x.textBaseline = 'middle'; x.fillStyle = '#ffffff';
        x.fillText('مُذكّر', ix - gap, by + bh / 2 + 2);
        x.restore();
    }
    const fadeIn = .4, fadeOut = .3;
    function frame(x, t, live) {
        const a = audio;
        drawBg(x, t, a ? a.dur : 20, live);
        if (a) {
            const c = a.cards.find(k => t >= k.from && t < k.to);
            if (c) {
                let al = Math.min(1, (t - c.from) / fadeIn);
                if (c.to !== Infinity) al = Math.min(al, (c.to - t) / fadeOut);
                drawCard(x, c, Math.max(0, al));
            }
        }
        drawBadge(x);
    }

    // ---------- النص والصوت ----------
    async function ayahText(s, a) {
        const p0 = QuranIndex.pageOf(s, a);
        for (const p of [p0, p0 + 1, p0 - 1]) {
            if (p < 1 || p > 604) continue;
            try { const ay = (await QuranData.getPage(p)).find(x => x.surah.number === s && x.numberInSurah === a); if (ay) return QuranData.verseText(ay); } catch (e) {}
        }
        throw new Error('text');
    }
    function mono(buf) {
        const n = buf.length, out = new Float32Array(n), chs = buf.numberOfChannels;
        for (let c = 0; c < chs; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) out[i] += d[i] / chs; }
        return out;
    }
    // السكوت الطويل بأول وآخر الآية بينشال، ومنخلّي شوي حتى ما تنقطع النَّفَس
    function trim(d) {
        const th = .006; let a = 0, b = d.length - 1;
        while (a < d.length && Math.abs(d[a]) < th) a++;
        while (b > a && Math.abs(d[b]) < th) b--;
        a = Math.max(0, a - Math.round(.06 * SR)); b = Math.min(d.length, b + Math.round(.3 * SR));
        const out = d.slice(a, b), f = Math.min(240, out.length >> 1);
        for (let i = 0; i < f; i++) { out[i] *= i / f; out[out.length - 1 - i] *= i / f; }
        return out;
    }
    const audioKey = () => `${st.rid}|${st.s}|${st.from}|${st.to}`;
    async function buildAudio(job) {
        if (audio && audio.key === audioKey()) return audio;
        const items = [];
        if (needsBas(st.s, st.from)) items.push({ s: st.s, a: st.from, bas: true });
        for (let a = st.from; a <= st.to; a++) items.push({ s: st.s, a });
        const dec = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, SR, SR);
        const parts = [];
        let i = 0;
        for (const it of items) {
            if (job.cancel) throw new Error('cancel');
            busy(`جارٍ تحميل التلاوة… ${ar(i + 1)} من ${ar(items.length)}`, i / items.length);
            const res = await Recite.fetchAyah(it.bas ? 1 : it.s, it.bas ? 1 : it.a, st.rid);
            const buf = await dec.decodeAudioData(await res.arrayBuffer());
            const text = it.bas ? QuranData.BASMALA : await ayahText(it.s, it.a);
            parts.push({ it, text, data: trim(mono(buf)) });
            i++;
        }
        if (job.cancel) throw new Error('cancel');
        let tot = LEAD;
        const segs = parts.map((p, k) => {
            const start = tot; tot += p.data.length / SR;
            const sg = { start, end: tot, text: p.text, ref: p.it.bas ? '' : `${surahName(p.it.s)} · ${arQ(p.it.a)}` };
            if (k < parts.length - 1) tot += GAP;
            return sg;
        });
        const dur = tot + TAIL;
        if (dur > MAX_SEC) throw new Error('long');
        const pcm = new Float32Array(Math.ceil(dur * SR));
        parts.forEach((p, k) => pcm.set(p.data, Math.round(segs[k].start * SR)));
        await fontsReady();
        audio = { key: audioKey(), pcm, segs, dur, cards: layoutCards(segs), n: st.to - st.from + 1 };
        paintMeta();
        return audio;
    }
    let fontsP = null;
    const fontsReady = () => fontsP || (fontsP = Promise.all([
        document.fonts?.load?.(`48px ${QFONT}`, 'بِسْمِ'), document.fonts?.load?.('700 28px "Noto Kufi Arabic"', 'مُذكّر'), document.fonts?.load?.('500 26px "Readex Pro"', 'البقرة')
    ].map(p => Promise.resolve(p).catch(() => null))));

    // ---------- اللقطة الثابتة (قبل التشغيل) ----------
    async function still() {
        if (!cv || run) return;
        await fontsReady();
        if (run) return;
        let a = audio && audio.key === audioKey() ? audio : null;
        if (!a) {
            let text = '';
            try { text = await ayahText(st.s, st.from); } catch (e) { text = ''; }
            if (run) return;
            const segs = text ? [{ start: 0, end: 4, text, ref: `${surahName(st.s)} · ${arQ(st.from)}` }] : [];
            const saved = audio; audio = { cards: layoutCards(segs), dur: 20 };
            frame(cx, 2.5, false);
            audio = saved;
            return;
        }
        const c0 = a.cards[0];
        frame(cx, c0 ? c0.from + 1 : 2, false);
    }
    const stillSoon = () => { clearTimeout(stillTimer); stillTimer = setTimeout(still, 120); };

    // ---------- التشغيل والتسجيل (بوقتو الحقيقي) ----------
    function busy(text, p) {
        const b = $('vm-busy'); if (!b) return;
        b.hidden = text == null;
        if (text != null) { $('vm-busy-t').textContent = text; $('vm-bar-i').style.transform = `scaleX(${Math.max(0, Math.min(1, p || 0))})`; }
    }
    function bgStart() {
        if (st.bg === 'mine' && mine && mine.kind === 'video') { try { mine.el.currentTime = 0; } catch (e) {} mine.el.play().catch(() => {}); }
        else if (!DRAW[st.bg] && st.bg !== 'mine') { const v = clip(st.bg); try { v.currentTime = 0; } catch (e) {} v.play().catch(() => {}); }
    }
    function bgStop() {
        Object.values(clips).forEach(v => { try { v.pause(); } catch (e) {} });
        if (mine && mine.kind === 'video') try { mine.el.pause(); } catch (e) {}
    }
    // دعم WebCodecs: H.264 Baseline (بلا B-frames فما منحتاج ctts) و AAC
    async function wcConfig() {
        if (typeof VideoEncoder === 'undefined' || typeof AudioEncoder === 'undefined' || typeof VideoFrame === 'undefined' || typeof OffscreenCanvas === 'undefined' || typeof AudioData === 'undefined') return null;
        let vcfg = null;
        for (const codec of ['avc1.42001f', 'avc1.420028', 'avc1.42002a']) {
            // 2.5 ميغابت: دقيقة فيديو حوالي 19 ميغا (واتساب وإنستغرام بيقبلوها بلا ما يقصّوها كتير)
            const c = { codec, width: W, height: H, bitrate: 2_500_000, framerate: FPS, avc: { format: 'avc' } };
            try { if ((await VideoEncoder.isConfigSupported(c)).supported) { vcfg = c; break; } } catch (e) {}
        }
        if (!vcfg) return null;
        const acfg = { codec: 'mp4a.40.2', sampleRate: SR, numberOfChannels: 1, bitrate: 128000 };
        try { if (!(await AudioEncoder.isConfigSupported(acfg)).supported) return null; } catch (e) { return null; }
        return { vcfg, acfg };
    }
    function mrMime() {
        if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) return '';
        return ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(m => { try { return MediaRecorder.isTypeSupported(m); } catch (e) { return false; } }) || '';
    }
    async function encodeAudio(pcm, acfg) {
        const samples = []; let asc = null;
        const enc = new AudioEncoder({
            output: (ch, meta) => { if (!asc && meta && meta.decoderConfig && meta.decoderConfig.description) asc = new Uint8Array(meta.decoderConfig.description.slice ? meta.decoderConfig.description.slice(0) : meta.decoderConfig.description); const d = new Uint8Array(ch.byteLength); ch.copyTo(d); samples.push({ data: d, dur: 1024 }); },
            error: e => { enc.err = e; }
        });
        enc.configure(acfg);
        for (let i = 0; i < pcm.length; i += 1024) {
            const n = Math.min(1024, pcm.length - i);
            const ad = new AudioData({ format: 'f32-planar', sampleRate: SR, numberOfFrames: n, numberOfChannels: 1, timestamp: Math.round(i / SR * 1e6), data: pcm.slice(i, i + n) });
            enc.encode(ad); ad.close();
            if (enc.encodeQueueSize > 40) await new Promise(r => setTimeout(r, 0));
        }
        await enc.flush(); enc.close();
        if (enc.err) throw enc.err;
        return { samples, asc: asc || new Uint8Array([0x11, 0x88]) }; // AAC-LC، 48000، أحادي
    }

    // record: false = معاينة بس. actx لازم ينعمل وقت الكبسة نفسها (الآيفون بيمنع الصوت بعدين)
    async function start(record, actx) {
        const job = { cancel: false };
        run = { job, record, stop: () => { job.cancel = true; } };
        paintButtons();
        KeepAwake.on('video');
        let raf = 0, src = null;
        const cleanup = () => {
            cancelAnimationFrame(raf);
            try { src && src.stop(); } catch (e) {}
            try { actx.close(); } catch (e) {}
            bgStop(); busy(null); KeepAwake.off('video');
            run = null; paintButtons();
        };
        try {
            await buildAudio(job);
            let wc = null, mime = '';
            if (record) {
                busy('جارٍ التجهيز…', 0);
                wc = await wcConfig();
                if (!wc) { mime = mrMime(); if (!mime) throw new Error('nosupport'); }
            }
            if (job.cancel) throw new Error('cancel');
            const a = audio;
            const buf = actx.createBuffer(1, a.pcm.length, SR); buf.copyToChannel(a.pcm, 0);
            src = actx.createBufferSource(); src.buffer = buf; src.connect(actx.destination);
            // التسجيل
            let venc = null, vSamples = [], avcC = null, aEnc = null, oc = null, ox = null, mr = null, chunks = [], nextFrame = 0;
            const totalFrames = Math.ceil(a.dur * FPS);
            if (record && wc) {
                busy('جارٍ تجهيز الصوت…', 0);
                aEnc = await encodeAudio(a.pcm, wc.acfg);
                oc = new OffscreenCanvas(W, H); ox = oc.getContext('2d', { alpha: false });
                venc = new VideoEncoder({
                    output: (ch, meta) => { if (!avcC && meta && meta.decoderConfig && meta.decoderConfig.description) avcC = new Uint8Array(meta.decoderConfig.description.slice ? meta.decoderConfig.description.slice(0) : meta.decoderConfig.description); const d = new Uint8Array(ch.byteLength); ch.copyTo(d); vSamples.push({ data: d, dur: 90000 / FPS, key: ch.type === 'key', ts: ch.timestamp }); },
                    error: e => { venc.err = e; }
                });
                venc.configure(wc.vcfg);
            } else if (record) {
                const dest = actx.createMediaStreamDestination(); src.connect(dest);
                const stream = cv.captureStream(FPS); dest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr));
                mr = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000, audioBitsPerSecond: 128000 });
                mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
                mr.start(1000);
            }
            if (job.cancel) throw new Error('cancel');
            busy(null);
            bgStart();
            // إذا الجهاز منع الصوت (ما كانت كبسة حقيقية مثلًا) الساعة ما بتمشي، فما منعلق
            await Promise.race([actx.resume(), new Promise(r => setTimeout(r, 2500))]);
            if (actx.state !== 'running') throw new Error('audio');
            const t0 = actx.currentTime + .08;
            src.start(t0);
            const done = await new Promise((resolve, reject) => {
                const tick = () => {
                    if (job.cancel) return reject(new Error('cancel'));
                    if (venc && venc.err) return reject(venc.err);
                    const t = Math.max(0, actx.currentTime - t0);
                    if (ox) {
                        frame(ox, t, true);
                        // كل الفريمات يلي وقتها إجا (إذا الجهاز تأخّر شوي منكرّر نفس الصورة) بفاصل ثابت
                        const target = Math.min(totalFrames, Math.floor(t * FPS) + 1);
                        while (nextFrame < target) {
                            const vf = new VideoFrame(oc, { timestamp: Math.round(nextFrame * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
                            venc.encode(vf, { keyFrame: nextFrame % (FPS * 2) === 0 }); vf.close();
                            nextFrame++;
                        }
                        cx.drawImage(oc, 0, 0);
                    } else frame(cx, t, true);
                    if (record) $('vm-rec-t').textContent = `جارٍ التسجيل… ${ar(Math.min(100, Math.round(t / a.dur * 100)))}٪`;
                    if (t >= a.dur) return resolve(true);
                    raf = requestAnimationFrame(tick);
                };
                raf = requestAnimationFrame(tick);
            });
            cancelAnimationFrame(raf);
            try { src.stop(); } catch (e) {}
            if (!record || !done) { cleanup(); stillSoon(); return; }
            busy('جارٍ حفظ الفيديو…', 1);
            let blob;
            if (venc) {
                await venc.flush(); venc.close();
                if (venc.err) throw venc.err;
                if (vSamples.some((s, i) => i && s.ts < vSamples[i - 1].ts)) throw new Error('bframes');
                const bytes = muxMp4({ vSamples, avcC, vTimescale: 90000, width: W, height: H, aSamples: aEnc.samples, asc: aEnc.asc, sampleRate: SR, channels: 1 });
                blob = new Blob([bytes], { type: 'video/mp4' });
            } else {
                await new Promise(r => { mr.onstop = r; mr.stop(); });
                blob = new Blob(chunks, { type: mime.split(';')[0] });
            }
            cleanup();
            showResult(blob);
        } catch (e) {
            const m = String(e && e.message || e);
            cleanup();
            if (m === 'cancel') { stillSoon(); return; }
            if (m === 'long') Toast.show('المقطع أطول من 3 دقايق، اختار آيات أقل', 3600);
            else if (m === 'nosupport') Toast.show('متصفحك ما بيقدر يصنع فيديو. جرّب Chrome أو Safari الجديد', 4200);
            else if (m === 'audio') Toast.show('الجهاز ما سمح بالصوت، اضغط الزر مرة تانية', 3600);
            else if (/HTTP|fetch|Failed|network|text/i.test(m)) Toast.show(navigator.onLine ? 'تعذّر تحميل التلاوة، جرّب كمان شوي' : 'بدّك نت لتحميل التلاوة، أو نزّل السورة من «التلاوة بلا نت»', 4200);
            else Toast.show('صار خطأ بصنع الفيديو، جرّب كمان مرة', 3600);
            stillSoon();
        }
    }

    // ---------- النتيجة: مشاركة أو حفظ ----------
    let outUrl = '', outFile = null;
    function showResult(blob) {
        const ext = /mp4/.test(blob.type) ? 'mp4' : 'webm';
        outFile = new File([blob], `mudhakkir-${st.s}-${st.from}${st.to > st.from ? '-' + st.to : ''}.${ext}`, { type: blob.type });
        if (outUrl) URL.revokeObjectURL(outUrl);
        outUrl = URL.createObjectURL(blob);
        const v = $('vm-out'); v.src = outUrl;
        $('vm-result').hidden = false;
        $('vm-result-meta').textContent = `${surahName(st.s)} · ${st.to > st.from ? `${ar(st.from)}–${ar(st.to)}` : ar(st.from)} · ${Recite.rec(st.rid).short} · ${(blob.size / 1048576).toFixed(1)} ميغا`;
        setTimeout(() => $('vm-result').scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }), 80);
        Toast.show('الفيديو جاهز ✓');
    }
    async function share() {
        if (!outFile) return;
        try { if (navigator.canShare && navigator.canShare({ files: [outFile] })) { await navigator.share({ files: [outFile], title: 'مُذكّر' }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
        download();
    }
    function download() {
        if (!outUrl) return;
        const a = document.createElement('a'); a.href = outUrl; a.download = outFile.name; document.body.append(a); a.click(); a.remove();
        Toast.show('انحفظ الفيديو ✓');
    }

    // ---------- الواجهة ----------
    function paintMeta() {
        const n = st.to - st.from + 1, el = $('vm-meta'); if (!el) return;
        const a = audio && audio.key === audioKey() ? audio : null;
        const len = a ? ` · ${Math.floor(a.dur / 60)}:${String(Math.round(a.dur % 60)).padStart(2, '0')} دقيقة` : '';
        if (EN) { el.textContent = `${sn(st.s)} · ${n === 1 ? '1 ayah' : n + ' ayat'}${a ? ` · ${Math.floor(a.dur / 60)}:${String(Math.round(a.dur % 60)).padStart(2, '0')} min` : ''}`; return; }
        el.textContent = `${surahName(st.s)} · ${n === 1 ? 'آية وحدة' : n === 2 ? 'آيتين' : n <= 10 ? `${ar(n)} آيات` : `${ar(n)} آية`}${len} · ${Recite.rec(st.rid).short}`;
    }
    function paintButtons() {
        const p = $('vm-preview'), m = $('vm-make'), rec = run && run.record;
        p.classList.toggle('is-playing', !!run && !rec);
        p.setAttribute('aria-label', run && !rec ? 'إيقاف المعاينة' : 'معاينة');
        p.hidden = !!rec;
        m.textContent = rec ? 'إلغاء' : 'اصنع الفيديو';
        m.classList.toggle('is-cancel', !!rec);
        $('vm-rec').hidden = !rec;
        document.querySelectorAll('#page-video .vm-controls select, #vm-reciters button, #vm-bgs button').forEach(b => { b.disabled = !!run; });
    }
    function fillRange() {
        const opts = (lo, hi, sel) => { let h = ''; for (let i = lo; i <= hi; i++) h += `<option value="${i}"${i === sel ? ' selected' : ''}>${ar(i)}</option>`; return h; };
        $('vm-surah').value = String(st.s);
        $('vm-from').innerHTML = opts(1, count(st.s), st.from);
        $('vm-to').innerHTML = opts(st.from, Math.min(count(st.s), st.from + MAX_AYAT - 1), st.to);
    }
    function paintChoices() {
        document.querySelectorAll('#vm-reciters [data-rid]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.rid === st.rid)));
        document.querySelectorAll('#vm-bgs [data-bg]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.bg === st.bg)));
    }
    function changed() {
        clampRange(); save(); fillRange(); paintChoices(); paintMeta();
        $('vm-result').hidden = true;
        stillSoon();
    }
    function build() {
        cv = $('vm-canvas'); cx = cv.getContext('2d', { alpha: false });
        $('vm-surah').innerHTML = Array.from({ length: 114 }, (_, i) => `<option value="${i + 1}">${ar(i + 1)}. ${sn(i + 1)}</option>`).join('');
        $('vm-reciters').innerHTML = Recite.RECITERS.map(r => `<button type="button" role="radio" data-rid="${r.id}" aria-checked="false">${qEsc(r.short)}${r.note ? ` <small>${qEsc(r.note)}</small>` : ''}</button>`).join('');
        $('vm-bgs').innerHTML = REAL.map(([k, n]) => `<button type="button" role="radio" data-bg="${k}" aria-checked="false" aria-label="${n}"><img src="assets/video/bg/${k}.jpg" alt="" width="72" height="128" loading="lazy" decoding="async"><span>${n}</span></button>`).join('')
            + DRAWN.map(([k, n]) => `<button type="button" role="radio" data-bg="${k}" aria-checked="false" aria-label="${n}"><canvas width="72" height="128" data-draw="${k}"></canvas><span>${n}</span></button>`).join('')
            + '<button type="button" class="vm-mine" id="vm-mine-btn"><b aria-hidden="true">+</b><span>من جهازك</span></button>';
        $('vm-bgs').querySelectorAll('canvas[data-draw]').forEach(c => { const x = c.getContext('2d'); x.save(); x.scale(c.width / W, c.height / H); DRAW[c.dataset.draw](x, W, H, 4); x.restore(); });
        $('vm-surah').addEventListener('change', e => { st.s = Number(e.target.value); st.from = 1; st.to = Math.min(count(st.s), 3); changed(); });
        $('vm-from').addEventListener('change', e => { st.from = Number(e.target.value); if (st.to < st.from) st.to = st.from; changed(); });
        $('vm-to').addEventListener('change', e => { st.to = Number(e.target.value); changed(); });
        $('vm-reciters').addEventListener('click', e => { const b = e.target.closest('[data-rid]'); if (!b || run) return; st.rid = b.dataset.rid; changed(); });
        $('vm-bgs').addEventListener('click', e => {
            if (run) return;
            if (e.target.closest('#vm-mine-btn')) { $('vm-file').click(); return; }
            const b = e.target.closest('[data-bg]'); if (!b) return;
            st.bg = b.dataset.bg; changed();
            if (!DRAW[st.bg] && st.bg !== 'mine') { const p = poster(st.bg); if (!p.complete) p.onload = stillSoon; clip(st.bg); }
        });
        $('vm-file').addEventListener('change', e => {
            const f = e.target.files && e.target.files[0]; e.target.value = '';
            if (!f) return;
            const isVid = /^video\//.test(f.type), url = URL.createObjectURL(f);
            if (mine) { try { URL.revokeObjectURL(mine.url); } catch (err) {} }
            let el;
            if (isVid) { el = document.createElement('video'); el.muted = true; el.loop = true; el.playsInline = true; el.setAttribute('playsinline', ''); el.preload = 'auto'; el.src = url; el.addEventListener('loadeddata', stillSoon, { once: true }); }
            else { el = new Image(); el.onload = stillSoon; el.src = url; }
            mine = { kind: isVid ? 'video' : 'image', url, el };
            // زر «من جهازك» بيصير هو الخلفية المختارة، وعليه صورة مصغّرة
            const mb = $('vm-mine-btn'); mb.dataset.bg = 'mine'; mb.setAttribute('role', 'radio'); mb.classList.add('has-file');
            mb.querySelector('b').textContent = isVid ? '▶' : '✓';
            st.bg = 'mine'; changed();
        });
        $('vm-preview').addEventListener('click', () => {
            if (run) { run.stop(); return; }
            const actx = new (window.AudioContext || window.webkitAudioContext)(); actx.resume().catch(() => {});
            $('vm-result').hidden = true;
            start(false, actx);
        });
        $('vm-make').addEventListener('click', () => {
            if (run) { run.stop(); return; }
            const actx = new (window.AudioContext || window.webkitAudioContext)(); actx.resume().catch(() => {});
            $('vm-result').hidden = true;
            start(true, actx);
        });
        $('vm-cancel').addEventListener('click', () => { if (run) run.stop(); });
        $('vm-share').addEventListener('click', share);
        $('vm-save').addEventListener('click', download);
        // إذا طلع من التطبيق وقت التسجيل: الفريمات بتوقف، فمنلغي ومنقلّو
        document.addEventListener('visibilitychange', () => { if (document.hidden && run) { const rec = run.record; run.stop(); if (rec) Toast.show('وقف صنع الفيديو لأنك طلعت من التطبيق، جرّب كمان مرة وخلّي الشاشة مفتوحة', 5000); } });
        inited = true;
    }
    function show() {
        if (!inited) build();
        fillRange(); paintChoices(); paintMeta(); paintButtons();
        if (!DRAW[st.bg] && st.bg !== 'mine') { const p = poster(st.bg); if (!p.complete) p.onload = stillSoon; }
        badge.complete ? stillSoon() : (badge.onload = stillSoon);
    }
    function hide() { if (run) run.stop(); }

    // ---------- MP4 صغير: H.264 + AAC، و moov بالأول («faststart») حتى ينفتح فورًا بإنستغرام وواتساب ----------
    // (نفس كاتب الملفات تبع فيديو التعريف بـ tools/video)
    const te = new TextEncoder();
    const cat = arrs => { let n = 0; for (const a of arrs) n += a.length; const o = new Uint8Array(n); let p = 0; for (const a of arrs) { o.set(a, p); p += a.length; } return o; };
    const U8 = x => (x instanceof Uint8Array ? x : Uint8Array.from(x));
    const u32 = n => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
    const u16 = n => [(n >>> 8) & 255, n & 255];
    const box = (type, ...parts) => { const body = cat(parts.map(U8)); return cat([U8(u32(8 + body.length)), te.encode(type), body]); };
    const fbox = (type, v, flags, ...parts) => box(type, [v, (flags >>> 16) & 255, (flags >>> 8) & 255, flags & 255], ...parts);
    const MATRIX = [...u32(0x10000), ...u32(0), ...u32(0), ...u32(0), ...u32(0x10000), ...u32(0), ...u32(0), ...u32(0), ...u32(0x40000000)];
    const desc = (tag, ...parts) => { const body = cat(parts.map(U8)); return cat([U8([tag, body.length]), body]); };
    function stbl(entry, samples, offsets, stssList) {
        const runs = []; samples.forEach(s => { const r = runs[runs.length - 1]; if (r && r[1] === s.dur) r[0]++; else runs.push([1, s.dur]); });
        const parts = [fbox('stsd', 0, 0, u32(1), entry), fbox('stts', 0, 0, u32(runs.length), ...runs.map(r => [...u32(r[0]), ...u32(r[1])]))];
        if (stssList) parts.push(fbox('stss', 0, 0, u32(stssList.length), ...stssList.map(n => u32(n))));
        parts.push(fbox('stsc', 0, 0, u32(1), u32(1), u32(1), u32(1)));
        parts.push(fbox('stsz', 0, 0, u32(0), u32(samples.length), ...samples.map(s => u32(s.data.length))));
        parts.push(fbox('stco', 0, 0, u32(offsets.length), ...offsets.map(o => u32(o))));
        return box('stbl', ...parts);
    }
    function moovBox({ vSamples, avcC, vTimescale, width, height, aSamples, asc, sampleRate, channels }, vOff, aOff) {
        const vDur = vSamples.reduce((s, x) => s + x.dur, 0), aDur = aSamples.reduce((s, x) => s + x.dur, 0);
        const vDurMs = Math.round(vDur / vTimescale * 1000), aDurMs = Math.round(aDur / sampleRate * 1000);
        const keys = vSamples.map((s, i) => (s.key ? i + 1 : 0)).filter(Boolean);
        const avc1 = box('avc1', new Uint8Array(6), u16(1), u16(0), u16(0), u32(0), u32(0), u32(0), u16(width), u16(height), u32(0x480000), u32(0x480000), u32(0), u16(1), new Uint8Array(32), u16(0x18), u16(0xffff), box('avcC', new Uint8Array(avcC)));
        const vTrak = box('trak',
            fbox('tkhd', 0, 3, u32(0), u32(0), u32(1), u32(0), u32(vDurMs), u32(0), u32(0), u16(0), u16(0), u16(0), u16(0), MATRIX, u32(width << 16), u32(height << 16)),
            box('mdia', fbox('mdhd', 0, 0, u32(0), u32(0), u32(vTimescale), u32(vDur), u16(0x55c4), u16(0)),
                fbox('hdlr', 0, 0, u32(0), te.encode('vide'), u32(0), u32(0), u32(0), te.encode('VideoHandler\0')),
                box('minf', fbox('vmhd', 0, 1, u16(0), u16(0), u16(0), u16(0)), box('dinf', fbox('dref', 0, 0, u32(1), fbox('url ', 0, 1))), stbl(avc1, vSamples, vOff, keys))));
        const esds = fbox('esds', 0, 0, desc(0x03, u16(2), [0], desc(0x04, [0x40, 0x15, 0, 0, 0], u32(128000), u32(128000), desc(0x05, new Uint8Array(asc))), desc(0x06, [0x02])));
        const mp4a = box('mp4a', new Uint8Array(6), u16(1), u32(0), u32(0), u16(channels), u16(16), u16(0), u16(0), u32(sampleRate * 65536 >>> 0), esds);
        const aTrak = box('trak',
            fbox('tkhd', 0, 3, u32(0), u32(0), u32(2), u32(0), u32(aDurMs), u32(0), u32(0), u16(0), u16(1), u16(0x100), u16(0), MATRIX, u32(0), u32(0)),
            box('mdia', fbox('mdhd', 0, 0, u32(0), u32(0), u32(sampleRate), u32(aDur), u16(0x55c4), u16(0)),
                fbox('hdlr', 0, 0, u32(0), te.encode('soun'), u32(0), u32(0), u32(0), te.encode('SoundHandler\0')),
                box('minf', fbox('smhd', 0, 0, u16(0), u16(0)), box('dinf', fbox('dref', 0, 0, u32(1), fbox('url ', 0, 1))), stbl(mp4a, aSamples, aOff, null))));
        const mvhd = fbox('mvhd', 0, 0, u32(0), u32(0), u32(1000), u32(Math.max(vDurMs, aDurMs)), u32(0x10000), u16(0x100), new Uint8Array(10), MATRIX, new Uint8Array(24), u32(3));
        return box('moov', mvhd, vTrak, ...(aSamples.length ? [aTrak] : []));
    }
    function muxMp4(opts) {
        const ftyp = box('ftyp', te.encode('isom'), u32(0x200), te.encode('isom'), te.encode('iso2'), te.encode('avc1'), te.encode('mp41'));
        const { vSamples, aSamples, vTimescale, sampleRate } = opts;
        // الصورة والصوت متداخلين بترتيب الوقت، حتى المشغّل يقرا الملف من أولو لآخرو
        const order = [...vSamples.map((s, i) => ({ s, kind: 'v', i, t: i * s.dur / vTimescale })), ...aSamples.map((s, i) => ({ s, kind: 'a', i, t: i * 1024 / sampleRate }))]
            .sort((a, b) => a.t - b.t || (a.kind === 'v' ? -1 : 1));
        const build = base => {
            const vOff = new Array(vSamples.length), aOff = new Array(aSamples.length); let pos = base;
            order.forEach(o => { (o.kind === 'v' ? vOff : aOff)[o.i] = pos; pos += o.s.data.length; });
            return moovBox(opts, vOff, aOff);
        };
        const probe = build(0), moov = build(ftyp.length + probe.length + 8);
        let n = 0; order.forEach(o => { n += o.s.data.length; });
        const mdat = new Uint8Array(8 + n); mdat.set(u32(8 + n), 0); mdat.set(te.encode('mdat'), 4);
        let p = 8; order.forEach(o => { mdat.set(o.s.data, p); p += o.s.data.length; });
        return cat([ftyp, moov, mdat]);
    }

    return { show, hide, isBusy: () => !!run };
})();
