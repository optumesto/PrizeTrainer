// RdyDeck guide pages: up to two ad spots, at breaks between sections (v52):
// after the opening section, and before the last section. Never two in view.
// Nothing shows or loads until the publisher id and a slot are set. Never in the Play app,
// never offline. Uses the age group saved by the app on this device; with no
// answer, the ad is requested as child-directed, like in the app.
(function () {
  var RD_ADS = {
    client: 'ca-pub-XXXXXXXXXXXXXXXX',  // AdSense publisher id, same as PT_ADS.client in index.html
    slot: '',                            // ad unit id for the first guide spot (fixed size display unit)
    slot2: ''                            // ad unit id for the second guide spot (can be the same id)
  };
  if (!/^ca-pub-\d{10,20}$/.test(RD_ADS.client) || !(RD_ADS.slot || RD_ADS.slot2)) return;
  if (navigator.onLine === false) return;
  var age = '';
  try {
    var play = new URLSearchParams(location.search).get('src') === 'play' ||
      String(document.referrer || '').indexOf('android-app://com.rdydeck.app') === 0 ||
      sessionStorage.getItem('pt_channel') === 'play';
    if (play) { sessionStorage.setItem('pt_channel', 'play'); return; }
    age = localStorage.getItem('pt_age_v32') || '';
  } catch (e) {}
  // adult: no tag. 13 to 17: teen (2). Under 13, skipped or never asked: child (1).
  var tag = age === 'adult' ? '' : age === 'teen' ? '2' : '1';
  var hs = document.querySelectorAll('main h2');
  if (hs.length < 2) return;
  // Phones: a 320 by 100 banner. Computers: as wide as the text column (up to 728),
  // 90 tall, so it fills the row. The guide ad units must be responsive display units.
  var cw = Math.floor(hs[0].parentNode.clientWidth || 320);
  var wide = window.innerWidth >= 768 && cw >= 468;
  var w = wide ? Math.min(728, cw) : Math.min(320, cw), ht = wide ? 90 : 100;
  if (w < 234) return;
  var st = document.createElement('style');
  st.textContent = '.ad47{margin:2.2rem 0 0;box-sizing:border-box;padding:6px 0 12px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);text-align:center;overflow:hidden;contain:layout paint}' +
    '.ad47-lbl{margin:0 auto;text-align:left;font-size:0.6875rem;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-3);height:20px;line-height:20px}' +
    '.ad47 ins{overflow:hidden;text-decoration:none}';
  document.head.appendChild(st);
  var made = 0, tops = [];
  function place(h, slot) {
    if (!h || !slot) return;
    var y = h.getBoundingClientRect().top + window.scrollY;
    for (var i = 0; i < tops.length; i++) if (Math.abs(tops[i] - y) < window.innerHeight) return;
    var box = document.createElement('div');
    box.className = 'ad47';
    box.style.height = (ht + 38) + 'px';
    box.innerHTML = '<div class="ad47-lbl" style="max-width:' + w + 'px">Advertisement</div><ins class="adsbygoogle" style="display:inline-block;width:' + w + 'px;height:' + ht + 'px"></ins>';
    var ins = box.querySelector('ins');
    ins.setAttribute('data-ad-client', RD_ADS.client);
    ins.setAttribute('data-ad-slot', slot);
    if (tag) ins.setAttribute('data-tag-for-age-treatment', tag);
    h.parentNode.insertBefore(box, h);
    tops.push(box.getBoundingClientRect().top + window.scrollY);
    made++;
  }
  place(hs[1], RD_ADS.slot);                    // after the opening section
  if (hs.length > 3) place(hs[hs.length - 2], RD_ADS.slot2); // before the last section
  if (!made) return;
  var s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(RD_ADS.client);
  document.head.appendChild(s);
  for (var k = 0; k < made; k++) { try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {} }
})();
