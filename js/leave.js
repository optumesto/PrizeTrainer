// 3.2.8: a short notice before a link opens another site, so a tap never takes a player out of
// RdyDeck without saying so. One handler for the app and for the site's own pages: a plain tap on
// any http or https link to another site asks first ("Opening limitlesstcg.com in your browser",
// Continue or Cancel). Email links, links within rdydeck.com and taps with a modifier key (a new
// tab on purpose) go straight through. The app uses its own dialog (js/app-dialog.js); the site's
// pages, which do not load it, get a small one built here. Nothing here changes a grade.
(function () {
  if (window.rdLeaveOn) return;
  window.rdLeaveOn = true;

  var T = {
    en: ['Opening {d} in your browser', 'This link leaves RdyDeck.', 'Continue', 'Cancel'],
    es: ['Abriendo {d} en tu navegador', 'Este enlace te lleva fuera de RdyDeck.', 'Continuar', 'Cancelar'],
    pt: ['Abrindo {d} no seu navegador', 'Este link leva você para fora do RdyDeck.', 'Continuar', 'Cancelar'],
    de: ['{d} wird in deinem Browser geöffnet', 'Dieser Link führt dich aus RdyDeck hinaus.', 'Weiter', 'Abbrechen'],
    fr: ['Ouverture de {d} dans votre navigateur', 'Ce lien vous fait quitter RdyDeck.', 'Continuer', 'Annuler'],
    it: ['Apertura di {d} nel tuo browser', 'Questo link ti porta fuori da RdyDeck.', 'Continua', 'Annulla']
  };

  function lang() {
    try { if (typeof rdI18n === 'object' && rdI18n && T[rdI18n.lang]) return rdI18n.lang; } catch (e) {}
    try { var s = localStorage.getItem('rd_lang'); if (s && T[s]) return s; } catch (e) {}
    return 'en';
  }

  /** The other site a link goes to, as a URL, or null for a link that stays here or is not web. */
  function away(a) {
    var u;
    try { u = new URL(a.getAttribute('href'), location.href); } catch (e) { return null; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    var h = u.hostname.toLowerCase();
    if (h === location.hostname.toLowerCase() || h === 'rdydeck.com' || /\.rdydeck\.com$/.test(h)) return null;
    return u;
  }

  // The site's pages: a small dialog of their own, light or dark like the page.
  var box = null, done = null;
  function close(ok) {
    if (!box) return;
    var f = done; done = null;
    box.parentNode && box.parentNode.removeChild(box);
    box = null;
    if (f) f(ok);
  }
  function ask(t) {
    return new Promise(function (resolve) {
      close(false);
      var light = document.documentElement.dataset.theme === 'light' || (document.body && document.body.dataset.theme === 'light');
      var bg = light ? '#faf8f3' : '#1a1917', fg = light ? '#1a1914' : '#ede8de', sub = light ? '#4a453d' : '#bdb6a9', line = light ? 'rgba(26,24,20,0.24)' : 'rgba(237,232,222,0.22)';
      box = document.createElement('div');
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-labelledby', 'rd-leave-t');
      box.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(8,7,6,0.6);';
      var card = document.createElement('div');
      card.style.cssText = 'width:100%;max-width:400px;box-sizing:border-box;padding:20px;border-radius:8px;background:' + bg + ';color:' + fg + ';border:1px solid ' + line + ';font:16px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;';
      var h = document.createElement('div');
      h.id = 'rd-leave-t';
      h.style.cssText = 'font-weight:700;font-size:17px;overflow-wrap:anywhere;';
      h.textContent = t[0];
      var p = document.createElement('p');
      p.style.cssText = 'margin:8px 0 0;color:' + sub + ';';
      p.textContent = t[1];
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end;margin-top:18px;';
      var btn = function (label, primary) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.style.cssText = 'min-height:48px;min-width:96px;padding:0 16px;border-radius:6px;font:inherit;font-weight:600;cursor:pointer;' +
          (primary ? 'background:' + fg + ';color:' + bg + ';border:1px solid ' + fg + ';' : 'background:transparent;color:' + fg + ';border:1px solid ' + line + ';');
        return b;
      };
      var no = btn(t[3], false), yes = btn(t[2], true);
      no.addEventListener('click', function () { close(false); });
      yes.addEventListener('click', function () { close(true); });
      box.addEventListener('click', function (e) { if (e.target === box) close(false); });
      box.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.preventDefault(); close(false); }
        else if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === yes ? no : yes).focus(); }
      });
      row.appendChild(no); row.appendChild(yes);
      card.appendChild(h); card.appendChild(p); card.appendChild(row);
      box.appendChild(card);
      done = resolve;
      document.body.appendChild(box);
      yes.focus();
    });
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || a.hasAttribute('download') || a.hasAttribute('data-no-leave')) return;
    var u = away(a);
    if (!u) return;
    e.preventDefault();
    var t = T[lang()].slice(), d = u.hostname.replace(/^www\./i, '');
    t[0] = t[0].replace('{d}', d);
    var newTab = String(a.getAttribute('target') || '').toLowerCase() === '_blank', href = u.href;
    var q = typeof rdConfirm === 'function' && document.getElementById('rd-dlg')
      ? rdConfirm({ title: t[0], text: t[1], yes: t[2], no: t[3] }) : ask(t);
    q.then(function (ok) {
      if (!ok) return;
      if (newTab) { var w = window.open(href, '_blank', 'noopener'); if (!w) location.href = href; return; }
      // 3.6.6: on the app's pages, the dialog takes a Back step of its own while it is open, and gives it back
      // (history.back, js/v38-settings-home.js) just after it closes. That step back cancelled the trip to the
      // other site, so Continue seemed to do nothing (the Google Play link on the home page). Go once the step
      // back is done, or after a moment when there was none.
      var gone = false;
      var go = function () { if (gone) return; gone = true; removeEventListener('popstate', go); location.href = href; };
      if (history.state && history.state.rd38) { addEventListener('popstate', go); setTimeout(go, 600); }
      else setTimeout(go, 50);
    });
  }, true);   // capture, so a row that stops its click from bubbling cannot skip the notice
})();
