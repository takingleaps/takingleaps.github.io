/* FLWRPWR motion layer — deliberately light, Nov 8 rebuild.
   Native scroll only: no Lenis smooth-scroll hijack, no ScrollTrigger
   reveal pop-ins, no SplitType hero animation, no hero parallax.
   Content is visible by default; this file only adds a magnetic pull
   on primary CTAs for desktop pointers. Honors prefers-reduced-motion. */
(function(){
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;
  if (typeof window.gsap === "undefined") return;
  var gsap = window.gsap;

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
