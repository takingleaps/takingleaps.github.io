/* FLWRPWR coming soon screen. Hard gate (Nov 10, Nathan-only Nov 10):
   no password, no preview. The public face is a dynamic Coming Soon page
   (drifting daisy field, floating daisies, sparkles, big logo, Notify Me).
   There is NO public way past it: no Preview link, no dismiss. Visitors
   cannot reach the shop behind the overlay.
   Nathan only: the shop opens only in a browser signed in to admin.html
   as nathanltwong@gmail.com. The old ?preview URL bypass is gone.
   Add ?coming-soon to the URL to force the Coming Soon screen back
   (even for Nathan).
   The Notify Me email is saved on-device (localStorage, the same
   client-side approach as the shop basket). There is no backend here;
   the list lives on the visitor's device until the team wires it up.
   Scroll: the overlay scrolls itself (overflow-y:auto). */
(function(){
  "use strict";
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

  /* Nathan only: the shop opens only when this browser holds a Supabase
     session for nathanltwong@gmail.com (set by signing in on admin.html).
     We read the stored session directly so the check is instant and needs
     no extra script. Anyone else, even with the old ?preview link, gets
     the Coming Soon screen. */
  function nathanSignedIn(){
    try {
      for (var i = 0; i < localStorage.length; i++){
        var k = localStorage.key(i);
        if (!/^sb-.*-auth-token$/.test(k)) continue;
        var s = JSON.parse(localStorage.getItem(k) || "null");
        if (s && s.user && s.user.email === "nathanltwong@gmail.com" && s.access_token) return true;
      }
    } catch (e) {}
    return false;
  }

  /* hard gate: the Coming Soon screen always shows, unless this browser is
     signed in as Nathan. Clear any old remembered preview so past
     visitors get the gate back. */
  /* live countdown: ticks every second to the San Diego launch event, Thu Nov 12, 2026 (midnight PT = event day).
     It updates every [data-cd-*] on the page (the Coming Soon overlay AND the shop hero countdown),
     and keeps ticking after the overlay is removed. It only stops when the launch time is reached,
     or when the page has no countdown on it at all. */
  var cdTimer = null;
  function cdTick(){
    var ds = document.querySelectorAll("[data-cd-d]"),
        hs = document.querySelectorAll("[data-cd-h]"),
        ms = document.querySelectorAll("[data-cd-m]"),
        ss = document.querySelectorAll("[data-cd-s]"),
        notes = document.querySelectorAll("[data-cd-note]");
    if (!ds.length || !hs.length || !ms.length || !ss.length){
      if (cdTimer) clearInterval(cdTimer);
      return;
    }
    var target = new Date("2026-11-12T00:00:00-08:00").getTime();
    function pad(n){ return (n < 10 ? "0" : "") + n; }
    function setAll(list, v){ for (var i = 0; i < list.length; i++) list[i].textContent = v; }
    var diff = target - Date.now();
    if (diff <= 0){
      setAll(ds, "0"); setAll(hs, "00"); setAll(ms, "00"); setAll(ss, "00");
      setAll(notes, "the San Diego launch event is here \u2713 see you there");
      if (cdTimer) clearInterval(cdTimer);
      return;
    }
    var secs = Math.floor(diff / 1000);
    setAll(ds, String(Math.floor(secs / 86400)));
    setAll(hs, pad(Math.floor(secs % 86400 / 3600)));
    setAll(ms, pad(Math.floor(secs % 3600 / 60)));
    setAll(ss, pad(secs % 60));
  }
  cdTick();
  cdTimer = setInterval(cdTick, 1000);

  try { localStorage.removeItem("flwrpwr-preview"); } catch (e) {}
  var forceSoon = /[?&]coming-soon\b/.test(location.search);
  if (!forceSoon && nathanSignedIn()){ removeOverlay(); return; }

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


})();
