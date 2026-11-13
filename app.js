    (function () {
      var root = document.documentElement;
      var soundToggle = document.querySelector('[data-sound-toggle]');
      var themeToggle = document.querySelector('[data-theme-toggle]');
      var soundEnabled = true;
      var savedTheme = null;
      try { savedTheme = window.localStorage.getItem('byyy-theme'); } catch (e) { savedTheme = null; }
      if ((savedTheme === 'light' || savedTheme === 'dark') && themeToggle) {
        root.setAttribute('data-theme', savedTheme);
        themeToggle.setAttribute('aria-pressed', String(savedTheme === 'light'));
        themeToggle.querySelector('span').textContent = savedTheme === 'light' ? 'LIGHT' : 'DARK';
      }
      var audioContext = null;
      var lastHoverAt = 0;
      var canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

      function playBlip(kind) {
        if (!soundEnabled) return;
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioContext) audioContext = new AudioCtx();
        if (audioContext.state === 'suspended') {
          audioContext.resume();
          if (audioContext.state === 'suspended') return;
        }
        var oscillator = audioContext.createOscillator();
        var gain = audioContext.createGain();
        var now = audioContext.currentTime;
        var hover = kind === 'hover';
        var frequency = hover ? 690 : (kind === 'toggle' ? 580 : 430);
        var duration = hover ? .035 : .07;
        var peak = hover ? .006 : .025;
        oscillator.type = hover ? 'triangle' : 'sine';
        oscillator.frequency.setValueAtTime(frequency, now);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * (hover ? .92 : .82), now + duration * .8);
        gain.gain.setValueAtTime(.0001, now);
        gain.gain.exponentialRampToValueAtTime(peak, now + (hover ? .004 : .008));
        gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(now);
        oscillator.stop(now + duration + .005);
      }

      if (soundToggle) {
        soundToggle.addEventListener('click', function () {
          if (soundEnabled) playBlip('toggle');
          soundEnabled = !soundEnabled;
          soundToggle.setAttribute('aria-pressed', String(soundEnabled));
          soundToggle.querySelector('span:last-child').textContent = soundEnabled ? 'SOUND ON' : 'SOUND OFF';
          if (soundEnabled) playBlip('toggle');
        });
      }

      if (themeToggle) {
        themeToggle.addEventListener('click', function () {
          var light = root.getAttribute('data-theme') !== 'light';
          root.setAttribute('data-theme', light ? 'light' : 'dark');
          try { window.localStorage.setItem('byyy-theme', light ? 'light' : 'dark'); } catch (e) {}
          themeToggle.setAttribute('aria-pressed', String(light));
          themeToggle.querySelector('span').textContent = light ? 'LIGHT' : 'DARK';
          playBlip('toggle');
        });
      }

      var serviceButtons = Array.prototype.slice.call(document.querySelectorAll('.service-mark'));
      serviceButtons.forEach(function (button) {
        button.addEventListener('click', function () {
          var row = button.closest('.service-row');
          var open = button.getAttribute('aria-expanded') === 'true';
          button.setAttribute('aria-expanded', String(!open));
          row.classList.toggle('is-open', !open);
          var assistiveText = button.querySelector('.sr-only');
          if (assistiveText) assistiveText.textContent = (!open ? 'Hide ' : 'Show ') + row.querySelector('h3').textContent.toLowerCase() + ' details';
        });
      });

      if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) {
        serviceButtons.forEach(function (button) {
          var row = button.closest('.service-row');
          button.setAttribute('aria-expanded', 'false');
          row.classList.remove('is-open');
          var assistiveText = button.querySelector('.sr-only');
          if (assistiveText) assistiveText.textContent = 'Show ' + row.querySelector('h3').textContent.toLowerCase() + ' details';
        });
      }

      var conceptModal = document.querySelector('[data-concept-modal]');
      var conceptOpen = document.querySelector('[data-concept-open]');
      var conceptClose = conceptModal ? Array.prototype.slice.call(conceptModal.querySelectorAll('[data-concept-close]')) : [];
      var lastModalFocus = null;
      function openConceptModal() {
        if (!conceptModal) return;
        lastModalFocus = document.activeElement;
        conceptModal.classList.add('is-open');
        conceptModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        conceptModal.querySelector('.concept-modal__close').focus();
      }
      function closeConceptModal() {
        if (!conceptModal) return;
        conceptModal.classList.remove('is-open');
        conceptModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
        if (lastModalFocus && lastModalFocus.focus) lastModalFocus.focus();
      }
      if (conceptOpen) conceptOpen.addEventListener('click', openConceptModal);
      conceptClose.forEach(function (control) { control.addEventListener('click', closeConceptModal); });
      var sheldonModal = document.querySelector('[data-sheldon-modal]');
      var sheldonOpen = document.querySelector('[data-sheldon-open]');
      var sheldonClose = sheldonModal ? Array.prototype.slice.call(sheldonModal.querySelectorAll('[data-sheldon-close]')) : [];
      var lastSheldonFocus = null;
      function openSheldonModal() {
        if (!sheldonModal) return;
        lastSheldonFocus = document.activeElement;
        sheldonModal.classList.add('is-open');
        sheldonModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        sheldonModal.querySelector('.concept-modal__close').focus();
      }
      function closeSheldonModal() {
        if (!sheldonModal) return;
        sheldonModal.classList.remove('is-open');
        sheldonModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
        if (lastSheldonFocus && lastSheldonFocus.focus) lastSheldonFocus.focus();
      }
      if (sheldonOpen) sheldonOpen.addEventListener('click', openSheldonModal);
      sheldonClose.forEach(function (control) { control.addEventListener('click', closeSheldonModal); });
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && conceptModal && conceptModal.classList.contains('is-open')) closeConceptModal();
        if (event.key === 'Escape' && sheldonModal && sheldonModal.classList.contains('is-open')) closeSheldonModal();
      });
      Array.prototype.slice.call(document.querySelectorAll('.concept-option__image img, .work-image img')).forEach(function (image) {
        image.addEventListener('error', function () { image.style.display = 'none'; });
      });

      var burstCanvas = document.getElementById('pixel-burst');
      if (burstCanvas && window.matchMedia && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        var bctx = burstCanvas.getContext('2d');
        var burstParticles = [];
        var burstRunning = false;
        function sizeBurst() {
          var dpr = Math.min(window.devicePixelRatio || 1, 2);
          burstCanvas.width = Math.floor(window.innerWidth * dpr);
          burstCanvas.height = Math.floor(window.innerHeight * dpr);
          bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        sizeBurst();
        window.addEventListener('resize', sizeBurst);
        function spawnBurst(x, y) {
          var colors = ['#37ff00', '#ffffff', '#c9c9c9', '#1c2b1c'];
          for (var i = 0; i < 16; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = 2 + Math.random() * 5;
            burstParticles.push({ x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2, size: 3 + Math.random() * 7, color: colors[i % colors.length], life: 1 });
          }
          if (!burstRunning) { burstRunning = true; requestAnimationFrame(tickBurst); }
        }
        function tickBurst() {
          bctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
          burstParticles = burstParticles.filter(function (pt) { return pt.life > 0; });
          if (!burstParticles.length) { burstRunning = false; return; }
          burstParticles.forEach(function (pt) {
            pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.18; pt.life -= 0.02;
            bctx.globalAlpha = Math.max(pt.life, 0);
            bctx.fillStyle = pt.color;
            bctx.fillRect(pt.x, pt.y, pt.size, pt.size);
          });
          bctx.globalAlpha = 1;
          requestAnimationFrame(tickBurst);
        }
        document.addEventListener('pointerdown', function (event) {
          if (event.button !== undefined && event.button !== 0) return;
          spawnBurst(event.clientX, event.clientY);
        });
      }

      var workPanel = document.querySelector('[data-work-panel-root]');
      var workPanelOpeners = Array.prototype.slice.call(document.querySelectorAll('[data-work-panel]'));
      var lastPanelFocus = null;
      function openWorkPanel(card) {
        if (!workPanel) return;
        lastPanelFocus = document.activeElement;
        var title = card.querySelector('h3');
        var desc = card.querySelector('.work-card__copy p');
        var meta = card.querySelector('.project-meta span');
        var banner = card.querySelector('.work-banner');
        var image = card.querySelector('.work-image img');
        var panelTitle = workPanel.querySelector('[data-work-panel-title]');
        var panelDesc = workPanel.querySelector('[data-work-panel-desc]');
        var panelMeta = workPanel.querySelector('[data-work-panel-meta]');
        var panelBanner = workPanel.querySelector('[data-work-panel-banner]');
        var panelImage = workPanel.querySelector('[data-work-panel-image]');
        var panelLink = workPanel.querySelector('[data-work-panel-link]');
        if (panelTitle && title) panelTitle.textContent = title.textContent;
        if (panelDesc && desc) panelDesc.textContent = desc.textContent;
        if (panelMeta && meta) panelMeta.textContent = meta.textContent;
        if (panelBanner) {
          if (banner) { panelBanner.textContent = banner.textContent; panelBanner.style.display = ''; }
          else { panelBanner.textContent = ''; panelBanner.style.display = 'none'; }
        }
        if (panelImage) {
          if (image && image.getAttribute('src')) { panelImage.src = image.getAttribute('src'); panelImage.alt = image.getAttribute('alt') || ''; panelImage.style.display = ''; }
          else { panelImage.removeAttribute('src'); panelImage.alt = ''; }
        }
        if (panelLink) panelLink.href = card.getAttribute('data-work-href') || '#';
        workPanel.classList.add('is-open');
        workPanel.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        var panelClose = workPanel.querySelector('.work-panel__close');
        if (panelClose) {
          window.setTimeout(function () { panelClose.focus(); }, 250);
        }
      }
      function closeWorkPanel() {
        if (!workPanel) return;
        workPanel.classList.remove('is-open');
        workPanel.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
        if (lastPanelFocus && lastPanelFocus.focus) lastPanelFocus.focus();
      }
      workPanelOpeners.forEach(function (card) {
        card.addEventListener('click', function () { openWorkPanel(card); });
      });
      if (workPanel) {
        Array.prototype.slice.call(workPanel.querySelectorAll('[data-work-panel-close]')).forEach(function (control) {
          control.addEventListener('click', closeWorkPanel);
        });
      }
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && workPanel && workPanel.classList.contains('is-open')) closeWorkPanel();
      });

      var bookingEmbed = document.querySelector('[data-booking-embed]');
      if (bookingEmbed) {
        var bookingFrame = bookingEmbed.querySelector('[data-calendly-frame]');
        var bookingStatus = bookingEmbed.querySelector('.booking-status');
        var bookingReady = false;
        var bookingBlocked = false;
        function setBookingStatus(text) { if (bookingStatus) bookingStatus.textContent = text; }
        function markBookingReady() {
          if (bookingReady || bookingBlocked) return;
          if (!bookingFrame || !bookingFrame.getAttribute('src')) return;
          bookingReady = true;
          bookingEmbed.classList.add('is-ready');
          setBookingStatus('Calendar loaded.');
        }
        function showBookingFallback() {
          if (bookingReady) return;
          bookingBlocked = true;
          bookingEmbed.classList.remove('is-loading');
          bookingEmbed.classList.add('is-fallback');
        }
        var bookingRetry = document.querySelector('[data-booking-retry]');
        if (bookingRetry) bookingRetry.addEventListener('click', function () {
          bookingReady = false;
          bookingBlocked = false;
          bookingEmbed.classList.remove('is-fallback', 'is-ready');
          if (bookingFrame) bookingFrame.removeAttribute('src');
          setBookingStatus('Loading available times...');
          startBookingLoad();
        });
        function startBookingLoad() {
          if (!bookingFrame || bookingFrame.getAttribute('src')) return;
          var src = bookingFrame.getAttribute('data-calendly-src');
          if (!src) return;
          bookingEmbed.classList.add('is-loading');
          setBookingStatus('Loading available times...');
          bookingFrame.setAttribute('src', src);
          window.setTimeout(function () {
            if (!bookingReady) showBookingFallback();
          }, 12000);
        }
        if (bookingFrame) bookingFrame.addEventListener('load', markBookingReady, { once: true });
        window.addEventListener('message', function (event) {
          if (event.origin !== 'https://calendly.com') return;
          if (event.data && typeof event.data.event === 'string' && event.data.event.indexOf('calendly.') === 0) markBookingReady();
        });
        document.addEventListener('securitypolicyviolation', function (event) {
          if (String(event.violatedDirective).indexOf('frame-src') === -1) return;
          if (String(event.blockedURI).indexOf('calendly.com') === -1) return;
          showBookingFallback();
        });
        if ('IntersectionObserver' in window) {
          var bookingObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
              if (!entry.isIntersecting) return;
              startBookingLoad();
              bookingObserver.disconnect();
            });
          }, { rootMargin: '400px 0px' });
          bookingObserver.observe(bookingEmbed);
        } else {
          startBookingLoad();
        }
      }

      document.addEventListener('click', function (event) {
        if (event.target.closest('[data-sound-toggle], [data-theme-toggle]')) return;
        if (event.target.closest('a, button, .work-card, .service-row, .flow-item, .project')) playBlip('click');
      });

      if (canHover) {
        document.addEventListener('pointerover', function (event) {
          var interactive = event.target.closest('a, button, .work-card, .service-row, .flow-item, .project, .stack-node');
          if (!interactive || interactive.contains(event.relatedTarget)) return;
          var now = Date.now();
          if (now - lastHoverAt < 85) return;
          lastHoverAt = now;
          playBlip('hover');
        });
      }

      var quoteForm = document.querySelector('.quote-form');
      if (quoteForm) {
        var formStatus = quoteForm.querySelector('.form-status');
        quoteForm.addEventListener('submit', function (event) {
          event.preventDefault();
          var name = quoteForm.elements.name.value.trim();
          var email = quoteForm.elements.email.value.trim();
          var project = quoteForm.elements.project.value.trim();
          var emailField = quoteForm.elements.email;
          if (!name || !email || !project || !emailField.checkValidity()) {
            formStatus.textContent = 'Fill in your name, a valid email, and your project details first.';
            formStatus.classList.add('is-error');
            var firstInvalid = !name ? quoteForm.elements.name : (!email || !emailField.checkValidity() ? emailField : quoteForm.elements.project);
            firstInvalid.focus();
            playBlip('toggle');
            return;
          }
          formStatus.classList.remove('is-error');
          formStatus.textContent = 'Opening your mail app.';
          playBlip('click');
          var subject = 'Quote request from ' + name;
          var body = 'Name: ' + name + '\nEmail: ' + email + '\n\nAbout the project:\n' + project;
          var mailLink = document.createElement('a');
          mailLink.href = 'mailto:nathanltwong@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
          mailLink.style.display = 'none';
          document.body.appendChild(mailLink);
          mailLink.click();
          mailLink.remove();
        });
      }

      var copyButton = document.querySelector('[data-copy]');
      var status = document.querySelector('.copy-status');
      if (copyButton && status) {
        copyButton.addEventListener('click', function () {
          var value = copyButton.getAttribute('data-copy');
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(value).then(function () {
              status.textContent = 'Instagram handle copied.';
            }).catch(function () {
              status.textContent = value;
            });
          } else {
            status.textContent = value;
          }
        });
      }

      var pipeline = document.querySelector('.stack-map');
      var pipelineSteps = pipeline ? Array.prototype.slice.call(pipeline.querySelectorAll('.stack-node')) : [];
      var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      function finishPipelineStep(step) {
        step.classList.remove('is-running');
        step.classList.add('is-complete');
      }
      function runPipeline() {
        if (!pipeline || pipeline.classList.contains('pipeline-running')) return;
        pipeline.classList.add('pipeline-running');
        pipelineSteps.forEach(function (step, index) {
          window.setTimeout(function () {
            step.classList.add('is-running');
            window.setTimeout(function () { finishPipelineStep(step); }, 540);
          }, 220 + (index * 570));
        });
      }
      if (pipeline && pipelineSteps.length) {
        if (reduceMotion || !('IntersectionObserver' in window)) {
          pipeline.classList.add('pipeline-running');
          pipelineSteps.forEach(finishPipelineStep);
        } else {
          var pipelineObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
              if (!entry.isIntersecting) return;
              runPipeline();
              pipelineObserver.disconnect();
            });
          }, { threshold: .45 });
          pipelineObserver.observe(pipeline);
        }
      }

      var flowSystem = document.querySelector('.flow-canvas');
      var flowSteps = flowSystem ? Array.prototype.slice.call(flowSystem.querySelectorAll('.flow-item')) : [];
      var flowSvg = flowSystem ? flowSystem.querySelector('.flow-connectors') : null;
      var flowCore = flowSystem ? flowSystem.querySelector('.flow-core') : null;
      var flowPaths = [];
      function drawFlowConnectors() {
        if (!flowSystem || !flowSvg || !flowCore || !flowSteps.length) return;
        var canvasRect = flowSystem.getBoundingClientRect();
        var coreRect = flowCore.getBoundingClientRect();
        var width = Math.max(1, canvasRect.width);
        var height = Math.max(1, canvasRect.height);
        var centerX = width / 2;
        var laneOffsets = [-15, 15, -5, 5];
        flowSvg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
        flowSvg.innerHTML = '';
        flowPaths = [];
        flowSteps.forEach(function (step, index) {
          var itemRect = step.getBoundingClientRect();
          var isLeftColumn = index % 2 === 0;
          var startX = (isLeftColumn ? itemRect.right : itemRect.left) - canvasRect.left;
          var startY = itemRect.top - canvasRect.top + itemRect.height / 2;
          var endX = centerX + laneOffsets[index];
          var endY = coreRect.top - canvasRect.top;
          var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('class', 'flow-connector');
          path.setAttribute('d', 'M ' + startX + ' ' + startY + ' H ' + endX + ' V ' + endY);
          flowSvg.appendChild(path);
          flowPaths.push(path);
        });
      }
      function finishFlowStep(step, index) {
        step.classList.remove('is-running');
        step.classList.add('is-complete');
        if (flowPaths[index]) {
          flowPaths[index].classList.remove('is-active');
          flowPaths[index].classList.add('is-complete');
        }
      }
      function runFlowSystem() {
        if (!flowSystem || flowSystem.classList.contains('system-running')) return;
        flowSystem.classList.add('system-running');
        flowSteps.forEach(function (step, index) {
          window.setTimeout(function () {
            step.classList.add('is-running');
            if (flowPaths[index]) flowPaths[index].classList.add('is-active');
            window.setTimeout(function () { finishFlowStep(step, index); }, 520);
          }, 180 + (index * 540));
        });
      }
      if (flowSystem && flowSteps.length) {
        drawFlowConnectors();
        window.addEventListener('resize', drawFlowConnectors);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawFlowConnectors);
        if (reduceMotion || !('IntersectionObserver' in window)) {
          flowSystem.classList.add('system-running');
          flowSteps.forEach(function (step, index) { finishFlowStep(step, index); });
        } else {
          var flowObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
              if (!entry.isIntersecting) return;
              runFlowSystem();
              flowObserver.disconnect();
            });
          }, { threshold: .35 });
          flowObserver.observe(flowSystem);
        }
      }

      var links = Array.prototype.slice.call(document.querySelectorAll('.nav-link[href^="#"], .bottom-nav__link[href^="#"]'));
      var sections = links.map(function (link) { return document.querySelector(link.getAttribute('href')); }).filter(Boolean);
      if ('IntersectionObserver' in window && sections.length) {
        var observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            links.forEach(function (link) {
              var active = link.getAttribute('href') === '#' + entry.target.id;
              if (active) link.setAttribute('aria-current', 'true');
              else link.removeAttribute('aria-current');
            });
          });
        }, { rootMargin: '-20% 0px -65% 0px', threshold: 0 });
        sections.forEach(function (section) { observer.observe(section); });
      }
    }());
  /* Kinetic terminal typing hero (Motion Studio Stack).
         Types the command line, then the headline, char by char, with a
         block cursor. Copy + buttons fade in after (CSS, once js-typing
         lifts). Skipped entirely under prefers-reduced-motion: everything
         stays visible as authored. Full text stays in the HTML, so no-JS
         and screen readers see it. The head script adds js-typing before
         first paint so the full headline never flashes; each line is
         unhidden the moment its typing starts, so the page loads as it
         types. */
      (function () {
        var heroTitle = document.getElementById('hero-title');
        var commandLine = document.querySelector('.hero-main .command-line');
        if (!heroTitle || !commandLine) return;
        var titleText = heroTitle.textContent;
        var cmdText = commandLine.textContent;
        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var rootEl = document.documentElement;
        var finished = false;
        var timers = [];
        function finish() {
          if (finished) return;
          finished = true;
          timers.forEach(window.clearTimeout);
          heroTitle.textContent = titleText;
          commandLine.textContent = cmdText;
          rootEl.classList.remove('js-typing');
          rootEl.classList.add('typing-done');
        }
        if (reduce) { finish(); return; }
        rootEl.classList.add('js-typing');
        /* Safety: never leave the hero half typed, whatever else fails. */
        window.setTimeout(finish, 8000);
        /* Only the typed part shows; the rest stays invisible (same
           wrapping, no layout shift), cursor between them. */
        function typeInto(el, text, rate, keepCursor, done) {
          el.classList.add('t-started');
          el.textContent = '';
          var on = document.createElement('span');
          var caret = document.createElement('span');
          var off = document.createElement('span');
          var cursor = document.createElement('span');
          on.className = 't-on'; off.className = 't-off'; caret.className = 't-caret'; cursor.className = 'type-cursor';
          [on, caret, off].forEach(function (n) { n.setAttribute('aria-hidden', 'true'); });
          caret.appendChild(cursor);
          off.textContent = text;
          el.appendChild(on); el.appendChild(caret); el.appendChild(off);
          var i = 0;
          (function step() {
            if (finished) return;
            i += 1;
            on.textContent = text.slice(0, i);
            off.textContent = text.slice(i);
            if (i >= text.length) {
              if (!keepCursor) { el.textContent = text; }
              else { off.remove(); }
              el.classList.add('t-done');
              done();
              return;
            }
            /* Rhythm, not jitter: a beat after each comma, a breath at each
               space, and a slow, steady pace for the rest of the line. */
            var c = text.charAt(i - 1);
            var wait = c === ',' ? rate * 7 : c === ' ' ? rate * 1.6 : c === '.' ? rate * 4 : rate;
            timers.push(window.setTimeout(step, wait));
          }());
        }
        timers.push(window.setTimeout(function () {
          typeInto(commandLine, cmdText, 10, false, function () {
            timers.push(window.setTimeout(function () {
              typeInto(heroTitle, titleText, 18, true, function () {
                timers.push(window.setTimeout(function () {
                  rootEl.classList.remove('js-typing');
                  rootEl.classList.add('typing-done');
                  finished = true;
                }, 120));
              });
            }, 150));
          });
        }, 200));
      }());

  /* Motion layer (Nov 10). Native scroll only: one passive listener writes
     --scroll (a registered number) on the hero, CSS turns it into three
     depths. Section headings get a cursor that blinks four times and goes.
     Nothing here hides or delays content. Off under reduced motion. */
      (function () {
        var mm = function (q) { return window.matchMedia ? window.matchMedia(q).matches : false; };
        if (mm('(prefers-reduced-motion: reduce)')) return;
        var rootEl = document.documentElement;
        rootEl.classList.add('mo-on');
        if (window.CSS && CSS.registerProperty) {
          try { CSS.registerProperty({ name: '--scroll', syntax: '<number>', inherits: true, initialValue: '0' }); } catch (e) {}
        }
        var hero = document.querySelector('.terminal');
        var heroH = hero ? hero.offsetHeight : 0;
        var ticking = false;
        function write() {
          ticking = false;
          if (hero) hero.style.setProperty('--scroll', Math.min(window.scrollY, heroH).toFixed(1));
        }
        window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(write); } }, { passive: true });
        window.addEventListener('resize', function () { heroH = hero ? hero.offsetHeight : 0; }, { passive: true });
        write();

        /* readout values flicker once per 8 s loop, each on its own phase */
        Array.prototype.forEach.call(document.querySelectorAll('.rail-readout strong'), function (el, i) {
          el.style.setProperty('--mo-delay', (-((i * 2.9 + 1.3) % 8)).toFixed(2) + 's');
        });

        /* press: squash and spring back */
        document.addEventListener('pointerdown', function (e) {
          var b = e.target.closest && e.target.closest('.button, .nav-link, .bottom-nav__link, .status-toggle');
          if (!b || !b.animate) return;
          b.animate([{ scale: '1' }, { scale: '.96', offset: .25 }, { scale: '1.02', offset: .65 }, { scale: '1' }],
            { duration: 420, easing: 'ease-out' });
        });

        /* section headings: a cursor ticks after the heading when it arrives */
        if ('IntersectionObserver' in window) {
          var heads = document.querySelectorAll('.section-heading h2, .systems-copy h2, .niche-copy h2, .call-panel h2');
          var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
              if (!en.isIntersecting) return;
              io.unobserve(en.target);
              var t = document.createElement('span');
              t.className = 'mo-tick';
              t.setAttribute('aria-hidden', 'true');
              en.target.appendChild(t);
              window.setTimeout(function () { t.remove(); }, 3700);
            });
          }, { threshold: .6 });
          Array.prototype.forEach.call(heads, function (h) { io.observe(h); });
        }
      }());
