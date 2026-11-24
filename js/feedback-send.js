// 3.3.x: Send feedback sends the message itself, through rdydeck.com (POST /api/feedback, which
// emails it to us), instead of only opening the player's email app. A mail link did nothing on a
// computer or tablet with no email app set up, and the sheet closed with the message lost.
// Now the player always sees what happened: "Sending", then "Thanks, it's sent", or a plain reason
// it did not send with the message kept, plus two ways out: Send by email (a real link the player
// taps, the old mail app route) and Copy message. The form asks for nothing new: no name, no
// email address. Off rdydeck.com (the one-file download, the github.io copy) there is no server,
// so the form goes straight to those two ways out.
(function () {
  if (typeof openFeedback !== 'function' || typeof FEEDBACK_EMAIL !== 'string' || !FEEDBACK_EMAIL) return;

  const FB_URL = '/api/feedback';
  const canPost = () => location.protocol === 'https:' && location.hostname === 'rdydeck.com';
  const fbDeck = () => (state.decks || []).find(d => d.id === state.activeDeckId) || (state.decks || [])[0];
  const fbLang = () => { try { return (typeof rdI18n === 'object' && rdI18n && rdI18n.lang) || 'en'; } catch (_) { return 'en'; } };
  let fbBusy = false;

  openFeedback = function () {
    fbKind = 'Bug';
    fbBusy = false;
    const deck = fbDeck();
    openSheet(`<div class="modal-title">Send Feedback</div>
      <div class="modal-hint" style="margin-bottom:0.9rem">This sends your message straight to us. Please leave out your name and contact details. Under 13? Ask a parent to send it.</div>
      <div class="field-label">What is it about?</div>
      <div class="seg fb-seg" role="group" aria-label="Feedback type">
        ${['Bug', 'Missing Card', 'Idea'].map(k => `<button class="mode-opt${k === fbKind ? ' active' : ''}" data-k="${k}" onclick="setFbKind(this)">${k}</button>`).join('')}
      </div>
      <div class="mb" style="margin-top:0.9rem">
        <label for="fb-text">Tell us what happened</label>
        <textarea id="fb-text" maxlength="1500" placeholder="For a missing card, include its name, set code and number."></textarea>
      </div>
      ${deck ? `<label class="fb-check"><input type="checkbox" id="fb-deck"> <span>Include my list for <b>${esc(deck.name)}</b></span></label>` : ''}
      <input type="text" id="fb-website" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">
      <div class="fb-status" id="fb-status" role="status" aria-live="polite" style="margin-top:0.6rem;font-size:var(--fs-sm);min-height:1.2em"></div>
      <div class="fb-ways" id="fb-ways" style="display:none;gap:0.5rem;flex-wrap:wrap;margin-top:0.5rem">
        <a class="btn" id="fb-mail" href="#">Send by email</a>
        <button class="btn" type="button" id="fb-copy" onclick="fbCopy()">Copy message</button>
      </div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeSheet()">Cancel</button><button class="btn btn-primary" id="fb-send" onclick="sendFeedback()">Send</button></div>
      <div class="modal-hint" style="margin-top:0.6rem">Or write to ${esc(FEEDBACK_EMAIL)}</div>`);
    if (!canPost()) fbFail('Send it by email, or copy it and write to us.');
  };

  function fbParts() {
    const t = document.getElementById('fb-text');
    const inc = document.getElementById('fb-deck');
    const deck = inc && inc.checked ? fbDeck() : null;
    const ua = navigator.userAgent;
    let list = deck ? deckListText(deck.cards || []) : '';
    if (list.length > 900) list = list.slice(0, 900) + '\n(cut short)';
    return {
      deck,
      body: {
        kind: fbKind,
        text: v24Clean(t ? t.value : '', 1500).trim(),
        deck: deck ? v24Clean(list, 1000) : '',
        deckName: deck ? v24Clean(deck.name, 80) : '',
        v: PT_VERSION,
        build: PT_BUILD,
        screen: ((document.querySelector('.screen.active') || {}).id || '').replace('screen-', ''),
        device: /iPhone|iPad|iPod/.test(ua) ? 'iPhone or iPad' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Other',
        width: Math.round(innerWidth) || 0,
        play: !!(typeof PT_PLAY !== 'undefined' && PT_PLAY),
        lang: fbLang(),
        website: (document.getElementById('fb-website') || {}).value || '',
      },
    };
  }

  function fbSay(msg, tone) {
    const s = document.getElementById('fb-status');
    if (!s) return;
    s.textContent = msg;
    s.style.color = tone === 'bad' ? 'var(--danger)' : tone === 'good' ? 'var(--success)' : 'var(--text-2)';
  }

  /** It did not send: say why, keep the message, and show the two other ways. */
  function fbFail(msg) {
    fbSay(msg, 'bad');
    const p = fbParts();
    const mail = document.getElementById('fb-mail');
    if (mail) mail.href = feedbackUrl(fbKind, p.body.text, p.deck);
    const ways = document.getElementById('fb-ways');
    if (ways) ways.style.display = 'flex';
    const b = document.getElementById('fb-send');
    if (b) { b.disabled = false; b.textContent = 'Try again'; }
    fbBusy = false;
  }

  // The mail link always carries the latest text, also when it is edited after a failure.
  document.addEventListener('input', e => {
    if (!e.target || (e.target.id !== 'fb-text' && e.target.id !== 'fb-deck')) return;
    const mail = document.getElementById('fb-mail');
    if (mail && document.getElementById('fb-ways').style.display !== 'none') { const p = fbParts(); mail.href = feedbackUrl(fbKind, p.body.text, p.deck); }
  });
  document.addEventListener('change', e => { if (e.target && e.target.id === 'fb-deck') e.target.dispatchEvent(new Event('input', { bubbles: true })); });

  sendFeedback = async function () {
    if (fbBusy) return;
    const p = fbParts();
    if (!p.body.text) { fbSay('Write a few words first.', 'bad'); const t = document.getElementById('fb-text'); if (t) t.focus(); return; }
    if (!canPost()) { fbFail('Send it by email, or copy it and write to us.'); return; }
    if (navigator.onLine === false) { fbFail("You're offline. Try again when you're connected, or send it by email."); return; }
    fbBusy = true;
    const b = document.getElementById('fb-send');
    if (b) { b.disabled = true; b.textContent = 'Sending'; }
    fbSay('Sending', '');
    let r = null;
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), 15000) : 0;
    try {
      r = await fetch(FB_URL, {
        method: 'POST', body: JSON.stringify(p.body), credentials: 'omit', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, signal: ctl ? ctl.signal : undefined,
      });
    } catch (_) { r = null; }
    clearTimeout(timer);
    let j = null;
    try { j = r ? await r.json() : null; } catch (_) {}
    if (r && r.ok && j && j.ok) {
      fbBusy = false;
      openSheet(`<div class="modal-title">Thanks, it's sent</div>
        <div class="modal-hint">We read every message.</div>
        <div class="modal-actions"><button class="btn btn-primary" onclick="closeSheet()">Close</button></div>`);
      return;
    }
    if (r && r.status === 429) fbFail('Too many messages right now. Wait a minute and try again, or send it by email.');
    else if (!r && navigator.onLine === false) fbFail("You're offline. Try again when you're connected, or send it by email.");
    else fbFail("It didn't send. Try again, or send it by email.");
  };

  window.fbCopy = async function () {
    const p = fbParts();
    const text = decodeURIComponent((feedbackUrl(fbKind, p.body.text, p.deck).split('&body=')[1] || ''));
    const all = `To: ${FEEDBACK_EMAIL}\n\n${text}`;
    let ok = false;
    try { await navigator.clipboard.writeText(all); ok = true; } catch (_) {
      try {
        const ta = document.createElement('textarea');
        ta.value = all; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove();
      } catch (_) {}
    }
    showToast(ok ? `Copied. Paste it into an email to ${FEEDBACK_EMAIL}.` : `Could not copy. Write to ${FEEDBACK_EMAIL}.`);
  };
})();
