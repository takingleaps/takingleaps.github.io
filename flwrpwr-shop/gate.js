/* FLWRPWR coming soon screen. Replaces the old gate (Nov 10):
   no password anymore. The public face is a dynamic Coming Soon page
   (drifting daisy field, floating daisies, sparkles, big logo, Notify Me).
   "Preview the shop" dismisses it for the team; the dismissal is
   remembered per device so the team only taps once. Add ?coming-soon to
   the URL to see the Coming Soon screen again.
   The Notify Me email is saved on-device (localStorage, the same
   client-side approach as the shop basket). There is no backend here;
   the list lives on the visitor's device until the team wires it up.
   Scroll: the overlay scrolls itself (overflow-y:auto). Dismissing it
   removes it from the DOM and clears any stuck scroll lock, so the
   shop behind it scrolls normally. */
(function(){
  "use strict";
  var KEY = "flwrpwr-preview";
  var LIST_KEY = "flwrpwr_notify_v1";
  var overlay = document.getElementById("flwrGate");
  if (!overlay) return;

  function clearLocks(){
    document.body.classList.remove("shop-locked");
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  }
  function removeOverlay(){
    clearLocks();
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }

  /* remembered preview: skip the Coming Soon screen, unless ?coming-soon is in the URL */
  var forceSoon = /[?&]coming-soon\b/.test(location.search);
  try {
    if (!forceSoon && localStorage.getItem(KEY) === "1"){ removeOverlay(); return; }
  } catch (e) {}

  /* fill any daisy SVGs in the overlay that the page's own filler missed */
  function daisySVG(petal){
    var petals = "", i, a;
    for (i = 0; i < 8; i++){ a = i * 45;
      petals += '<ellipse cx="50" cy="26" rx="11" ry="20" fill="' + petal + '" transform="rotate(' + a + ' 50 50)"/>';
    }
    return petals + '<circle cx="50" cy="50" r="13" fill="#556B3F"/><circle cx="46" cy="47" r="2.4" fill="#A7B995"/><circle cx="54" cy="52" r="2" fill="#A7B995"/><circle cx="51" cy="44" r="1.6" fill="#A7B995"/>';
  }
  overlay.querySelectorAll("[data-daisy]").forEach(function(el){
    if (!el.innerHTML) el.innerHTML = daisySVG(el.getAttribute("data-c") || "#ffffff");
  });

  /* notify me: same email check as the shop Join form; save on-device */
  var form = document.getElementById("flwrSoonForm");
  var input = document.getElementById("flwrSoonEmail");
  var done = document.getElementById("flwrSoonDone");
  var err = document.getElementById("flwrSoonErr");
  if (form && input){
    form.addEventListener("submit", function(ev){
      ev.preventDefault();
      var v = (input.value || "").trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)){
        if (err) err.hidden = false;
        if (done) done.hidden = true;
        input.focus(); input.select();
        if (overlay.animate) overlay.animate(
          [{ transform:"translateX(0)" }, { transform:"translateX(-8px)" }, { transform:"translateX(8px)" }, { transform:"translateX(0)" }],
          { duration:300 }
        );
        return;
      }
      try {
        var list = [];
        try { list = JSON.parse(localStorage.getItem(LIST_KEY) || "[]") || []; } catch (e2) { list = []; }
        if (list.indexOf(v) === -1) list.push(v);
        localStorage.setItem(LIST_KEY, JSON.stringify(list));
      } catch (e) {}
      if (err) err.hidden = true;
      if (done) done.hidden = false;
      form.hidden = true;
    });
  }

  /* preview the shop: discreet team link, dismisses the overlay */
  var preview = document.getElementById("flwrSoonPreview");
  if (preview){
    preview.addEventListener("click", function(ev){
      ev.preventDefault();
      try { localStorage.setItem(KEY, "1"); } catch (e) {}
      removeOverlay();
    });
  }

  /* live countdown: ticks every second to the San Diego launch event, Thu Nov 12, 2026 (midnight PT = event day) */
  var cdTimer = null;
  function cdTick(){
    if (!overlay.parentNode){ if (cdTimer) clearInterval(cdTimer); return; }
    var d = overlay.querySelector("[data-cd-d]"), h = overlay.querySelector("[data-cd-h]"),
        m = overlay.querySelector("[data-cd-m]"), s = overlay.querySelector("[data-cd-s]"),
        note = overlay.querySelector("[data-cd-note]");
    if (!d || !h || !m || !s) return;
    var target = new Date("2026-11-12T00:00:00-08:00").getTime();
    function pad(n){ return (n < 10 ? "0" : "") + n; }
    var diff = target - Date.now();
    if (diff <= 0){
      d.textContent = "0"; h.textContent = "00"; m.textContent = "00"; s.textContent = "00";
      if (note) note.textContent = "the San Diego launch event is here \u2713 see you there";
      if (cdTimer) clearInterval(cdTimer);
      return;
    }
    var secs = Math.floor(diff / 1000);
    d.textContent = Math.floor(secs / 86400);
    h.textContent = pad(Math.floor(secs % 86400 / 3600));
    m.textContent = pad(Math.floor(secs % 3600 / 60));
    s.textContent = pad(secs % 60);
  }
  cdTick();
  cdTimer = setInterval(cdTick, 1000);
})();
