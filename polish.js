/* polish.js: flowing background lines + nav that blends in, then tints
   to whatever section sits behind it. No dependencies, no network. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';

  function flowLines() {
    if (document.querySelector('.flow-lines')) return;
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'flow-lines');
    svg.setAttribute('viewBox', '0 0 1440 900');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML =
      '<defs><linearGradient id="fl-grad" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#37ff00" stop-opacity="0"/>' +
      '<stop offset=".35" stop-color="#37ff00" stop-opacity=".9"/>' +
      '<stop offset=".7" stop-color="#5fe0b4" stop-opacity=".8"/>' +
      '<stop offset="1" stop-color="#5fe0b4" stop-opacity="0"/></linearGradient></defs>';
    /* three ribbons that cross and touch, edge to edge */
    var paths = [
      'M-40 210 C 260 90, 520 360, 760 250 S 1180 70, 1480 190',
      'M-40 520 C 300 640, 560 300, 800 430 S 1160 650, 1480 470',
      'M-40 760 C 240 620, 600 820, 860 660 S 1200 520, 1480 720'
    ];
    var gA = document.createElementNS(NS, 'g');
    var gB = document.createElementNS(NS, 'g');
    paths.forEach(function (d, i) {
      var g = i === 1 ? gB : gA;
      var base = document.createElementNS(NS, 'path');
      base.setAttribute('d', d);
      base.setAttribute('class', 'fl-base');
      var run = document.createElementNS(NS, 'path');
      run.setAttribute('d', d);
      run.setAttribute('class', 'fl-run d' + (i + 1));
      g.appendChild(base);
      g.appendChild(run);
    });
    svg.appendChild(gA);
    svg.appendChild(gB);
    document.body.insertBefore(svg, document.body.firstChild);
  }

  function adaptiveNav() {
    var nav = document.querySelector('.site-nav');
    if (!nav) return;
    var root = document.documentElement;
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        nav.classList.toggle('is-scrolled', window.scrollY > 24);
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var tinted = Array.prototype.slice.call(document.querySelectorAll('[data-nav-tint]'));
    if (!tinted.length) return;
    var current = '';
    function pickTint() {
      var probe = nav.getBoundingClientRect().bottom + 12;
      var light = root.getAttribute('data-theme') === 'light';
      for (var i = tinted.length - 1; i >= 0; i--) {
        var r = tinted[i].getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe) {
          var tint = tinted[i].getAttribute(light ? 'data-nav-tint-light' : 'data-nav-tint') || tinted[i].getAttribute('data-nav-tint');
          if (tint !== current && /^\d{1,3},\s*\d{1,3},\s*\d{1,3}$/.test(tint)) { current = tint; nav.style.setProperty('--nav-tint', tint); }
          return;
        }
      }
    }
    var queued = false;
    function onMove() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; pickTint(); });
    }
    window.addEventListener('scroll', onMove, { passive: true });
    window.addEventListener('resize', onMove, { passive: true });
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-theme-toggle]')) { current = ''; setTimeout(pickTint, 0); } });
    pickTint();
  }

  function start() { flowLines(); adaptiveNav(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
