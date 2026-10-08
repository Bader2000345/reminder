/* مُذكّر — يُطبّق الوضع الداكن قبل رسم الصفحة (يمنع الوميض الأبيض). يجب أن يبقى أول <body>. */

try { var __m = localStorage.getItem('mudhakkir-theme') || 'light'; if (__m === 'dark' || (__m === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches) || (__m === 'sun' && localStorage.getItem('mudhakkir-theme-dark') === '1')) document.body.classList.add('dark-mode'); } catch (e) {}
