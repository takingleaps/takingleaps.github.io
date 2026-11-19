(() => {
  const scene = document.querySelector("#hero-scene");
  const plate = scene?.querySelector("[data-frame-root]");
  if (!plate) return;

  const stage = scene.querySelector(".hero-stage");
  const masthead = document.querySelector(".masthead");
  const still = plate.querySelector("#hero-image");
  const displayed = plate.querySelector("#turn-frame");
  const strip = plate.querySelector(".turn-strip");
  const controls = plate.querySelector(".turn-controls");
  const disclosure = plate.querySelector(".turn-disclosure");
  const title = plate.querySelector("#turn-title");
  const spec = plate.querySelector("#turn-spec");
  const sale = plate.querySelector("#turn-sale");
  const step = plate.querySelector("#turn-step");
  const drop = document.querySelector("#drop .section-lead");
  const dots = [...plate.querySelectorAll("[data-turn-to]")];
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const toggle = document.querySelector("#reduce-motion");
  const frames = Array.from({ length: 24 }, (_, index) => (
    `${plate.dataset.frameRoot}${String(index * 15).padStart(3, "0")}.webp`
  ));
  const captions = [
    ["Blue Mirror", "Polarized sports frames"],
    ["Silver wraparound frame", "Polarized sports frames"],
    ["Blue Mirror lens", "Polarized lens"],
    ["Temple and hinge", "Polarized sports frames"],
    ["Blue Mirror", "Polarized sports frames"],
  ];
  // The lens holds the center of the reveal and the orbit then returns to the catalog pose.
  const timeline = [[0, 0], [.22, 3], [.45, 5], [.57, 7], [.76, 9], [.98, 23]];
  let preferred = false;
  let ready = false;
  let queued = 0;
  let activeFrame = -2;
  let activeState = -1;
  const clamp = value => Math.min(1, Math.max(0, value));

  function frameAt(progress) {
    if (progress >= .985) return -1;
    for (let index = 1; index < timeline.length; index++) {
      const [end, next] = timeline[index];
      if (progress <= end) {
        const [start, current] = timeline[index - 1];
        return Math.round(current + (next - current) * (progress - start) / (end - start));
      }
    }
    return frames.length - 1;
  }

  function showFrame(index) {
    if (activeFrame === index) return;
    activeFrame = index;
    if (index >= 0) displayed.src = frames[index];
    displayed.hidden = index < 0;
    still.hidden = index >= 0;
    scene.dataset.turnFrame = index < 0 ? "catalog" : String(index);
  }

  function showState(index) {
    if (activeState === index) return;
    activeState = index;
    [title.textContent, spec.textContent] = captions[index];
    sale.hidden = index < 3;
    const selected = Math.min(index, 3);
    step.textContent = `Step ${selected + 1} of 4`;
    for (const [number, dot] of dots.entries()) {
      if (selected === number) dot.setAttribute("aria-current", "step");
      else dot.removeAttribute("aria-current");
    }
    scene.dataset.turnState = String(index);
  }

  function draw() {
    queued = 0;
    const mode = scene.dataset.turnMode;
    if (mode !== "scrub" && mode !== "flow") return;
    const travel = mode === "scrub"
      ? scene.offsetHeight - stage.offsetHeight
      : Math.max(175, Math.min(innerHeight * .37, 300));
    if (travel <= 0) return;
    const progress = clamp((masthead.offsetHeight - scene.getBoundingClientRect().top) / travel);
    showFrame(frameAt(progress));
    const state = progress >= .985 ? 4 : progress >= .735 ? 3 : progress >= .48 ? 2 : progress >= .23 ? 1 : 0;
    showState(state);
  }

  function schedule() {
    if (!queued && /^(scrub|flow)$/.test(scene.dataset.turnMode)) queued = requestAnimationFrame(draw);
  }

  function measure() {
    scene.style.setProperty("--hero-top", `${masthead.offsetHeight}px`);
    const stripHeight = strip.hidden ? 0 : strip.offsetHeight + 12;
    const controlsHeight = controls.hidden ? 44 : 0;
    const fits = stage.offsetHeight - stripHeight + controlsHeight + masthead.offsetHeight
      <= document.documentElement.clientHeight;
    const compact = innerWidth <= 680 || innerHeight <= 740;
    const mode = !ready ? "still" : motion.matches || preferred ? "reduced" : !compact && fits ? "scrub" : "flow";
    if (scene.dataset.turnMode !== mode) scene.dataset.turnMode = mode;
    controls.hidden = mode !== "scrub";
    strip.hidden = mode !== "reduced";
    disclosure.hidden = !ready;
    if (mode === "scrub" || mode === "flow") schedule();
    else {
      showFrame(-1);
      showState(0);
      if (ready) sale.hidden = false;
    }
    toggle.setAttribute("aria-pressed", String(motion.matches || preferred));
    toggle.disabled = motion.matches;
  }

  for (const dot of dots) {
    dot.addEventListener("click", () => {
      const start = window.scrollY + scene.getBoundingClientRect().top - masthead.offsetHeight;
      const travel = scene.offsetHeight - stage.offsetHeight;
      window.scrollTo({ top: start + travel * Number(dot.dataset.turnTo), behavior: "instant" });
    });
  }
  toggle.addEventListener("click", () => {
    preferred = !preferred;
    measure();
  });
  motion.addEventListener("change", measure);
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", measure);
  const observer = new ResizeObserver(measure);
  observer.observe(stage);
  observer.observe(masthead);
  if (drop && "IntersectionObserver" in window) {
    const dropObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        drop.classList.add("drop-arrived");
        dropObserver.disconnect();
      }
    }, {threshold: .22});
    dropObserver.observe(drop);
  }
  measure();

  Promise.all(frames.map(async (source) => {
    const preload = new Image();
    preload.src = source;
    await preload.decode();
  })).then(() => {
    for (const image of strip.querySelectorAll("[data-angle]")) {
      image.src = `${plate.dataset.frameRoot}${image.dataset.angle}.webp`;
    }
    ready = true;
    measure();
  }).catch(() => {
    // Any missing frame leaves the actual catalog photo and navigation visible.
    ready = false;
    measure();
  });
})();
