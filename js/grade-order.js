/*
 * 3.5.5: one order for the Grade tab (Muse layout brief, Mason 24 Nov 2026).
 * Many parts of the app add their section to the Grade tab on their own, some after a fetch, so the order on
 * screen used to depend on which one finished first. This puts the sections in one fixed order every time:
 * what to do first (Fix first, Upgrades, Watch out for), then how the grade was worked out, then the detail,
 * and the share buttons at the end. A section that is not in the list stays where it was drawn.
 */
const GO37_ORDER = ['g29-fix', 'up75-sec', 'wo83-sec', 'go37-proof', 'atk62-sec', 'gh72-sec', 'r29-sec',
  'g79-sec', 'mu60-sec', 'g29-good', 'g29-syn', 't68-sec', 'go37-share'];

function go37Order() {
  const root = document.getElementById('grade-body');
  if (!root) return;
  const els = GO37_ORDER.map(id => document.getElementById(id)).filter(el => el && el.parentNode === root);
  for (let i = 1; i < els.length; i++) {
    // Move only what is out of place, so a section that is already right is never touched.
    const prev = els[i - 1], el = els[i];
    if (prev.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING) prev.after(el);
  }
  // The share buttons follow Trainers, or the last section in the list if there is no Trainers section.
  const share = document.getElementById('go37-share');
  if (share && share.parentNode === root && els.length > 1) {
    const last = els.filter(el => el !== share).pop();
    if (last && last.nextElementSibling !== share) last.after(share);
  }
}

(function () {
  if (typeof document === 'undefined') return;
  let queued = false;
  const run = () => { queued = false; try { go37Order(); } catch (_) {} };
  const start = () => {
    const root = document.getElementById('grade-body');
    if (!root) return;
    // Only direct children matter, so a section opening or a select changing never sets this off.
    new MutationObserver(() => { if (!queued) { queued = true; Promise.resolve().then(run); } }).observe(root, { childList: true });
    run();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
