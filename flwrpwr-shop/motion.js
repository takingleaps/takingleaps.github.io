/* FLWRPWR motion layer — Lenis smooth scroll + GSAP ScrollTrigger reveals + SplitType kinetic type.
   Garnish only: every enhancement is applied from JS, so with no JS (or a dead CDN) the page is fully visible.
   Honors prefers-reduced-motion. Physics-style eases only; transform/opacity only. */
(function(){
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;

  /* Lenis smooth scroll, tied into ScrollTrigger when both exist */
  var lenis = null;
  if (typeof window.Lenis !== "undefined"){
    lenis = new window.Lenis({ duration: 1.15, smoothWheel: true });
    function raf(t){ lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }

  if (typeof window.gsap === "undefined") return;
  var gsap = window.gsap;
  if (typeof window.ScrollTrigger !== "undefined"){
    gsap.registerPlugin(window.ScrollTrigger);
    if (lenis) lenis.on("scroll", window.ScrollTrigger.update);
  }

  /* kinetic hero type: SplitType chars rise in with a springy stagger */
  var splitTargets = document.querySelectorAll("[data-split]");
  if (typeof window.SplitType !== "undefined" && splitTargets.length){
    splitTargets.forEach(function(el){
      try {
        var split = new window.SplitType(el, { types: "chars" });
        gsap.from(split.chars, {
          yPercent: 110, rotate: 4, opacity: 0,
          duration: 0.9, ease: "back.out(1.6)", stagger: 0.028, delay: 0.08,
          clearProps: "transform,opacity"
        });
      } catch(e){ /* split is garnish */ }
    });
  }

  /* hero art: gentle parallax drift on scroll */
  var heroArt = document.querySelectorAll(".hero-art, .pouch-stage");
  if (typeof window.ScrollTrigger !== "undefined" && heroArt.length){
    heroArt.forEach(function(el){
      gsap.to(el, { y: -26, ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 1.1 } });
    });
  }

  /* section reveals — orchestrated batch, not the same fade on everything:
     cards stagger up, heads slide from the left edge of their column */
  if (typeof window.ScrollTrigger !== "undefined"){
    gsap.utils.toArray(".grid, .feed-grid, .props, .next-row").forEach(function(group){
      gsap.from(group.children, {
        y: 34, opacity: 0, duration: 0.75, ease: "power3.out", stagger: 0.09,
        clearProps: "transform,opacity",
        scrollTrigger: { trigger: group, start: "top 86%" }
      });
    });
    gsap.utils.toArray(".sec-head, .strain-copy, .glass-panel").forEach(function(el){
      gsap.from(el, {
        y: 22, opacity: 0, duration: 0.7, ease: "power2.out", clearProps: "transform,opacity",
        scrollTrigger: { trigger: el, start: "top 88%" }
      });
    });
  }

  /* magnetic pull on primary CTAs (desktop pointers only) */
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches){
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
