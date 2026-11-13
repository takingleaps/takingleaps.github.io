/* FLWRPWR signup wiring: every Notify Me / subscribe form on the shop saves
   the email to Supabase (table flwrpwr_signups) instead of going nowhere.
   Forms wired: flwrSoonForm (Coming Soon overlay, all 10 pages),
   subscribeForm (footer, all 10 pages), joinForm (home page only).
   - Validates the email, then POSTs {email, source} with the anon key.
   - On success the form hides and the "you're on the list" line shows.
   - If Supabase is unreachable or the table is not set up yet, the email is
     queued on-device and retried on later page loads, and the visitor still
     sees the success line. Nothing is shown to the visitor about the queue.
   Silent by design: no console errors, no change to the forms' look. */
(function () {
  var SB_URL = "https://dqcoincagejyowqxqqnz.supabase.co";
  var SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxY29pbmNhZ2VqeW93cXhxcW56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMzY4NTQsImV4cCI6MjEwNjcxMjg1NH0.dG7GwddKfuoq08DX_SgtluxWKAU-hyAjMZcAc320ysI";
  var QUEUE_KEY = "flwrpwr_signups_pending_v1";
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  function pageName() {
    try {
      var p = (location.pathname || "/").split("/").pop();
      return p || "index.html";
    } catch (e) { return "index.html"; }
  }

  function loadQueue() {
    try {
      var q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]") || [];
      return Array.isArray(q) ? q : [];
    } catch (e) { return []; }
  }
  function saveQueue(q) {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch (e) {}
  }
  function enqueue(row) {
    var q = loadQueue();
    var exists = false;
    for (var i = 0; i < q.length; i++) {
      if (q[i] && q[i].email === row.email) { exists = true; break; }
    }
    if (!exists) q.push(row);
    if (q.length > 200) q = q.slice(-200);
    saveQueue(q);
  }

  function postSignup(row) {
    if (!window.fetch) return Promise.resolve(false);
    var ctrl = null, timer = null;
    try {
      if ("AbortController" in window) {
        ctrl = new AbortController();
        timer = setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, 5000);
      }
    } catch (e) {}
    return fetch(SB_URL + "/rest/v1/flwrpwr_signups?on_conflict=email", {
      method: "POST",
      headers: {
        apikey: SB_ANON,
        Authorization: "Bearer " + SB_ANON,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify(row),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      if (timer) clearTimeout(timer);
      return r.ok;
    }).catch(function () {
      if (timer) clearTimeout(timer);
      return false;
    });
  }

  function flushQueue() {
    var q = loadQueue();
    if (!q.length) return;
    var remaining = q.slice();
    var chain = Promise.resolve();
    q.forEach(function (row) {
      chain = chain.then(function () {
        return postSignup(row).then(function (ok) {
          if (ok) {
            for (var i = 0; i < remaining.length; i++) {
              if (remaining[i] && remaining[i].email === row.email) { remaining.splice(i, 1); break; }
            }
            saveQueue(remaining);
          }
        });
      });
    });
  }

  function wire(cfg) {
    var form = document.getElementById(cfg.form);
    if (!form) return;
    var input = document.getElementById(cfg.input);
    var done = document.getElementById(cfg.done);
    var err = cfg.err ? document.getElementById(cfg.err) : null;
    if (!input) return;
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var v = (input.value || "").trim().toLowerCase();
      if (!EMAIL_RE.test(v)) {
        if (err) err.hidden = false;
        if (done) done.hidden = true;
        try { input.focus(); input.select(); } catch (e) {}
        return;
      }
      var row = { email: v, source: pageName() };
      postSignup(row).then(function (ok) {
        if (!ok) enqueue(row);
        if (err) err.hidden = true;
        if (done) done.hidden = false;
        form.hidden = true;
      });
    });
  }

  function init() {
    wire({ form: "flwrSoonForm", input: "flwrSoonEmail", done: "flwrSoonDone", err: "flwrSoonErr" });
    wire({ form: "joinForm", input: "joinEmail", done: "joinDone", err: null });
    wire({ form: "subscribeForm", input: "subscribeEmail", done: "subscribeDone", err: null });
    flushQueue();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
