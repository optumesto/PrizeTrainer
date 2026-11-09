// RdyDeck guide pages: one ad spot, before the page's third heading.
// Nothing shows or loads until both fill-ins are set. Never in the Play app,
// never offline. Uses the age group saved by the app on this device; with no
// answer, the ad is requested as child-directed, like in the app.
(function () {
  var RD_ADS = {
    client: 'ca-pub-XXXXXXXXXXXXXXXX',  // AdSense publisher id, same as PT_ADS.client in index.html
    slot: ''                             // ad unit id for the guide spot (fixed size display unit)
  };
  if (!/^ca-pub-\d{10,20}$/.test(RD_ADS.client) || !RD_ADS.slot) return;
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
  var h = document.querySelectorAll('main h2')[2];
  if (!h) return;
  var w = Math.min(320, Math.floor(h.parentNode.clientWidth || 320));
  if (w < 234) return;
  var st = document.createElement('style');
  st.textContent = '.ad47{margin:2.2rem 0 0;height:138px;box-sizing:border-box;padding:6px 0 12px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);text-align:center;overflow:hidden;contain:layout paint}' +
    '.ad47-lbl{max-width:320px;margin:0 auto;text-align:left;font-size:0.6875rem;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-3);height:20px;line-height:20px}' +
    '.ad47 ins{overflow:hidden;text-decoration:none}';
  document.head.appendChild(st);
  var box = document.createElement('div');
  box.className = 'ad47';
  box.innerHTML = '<div class="ad47-lbl">Ad</div><ins class="adsbygoogle" style="display:inline-block;width:' + w + 'px;height:100px"></ins>';
  var ins = box.querySelector('ins');
  ins.setAttribute('data-ad-client', RD_ADS.client);
  ins.setAttribute('data-ad-slot', RD_ADS.slot);
  if (tag) ins.setAttribute('data-tag-for-age-treatment', tag);
  h.parentNode.insertBefore(box, h);
  var s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(RD_ADS.client);
  document.head.appendChild(s);
  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
})();
