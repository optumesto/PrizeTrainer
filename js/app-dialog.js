// ═══════════ 3.2.7: in-app dialogs ═══════════
// Questions like "Quit this game?" used the browser's own confirm box, which says "rdydeck.com says",
// looks nothing like the app and can stay in English. rdConfirm asks the same question in a dialog of
// the app's own, in the player's language, and resolves true for yes and false for no.
//   rdConfirm({ title, text, yes, no, danger })  ->  Promise<boolean>
// Cancel, the Escape key, Back on Android and a tap outside all answer no. While it is open, no other
// key reaches the page, so a prize game's shortcuts never fire behind it. Nothing here changes a grade.

let _rdDlg = null;   // { resolve, back } while a dialog is open

function rdDlgT(s) {
  try { return typeof rdI18n !== 'undefined' && rdI18n.t ? rdI18n.t(s) : s; } catch (_) { return s; }
}

function rdDlgClose(answer) {
  const ov = document.getElementById('rd-dlg');
  if (!_rdDlg) return;
  const d = _rdDlg;
  _rdDlg = null;
  if (ov) ov.classList.remove('active');
  try { if (d.back && d.back.isConnected) d.back.focus({ preventScroll: true }); } catch (_) {}
  d.resolve(!!answer);
}

function rdConfirm(o) {
  o = o || {};
  const ov = document.getElementById('rd-dlg');
  if (!ov) return Promise.resolve(false);
  if (_rdDlg) rdDlgClose(false);   // a new question replaces one left open
  const $ = id => document.getElementById(id);
  $('rd-dlg-t').textContent = rdDlgT(o.title || '');
  const m = $('rd-dlg-m');
  m.textContent = o.text ? rdDlgT(o.text) : '';
  m.hidden = !o.text;
  const yes = $('rd-dlg-yes'), no = $('rd-dlg-no');
  yes.textContent = rdDlgT(o.yes || 'OK');
  no.textContent = rdDlgT(o.no || 'Cancel');
  yes.className = 'btn ' + (o.danger ? 'btn-danger rd-dlg-danger' : 'btn-primary');
  return new Promise(resolve => {
    _rdDlg = { resolve, back: document.activeElement };
    ov.classList.add('active');
    // A step that cannot be undone starts on Cancel, so a stray Enter never deletes anything.
    (o.danger ? no : yes).focus({ preventScroll: true });
  });
}

(function () {
  const ov = document.getElementById('rd-dlg');
  if (!ov) return;
  document.getElementById('rd-dlg-yes').addEventListener('click', () => rdDlgClose(true));
  document.getElementById('rd-dlg-no').addEventListener('click', () => rdDlgClose(false));
  ov.addEventListener('click', e => { if (e.target === ov) rdDlgClose(false); });
  // Back on Android and Escape close the top dialog through the app's own list (core.js, _v26Close).
  if (typeof _v26Close === 'object' && _v26Close) _v26Close['rd-dlg'] = () => rdDlgClose(false);
  // Keys: Escape says no, Tab stays inside, and nothing else reaches the page behind.
  window.addEventListener('keydown', e => {
    if (!_rdDlg) return;
    const yes = document.getElementById('rd-dlg-yes'), no = document.getElementById('rd-dlg-no');
    if (e.key === 'Escape') { e.preventDefault(); rdDlgClose(false); }
    else if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === yes ? no : yes).focus(); }
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (document.activeElement === yes) rdDlgClose(true);
      else if (document.activeElement === no) rdDlgClose(false);
    }
    e.stopImmediatePropagation();
  }, true);
})();
