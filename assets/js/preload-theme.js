/* مُذكّر — يُطبّق الوضع الداكن قبل رسم الصفحة (يمنع الوميض الأبيض). يجب أن يبقى أول <body>. */

// ألوان الوقت من أول لحظة: الفترة الثابتة إن اختارها المستخدم بالإعدادات، وإلا آخر فترة معروفة، ثم يحدّثها atmosphere.js
try { var __p = localStorage.getItem('mudhakkir-daytime-pref'), __dt = /^(dawn|day|afternoon|sunset|night)$/.test(__p || '') ? __p : localStorage.getItem('mudhakkir-daytime'); if (__dt) document.documentElement.dataset.daytime = __dt; } catch (e) {}
// حجم خط التطبيق وحجم خط الآية (prefs.js) من أول لحظة
try { var __f = localStorage.getItem('mudhakkir-text-size'); if (/^(sm|lg|xl)$/.test(__f || '')) document.documentElement.dataset.font = __f; var __v = Number(localStorage.getItem('mudhakkir-verse-scale')); if (__v >= .8 && __v <= 1.6) document.documentElement.style.setProperty('--verse-scale', String(__v)); } catch (e) {}
// المؤثرات (الإصدار ١٥): «خفيفة» = بلا حركات دائمة ولا زجاج مغبّش. التلقائي: خفيفة على الجوال والأجهزة الضعيفة، وكاملة على الكمبيوتر
try { var __x = localStorage.getItem('mudhakkir-effects'), __c = navigator.connection || {}; if (__x === 'lite' || (__x !== 'full' && (matchMedia('(pointer: coarse)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches || (navigator.hardwareConcurrency || 8) <= 4 || __c.saveData))) document.documentElement.classList.add('fx-lite'); } catch (e) {}
try { var __m = localStorage.getItem('mudhakkir-theme') || 'light'; if (__m === 'dark' || (__m === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches) || (__m === 'sun' && localStorage.getItem('mudhakkir-theme-dark') === '1')) document.body.classList.add('dark-mode'); } catch (e) {}
