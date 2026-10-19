/* Static-page binding: every number on the page comes from assets/data/results.json (the public, sanitized copy
   of final_results_v2.json). Elements: <bdi dir="ltr" data-v="path.to.value" data-fmt="3|pct|e|int" data-unit="cm/s"
   data-scale="100">. English and Arabic pages read the same file. */
(function () {
  "use strict";
  var LANG = document.documentElement.lang === "ar" ? "ar" : "en";
  var B = window.Bidi;
  var ROOT = document.body.getAttribute("data-root") || "../";
  function get(o, path) { return path.split(".").reduce(function (a, k) { return a == null ? a : a[/^\d+$/.test(k) ? +k : k]; }, o); }
  function fmt(v, f, scale) {
    if (v === null || v === undefined) return "—";
    if (typeof v === "number" && scale) v = v * scale;
    if (f === "int") return Math.round(v).toLocaleString("en-US");
    if (f === "pct") return (v * 100).toFixed(1) + "%";
    if (f === "pct0") return (v * 100).toFixed(0) + "%";
    if (f === "e") return v.toExponential(1);
    if (f === "raw") return String(v);
    return B.fmtNum(v, f === undefined ? 3 : parseInt(f, 10));
  }
  function bind(data) {
    document.querySelectorAll("[data-v]").forEach(function (el) {
      var v = get(data, el.dataset.v);
      var s = fmt(v, el.dataset.fmt, el.dataset.scale ? parseFloat(el.dataset.scale) : 0);
      el.textContent = s + (el.dataset.unit ? " " + el.dataset.unit : "");
      el.setAttribute("dir", "ltr");
      if (v === undefined) { el.classList.add("missing"); console.warn("missing value", el.dataset.v); }
    });
    var T = window.PAGE_TEXT[LANG];
    // experiments table
    var tb = document.getElementById("exp-table");
    if (tb) {
      var sel = data.prediction.selected.experiment_id;
      var head = "<tr>" + T.exp_cols.map(function (c) { return "<th>" + c + "</th>"; }).join("") + "</tr>";
      var rows = data.prediction.experiments.map(function (r) {
        var cls = r.experiment_id === sel ? "sel" : (r.experiment_id === "P0_LRP_baseline" ? "base" : "");
        var name = (T.exp_names[r.experiment_id] || r.experiment_id);
        function n(x, d) { return '<td class="n">' + B.ltrToken(B.fmtNum(x, d), "num") + "</td>"; }
        return '<tr class="' + cls + '"><td>' + B.ltrToken(r.experiment_id.split("_")[0]) + " " + name + "</td>" +
          n(r.val_L_nested, 3) + n(r.val_L_nested_std, 3) + n(r.test_L, 4) +
          '<td class="n">' + B.ltrToken("[" + B.fmtNum(r.test_L_ci95[0], 3) + ", " + B.fmtNum(r.test_L_ci95[1], 3) + "]", "num") + "</td>" +
          n(r.test_F2, 3) + n(r.test_MSE_HR, 3) + n(r.test_PR_AUC, 3) + n(r.test_precision, 3) + n(r.test_recall, 3) +
          '<td class="n">' + B.ltrToken(r.TP + " / " + r.FP + " / " + r.FN, "num") + "</td></tr>";
      }).join("");
      tb.innerHTML = "<thead>" + head + "</thead><tbody>" + rows + "</tbody>";
    }
    var ut = document.getElementById("unc-table");
    if (ut) {
      var head2 = "<tr>" + T.unc_cols.map(function (c) { return "<th>" + c + "</th>"; }).join("") + "</tr>";
      var order = { perfect_state: 0, typical_camera_track: 1, including_track_failures: 2 };
      var rows2 = data.uncertainty.results.slice().sort(function (a, b) { return order[a.case] - order[b.case] || a.margin_k - b.margin_k; }).map(function (r) {
        function n(x, d) { return '<td class="n">' + B.ltrToken(B.fmtNum(x, d), "num") + "</td>"; }
        return "<tr><td>" + T.unc_case[r.case] + "</td>" + '<td class="n">' + B.ltrToken(r.margin_k + "σ") + "</td>" +
          '<td class="n">' + B.ltrToken(B.fmtNum(r.bearing_sigma_deg, 4) + "°", "num") + "</td>" +
          n(r.sigma_lat_m, 1) + '<td class="n">' + B.ltrToken((r.safe_rate * 100).toFixed(1) + "%", "num") + "</td>" +
          '<td class="n">' + B.ltrToken((r.recovered_rate * 100).toFixed(1) + "%", "num") + "</td>" +
          '<td class="n">' + B.ltrToken((r.safe_and_recovered_rate * 100).toFixed(1) + "%", "num") + "</td>" +
          '<td class="n">' + B.ltrToken("×" + B.fmtNum(r.dv_inflation_median, 2), "num") + "</td>" +
          n(r.rr_p95, 1) + n(r.vv_p95 * 1000, 3) + "</tr>";
      }).join("");
      ut.innerHTML = "<thead>" + head2 + "</thead><tbody>" + rows2 + "</tbody>";
    }
    document.documentElement.setAttribute("data-bound", "1");
  }
  fetch(ROOT + "assets/data/results.json").then(function (r) { return r.json(); }).then(function (d) { window.__results = d; bind(d); })
    .catch(function (e) { console.error(e); });
})();
