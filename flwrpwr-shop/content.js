/* FLWRPWR live content: pulls editable site copy from Supabase when the
   flwrpwr_content table exists. If the table is missing, or the request
   fails, the page keeps the copy baked into the HTML. Silent by design. */
(function () {
  var SB_URL = "https://dqcoincagejyowqxqqnz.supabase.co";
  var SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxY29pbmNhZ2VqeW93cXhxcW56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMzY4NTQsImV4cCI6MjEwNjcxMjg1NH0.dG7GwddKfuoq08DX_SgtluxWKAU-hyAjMZcAc320ysI";
  function apply(rows) {
    rows.forEach(function (r) {
      if (!r || !r.key || typeof r.value !== "string") return;
      var els = document.querySelectorAll('[data-content="' + r.key + '"]');
      for (var i = 0; i < els.length; i++) {
        if (r.value.trim() !== "") els[i].textContent = r.value;
      }
    });
  }
  try {
    fetch(SB_URL + "/rest/v1/flwrpwr_content?select=key,value", {
      headers: { apikey: SB_ANON, Authorization: "Bearer " + SB_ANON }
    })
      .then(function (res) { return res.ok ? res.json() : []; })
      .then(function (rows) { if (rows && rows.length) apply(rows); })
      .catch(function () {});
  } catch (e) {}
})();
