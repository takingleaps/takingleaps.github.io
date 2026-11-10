/* FLWRPWR motion layer. Nov 10 motion pass, built on the Nov 8 rules.
   Native scroll only: no Lenis, no ScrollTrigger, no reveal that hides
   content. Everything here moves things that are already on screen.
   - --scroll (registered as a number) drives three hero layers:
     photo behind (slow), sparkles mid, daisies in front (fast).
   - The FLWR PWR letters settle once (overshoot, settle, a small
     correction) and then breathe on uneven loops. They are visible from
     the first frame.
   - Pouches float, lag behind the card tilt and squash on hover.
   - Buttons press, arrows nudge, the Flower / Prerolls pill glides,
     vibe cards snap, the ticker speeds up with scroll speed.
   Loop lengths: 900 ms quick signals, then 2 / 4 / 8 / 16 s, offset by
   index mod the loop length so nothing moves in step.
   Phones get shorter moves and fewer layers. prefers-reduced-motion
   turns all of it off and leaves a still page. */
(function(){
  "use strict";
  var mm = function(q){ return window.matchMedia ? window.matchMedia(q).matches : false; };
  var reduced = mm("(prefers-reduced-motion: reduce)");
  var fine = mm("(hover: hover) and (pointer: fine)");
  var small = mm("(max-width: 760px)");
  var root = document.documentElement;
  if (reduced) return;
  root.classList.add("fm-on");

  /* ---- 1. --scroll: one number, three hero layers (CSS does the math) ---- */
  if (window.CSS && CSS.registerProperty){
    ["--scroll", "--px", "--py"].forEach(function(name){
      /* registered numbers can be transitioned, which is what makes the pouch lag */
      try { CSS.registerProperty({ name:name, syntax:"<number>", inherits:true, initialValue:"0" }); } catch(e){}
    });
  }
  var hero = document.querySelector(".hero");
  var heroH = hero ? hero.offsetHeight : 0;
  var ticker = document.querySelector(".ticker-track");
  var tickAnim = null;
  var lastY = window.scrollY, rate = 1, rafOn = false;
  function frame(){
    var y = window.scrollY;
    /* only the hero uses the parallax, so stop counting once it is gone */
    if (hero) hero.style.setProperty("--scroll", Math.min(y, heroH + 200).toFixed(1));
    /* ticker: scroll speed pushes the marquee, then it eases back to 1x */
    var v = Math.abs(y - lastY); lastY = y;
    var target = 1 + Math.min(v * (small ? .03 : .06), small ? 1.5 : 3);
    rate += (target - rate) * (target > rate ? .35 : .06);
    if (tickAnim) tickAnim.playbackRate = rate;
    if (rate > 1.01 || v > 0){ requestAnimationFrame(frame); }
    else { rate = 1; if (tickAnim) tickAnim.playbackRate = 1; rafOn = false; }
  }
  function kick(){ if (!rafOn){ rafOn = true; requestAnimationFrame(frame); } }
  window.addEventListener("scroll", kick, { passive:true });
  window.addEventListener("resize", function(){ heroH = hero ? hero.offsetHeight : 0; kick(); measurePill(); }, { passive:true });
  if (ticker && ticker.getAnimations){
    tickAnim = ticker.getAnimations()[0] || null;
    if (fine && tickAnim){
      ticker.parentNode.addEventListener("mouseenter", function(){ tickAnim.playbackRate = .25; rate = .25; });
      ticker.parentNode.addEventListener("mouseleave", function(){ kick(); });
    }
  }
  kick();

  /* ---- 2. kinetic hero type ---- */
  var h1 = document.querySelector(".hero h1");
  var letters = [];
  if (h1){
    h1.setAttribute("aria-label", h1.textContent.replace(/\s+/g, " ").trim());
    (function split(node){
      Array.prototype.slice.call(node.childNodes).forEach(function(n){
        if (n.nodeType === 3){
          var frag = document.createDocumentFragment();
          /* each word stays in one nowrap box so a phone never breaks FLWR mid-word */
          n.textContent.split(/(\s+)/).forEach(function(word){
            if (!word) return;
            if (/^\s+$/.test(word)){ frag.appendChild(document.createTextNode(word)); return; }
            var w = document.createElement("span");
            w.className = "fm-w"; w.setAttribute("aria-hidden", "true");
            word.split("").forEach(function(c){
              var s = document.createElement("span");
              s.className = "fm-ch"; s.textContent = c;
              w.appendChild(s); letters.push(s);
            });
            frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1){ split(n); }
      });
    })(h1);
    letters.forEach(function(s, i){
      /* uneven breathing: loop of 4 s or 8 s, phase = i*1.7 s mod loop */
      var loop = (i % 3 === 1) ? 8 : 4;
      s.style.setProperty("--fm-dur", loop + "s");
      s.style.setProperty("--fm-delay", (-((i * 1.7) % loop)).toFixed(2) + "s");
      if (s.textContent === "W") s.classList.add("fm-lean");   /* the W leans like it was lettered by hand */
    });
  }
  /* one settle: drop, overshoot, settle, small correction. Uneven gaps. */
  var GAPS = [0, 55, 150, 185, 300, 330, 430];
  var DUR = [820, 980, 760, 1040, 900, 1100, 860];
  function settle(){
    letters.forEach(function(s, i){
      if (!s.animate) return;
      var lift = (small ? .1 : .2) * (i % 2 ? 1 : .8);
      s.animate([
        { translate: "0 -" + lift + "em", rotate: (i % 2 ? 5 : -4) + "deg" },
        { translate: "0 .045em", rotate: (i % 2 ? -1.2 : 1) + "deg", offset: .58 },
        { translate: "0 -.012em", rotate: ".3deg", offset: .82 },
        { translate: "0 0", rotate: "0deg" }
      ], { duration: DUR[i % DUR.length], delay: GAPS[i % GAPS.length], easing: "cubic-bezier(.3,.7,.3,1)" });
    });
  }
  /* wait for the password gate so the settle plays when it can be seen */
  var gate = document.getElementById("flwrGate");
  if (gate && "MutationObserver" in window){
    var mo = new MutationObserver(function(){
      if (!document.getElementById("flwrGate")){ mo.disconnect(); settle(); }
    });
    mo.observe(document.body, { childList:true });
  } else { settle(); }

  /* letters near the pointer lift a little (desktop only) */
  if (fine && h1 && letters.length){
    h1.addEventListener("pointermove", function(e){
      letters.forEach(function(s){
        var r = s.getBoundingClientRect();
        var d = Math.abs(e.clientX - (r.left + r.width / 2));
        var k = Math.max(0, 1 - d / 140);
        s.style.setProperty("--fm-lift", (-k * 10).toFixed(1) + "px");
      });
    });
    h1.addEventListener("pointerleave", function(){
      letters.forEach(function(s){ s.style.setProperty("--fm-lift", "0px"); });
    });
  }

  /* ---- 3. badges and cards get uneven ambient phases ---- */
  document.querySelectorAll(".hero-badges span").forEach(function(b, i){
    b.style.setProperty("--fm-delay", (-((i * 2.3) % 8)).toFixed(2) + "s");
  });
  function phaseCards(){
    document.querySelectorAll(".card .card-pouch").forEach(function(p, i){
      p.style.setProperty("--fm-delay", (-((i * 2.9 + 1.1) % 8)).toFixed(2) + "s");
    });
  }
  phaseCards();

  /* pouch follows the card tilt a beat late (secondary motion).
     Delegated, so cards re-rendered by the vibe filter get it too. */
  if (fine){
    document.addEventListener("pointermove", function(e){
      var card = e.target.closest && e.target.closest(".card");
      if (!card) return;
      var r = card.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
      card.style.setProperty("--ry", (nx * 7).toFixed(2) + "deg");
      card.style.setProperty("--rx", (-ny * 7).toFixed(2) + "deg");
      card.style.setProperty("--px", (nx * 10).toFixed(1));
      card.style.setProperty("--py", (ny * 6).toFixed(1));
    }, { passive:true });
    document.addEventListener("pointerout", function(e){
      var card = e.target.closest && e.target.closest(".card");
      if (!card || (e.relatedTarget && card.contains(e.relatedTarget))) return;
      ["--rx","--ry"].forEach(function(k){ card.style.setProperty(k, "0deg"); });
      ["--px","--py"].forEach(function(k){ card.style.setProperty(k, "0"); });
    });
  }

  /* ---- 4. micro-interactions ---- */
  /* trailing arrows and flowers get their own span so they can move */
  function wrapGlyphs(scope){
    (scope || document).querySelectorAll(".btn, .vibe-links a, .vibe-links button, .add-btn, .weedmaps-search button").forEach(function(el){
      if (el.querySelector(".fm-g")) return;
      Array.prototype.slice.call(el.childNodes).forEach(function(n){
        if (n.nodeType !== 3) return;
        var m = n.textContent.match(/^(.*?)\s*([→↗▶✿])\s*$/) || n.textContent.match(/^\s*([▶])\s*(.*)$/);
        if (!m) return;
        var lead = n.textContent.match(/^\s*▶/);
        var g = document.createElement("span");
        g.className = "fm-g " + (/[✿]/.test(n.textContent) ? "fm-flower" : /↗/.test(n.textContent) ? "fm-out" : lead ? "fm-play" : "fm-arrow");
        g.setAttribute("aria-hidden", "true");
        if (lead){
          g.textContent = "▶";
          el.insertBefore(g, n);
          n.textContent = n.textContent.replace(/^\s*▶\s*/, " ");
        } else {
          g.textContent = m[2];
          n.textContent = m[1] + " ";
          el.insertBefore(g, n.nextSibling);
        }
      });
    });
  }
  wrapGlyphs();

  /* press: squash, overshoot, settle (WAAPI, so CSS hover stays intact) */
  document.addEventListener("pointerdown", function(e){
    var b = e.target.closest && e.target.closest(".btn, .add-btn, .cart-btn, .toggle-btn, .vibe-links a, .vibe-links button, .subscribe-form button, .weedmaps-search button, .hero-badges span");
    if (!b || !b.animate) return;
    b.animate([{ scale:"1" }, { scale:".95", offset:.25 }, { scale:"1.03", offset:.65 }, { scale:".995", offset:.85 }, { scale:"1" }],
      { duration: small ? 420 : 520, easing:"ease-out" });
  });
  /* reserving: the flower spins once and the basket catches it */
  document.addEventListener("click", function(e){
    var add = e.target.closest && e.target.closest("[data-add]");
    if (!add) return;
    var f = add.querySelector(".fm-flower");
    if (f && f.animate) f.animate([{ rotate:"0deg" }, { rotate:"400deg", offset:.7 }, { rotate:"355deg", offset:.88 }, { rotate:"360deg" }], { duration:900, easing:"cubic-bezier(.2,.8,.3,1)" });
    var cart = document.getElementById("cartOpenBtn");
    if (cart && cart.animate) cart.animate([{ rotate:"0deg" }, { rotate:"-5deg", offset:.3 }, { rotate:"3.5deg", offset:.55 }, { rotate:"-1deg", offset:.8 }, { rotate:"0deg" }], { duration:620, delay:180, easing:"ease-out" });
  });

  /* Flower / Prerolls: a pill glides between the two (the buttons keep their behavior) */
  var toggle = document.querySelector(".shop-toggle");
  var pill = null;
  function measurePill(){
    if (!toggle || !pill) return;
    var a = toggle.querySelector(".toggle-btn.active");
    if (!a) return;
    pill.style.width = a.offsetWidth + "px";
    pill.style.transform = "translateX(" + (a.offsetLeft - toggle.querySelector(".toggle-btn").offsetLeft) + "px)";
    pill.style.left = toggle.querySelector(".toggle-btn").offsetLeft + "px";
    pill.style.top = a.offsetTop + "px";
    pill.style.height = a.offsetHeight + "px";
  }
  if (toggle){
    pill = document.createElement("span");
    pill.className = "fm-pill"; pill.setAttribute("aria-hidden", "true");
    toggle.insertBefore(pill, toggle.firstChild);
    measurePill();
    requestAnimationFrame(function(){ toggle.classList.add("fm-ready"); });
    toggle.addEventListener("click", function(){ requestAnimationFrame(measurePill); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measurePill);
  }

  /* vibe cards: snap on pick, the arrow turns to point at the grid */
  document.querySelectorAll(".vibe-banner").forEach(function(b, i){
    b.style.setProperty("--fm-delay", (-((i * 1.3) % 4)).toFixed(2) + "s");
    b.addEventListener("click", function(){
      if (!b.animate) return;
      b.animate([{ scale:"1" }, { scale:".97", offset:.2 }, { scale:"1.018", offset:.55 }, { scale:".998", offset:.8 }, { scale:"1" }], { duration:560, easing:"ease-out" });
    });
  });

  /* the vibe preview swings in from the side it was picked on */
  var preview = document.getElementById("vibePreview");
  if (preview && "MutationObserver" in window){
    new MutationObserver(function(){
      if (preview.hidden) return;
      var img = preview.querySelector("img"), txt = preview.querySelector("div");
      if (img && img.animate) img.animate([{ translate:"-26px 6px", rotate:"-9deg" }, { translate:"3px 0", rotate:"2deg", offset:.6 }, { translate:"0 0", rotate:"0deg" }], { duration:700, easing:"cubic-bezier(.3,.7,.3,1)" });
      if (txt && txt.animate) txt.animate([{ translate:"14px 0" }, { translate:"-2px 0", offset:.65 }, { translate:"0 0" }], { duration:620, delay:80, easing:"cubic-bezier(.3,.7,.3,1)" });
    }).observe(preview, { attributes:true, attributeFilter:["hidden"] });
  }

  /* re-rendered grid (vibe filter, format toggle): new cards need phases and glyphs */
  var grid = document.getElementById("productGrid");
  if (grid && "MutationObserver" in window){
    new MutationObserver(function(){ phaseCards(); wrapGlyphs(grid); }).observe(grid, { childList:true });
  }

  /* ---- 5. existing magnetic pull on primary CTAs (desktop, needs GSAP) ---- */
  if (fine && typeof window.gsap !== "undefined"){
    var gsap = window.gsap;
    document.querySelectorAll(".btn-pink, .btn-gold, .btn-leaf").forEach(function(btn){
      btn.addEventListener("mousemove", function(e){
        var r = btn.getBoundingClientRect();
        gsap.to(btn, { x: (e.clientX - r.left - r.width/2) * 0.18, y: (e.clientY - r.top - r.height/2) * 0.28, duration: 0.4, ease: "power2.out" });
      });
      btn.addEventListener("mouseleave", function(){
        gsap.to(btn, { x: 0, y: 0, duration: 0.55, ease: "elastic.out(1, 0.45)" });
      });
    });
  }
})();
