/* FLWRPWR shared site logic — products, basket (localStorage, shared across pages), drawer, toast.
   Facts synced to @flwrpwr_co (Oct 2026): 4g Smalls, first drop Thai Stick / Northern Lights / Maui Wowie,
   Thai Stick notes "Sweet lime, herbal + tropical" are from the brand's own intro post. */
(function(){
  "use strict";

  var PRODUCTS = [
    { id:"thai-stick", name:"Thai Stick", type:"Hybrid", notes:["Sweet lime","Herbal","Tropical"], art:"mint", c1:"#cdeeda", c2:"#8fd6a8", label:"#2e7d4f", tex:"tex/label_thai.png",
      blurb:"The one the feed met first. Sweet lime up front, herbal through the middle, tropical on the way out." },
    { id:"northern-lights", name:"Northern Lights", type:"Indica", notes:null, art:"lav", c1:"#e7deff", c2:"#b7a6f5", label:"#5b3fae", tex:"tex/label_northern.png",
      blurb:"The slow-down pouch. Lights low, blanket up, nowhere to be." },
    { id:"maui-wowie", name:"Maui Wowie", type:"Sativa", notes:null, art:"pink", c1:"#ffd7ea", c2:"#ff9cc6", label:"#c22b78", tex:"tex/label_maui.png",
      blurb:"Sunshine in a pouch. The get-up-and-go of the first drop." },
    { id:"acapulco-gold", name:"Acapulco Gold", type:"Hybrid", notes:null, art:"gold", c1:"#ffeec4", c2:"#f6cd7a", label:"#9a6a14", tex:"tex/label_soon.png", soon:true,
      blurb:"Still on the plant. Get on the list and you'll hear it here first." },
    { id:"trainwreck", name:"Trainwreck", type:"Sativa", notes:null, art:"blue", c1:"#dff2ff", c2:"#9fd2f7", label:"#2b6cb2", tex:"tex/label_soon.png", soon:true,
      blurb:"Still on the plant. Get on the list and you'll hear it here first." },
    { id:"afghani", name:"Afghani", type:"Indica", notes:null, art:"lilac", c1:"#f3e9ff", c2:"#d3b8f7", label:"#7c3fae", tex:"tex/label_soon.png", soon:true,
      blurb:"Still on the plant. Get on the list and you'll hear it here first." }
  ];
  function byId(id){ for (var i=0;i<PRODUCTS.length;i++) if (PRODUCTS[i].id===id) return PRODUCTS[i]; return null; }

  /* ---------- svg art ---------- */
  function daisySVG(petal){
    var petals="", i, a;
    for (i=0;i<8;i++){ a=i*45;
      petals += '<ellipse cx="50" cy="26" rx="11" ry="20" fill="'+petal+'" transform="rotate('+a+' 50 50)"/>';
    }
    return petals + '<circle cx="50" cy="50" r="13" fill="#ffc93c"/><circle cx="46" cy="47" r="2.4" fill="#d18f24"/><circle cx="54" cy="52" r="2" fill="#d18f24"/><circle cx="51" cy="44" r="1.6" fill="#d18f24"/>';
  }
  var POUCH_ART = {
    mint:  { c1:"#d9f4e3", c2:"#8fd6a8", band:"#2e7d4f", name:"THAI", sub:"STICK" },
    lav:   { c1:"#e9e1ff", c2:"#b7a6f5", band:"#5b3fae", name:"NORTHERN", sub:"LIGHTS" },
    pink:  { c1:"#ffe0ef", c2:"#ff9cc6", band:"#c22b78", name:"MAUI", sub:"WOWIE" },
    gold:  { c1:"#fff3d6", c2:"#f6cd7a", band:"#9a6a14", name:"BLOOMING", sub:"SOON" },
    blue:  { c1:"#e6f4ff", c2:"#9fd2f7", band:"#2b6cb2", name:"BLOOMING", sub:"SOON" },
    lilac: { c1:"#f6ecff", c2:"#d3b8f7", band:"#7c3fae", name:"BLOOMING", sub:"SOON" }
  };
  function pouchSVG(kind, gid){
    var a = POUCH_ART[kind]; if(!a) return "";
    return '<defs><linearGradient id="pg'+gid+'" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0" stop-color="'+a.c1+'"/><stop offset="1" stop-color="'+a.c2+'"/></linearGradient></defs>'
      + '<path d="M38 26 L162 26 L172 208 Q173 226 155 226 L45 226 Q27 226 28 208 Z" fill="url(#pg'+gid+')" stroke="#2b2118" stroke-width="4"/>'
      + '<rect x="34" y="10" width="132" height="20" rx="9" fill="'+a.c2+'" stroke="#2b2118" stroke-width="4"/>'
      + '<rect x="50" y="54" width="100" height="106" rx="14" fill="#fffdf9" stroke="#2b2118" stroke-width="3.5"/>'
      + '<g transform="translate(79,60) scale(0.42)">'+daisySVG(a.c2)+'</g>'
      + '<text x="100" y="126" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="900" font-size="12" fill="'+a.band+'">'+a.name+'</text>'
      + '<text x="100" y="143" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="900" font-size="12" fill="'+a.band+'">'+a.sub+'</text>'
      + '<text x="100" y="196" text-anchor="middle" font-family="Shrikhand,cursive" font-size="17" fill="#2b2118">FLWRPWR</text>'
      + '<text x="100" y="214" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="800" font-size="10" letter-spacing="2" fill="#2b2118">4G SMALLS</text>';
  }
  function paintArt(scope){
    (scope||document).querySelectorAll("[data-daisy]").forEach(function(el){ el.innerHTML = daisySVG(el.getAttribute("data-c") || "#ffffff"); });
    (scope||document).querySelectorAll("[data-pouch]").forEach(function(el, i){ el.innerHTML = pouchSVG(el.getAttribute("data-pouch"), "s"+i+Math.random().toString(36).slice(2,6)); });
  }

  /* ---------- ticker ---------- */
  function fillTicker(el){
    if (!el) return;
    var phrases = ["Good vibes, great flower","Women-owned","4g Smalls","Thai Stick ✿ Northern Lights ✿ Maui Wowie","Blooming soon","@flwrpwr_co"];
    var half = phrases.map(function(p){ return "<span>✿ "+p+"</span>"; }).join("");
    el.innerHTML = half + half;
  }

  /* ---------- basket (persisted, shared across every page) ---------- */
  var KEY = "flwrpwr_cart_v1";
  var cart = {};
  try { cart = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch(e){ cart = {}; }
  Object.keys(cart).forEach(function(k){ if (!byId(k) || byId(k).soon) delete cart[k]; });
  function saveCart(){ try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch(e){} }
  function cartCountTotal(){ var n=0; for (var k in cart) n += cart[k]; return n; }
  function syncCartBadges(){
    var n = cartCountTotal();
    document.querySelectorAll(".cart-count, #cartCount, #shopCartCount").forEach(function(el){ el.textContent = n; });
    saveCart();
  }
  function addToCart(id, silent){
    var p = byId(id); if (!p || p.soon) return;
    cart[id] = (cart[id] || 0) + 1;
    syncCartBadges(); renderCart();
    if (!silent) toast("✿ " + p.name + " added to your basket");
  }
  function setQty(id, qty){ if (qty <= 0) delete cart[id]; else cart[id] = qty; syncCartBadges(); renderCart(); }
  function cartIds(){ return Object.keys(cart); }

  /* ---------- drawer (injected once per page) ---------- */
  var drawer, scrim, toastEl, toastTimer = null;
  function buildDrawer(){
    if (document.getElementById("drawer")) { drawer = document.getElementById("drawer"); scrim = document.getElementById("scrim"); return; }
    var html = ''
    + '<div class="scrim" id="scrim"></div>'
    + '<aside class="drawer" id="drawer" aria-hidden="true" aria-label="Shopping basket">'
    +   '<div class="drawer-head"><h3 id="drawerTitle">Your basket</h3>'
    +   '<button class="icon-btn" id="drawerClose" type="button" aria-label="Close basket">✕</button></div>'
    +   '<div class="drawer-body" id="cartView"><div id="cartItems"></div>'
    +   '<div class="empty-cart" id="emptyCart"><div class="big">✿</div>Nothing in the basket yet.<br />Tap a pouch — here, or inside the 3D shop.</div></div>'
    +   '<div class="drawer-foot" id="cartFoot"><p class="drawer-note">We\u2019re pre-launch, so checkout is a <b>reservation</b>: no prices, no payment — we just hold your picks and email you on launch day.</p>'
    +   '<button class="checkout-btn" id="toCheckoutBtn" type="button">Reserve my picks →</button></div>'
    +   '<div class="drawer-body" id="checkoutView" hidden><button class="back-link" id="backToCart" type="button">← back to basket</button>'
    +   '<div class="field"><label for="coName">Your name</label><input id="coName" type="text" autocomplete="name" placeholder="e.g. Daisy Bloom" /></div>'
    +   '<div class="field"><label for="coEmail">Email for launch day</label><input id="coEmail" type="email" autocomplete="email" placeholder="your@email.com" /></div>'
    +   '<button class="age-confirm" id="ageConfirm" type="button" aria-pressed="false">Tap to confirm you\u2019re 21 or older</button>'
    +   '<p class="form-err" id="formErr"></p><div class="success-list" id="checkoutSummary" style="margin-top:0"></div></div>'
    +   '<div class="drawer-foot" id="checkoutFoot" hidden><button class="checkout-btn" id="placeReservation" type="button">Place my reservation ✿</button></div>'
    +   '<div class="drawer-body" id="successView" hidden><div class="success-box">'
    +   '<svg class="big-daisy" viewBox="0 0 100 100" data-daisy data-c="#ff8fc7"></svg><h4>You\u2019re reserved!</h4>'
    +   '<p id="successText">Your picks are saved for launch day.</p><div class="success-list" id="successList"></div>'
    +   '<button class="btn btn-pink" id="successClose" type="button" style="margin-top:6px">Keep browsing</button></div></div>'
    + '</aside>'
    + '<div class="toast" id="toast" role="status"></div>';
    var div = document.createElement("div"); div.innerHTML = html;
    while (div.firstChild) document.body.appendChild(div.firstChild);
    drawer = document.getElementById("drawer"); scrim = document.getElementById("scrim");
    paintArt(drawer);
    wireDrawer();
  }
  function toast(msg){
    toastEl = document.getElementById("toast"); if (!toastEl) return;
    toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function(){ toastEl.classList.remove("show"); }, 2600);
  }
  var views = { cart:["cartView","cartFoot"], checkout:["checkoutView","checkoutFoot"], success:["successView",null] };
  function showView(name){
    ["cartView","cartFoot","checkoutView","checkoutFoot","successView"].forEach(function(id){ var el=document.getElementById(id); if (el) el.hidden = true; });
    views[name].forEach(function(id){ if (id) document.getElementById(id).hidden = false; });
    document.getElementById("drawerTitle").textContent = name === "checkout" ? "Reserve your picks" : name === "success" ? "Reserved ✿" : "Your basket";
    if (name === "checkout") renderCheckoutSummary();
  }
  function openDrawer(){ renderCart(); showView("cart"); drawer.classList.add("open"); scrim.classList.add("open"); drawer.setAttribute("aria-hidden","false"); }
  function closeDrawer(){ drawer.classList.remove("open"); scrim.classList.remove("open"); drawer.setAttribute("aria-hidden","true"); }
  function summaryHTML(){
    var ids = cartIds();
    if (!ids.length) return "<b>Nothing reserved yet.</b>";
    return "<b>Your reservation:</b><br />" + ids.map(function(id){ var p = byId(id); return "✿ " + p.name + " (" + p.type + ") × " + cart[id]; }).join("<br />");
  }
  function renderCheckoutSummary(){ document.getElementById("checkoutSummary").innerHTML = summaryHTML(); }
  function renderCart(){
    var box = document.getElementById("cartItems"); if (!box) return;
    var ids = cartIds();
    document.getElementById("emptyCart").style.display = ids.length ? "none" : "block";
    document.getElementById("toCheckoutBtn").disabled = !ids.length;
    box.innerHTML = ids.map(function(id){
      var p = byId(id);
      return '<div class="cart-item">'
        + '<span class="thumb" style="background:linear-gradient(150deg,'+p.c1+','+p.c2+')"><img src="img/pouch-'+p.id+'.png" alt="" style="width:30px;height:auto" /></span>'
        + '<div class="ci-main"><b>'+p.name+'</b><div class="ci-sub">'+p.type+' · 4g Smalls · pricing at launch</div></div>'
        + '<span class="qty"><button type="button" data-qty="'+id+'|-1" aria-label="One less">−</button><span>'+cart[id]+'</span><button type="button" data-qty="'+id+'|1" aria-label="One more">+</button></span>'
        + '<button class="remove-btn" type="button" data-remove="'+id+'">remove</button></div>';
    }).join("");
  }
  var ageOk = false;
  function wireDrawer(){
    document.addEventListener("click", function(e){
      var add = e.target.closest("[data-add]");
      if (add){ addToCart(add.getAttribute("data-add")); return; }
      var nt = e.target.closest("[data-notify]");
      if (nt){ toast("✿ Noted — we'll shout when this one blooms. Follow @flwrpwr_co for first dibs."); return; }
      var q = e.target.closest("[data-qty]");
      if (q){ var parts = q.getAttribute("data-qty").split("|"); setQty(parts[0], (cart[parts[0]]||0) + parseInt(parts[1],10)); return; }
      var rm = e.target.closest("[data-remove]");
      if (rm){ setQty(rm.getAttribute("data-remove"), 0); return; }
      if (e.target.closest("#cartOpenBtn")){ openDrawer(); return; }
      if (e.target.closest("#drawerClose") || e.target.closest("#successClose")){ closeDrawer(); return; }
      if (e.target.closest("#scrim")){ closeDrawer(); return; }
      if (e.target.closest("#toCheckoutBtn")){ showView("checkout"); return; }
      if (e.target.closest("#backToCart")){ showView("cart"); return; }
      if (e.target.closest("#ageConfirm")){
        var b = document.getElementById("ageConfirm");
        ageOk = !ageOk; b.classList.toggle("on", ageOk); b.setAttribute("aria-pressed", ageOk ? "true" : "false");
        b.textContent = ageOk ? "✓ Confirmed — I'm 21 or older" : "Tap to confirm you're 21 or older"; return;
      }
      if (e.target.closest("#placeReservation")){
        var name = document.getElementById("coName").value.trim();
        var email = document.getElementById("coEmail").value.trim();
        var err = document.getElementById("formErr"); var msg = "";
        if (!name) msg = "Add your name so we know whose basket this is.";
        else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) msg = "That email doesn't look right — we need it for launch day.";
        else if (!ageOk) msg = "One tap on the 21+ confirm — flower rules are flower rules.";
        if (msg){ err.textContent = msg; err.style.display = "block"; return; }
        err.style.display = "none";
        document.getElementById("successList").innerHTML = summaryHTML() + "<br /><br />Confirmation goes to <b>" + email.replace(/</g,"&lt;") + "</b> on launch day.";
        document.getElementById("successText").textContent = "Thanks, " + name.split(" ")[0].replace(/</g,"&lt;") + " — your picks are saved for launch day. We'll email you the moment the shop opens. No payment taken, pinky promise.";
        cart = {}; syncCartBadges(); renderCart(); showView("success"); return;
      }
    });
    var form = document.getElementById("subscribeForm");
    if (form) form.addEventListener("submit", function(e){
      e.preventDefault();
      var em = document.getElementById("subscribeEmail");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em.value.trim())){ toast("Hmm — that email looks off. One more try?"); em.focus(); return; }
      var done = document.getElementById("subscribeDone"); if (done) done.hidden = false;
      em.value = ""; toast("✿ You're on the list — see you at launch");
    });
    window.addEventListener("storage", function(e){ if (e.key === KEY){ try { cart = JSON.parse(e.newValue || "{}") || {}; } catch(_){ } syncCartBadges(); renderCart(); } });
  }

  /* ---------- product grid (shop index) ---------- */
  function renderGrid(el){
    if (!el) return;
    el.innerHTML = PRODUCTS.map(function(p, i){
      var chips = '<span class="chip type">'+p.type+'</span>' + (p.soon ? '<span class="chip note">Coming soon</span>' : '') + (p.notes ? p.notes.map(function(n){ return '<span class="chip note">'+n+'</span>'; }).join("") : "");
      var btn = p.soon
        ? '<button class="add-btn notify" type="button" data-notify="'+p.id+'">Notify me</button>'
        : '<button class="add-btn" type="button" data-add="'+p.id+'">Reserve ✿</button>';
      var foot = p.soon ? '<span class="price-note">still growing…</span>' : '<span class="price-note">pricing at launch</span>';
      return '<article class="card reveal'+(p.soon?" soon":"")+'">'
        + '<a class="card-art" href="'+p.id+'.html" style="background:linear-gradient(160deg,'+p.c1+','+p.c2+')" aria-label="'+p.name+' — its own page">'
        + (p.soon ? '<span class="badge">Blooming soon</span>' : '<span class="badge">First drop</span>')
        + '<img class="card-pouch" src="img/pouch-'+p.id+'.png" alt="'+p.name+' 4g Smalls pouch — photo from the FLWRPWR pack" loading="lazy" /></a>'
        + '<div class="card-body"><h3><a href="'+p.id+'.html">'+p.name+'</a></h3>'
        + '<div class="card-meta">'+chips+'</div>'
        + '<p class="size">FLWRPWR · 4g Smalls</p>'
        + '<div class="card-foot">'+foot+btn+'</div></div></article>';
    }).join("");
  }

  /* ---------- reveal garnish ---------- */
  function initReveal(){
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold:.12 });
    document.querySelectorAll(".reveal").forEach(function(el){ io.observe(el); });
  }

  document.addEventListener("DOMContentLoaded", function(){
    buildDrawer();
    paintArt(document);
    fillTicker(document.getElementById("tickerTrack"));
    renderGrid(document.getElementById("productGrid"));
    syncCartBadges(); renderCart(); initReveal();
  });

  window.FLWR = { addToCart:addToCart, openDrawer:openDrawer, closeDrawer:closeDrawer, toast:toast, byId:byId, PRODUCTS:PRODUCTS, pouchSVG:pouchSVG, daisySVG:daisySVG };
})();
