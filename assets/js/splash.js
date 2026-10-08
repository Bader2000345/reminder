/* مُذكّر — شاشة البداية بالشعار: تظهر مرة واحدة في كل جلسة ثم تُزال. */

try { var __s = document.getElementById('splash'); if (sessionStorage.getItem('mdk-splash')) __s.remove(); else { sessionStorage.setItem('mdk-splash', '1'); __s.addEventListener('animationend', function (e) { if (e.animationName === 'splashOut') __s.remove(); }); } } catch (e) {}
