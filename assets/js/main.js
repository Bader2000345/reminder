/* =====================================================================
 * مُذكّر — main.js
 * التشغيل: اختصارات لوحة المفاتيح، ثم تشغيل كل الأجزاء بالترتيب. (يجب أن يبقى آخر ملف)
 * يُحمَّل بالترتيب من index.html؛ الأجزاء تتشارك المتغيرات العامة فيما بينها.
 * ===================================================================== */

// إغلاق النوافذ بمفتاح Escape
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const openModal = [...document.querySelectorAll('.modal.open')].pop();
    if (openModal) setModalState(openModal, false);
    else if (document.getElementById('wird-focus')?.classList.contains('open')) document.getElementById('wird-focus-close').click();
});

// بطاقات الأقسام قابلة للتفعيل بلوحة المفاتيح
document.querySelectorAll('[data-adhkar-group]').forEach(card => {
    card.setAttribute('role', 'button');
    card.tabIndex = 0;
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); } });
});

// التشغيل المبدئي
renderGeneralAdhkar();
updateNavPill(true);
document.fonts?.ready.then(() => updateNavPill(true));
AdhkarViewer.init();
GeneralReminder.init();
Reminders.init();
syncNotifications();
TimeContext.init();
UserName.init();
FridayReminder.init();
Motion.init();
UpdateNotice.init();
Install.init();
Wird.init();
Atmosphere.init();
FX.init();
FocusTools.init();
Reader.setAdvanceHook(Wird.onReaderAdvance);
Share.init();
Assistant.init();
