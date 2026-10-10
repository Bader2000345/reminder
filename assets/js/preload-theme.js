/* مُذكّر — يُطبّق الوضع الداكن قبل رسم الصفحة (يمنع الوميض الأبيض). يجب أن يبقى أول <body>. */

// آخر «فترة يوم» معروفة (فجر/نهار/…) لتظهر ألوان الوقت من أول لحظة، ثم يحدّثها atmosphere.js
try { var __dt = localStorage.getItem('mudhakkir-daytime'); if (__dt) document.documentElement.dataset.daytime = __dt; } catch (e) {}
try { var __m = localStorage.getItem('mudhakkir-theme') || 'light'; if (__m === 'dark' || (__m === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches) || (__m === 'sun' && localStorage.getItem('mudhakkir-theme-dark') === '1')) document.body.classList.add('dark-mode'); } catch (e) {}
