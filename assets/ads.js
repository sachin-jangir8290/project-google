// ===== Google AdSense setup =====
// 1. AdSense approve hone ke baad apna publisher ID yahan daalo, jaise 'ca-pub-1234567890123456'
// 2. AdSense > Ads > By ad unit se ad units bana kar unke slot ID niche daalo
const ADSENSE_CLIENT = '';
const AD_SLOTS = { top: '', middle: '', tool: '' };

(function () {
  const slots = document.querySelectorAll('.ad[data-slot]');
  if (!ADSENSE_CLIENT) { slots.forEach(s => s.hidden = true); return; }
  const s = document.createElement('script');
  s.async = true; s.crossOrigin = 'anonymous';
  s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ADSENSE_CLIENT;
  document.head.append(s);
  slots.forEach(el => {
    const id = AD_SLOTS[el.dataset.slot];
    el.innerHTML = '<span class="adl">Advertisement</span><ins class="adsbygoogle" style="display:block" data-ad-client="' + ADSENSE_CLIENT + '"' +
      (id ? ' data-ad-slot="' + id + '"' : '') + ' data-ad-format="auto" data-full-width-responsive="true"></ins>';
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  });
})();
