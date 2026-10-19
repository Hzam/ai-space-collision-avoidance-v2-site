/* Interactive mission-control replay. Visualises PRECOMPUTED scientific results only (scenario JSON + camera replay
   JSON). JavaScript interpolates positions for smooth animation; it never generates scientific values. */
(function () {
  "use strict";
  var LANG = document.documentElement.lang === "ar" ? "ar" : "en";
  var S = window.I18N[LANG], B = window.Bidi;
  var ROOT = document.body.getAttribute("data-root") || "../";
  var $ = function (id) { return document.getElementById(id); };
  var COL = {};
  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    ["nominal", "threat", "avoid", "recover", "twoimp", "accent", "ok", "bad", "warn", "muted", "faint", "text", "line", "violet"]
      .forEach(function (k) { COL[k] = cs.getPropertyValue("--" + k).trim() || "#999"; });
    // canvases are always dark: use the dark-theme text colours regardless of the page theme
    COL.text = "#e6edf7"; COL.muted = "#9fb0c8"; COL.faint = "#6b7d99";
  }
  var ISO = function (x) { return "\u2066" + x + "\u2069"; };  // Unicode LTR isolate for numbers inside canvas text
  var CVT = {
    en: { decision: "decision", predicted: "predicted", pred_low: "predicted < −6", final: "final risk (label)", days: "days to TCA",
          tl: "time from TCA", nominal: "nominal (phantom) satellite", debris: "debris passes {v} from us", dist: "distance from nominal trajectory: {v}",
          burn: "burn {i} · {v}", trim: "trim · {v}", earth_note: "km-scale manoeuvres are invisible at Earth scale → see 'Distance from nominal'",
          alt: "altitude {a} · inclination {i}", enc_note: "encounter plane (B-plane) · ellipses: 1σ / 3σ position uncertainty",
          enc_foot: "relative speed {v} · hard-body radius {r} · safe = miss ≥ 1 km and Pc ≤ 1e-6", without: "WITHOUT MANOEUVRE: miss {m}, {pp}",
          with_: "WITH MANOEUVRE: miss {m}, {pp}", unsafe: " (unsafe)", safe: " (safe)", notsafe: " (NOT safe)", safety: "1 km safety distance",
          frame: "SIMULATED · frame {k}/{n} · t = {t} s", handed: "track handed to the manoeuvre planner", standby: "CAMERA STANDBY",
          off: "not activated (no alert)", obj: "object {c}", after: "(after)" },
    ar: { decision: "القرار", predicted: "متوقع", pred_low: "متوقع " + ISO("< −6"), final: "الخطر النهائي", days: "أيام حتى " + ISO("TCA"),
          tl: "الوقت من " + ISO("TCA"), nominal: "القمر الاسمي (المرجعي)", debris: "يمر الحطام على بعد {v}", dist: "البعد عن المسار الاسمي: {v}",
          burn: "الدفعة {i} · {v}", trim: "تصحيح صغير · {v}", earth_note: "مناورات بمقياس الكيلومتر لا تُرى بمقياس الأرض ← انظر «البعد عن المسار الاسمي»",
          alt: "الارتفاع {a} · الميل {i}", enc_note: "مستوى الاقتراب " + ISO("(B-plane)") + " · القطوع: عدم يقين الموقع " + ISO("1σ / 3σ"),
          enc_foot: "السرعة النسبية {v} · نصف القطر {r} · آمن = مسافة " + ISO("≥ 1 km") + " و" + ISO("Pc ≤ 1e-6"),
          without: "بدون مناورة: المسافة {m}، {pp}", with_: "مع المناورة: المسافة {m}، {pp}",
          unsafe: " (غير آمن)", safe: " (آمن)", notsafe: " (غير آمن)", safety: "مسافة الأمان " + ISO("1 km"),
          frame: "مُحاكى · الإطار {k}/{n} · " + ISO("t = {t} s"), handed: "سُلِّم المسار إلى مخطِّط المناورة", standby: "الكاميرا في وضع الانتظار",
          off: "لم تُفعَّل (لا يوجد تنبيه)", obj: "جسم {c}", after: "بعد" }
  }[document.documentElement.lang === "ar" ? "ar" : "en"];
  function cvt(key, vals) {
    var s = CVT[key];
    for (var k in vals || {}) s = s.replace("{" + k + "}", ISO(vals[k]));
    return s;
  }
  var st = { sc: null, cam: null, imgs: [], chapters: [], total: 1, p: 0, playing: false, speed: 1, mode: "auto",
             view: "earth", viewAuto: true, perception: "typical", margin: 0, scenarioId: "success", last: 0, errors: [] };
  window.__mission = st;

  // ---------------------------------------------------------------- data
  function fetchJSON(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(u + " " + r.status); return r.json(); }); }

  function variant() {
    var sc = st.sc, M = sc.maneuver;
    if (!M) return null;
    var key = st.perception + "|" + (st.perception === "perfect" ? 0 : st.margin);
    var vv = M.variants[key];
    if (st.perception === "perfect" || !vv || !vv.representative) {
      var n = M.nominal;
      return { kind: "nominal", dv_avoid_cms: n.dv_avoid_cms, direction: M.direction, lead_days: M.lead_days, burns: n.burns,
               traj: n.traj, miss: n.miss_after_m_j2, pc: n.pc_after_j2, safe: n.safe_j2, resid_r: n.resid_r_m,
               resid_v: n.resid_v_mms, recovered: n.recovered, dv_total: n.dv_total_cms, dv_rec: n.dv_recovery_cms,
               rec_end_h: n.recovery_end_h, miss_before_xy: n.miss_before_xy, miss_after_xy: n.miss_after_xy, cov_xy: n.cov_xy,
               mc: M.variants["perfect|0"] || null };
    }
    var r = vv.representative;
    return { kind: "mc", dv_avoid_cms: r.dv_avoid_cms, direction: r.direction, lead_days: r.lead_days, burns: r.burns,
             traj: r.traj, miss: r.miss_true_m, pc: r.pc_true, safe: r.safe, resid_r: r.resid_r_m, resid_v: r.resid_v_mms,
             recovered: r.recovered, dv_total: r.dv_total_cms,
             dv_rec: r.dv_total_cms - r.burns[0].mag_cms, rec_end_h: r.burns[r.burns.length - 1].t_h, closed_loop: true,
             miss_before_xy: r.miss_before_xy, miss_after_xy: r.miss_after_xy, cov_xy: r.cov_xy, mc: vv, est_err: r.estimate_error_m };
  }

  function cameraName() {
    if (!st.sc.camera) return null;
    return st.perception === "failure" ? "track_failure" : st.sc.camera;
  }

  function loadCamera(name) {
    if (!name) { st.cam = null; st.imgs = []; return Promise.resolve(); }
    if (st.cam && st.cam.name === name) return Promise.resolve();
    return fetchJSON(ROOT + "assets/camera/" + name + "/replay.json").then(function (meta) {
      st.cam = meta;
      st.imgs = meta.frames.map(function (f) {
        var im = new Image(); im.decoding = "async";
        im.src = ROOT + "assets/camera/" + name + "/f" + String(f.k).padStart(3, "0") + ".jpg"; return im;
      });
    });
  }

  function load(id, keepProgress) {
    var frac = st.total ? st.p / st.total : 0;
    st.loading = true;
    return fetchJSON(ROOT + "assets/data/scenarios/scenario_" + id + ".json").then(function (sc) {
      st.sc = sc; st.scenarioId = id;
      if (!sc.maneuver) { st.perception = st.perception; }
      return loadCamera(cameraName());
    }).then(function () {
      buildChapters(); st.loading = false;
      st.p = keepProgress ? frac * st.total : 0;
      syncControls(); renderChapters(); hideSummary();
    }).catch(function (e) { st.loading = false; st.errors.push(String(e)); console.error(e); });
  }

  // ---------------------------------------------------------------- timeline
  function buildChapters() {
    var sc = st.sc, v = variant();
    var cd = sc.cdms, t0 = -cd[0].t_tca_d * 24 - 6, tdec = -cd[cd.length - 1].t_tca_d * 24;
    var C = [];
    function add(id, dur, tm, extra) { var c = { id: id, dur: dur, tm: tm }; for (var k in extra || {}) c[k] = extra[k]; C.push(c); }
    add("identify", 4, [t0, t0]);
    add("cdms", 10, [t0, tdec]);
    add("predict", 7, [tdec, tdec]);
    if (v) {
      add("trigger", 3, [tdec, tdec]);
      var fr = st.cam ? st.cam.frames : [], N = fr.length;
      var f1 = fr.findIndex(function (f) { return f.dets.length > 0; }); if (f1 < 0) f1 = Math.floor(N / 3);
      var f2 = fr.findIndex(function (f) { return f.status === "tracked"; }); if (f2 < 0 || f2 < f1) f2 = Math.min(N - 1, f1 + 3);
      add("camera", 3 + Math.min(4, f1 / 10), [tdec, tdec], { cam: [0, Math.max(0, f1)] });
      add("detect", 4, [tdec, tdec], { cam: [Math.max(0, f1), f2] });
      add("track", 6, [tdec, tdec], { cam: [f2, N - 1] });
      var b = v.burns, tb1 = b[0].t_h;
      var kb = function (k) { for (var i = 0; i < b.length; i++) if (b[i].kind === k) return b[i].t_h; return null; };
      var tb2 = kb("recovery_start") !== null ? kb("recovery_start") : b[1].t_h;
      var tb3 = kb("recovery_stop") !== null ? kb("recovery_stop") : b[b.length - 1].t_h;
      var tEnd = b[b.length - 1].t_h;
      add("candidates", 5, [tdec, tb1]);
      add("burn1", 7, [tb1, -1.0]);
      add("tca", 9, [-1.0, 1.0]);
      add("recovery", 4, [1.0, tb2 + 0.4]);
      add("phasing", 8, [tb2 + 0.4, tb3 - 0.6]);
      add("restored", 5, [tb3 - 0.6, Math.max(tb3, tEnd) + 3]);
      add("summary", 7, [Math.max(tb3, tEnd) + 3, Math.max(tb3, tEnd) + 3]);
    } else {
      add("notrigger", 7, [tdec, -1.0]);
      add("outcome", 9, [-1.0, 1.0]);
      add("summary", 6, [1.0, 1.0]);
    }
    var acc = 0;
    C.forEach(function (c) { c.start = acc; acc += c.dur; });
    st.chapters = C; st.total = acc;
  }

  function at(p) {
    var C = st.chapters, c = C[C.length - 1];
    for (var i = 0; i < C.length; i++) if (p < C[i].start + C[i].dur) { c = C[i]; break; }
    var f = Math.max(0, Math.min(1, (p - c.start) / c.dur));
    var ease = c.id === "tca" ? f : f;
    var tm = c.tm[0] + (c.tm[1] - c.tm[0]) * ease;
    var camIdx = null;
    if (c.cam) camIdx = Math.round(c.cam[0] + (c.cam[1] - c.cam[0]) * f);
    else if (st.cam && ["candidates", "burn1"].indexOf(c.id) >= 0) camIdx = st.cam.frames.length - 1;
    return { ch: c, f: f, tm: tm, cam: camIdx, idx: C.indexOf(c) };
  }

  // ---------------------------------------------------------------- canvas helpers
  function prep(cv, aspect) {
    var dpr = window.devicePixelRatio || 1, w = cv.clientWidth || 300, h = Math.round(w * aspect);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.height = h + "px";
    }
    var g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    g.fillStyle = "#050912"; g.fillRect(0, 0, w, h);
    return { g: g, w: w, h: h };
  }
  function txt(g, s, x, y, col, size, align) {
    g.fillStyle = col || COL.muted; g.font = (size || 11) + "px " + (LANG === "ar" ? "Noto Kufi Arabic, Tahoma, sans-serif" : "Inter, system-ui, sans-serif");
    g.textAlign = align || "left"; g.direction = /[\u0600-\u06ff]/.test(s) ? "rtl" : "ltr"; g.fillText(s, x, y);
  }
  function interp(arrT, arrV, t) {
    if (t <= arrT[0]) return arrV[0];
    if (t >= arrT[arrT.length - 1]) return arrV[arrV.length - 1];
    var lo = 0, hi = arrT.length - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (arrT[mid] <= t) lo = mid; else hi = mid; }
    var f = (t - arrT[lo]) / (arrT[hi] - arrT[lo]); return arrV[lo] + f * (arrV[hi] - arrV[lo]);
  }
  function fmt(x, d) { return B.fmtNum(x, d); }

  // ---------------------------------------------------------------- risk panel
  function drawRisk(s) {
    var sc = st.sc, cv = $("risk-cv"), P = prep(cv, 0.62), g = P.g, w = P.w, h = P.h;
    var cd = sc.cdms, tmax = Math.max(7, Math.ceil(cd[0].t_tca_d)), ttca = -s.tm / 24;
    var risks = cd.map(function (c) { return c.risk; });
    var ymin = Math.min(-12, Math.min.apply(null, risks) - 1, sc.truth.final_risk - 1), ymax = Math.max(-2, Math.max.apply(null, risks) + 1);
    ymin = Math.max(ymin, -31);
    var L = 34, R = 8, T = 10, Bm = 22;
    var X = function (d) { return L + (1 - d / tmax) * (w - L - R); }, Y = function (r) { return T + (ymax - r) / (ymax - ymin) * (h - T - Bm); };
    g.strokeStyle = "#1c2a44"; g.lineWidth = 1;
    for (var dd = 0; dd <= tmax; dd++) { g.beginPath(); g.moveTo(X(dd), T); g.lineTo(X(dd), h - Bm); g.stroke(); txt(g, String(dd), X(dd), h - 8, COL.faint, 10, "center"); }
    for (var yy = Math.ceil(ymin / 5) * 5; yy <= ymax; yy += 5) { txt(g, String(yy).replace("-", "−"), L - 4, Y(yy) + 3, COL.faint, 10, "right"); }
    txt(g, cvt("days"), w - R, h - 8 - 10, COL.faint, 9, "right");
    g.strokeStyle = COL.bad; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(L, Y(-6)); g.lineTo(w - R, Y(-6)); g.stroke(); g.setLineDash([]);
    txt(g, "−6", w - R - 2, Y(-6) - 4, COL.bad, 10, "right");
    g.strokeStyle = "#475569"; g.setLineDash([2, 3]); g.beginPath(); g.moveTo(X(2), T); g.lineTo(X(2), h - Bm); g.stroke(); g.setLineDash([]);
    txt(g, cvt("decision"), X(2) + 3, T + 9, COL.faint, 9);
    var shown = cd.filter(function (c) { return c.t_tca_d >= ttca - 1e-9; });
    if (s.ch.id === "identify") shown = [];
    g.strokeStyle = COL.accent; g.lineWidth = 1.5; g.beginPath();
    shown.forEach(function (c, i) { var x = X(c.t_tca_d), y = Y(c.risk); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke();
    shown.forEach(function (c, i) { g.fillStyle = i === shown.length - 1 ? "#fff" : COL.accent; g.beginPath(); g.arc(X(c.t_tca_d), Y(c.risk), 3, 0, 7); g.fill(); });
    var after = s.idx >= st.chapters.findIndex(function (c) { return c.id === "predict"; });
    var atDec = cd.filter(function (c) { return c.t_tca_d >= 2 - 1e-9; });
    if (after && atDec.length && s.ch.id !== "cdms" && s.ch.id !== "identify") {
      var cdec = atDec[atDec.length - 1];
      g.strokeStyle = "#ffffff"; g.lineWidth = 2; g.beginPath(); g.arc(X(cdec.t_tca_d), Y(cdec.risk), 6.5, 0, 7); g.stroke(); g.lineWidth = 1;
    }
    if (after && s.ch.id !== "cdms" && s.ch.id !== "identify") {
      var p = sc.prediction, pr = p.triggered ? p.predicted_risk : -6.6;
      g.fillStyle = p.triggered ? COL.warn : COL.muted; g.beginPath(); g.moveTo(X(0.15), Y(pr) - 6); g.lineTo(X(0.15) + 6, Y(pr)); g.lineTo(X(0.15), Y(pr) + 6); g.lineTo(X(0.15) - 6, Y(pr)); g.fill();
      txt(g, p.triggered ? cvt("predicted") : cvt("pred_low"), X(0.15) - 8, Y(pr) - 8, p.triggered ? COL.warn : COL.muted, 9, "right");
    }
    if (s.ch.id === "summary" || s.ch.id === "outcome") {
      var fr = sc.truth.final_risk; g.fillStyle = COL.bad; star(g, X(0.3), Y(Math.max(fr, ymin + 0.5)), 7);
      txt(g, cvt("final"), X(0.3) - 9, Y(Math.max(fr, ymin + 0.5)) + 16, COL.bad, 9, "right");
    }
    // readouts
    var last = shown.length ? shown[shown.length - 1] : null;
    $("ro-ttca").innerHTML = s.tm > 0 ? (LANG === "ar" ? CVT.after + " " + B.ltrValue(Math.abs(s.tm) / 24, "d", 2) : B.ltrToken(fmt(Math.abs(s.tm) / 24, 2) + " d (after)", "num")) : B.ltrValue(Math.abs(s.tm) / 24, "d", 2);
    $("ro-ncdm").innerHTML = B.ltrToken(String(shown.length) + " / " + cd.length, "num");
    $("ro-latest").innerHTML = last ? B.ltrValue(last.risk, "", 2) : "—";
    var pp = sc.prediction;
    $("ro-prob").innerHTML = after && s.ch.id !== "cdms" && s.ch.id !== "identify" ? B.ltrExpression(fmt(pp.ml_probability, 3) + " (τ = " + fmt(pp.promotion_threshold, 2) + ")") : "—";
    $("ro-pred").innerHTML = after && s.ch.id !== "cdms" && s.ch.id !== "identify" ? (pp.triggered ? B.ltrValue(pp.predicted_risk, "", 2) : B.ltrExpression("< −6")) : "—";
    $("ro-trig").innerHTML = after && s.ch.id !== "cdms" && s.ch.id !== "identify" ? (pp.triggered ? '<span style="color:var(--bad);font-weight:700">' + S.yes + "</span>" : S.no) : "—";
    var list = shown.slice(-6).reverse().map(function (c, i) {
      return '<div class="' + (i === 0 ? "new" : "") + '"><bdi dir="ltr" class="ltr num">T−' + fmt(c.t_tca_d, 2) + " d</bdi><bdi dir=\"ltr\" class=\"ltr num\">risk " + fmt(c.risk, 2) + '</bdi><bdi dir="ltr" class="ltr num">' + Math.round(c.miss_m) + " m</bdi></div>";
    }).join("");
    $("cdm-list").innerHTML = list;
  }
  function star(g, x, y, r) { g.beginPath(); for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r / 2.3 : r; g.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); } g.closePath(); g.fill(); }

  // ---------------------------------------------------------------- orbit views
  function drawEarth(s) {
    var sc = st.sc, O = sc.orbit, cv = $("orbit-cv"), P = prep(cv, 0.68), g = P.g, w = P.w, h = P.h;
    var Re = O.earth_radius_km, sc0 = Math.min(w, h) / 2 / (Re + O.altitude_km + 900) * 0.92;
    var yaw = 0.6 + st.p * 0.02, pitch = 0.42;
    function proj(p) {
      var x = p[0], y = p[1], z = p[2];
      var x1 = x * Math.cos(yaw) - y * Math.sin(yaw), y1 = x * Math.sin(yaw) + y * Math.cos(yaw);
      var y2 = y1 * Math.cos(pitch) - z * Math.sin(pitch), z2 = y1 * Math.sin(pitch) + z * Math.cos(pitch);
      return [w / 2 + x1 * sc0, h / 2 - z2 * sc0, y2];
    }
    // stars
    g.fillStyle = "#1e293b"; for (var i = 0; i < 80; i++) { var sx = (i * 97.13) % w, sy = (i * 57.71) % h; g.fillRect(sx, sy, 1, 1); }
    var grd = g.createRadialGradient(w / 2 - Re * sc0 * 0.3, h / 2 - Re * sc0 * 0.3, Re * sc0 * 0.2, w / 2, h / 2, Re * sc0);
    grd.addColorStop(0, "#1d4ed8"); grd.addColorStop(0.7, "#0b2a6b"); grd.addColorStop(1, "#061433");
    function orbitLine(pts, col, back, dash) {
      g.strokeStyle = col; g.lineWidth = 1.6; g.setLineDash(dash || []);
      g.beginPath(); var pen = false;
      pts.forEach(function (p) {
        var q = proj(p), behind = q[2] > 0 && Math.hypot(q[0] - w / 2, q[1] - h / 2) < Re * sc0;
        if (behind !== back) { pen = false; return; }
        if (pen) g.lineTo(q[0], q[1]); else { g.moveTo(q[0], q[1]); pen = true; }
      }); g.stroke(); g.setLineDash([]);
    }
    orbitLine(O.sat_orbit_km, "rgba(148,163,184,.35)", true); orbitLine(O.debris_orbit_km, "rgba(248,113,113,.35)", true);
    g.fillStyle = grd; g.beginPath(); g.arc(w / 2, h / 2, Re * sc0, 0, 7); g.fill();
    g.strokeStyle = "rgba(56,189,248,.35)"; g.lineWidth = 3; g.beginPath(); g.arc(w / 2, h / 2, Re * sc0 + 2, 0, 7); g.stroke();
    orbitLine(O.sat_orbit_km, COL.nominal, false); orbitLine(O.debris_orbit_km, COL.threat, false, [6, 4]);
    var tsec = s.tm * 3600, Ts = O.sat_period_s, Td = O.debris_period_s;
    var us = ((tsec / Ts) % 1 + 1.5) % 1, ud = ((tsec / Td) % 1 + 1.5) % 1;
    function onPath(pts, u) { var k = u * (pts.length - 1), i0 = Math.floor(k), f = k - i0, a = pts[i0], b2 = pts[Math.min(i0 + 1, pts.length - 1)]; return [a[0] + f * (b2[0] - a[0]), a[1] + f * (b2[1] - a[1]), a[2] + f * (b2[2] - a[2])]; }
    var ps = proj(onPath(O.sat_orbit_km, us)), pd = proj(onPath(O.debris_orbit_km, ud)), pt = proj(O.tca_point_km);
    g.strokeStyle = COL.warn; g.lineWidth = 1; g.beginPath(); g.arc(pt[0], pt[1], 7, 0, 7); g.stroke();
    txt(g, S.tca === "TCA" ? "TCA" : "TCA", pt[0] + 9, pt[1] - 6, COL.warn, 10);
    g.fillStyle = COL.threat; g.beginPath(); g.arc(pd[0], pd[1], 3.5, 0, 7); g.fill();
    g.fillStyle = "#fff"; g.beginPath(); g.arc(ps[0], ps[1], 4.5, 0, 7); g.fill();
    g.strokeStyle = COL.ok; g.beginPath(); g.arc(ps[0], ps[1], 8, 0, 7); g.stroke();
    txt(g, cvt("alt", { a: fmt(O.altitude_km, 0) + " km", i: fmt(O.inclination_deg, 1) + "°" }), 8, h - 10, COL.faint, 10);
    txt(g, cvt("earth_note"), 8, 14, COL.faint, 10);
  }

  function drawRelative(s, v) {
    // distance from the nominal (phantom) satellite versus mission time: the clearest picture of avoid -> recover
    var sc = st.sc, M = sc.maneuver, cv = $("orbit-cv"), P = prep(cv, 0.68), g = P.g, w = P.w, h = P.h;
    var tr = v.traj, A = M.avoid_only.traj, T2 = M.two_impulse.traj, tm = s.tm;
    function dist(trj, i) { return Math.hypot(trj.r[i], trj.t[i], trj.n[i]) / 1000; }
    var t0 = tr.t_h[0], t1 = tr.t_h[tr.t_h.length - 1];
    var dmax = 0;
    [tr, A, T2].forEach(function (trj) { for (var i = 0; i < trj.t_h.length; i++) if (trj.t_h[i] <= t1) dmax = Math.max(dmax, dist(trj, i)); });
    dmax = Math.max(dmax * 1.1, 0.2);
    var L = 44, R = 14, T = 26, Bm = 28;
    var X = function (th) { return L + (th - t0) / (t1 - t0) * (w - L - R); }, Y = function (km) { return T + (1 - km / dmax) * (h - T - Bm); };
    g.strokeStyle = "#1c2a44"; g.lineWidth = 1;
    var hs = niceStep(t1 - t0);
    for (var k = Math.ceil(t0 / hs) * hs; k <= t1; k += hs) { g.beginPath(); g.moveTo(X(k), T); g.lineTo(X(k), h - Bm); g.stroke(); txt(g, (k > 0 ? "+" : "") + fmt(k, 0).replace("\u2212", "−") + " h", X(k), h - 12, COL.faint, 10, "center"); }
    var ds = niceStep(dmax);
    for (var d2 = 0; d2 <= dmax; d2 += ds) { txt(g, fmt(d2, ds < 1 ? 1 : 0) + " km", L - 4, Y(d2) + 3, COL.faint, 9, "right"); }
    txt(g, cvt("tl"), w - R, h - 2, COL.faint, 9, "right");
    g.strokeStyle = COL.nominal; g.lineWidth = 2; g.beginPath(); g.moveTo(L, Y(0)); g.lineTo(w - R, Y(0)); g.stroke();
    txt(g, cvt("nominal"), X(0) + 8, Y(0) - 6, COL.nominal, 10);  // right of TCA: clear of the burn-1 label
    function curve(trj, col, dash, upto, width) {
      g.strokeStyle = col; g.lineWidth = width || 1.6; g.setLineDash(dash || []); g.beginPath(); var on = false;
      for (var i = 0; i < trj.t_h.length; i++) { if (trj.t_h[i] > (upto === undefined ? 1e9 : upto) || trj.t_h[i] > t1) break; var x = X(trj.t_h[i]), y = Y(dist(trj, i)); if (on) g.lineTo(x, y); else { g.moveTo(x, y); on = true; } }
      g.stroke(); g.setLineDash([]);
    }
    curve(tr, hexA(COL.recover, .2), [], undefined, 1);
    if (tm > 0.5) { curve(A, COL.avoid, [6, 4], tm); curve(T2, COL.twoimp, [2, 3], tm); }
    curve(tr, COL.recover, [], tm, 2.6);
    // TCA line and debris crossing
    g.strokeStyle = hexA(COL.threat, .7); g.setLineDash([3, 3]); g.beginPath(); g.moveTo(X(0), T); g.lineTo(X(0), h - Bm); g.stroke(); g.setLineDash([]);
    txt(g, "TCA", X(0) + 4, T - 8, COL.threat, 10);
    if (tm > -1.5 && tm < 1.5) { var a = 1 - Math.abs(tm) / 1.5; g.globalAlpha = a; g.fillStyle = COL.threat; star(g, X(0), Y(0) + 2, 8); g.globalAlpha = 1;
      txt(g, cvt("debris", { v: fmt(v.miss, 0) + " m" }), X(0) + 10, Y(0) - 18, COL.threat, 11); }
    // burns
    v.burns.forEach(function (b, i) {
      if (tm < b.t_h - 0.01) return;
      var bx = X(b.t_h), by = Y(interp(tr.t_h, tr.t_h.map(function (_, j) { return dist(tr, j); }), b.t_h));
      var near = Math.abs(tm - b.t_h) < 3, col = i === 0 ? COL.avoid : COL.recover;
      g.fillStyle = col; g.beginPath(); g.arc(bx, by, near ? 6 : 4, 0, 7); g.fill();
      if (near) { g.strokeStyle = col; g.lineWidth = 1; g.beginPath(); g.arc(bx, by, 12 + 4 * Math.sin(st.p * 8), 0, 7); g.stroke(); }
      if (b.kind === "trim" && !near) { g.fillStyle = COL.recover; g.beginPath(); g.arc(bx, by, 2.5, 0, 7); g.fill(); return; }
      var lbl = b.kind === "trim" ? cvt("trim", { v: fmt(b.mag_cms, 3) + " cm/s" }) : cvt("burn", { i: String(mainIndex(v.burns, i)), v: fmt(b.mag_cms, 2) + " cm/s" });
      var tx = Math.min(Math.max(bx + 8, L + 4), w - R - 120);
      txt(g, lbl, tx, Math.max(T + 12, by - 10 - (i === 2 ? 0 : 0)), near ? COL.text : COL.muted, near ? 12 : 10);
    });
    // current position
    var curD = interp(tr.t_h, tr.t_h.map(function (_, j) { return dist(tr, j); }), tm);
    g.fillStyle = "#fff"; g.beginPath(); g.arc(X(Math.min(Math.max(tm, t0), t1)), Y(curD), 5, 0, 7); g.fill();
    var dm = curD * 1000;
    txt(g, cvt("dist", { v: dm >= 1000 ? fmt(dm / 1000, 2) + " km" : fmt(dm, dm < 10 ? 2 : 0) + " m" }), 8, 14, COL.text, 11);
  }
  function mainIndex(burns, i) { var c = 0; for (var j = 0; j <= i; j++) if (burns[j].kind !== "trim") c++; return c; }
  function niceStep(span) { var e = Math.pow(10, Math.floor(Math.log10(span / 4))), m = span / 4 / e; return (m < 2 ? 1 : m < 5 ? 2 : 5) * e; }
  function hexA(c, a) { if (c[0] !== "#") return c; var n = parseInt(c.slice(1), 16); return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")"; }
  function arrow(g, x0, y0, x1, y1, col) {
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    var a = Math.atan2(y1 - y0, x1 - x0); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - 8 * Math.cos(a - 0.4), y1 - 8 * Math.sin(a - 0.4)); g.lineTo(x1 - 8 * Math.cos(a + 0.4), y1 - 8 * Math.sin(a + 0.4)); g.fill();
  }

  function drawEncounter(s, v) {
    var sc = st.sc, cv = $("orbit-cv"), P = prep(cv, 0.68), g = P.g, w = P.w, h = P.h;
    var b0 = v ? v.miss_before_xy : null, b1 = v ? v.miss_after_xy : null, C = v ? v.cov_xy : null;
    var miss0 = sc.encounter.miss_before_m;
    var ext = Math.max(1500, miss0 * 1.3, b1 ? Math.hypot(b1[0], b1[1]) * 1.3 : 0);
    var cx = w / 2, cy = h / 2 + 6, k = Math.min(w, h) / 2 / ext * 0.86;
    // our satellite at the centre, safety circle
    g.strokeStyle = COL.bad; g.setLineDash([4, 4]); g.beginPath(); g.arc(cx, cy, 1000 * k, 0, 7); g.stroke(); g.setLineDash([]);
    txt(g, cvt("safety"), cx, cy - 1000 * k - 6, COL.bad, 10, "center");
    g.fillStyle = "#fff"; g.beginPath(); g.arc(cx, cy, 4, 0, 7); g.fill();
    function ell(p, col) {
      if (!C) return;
      var a = C[0][0], bb = C[0][1], d = C[1][1], tr = a + d, det = a * d - bb * bb, l1 = tr / 2 + Math.sqrt(Math.max(0, tr * tr / 4 - det)), l2 = tr / 2 - Math.sqrt(Math.max(0, tr * tr / 4 - det));
      var ang = Math.atan2(l1 - a, bb || 1e-9);
      [1, 3].forEach(function (m) { g.strokeStyle = col; g.globalAlpha = m === 1 ? 0.8 : 0.4; g.beginPath(); g.ellipse(cx + p[0] * k, cy - p[1] * k, m * Math.sqrt(Math.max(l1, 0)) * k, m * Math.sqrt(Math.max(l2, 0)) * k, -ang, 0, 7); g.stroke(); });
      g.globalAlpha = 1;
    }
    var pulse = 0.5 + 0.5 * Math.sin(st.p * 6);
    var p0 = b0 || [miss0, 0];
    ell(p0, COL.avoid);
    g.fillStyle = COL.avoid; g.beginPath(); g.arc(cx + p0[0] * k, cy - p0[1] * k, 5 + pulse * 2, 0, 7); g.fill();
    legendRow(g, 0, COL.avoid, cvt("without", { m: fmt(miss0, 0) + " m", pp: "Pc " + sciTxt(sc.encounter.pc_before) }) + (sc.encounter.pc_before > 1e-6 || miss0 < 1000 ? CVT.unsafe : ""), h);
    if (b1) {
      ell(b1, COL.recover);
      g.fillStyle = v.safe ? COL.recover : COL.bad; g.beginPath(); g.arc(cx + b1[0] * k, cy - b1[1] * k, 5 + pulse * 2, 0, 7); g.fill();
      legendRow(g, 1, v.safe ? COL.recover : COL.bad, cvt("with_", { m: fmt(v.miss, 0) + " m", pp: "Pc " + sciTxt(v.pc) }) + (v.safe ? CVT.safe : CVT.notsafe), h);
    }
    txt(g, cvt("enc_note"), 8, 14, COL.faint, 10);
    txt(g, cvt("enc_foot", { v: fmt(sc.encounter.rel_speed_mps / 1000, 1) + " km/s", r: fmt(sc.encounter.hbr_m, 1) + " m" }), 8, h - 8, COL.faint, 10);
  }
  function legendRow(g, i, col, text, h) {
    var y = h - 44 + i * 16;
    g.fillStyle = "rgba(5,9,18,.75)"; g.fillRect(4, y - 11, Math.min(560, 14 + text.length * 6.3), 15);
    g.fillStyle = col; g.beginPath(); g.arc(12, y - 4, 4, 0, 7); g.fill(); txt(g, text, 22, y, col, 11);
  }
  function strip(s) { return String(s).replace(/<[^>]+>/g, ""); }
  function sciTxt(p) { if (p === null || p === undefined) return "—"; if (p <= 0) return "<1e-30"; return p.toExponential(1); }

  // ---------------------------------------------------------------- camera
  function drawCamera(s) {
    var cv = $("cam-cv"), P = prep(cv, 1.0), g = P.g, w = P.w, h = P.h;
    var cam = st.cam, ro = { conf: "—", track: "—", bearing: "—", rate: "—", frame: "—" };
    var active = cam && s.cam !== null && s.cam !== undefined;
    if (!st.sc.maneuver) {
      txt(g, cvt("standby"), w / 2, h / 2 - 6, COL.faint, 14, "center"); txt(g, cvt("off"), w / 2, h / 2 + 14, COL.faint, 11, "center");
    } else if (!active) {
      var trigIdx = st.chapters.findIndex(function (c) { return c.id === "trigger"; });
      txt(g, cvt("standby"), w / 2, h / 2, s.idx >= trigIdx ? COL.warn : COL.faint, 14, "center");
    } else {
      var f = cam.frames[s.cam], im = st.imgs[s.cam], sc = w / cam.image_w;
      if (im && im.complete && im.naturalWidth) g.drawImage(im, 0, 0, w, h);
      var post = ["candidates", "burn1"].indexOf(s.ch.id) >= 0;
      f.dets.forEach(function (d) {
        var x0 = d.box[0] * sc, y0 = d.box[1] * sc, x1 = d.box[2] * sc, y1 = d.box[3] * sc, pad = 4;
        g.strokeStyle = "#ef4444"; g.lineWidth = 1.5; g.strokeRect(x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad);
        g.fillStyle = "rgba(239,68,68,.85)"; g.fillRect(x0 - pad, y0 - pad - 15, 74, 14);
        txt(g, "object " + d.conf.toFixed(2), x0 - pad + 3, y0 - pad - 4, "#fff", 10);
      });
      if (f.track_u !== undefined) {
        var tx = f.track_u * sc, ty = f.track_v * sc;
        g.strokeStyle = f.status === "tracked" ? "#facc15" : "#94a3b8"; g.lineWidth = 1.5; g.beginPath(); g.arc(tx, ty, 13, 0, 7); g.stroke();
        txt(g, "TRK-1 " + f.status, tx + 16, ty + 4, g.strokeStyle, 10);
        // short track history
        g.strokeStyle = "rgba(250,204,21,.6)"; g.beginPath(); var on = false;
        for (var j = Math.max(0, s.cam - 25); j <= s.cam; j++) { var q = cam.frames[j]; if (q.track_u === undefined) { on = false; continue; } if (on) g.lineTo(q.track_u * sc, q.track_v * sc); else { g.moveTo(q.track_u * sc, q.track_v * sc); on = true; } }
        g.stroke();
      }
      g.fillStyle = "rgba(5,9,18,.7)"; g.fillRect(0, h - 18, w, 18);
      txt(g, cvt("frame", { k: String(f.k), n: String(cam.n_frames - 1), t: f.t.toFixed(0) }).replace("\u2066t = " + "\u2066", "\u2066t = "), 6, h - 5, "#cbd5e1", 10);
      if (post) { g.fillStyle = "rgba(5,9,18,.55)"; g.fillRect(0, 0, w, 22); txt(g, cvt("handed"), 6, 15, COL.ok, 11); }
      var conf = f.dets.length ? Math.max.apply(null, f.dets.map(function (d) { return d.conf; })) : null;
      ro.conf = conf !== null ? B.ltrValue(conf, "", 2) : "—";
      ro.track = B.ltrToken(f.track_u !== undefined ? "TRK-1 · " + f.status : f.status);
      ro.bearing = f.az_deg !== undefined ? B.ltrExpression("(" + fmt(f.az_deg, 3) + "°, " + fmt(f.el_deg, 3) + "°)") : "—";
      ro.rate = f.ang_rate_dps !== undefined ? B.ltrValue(f.ang_rate_dps, "°/s", 3) : "—";
      ro.frame = B.ltrToken(f.k + " / " + (cam.n_frames - 1), "num");
    }
    $("ro-conf").innerHTML = ro.conf; $("ro-track").innerHTML = ro.track; $("ro-bearing").innerHTML = ro.bearing; $("ro-rate").innerHTML = ro.rate; $("ro-frame").innerHTML = ro.frame;
  }

  // ---------------------------------------------------------------- top bar, caption, summary
  function statusFor(s, v) {
    var id = s.ch.id, p = st.sc.prediction;
    if (id === "identify" || id === "cdms") return ["monitor", S.st_monitor];
    if (id === "predict") return p.triggered ? ["alert", S.st_alert] : ["monitor", S.st_monitor];
    if (["trigger", "camera", "detect", "track", "candidates"].indexOf(id) >= 0) return ["trigger", S.st_trigger];
    if (id === "burn1") return ["alert", S.st_burn];
    if (id === "tca") return s.f < 0.5 ? ["danger", S.st_tca] : (v.safe ? ["safe", S.st_safe] : ["danger", S.st_unsafe]);
    if (id === "recovery" || id === "phasing") return ["ok", S.st_recover];
    if (id === "restored" || id === "summary") {
      if (!v) return st.sc.truth.high_risk ? ["danger", S.st_missed] : ["safe", S.st_quiet];
      return v.recovered ? ["safe", S.st_restored] : ["alert", S.st_resid];
    }
    if (id === "notrigger") return ["monitor", st.sc.truth.high_risk ? S.st_monitor : S.st_quiet];
    if (id === "outcome") return st.sc.truth.high_risk ? ["danger", S.st_missed] : ["safe", S.st_quiet];
    return ["monitor", S.st_monitor];
  }
  var lastCap = "";
  function caption(s, v) {
    var id = s.ch.id, fnc = S.cap[id] || S.cap.summary;
    var html = fnc(st.sc, v || {});
    if (html !== lastCap) { $("cap-txt").innerHTML = html; lastCap = html; }
  }
  function showSummary(v) {
    var el = $("summary"); if (el.classList.contains("on")) return;
    var sc = st.sc, rows = [];
    function card(k, val) { rows.push('<div class="ro"><div class="k">' + k + '</div><div class="v">' + val + "</div></div>"); }
    if (v) {
      card(S.dv_total, B.ltrValue(v.dv_total, "cm/s", 2)); card(S.dv_avoid, B.ltrValue(v.dv_avoid_cms, "cm/s", 2)); card(S.dv_rec, B.ltrValue(v.dv_rec, "cm/s", 2));
      card(S.rec_dur, LANG === "ar" ? B.ltrValue(v.rec_end_h, "h", 1) + " بعد " + B.ltrToken("TCA") : B.ltrToken(fmt(v.rec_end_h, 1) + " h after TCA", "num"));
      card(S.miss_after, B.ltrValue(v.miss, "m", 0)); card(S.pc_after, B.ltrPc(v.pc));
      card(S.tca_safe, v.safe ? '<span style="color:var(--ok)">' + S.yes + "</span>" : '<span style="color:var(--bad)">' + S.not_safe + "</span>");
      card(S.resid_r, small(v.resid_r, "m", 3)); card(S.resid_v, small(v.resid_v, "mm/s", 4));
      card(S.status, v.recovered ? S.st_restored : S.st_resid);
      if (v.kind === "mc" && v.mc) { card(S.safe_rate, B.ltrValue(v.mc.safe_rate, "", "pct")); card(S.rec_rate, B.ltrValue(v.mc.recovered_rate, "", "pct")); }
    }
    card(LANG === "ar" ? "الحقيقة (الخطر النهائي)" : "Truth (final risk)", B.ltrToken(fmt(sc.truth.final_risk, 2) + " → " + sc.outcome, "num"));
    var note = v ? (v.kind === "mc" ? S.mc_note.replace("{n}", v.mc.n_mc) : S.nominal_note) : "";
    el.innerHTML = "<h4>" + S.sum_title + " · " + S.sc[sc.id] + '</h4><div class="grid">' + rows.join("") + '</div><p class="mc-note">' + note + "</p>";
    el.classList.add("on");
  }
  function small(x, unit, d) {
    if (x !== null && x !== undefined && Math.abs(x) < Math.pow(10, -d)) return B.ltrToken("< " + Math.pow(10, -d).toFixed(d) + "\u00a0" + unit, "num");
    return B.ltrValue(x, unit, d);
  }
  function hideSummary() { $("summary").classList.remove("on"); }

  // ---------------------------------------------------------------- frame
  function render() {
    if (!st.sc || !st.chapters.length || st.loading) return;
    var s = at(st.p), v = variant();
    if (st.viewAuto) {
      var id = s.ch.id;
      st.view = ["burn1", "recovery", "phasing", "restored", "summary"].indexOf(id) >= 0 && v ? "rel"
        : (id === "tca" || id === "outcome") ? "enc" : "earth";
    }
    if (st.view === "rel" && !v) st.view = "earth";
    document.querySelectorAll(".view-tabs button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.view === st.view)); });
    ["earth", "rel", "enc"].forEach(function (k) { ["-legend", "-legend-note"].forEach(function (suf) { var el = $(k + suf); if (el) el.style.display = st.view === k ? "" : "none"; }); });
    var ce = $("mc-compress");
    if (ce) ce.innerHTML = v ? (v.closed_loop ? S.compress_rec_cl : S.compress_rec).replace("{h}", B.ltrValue(v.rec_end_h, "h", 0)) : S.compress;
    drawRisk(s);
    if (st.view === "earth") drawEarth(s); else if (st.view === "rel") drawRelative(s, v); else drawEncounter(s, v);
    drawCamera(s);
    var stt = statusFor(s, v); var se = $("mc-status"); se.className = "status " + stt[0]; se.innerHTML = stt[1];
    var t = s.tm, sign = t < 0 ? "T−" : "T+";
    $("mc-clock").innerHTML = '<bdi dir="ltr">' + sign + Math.abs(t).toFixed(1) + " h</bdi>";
    caption(s, v ? { dv_avoid_cms: v.dv_avoid_cms, direction: v.direction, lead_days: v.lead_days, miss: v.miss, pc: v.pc, safe: v.safe, resid_r: v.resid_r, resid_v: v.resid_v, recovered: v.recovered, rec_end_h: v.rec_end_h, closed_loop: !!v.closed_loop } : null);
    $("scrub").value = String(Math.round(st.p / st.total * 1000));
    document.querySelectorAll(".chapters .mk").forEach(function (m, i) { m.classList.toggle("done", i <= s.idx); });
    if (s.ch.id === "summary") showSummary(v); else hideSummary();
  }
  function loop(ts) {
    var dt = st.last ? Math.min(0.1, (ts - st.last) / 1000) : 0; st.last = ts;
    if (st.playing) { st.p += dt * st.speed; if (st.p >= st.total) { st.p = st.total - 1e-3; st.playing = false; updPlay(); } }
    try { render(); } catch (e) { st.errors.push(String(e && e.stack || e)); console.error(e); st.playing = false; }
    requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------- controls
  function renderChapters() {
    var box = $("chapters"); box.innerHTML = "";
    st.chapters.forEach(function (c, i) {
      var m = document.createElement("span"); m.className = "mk" + (["cdms", "predict", "tca", "summary", "outcome"].indexOf(c.id) < 0 ? " hide-sm" : "");
      var pos = (c.start / st.total) * 100; m.style[LANG === "ar" ? "right" : "left"] = pos + "%";
      m.innerHTML = S.chapters[c.id] || c.id; m.title = strip(S.chapters[c.id] || c.id);
      m.addEventListener("click", function () { st.p = c.start + 0.01; hideSummary(); render(); });
      box.appendChild(m);
    });
  }
  function updPlay() { $("btn-play").textContent = st.playing ? S.pause : S.play; }
  function syncControls() {
    $("sel-scenario").value = st.scenarioId; $("sel-perc").value = st.perception; $("sel-margin").value = String(st.margin);
    var hasM = !!st.sc.maneuver; $("sel-perc").disabled = !hasM; $("sel-margin").disabled = !hasM || st.perception === "perfect";
  }
  function setup() {
    readColors();
    var sel = $("sel-scenario");
    Object.keys(S.sc).forEach(function (k) { var o = document.createElement("option"); o.value = k; o.textContent = S.sc[k]; sel.appendChild(o); });
    var sp = $("sel-perc"); Object.keys(S.pc).forEach(function (k) { var o = document.createElement("option"); o.value = k; o.textContent = S.pc[k]; sp.appendChild(o); });
    var sm = $("sel-margin"); [0, 1, 2, 3].forEach(function (k) { var o = document.createElement("option"); o.value = String(k); o.textContent = k + "σ"; sm.appendChild(o); });
    $("btn-play").addEventListener("click", function () { if (st.p >= st.total - 0.01) st.p = 0; st.playing = !st.playing; updPlay(); });
    $("btn-restart").addEventListener("click", function () { st.p = 0; hideSummary(); st.playing = true; updPlay(); });
    $("sel-speed").addEventListener("change", function (e) { st.speed = parseFloat(e.target.value); });
    $("scrub").addEventListener("input", function (e) { st.p = parseInt(e.target.value, 10) / 1000 * st.total; hideSummary(); });
    $("btn-auto").addEventListener("click", function () { setMode("auto"); });
    $("btn-explore").addEventListener("click", function () { setMode("explore"); });
    sel.addEventListener("change", function (e) { load(e.target.value, false).then(function () { st.playing = true; updPlay(); }); });
    sp.addEventListener("change", function (e) { st.perception = e.target.value; if (st.perception === "perfect") st.margin = 0; st.loading = true; loadCamera(cameraName()).then(function () { buildChapters(); st.loading = false; renderChapters(); syncControls(); }); });
    sm.addEventListener("change", function (e) { st.margin = parseInt(e.target.value, 10); buildChapters(); renderChapters(); hideSummary(); });
    document.querySelectorAll(".view-tabs button").forEach(function (b) { b.addEventListener("click", function () { st.view = b.dataset.view; st.viewAuto = false; $("view-auto").checked = false; }); });
    $("view-auto").addEventListener("change", function (e) { st.viewAuto = e.target.checked; });
    document.querySelectorAll("[data-run-mission]").forEach(function (b) {
      b.addEventListener("click", function () { setMode("auto"); load("success", false).then(function () { st.p = 0; st.playing = true; updPlay(); $("mission").scrollIntoView({ behavior: "smooth" }); }); });
    });
    var q = new URLSearchParams(location.search);
    if (q.get("capture") === "1") document.body.classList.add("capture");
    st.speed = parseFloat(q.get("speed") || "1"); $("sel-speed").value = String(st.speed);
    if (q.get("perception")) st.perception = q.get("perception");
    if (q.get("margin")) st.margin = parseInt(q.get("margin"), 10);
    if (q.get("mode") === "explore") setMode("explore");
    load(q.get("scenario") || "success", false).then(function () {
      if (q.get("autoplay") === "1") { st.playing = true; }
      updPlay(); window.__missionReady = true;
    });
    window.addEventListener("resize", render);
    requestAnimationFrame(loop);
  }
  function setMode(m) {
    st.mode = m; $("explore").classList.toggle("on", m === "explore");
    $("btn-auto").setAttribute("aria-pressed", String(m === "auto")); $("btn-explore").setAttribute("aria-pressed", String(m === "explore"));
    if (m === "auto") { st.perception = "typical"; st.margin = 0; st.viewAuto = true; $("view-auto").checked = true; }
  }
  window.addEventListener("error", function (e) { st.errors.push(String(e.message)); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup); else setup();
})();
