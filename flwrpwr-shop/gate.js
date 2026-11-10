/* FLWRPWR preview gate, shared password, client-side.
   Keeps casual visitors out of the pre-launch shop. This is a soft
   lock, not server security: the page source still lives in the browser,
   so anyone determined can get around it. The real lock is the admin
   side (Supabase accounts) when that lands.
   Unlock is remembered per device; changing PASS_HASH below (via a new
   push) locks everyone out again until they enter the new password. */
(function(){
  "use strict";
  var PASS_HASH = "649d473b8cdce01a2487f943785f258b7a85e289bf8e4e1f65ff6a8e050ebba6"; /* SHA-256 of the preview password */
  var KEY = "flwrpwr-unlocked";
  var gate = document.getElementById("flwrGate");
  if (!gate) return;
  function unlock(){
    try { localStorage.setItem(KEY, PASS_HASH); } catch (e) {}
    gate.remove();
  }
  try {
    if (localStorage.getItem(KEY) === PASS_HASH) { gate.remove(); return; }
  } catch (e) {}
  var form = document.getElementById("flwrGateForm");
  var input = document.getElementById("flwrGateInput");
  var err = document.getElementById("flwrGateError");
  if (input) input.focus();
  if (!form || !input) return;
  form.addEventListener("submit", function(ev){
    ev.preventDefault();
    if (!window.crypto || !crypto.subtle) {
      if (err) err.hidden = false;
      return;
    }
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(input.value || "")).then(function(buf){
      var hex = Array.prototype.map.call(new Uint8Array(buf), function(b){ return ("0" + b.toString(16)).slice(-2); }).join("");
      if (hex === PASS_HASH) { unlock(); return; }
      if (err) err.hidden = false;
      input.select();
      if (gate.animate) gate.animate(
        [{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "translateX(0)" }],
        { duration: 300 }
      );
    });
  });
})();
