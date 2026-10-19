/* UI strings and narrative captions (EN / AR). Values are never typed here: captions receive the scenario data
   and format numbers with the Bidi helpers, so both languages show the same saved numbers. */
(function (g) {
  "use strict";
  var B = g.Bidi, T = B.ltrToken, V = B.ltrValue, X = B.ltrExpression, PC = B.ltrPc, PCX = B.ltrPcExpr, N = B.fmtNum;
  function h(x) { return V(x, "h", 1); }
  function d(x) { return V(x, "d", 2); }
  function cms(x) { return V(x, "cm/s", 2); }
  function m(x) { return V(x, "m", 0); }

  var EN = {
    compress: "Time-compressed mission replay", compress_rec: "Time-compressed mission replay — recovery completes about {h} after TCA", compress_rec_cl: "Time-compressed mission replay — recovery, including the final trim, completes about {h} after TCA",
    run: "RUN MISSION", play: "Play", pause: "Pause", restart: "Restart", speed: "Speed", mode_auto: "Autoplay",
    mode_explore: "Explore", scenario: "Scenario", perception: "Perception", margin: "Safety margin",
    risk_panel: "ESA risk data", orbit_panel: "Orbit scene", camera_panel: "Onboard RGB camera",
    v_earth: "Earth view", v_rel: "Distance from nominal", v_enc: "Closest approach",
    latest_risk: "Latest reported risk", ml_prob: "ML alert probability", pred_risk: "Predicted final risk",
    trigger: "Observation trigger", n_cdm: "CDMs received", time_tca: "Time to TCA",
    conf: "YOLO confidence", track: "Track", bearing: "Bearing (az, el)", rate: "Angular rate", frame: "Frame",
    cam_standby: "CAMERA STANDBY", cam_off: "not activated (no trigger)", cam_label: "SIMULATED RGB frame · real YOLO + tracker output",
    st_monitor: "MONITORING", st_alert: "HIGH-RISK ALERT", st_trigger: "TRIGGER: OBSERVE", st_burn: "AVOIDANCE BURN",
    st_tca: "CLOSEST APPROACH", st_safe: "SAFE PASSAGE", st_unsafe: "UNSAFE PASSAGE", st_recover: "MISSION RECOVERY",
    st_restored: "NOMINAL TRAJECTORY RECOVERED WITHIN TOLERANCE", st_resid: "RECOVERY RESIDUAL", st_missed: "MISSED HIGH-RISK EVENT",
    st_quiet: "NO ACTION NEEDED",
    yes: "yes", no: "no", nominal: "nominal (phantom) satellite", threat: "debris / threat", avoid_only: "avoidance only",
    two_imp: "single return burn (phase offset remains)", selected: "selected: avoid + recover", tca: "TCA",
    without: "WITHOUT MANOEUVRE", with_: "WITH SELECTED MANOEUVRE", safety_circle: "1 km safety distance",
    sum_title: "Mission result", dv_total: "Total Δv", dv_avoid: "Avoidance Δv", dv_rec: "Recovery Δv",
    rec_dur: "Recovery completed", resid_r: "Final position error", resid_v: "Final velocity error", miss_after: "Miss distance at TCA",
    pc_after: "Collision probability at TCA", tca_safe: "Safe passage at TCA", not_safe: "NOT SAFE (miss < 1 km or Pc > 10⁻⁶)", status: "Recovery status", safe_rate: "Monte Carlo safe rate",
    rec_rate: "Monte Carlo recovery rate", mc_note: "Safe rate: {n} Monte Carlo draws with camera, execution and navigation errors. Recovery rate: 300 draws with the closed-loop recovery guidance (orbit-determination navigation, 3 small drift corrections + final trim). The trajectory shown is one representative (median-Δv) draw.",
    nominal_note: "Final numbers: two-body + J2 integration after differential correction. Trajectory drawn with the Clohessy–Wiltshire model.",
    sc: { success: "Successful avoidance + recovery (true alert)", rescued: "Alert added by the ML guard (true)", false_alarm: "False alarm (manoeuvre not needed)",
          missed: "Missed high-risk event (failure)", quiet: "True negative (no action)", difficult: "Difficult recovery (numerically repaired)" },
    pc: { perfect: "Perfect state", typical: "Typical camera error", failure: "Including tracking failures" },
    real_sim: "REAL: ESA CDMs, geometry · SIMULATED: camera, manoeuvre, recovery",
    chapters: { identify: "Event", cdms: "CDMs", predict: "Predict", trigger: "Alert", camera: "Camera", detect: "Detect",
                track: "Track", candidates: "Plan", burn1: "Burn 1", tca: "TCA", recovery: "Burn 2", phasing: "Return",
                restored: "Burn 3", summary: "Result", notrigger: "No alert", outcome: "Outcome" },
    cap: {
      identify: function (s) { return "Step 1/15 · A close approach is identified: ESA event " + T("#" + s.event_id) + ". Our satellite flies at " + V(s.orbit.altitude_km, "km", 0) + " altitude; the threat crosses at " + V(s.encounter.rel_speed_mps / 1000, "km/s", 1) + "."; },
      cdms: function (s) { return "Step 2/15 · Conjunction Data Messages (REAL ESA CDMs) arrive. Each one updates the reported collision risk " + X("log10(Pc)") + "."; },
      predict: function (s) { var p = s.prediction; return "Step 3–4/15 · Two days before TCA the model decides. Latest reported risk " + V(p.latest_risk, "", 2) + "; ML alert probability " + V(p.ml_probability, "", 2) + " (threshold " + V(p.promotion_threshold, "", 2) + "). Predicted final risk: " + (p.triggered ? V(p.predicted_risk, "", 2) + " ≥ " + T("−6") + " → HIGH RISK." : T("< −6") + " → low risk."); },
      trigger: function () { return "Step 5/15 · Alert → the onboard camera is pointed along the predicted threat direction (observation trigger)."; },
      camera: function () { return "Step 6/15 · The object enters the camera view (SIMULATED RGB frames)."; },
      detect: function () { return "Step 7/15 · YOLO detects the object: bounding box and confidence are the real outputs of the trained detector."; },
      track: function () { return "Step 8/15 · The tracker follows it frame by frame and measures the bearing (direction) and angular rate. One camera gives direction, not reliable range."; },
      candidates: function (s, v) { return "Step 9–10/15 · " + T("1,830") + " candidate burns are tested on the REAL encounter geometry; the cheapest safe one is chosen: " + cms(v.dv_avoid_cms) + " " + T(v.direction) + ", " + d(v.lead_days) + " before TCA."; },
      burn1: function (s, v) { return "Step 11/15 · Avoidance burn: " + cms(v.dv_avoid_cms) + ". The satellite slowly drifts away from its nominal position."; },
      tca: function (s, v) { return "Step 12/15 · Closest approach. Without a manoeuvre: " + m(s.encounter.miss_before_m) + ", " + PCX(s.encounter.pc_before) + ". With the manoeuvre: " + m(v.miss) + ", " + PCX(v.pc) + (v.safe ? " → safe passage." : " → NOT safe (shown honestly)."); },
      recovery: function (s, v) { return "Step 13/15 · Mission recovery: burn 2 cancels the avoidance drift and starts a slow phasing drift back toward the nominal position."; },
      phasing: function (s, v) { return "Step 13/15 · Phasing: the satellite drifts back over " + T(String(s.maneuver.k_orbits)) + " orbits (about " + h(v.rec_end_h) + " after TCA)." + (v.closed_loop ? " With burn and navigation errors, small trims keep the drift on target." : ""); },
      restored: function (s, v) { return "Step 14/15 · Burn 3 stops the drift at the nominal position. Final error " + V(v.resid_r, "m", 2) + " / " + V(v.resid_v, "mm/s", 3) + (v.recovered ? " → within the 50 m / 1 mm/s tolerance." : " → outside tolerance."); },
      summary: function () { return "Step 15/15 · Mission result: predict → observe → avoid → recover."; },
      notrigger: function (s) { return s.truth.high_risk ? "No alert: the reported risk stayed below the threshold, so the camera and manoeuvre were never activated." : "No alert: the event stays low-risk; only monitoring is needed."; },
      outcome: function (s) { return s.truth.high_risk ? "Failure shown honestly: the final risk became " + V(s.truth.final_risk, "", 2) + " (high risk) — a missed event. Its risk jumped late, after the decision time." : "Correct: the final risk was " + V(s.truth.final_risk, "", 2) + " (low). No fuel was spent."; }
    }
  };

  var AR = {
    compress: "عرض مضغوط زمنيًا للمهمة", compress_rec: "عرض مضغوط زمنيًا للمهمة — تكتمل العودة بعد نحو {h} من " + T("TCA"), compress_rec_cl: "عرض مضغوط زمنيًا للمهمة — تكتمل العودة مع التصحيح الأخير بعد نحو {h} من " + T("TCA"),
    run: "تشغيل المهمة", play: "تشغيل", pause: "إيقاف مؤقت", restart: "إعادة", speed: "السرعة", mode_auto: "عرض تلقائي",
    mode_explore: "استكشاف", scenario: "السيناريو", perception: "الرصد", margin: "هامش الأمان",
    risk_panel: "بيانات الخطر من وكالة الفضاء الأوروبية", orbit_panel: "المشهد المداري", camera_panel: "الكاميرا الملونة على متن القمر",
    v_earth: "منظر الأرض", v_rel: "البعد عن المسار الاسمي", v_enc: "أقرب اقتراب",
    latest_risk: "آخر خطر مُبلَّغ", ml_prob: "احتمال التنبيه " + T("(ML)"), pred_risk: "الخطر النهائي المتوقع",
    trigger: "تفعيل الرصد", n_cdm: "عدد الرسائل " + T("CDM"), time_tca: "الوقت حتى " + T("TCA"),
    conf: "ثقة " + T("YOLO"), track: "المسار", bearing: "الاتجاه " + T("(az, el)"), rate: "المعدل الزاوي", frame: "الإطار",
    cam_standby: "الكاميرا في وضع الانتظار", cam_off: "لم تُفعَّل (لا يوجد تنبيه)", cam_label: "إطار ملوّن مُحاكى · مخرجات حقيقية لـ " + T("YOLO") + " والمتتبِّع",
    st_monitor: "مراقبة", st_alert: "تنبيه خطر مرتفع", st_trigger: "تفعيل الرصد", st_burn: "دفعة التجنب",
    st_tca: "أقرب اقتراب", st_safe: "عبور آمن", st_unsafe: "عبور غير آمن", st_recover: "استعادة المهمة",
    st_restored: "استُعيد المسار الاسمي ضمن حد التسامح", st_resid: "الخطأ المتبقي بعد الاستعادة", st_missed: "حدث خطر لم يُكتشف",
    st_quiet: "لا حاجة لإجراء",
    yes: "نعم", no: "لا", nominal: "القمر الاسمي (المرجعي)", threat: "الحطام / التهديد", avoid_only: "تجنب فقط",
    two_imp: "دفعة عودة واحدة (يبقى فرق طوري)", selected: "المختارة: تجنب ثم عودة", tca: T("TCA"),
    without: "بدون مناورة", with_: "مع المناورة المختارة", safety_circle: "مسافة الأمان " + V(1, "km", 0),
    sum_title: "نتيجة المهمة", dv_total: "إجمالي " + T("Δv"), dv_avoid: T("Δv") + " التجنب", dv_rec: T("Δv") + " الاستعادة",
    rec_dur: "اكتمال الاستعادة", resid_r: "خطأ الموضع النهائي", resid_v: "خطأ السرعة النهائي", miss_after: "مسافة المرور عند " + T("TCA"),
    pc_after: "احتمال التصادم عند " + T("TCA"), tca_safe: "عبور آمن عند " + T("TCA"), not_safe: "غير آمن (المسافة " + T("< 1 km") + " أو " + T("Pc > 10⁻⁶") + ")", status: "حالة الاستعادة", safe_rate: "نسبة الأمان " + T("(Monte Carlo)"),
    rec_rate: "نسبة الاستعادة " + T("(Monte Carlo)"), mc_note: "نسبة الأمان من {n} محاولة " + T("Monte Carlo") + " بأخطاء الكاميرا والتنفيذ والملاحة، ونسبة الاستعادة من " + T("300") + " محاولة بتوجيه استعادة مغلق الحلقة (ملاحة بتحديد المدار، وثلاثة تصحيحات صغيرة للانجراف، وتصحيح أخير). المسار المعروض محاولة تمثيلية واحدة (الوسيط في " + T("Δv") + ").",
    nominal_note: "الأرقام النهائية من تكامل عددي " + T("(two-body + J2)") + " بعد التصحيح التفاضلي، والمسار مرسوم بنموذج " + T("Clohessy–Wiltshire") + ".",
    sc: { success: "تجنب واستعادة ناجحان (تنبيه صحيح)", rescued: "تنبيه أضافه حارس التعلم الآلي (صحيح)", false_alarm: "إنذار كاذب (لم تكن المناورة لازمة)",
          missed: "حدث خطر لم يُكتشف (إخفاق)", quiet: "سلبي صحيح (لا إجراء)", difficult: "استعادة صعبة (صُحِّحت عدديًا)" },
    pc: { perfect: "حالة مثالية", typical: "خطأ الكاميرا المعتاد", failure: "مع حالات فشل التتبع" },
    real_sim: "حقيقي: رسائل " + T("ESA CDM") + " والهندسة · مُحاكى: الكاميرا والمناورة والاستعادة",
    chapters: { identify: "الحدث", cdms: T("CDM"), predict: "التنبؤ", trigger: "التنبيه", camera: "الكاميرا", detect: "الكشف",
                track: "التتبع", candidates: "التخطيط", burn1: "الدفعة 1", tca: T("TCA"), recovery: "الدفعة 2", phasing: "العودة",
                restored: "الدفعة 3", summary: "النتيجة", notrigger: "لا تنبيه", outcome: "النتيجة" },
    cap: {
      identify: function (s) { return "الخطوة " + T("1/15") + " · رُصد اقتراب قريب: حدث " + T("ESA #" + s.event_id) + ". يدور قمرنا على ارتفاع " + V(s.orbit.altitude_km, "km", 0) + "، ويعبر التهديد بسرعة نسبية " + V(s.encounter.rel_speed_mps / 1000, "km/s", 1) + "."; },
      cdms: function () { return "الخطوة " + T("2/15") + " · تصل رسائل بيانات الاقتراب " + T("(CDM)") + " الحقيقية من وكالة الفضاء الأوروبية، وكل رسالة تُحدِّث الخطر المُبلَّغ " + X("log10(Pc)") + "."; },
      predict: function (s) { var p = s.prediction; return "الخطوتان " + T("3–4/15") + " · قبل " + T("TCA") + " بيومين يقرر النموذج. آخر خطر مُبلَّغ " + V(p.latest_risk, "", 2) + "، واحتمال تنبيه التعلم الآلي " + V(p.ml_probability, "", 2) + " (العتبة " + V(p.promotion_threshold, "", 2) + "). الخطر النهائي المتوقع: " + (p.triggered ? V(p.predicted_risk, "", 2) + " " + X("≥ −6") + " ← خطر مرتفع." : X("< −6") + " ← خطر منخفض."); },
      trigger: function () { return "الخطوة " + T("5/15") + " · تنبيه ← تُوجَّه الكاميرا على متن القمر نحو اتجاه التهديد المتوقع (تفعيل الرصد)."; },
      camera: function () { return "الخطوة " + T("6/15") + " · يدخل الجسم مجال رؤية الكاميرا (إطارات ملوّنة مُحاكاة)."; },
      detect: function () { return "الخطوة " + T("7/15") + " · يكتشف " + T("YOLO") + " الجسم: المربع المحيط ودرجة الثقة هما المخرجات الفعلية للكاشف المدرَّب."; },
      track: function () { return "الخطوة " + T("8/15") + " · يتتبعه المتتبِّع إطارًا بعد إطار ويقيس الاتجاه والمعدل الزاوي. كاميرا واحدة تعطي الاتجاه، لا المسافة بموثوقية."; },
      candidates: function (s, v) { return "الخطوتان " + T("9–10/15") + " · تُختبر " + T("1,830") + " دفعة مرشحة على الهندسة الحقيقية للاقتراب، ويُختار أرخص حل آمن: " + cms(v.dv_avoid_cms) + " باتجاه " + T(v.direction) + " قبل " + T("TCA") + " بـ " + d(v.lead_days) + "."; },
      burn1: function (s, v) { return "الخطوة " + T("11/15") + " · دفعة التجنب: " + cms(v.dv_avoid_cms) + ". يبتعد القمر ببطء عن موقعه الاسمي."; },
      tca: function (s, v) { return "الخطوة " + T("12/15") + " · أقرب اقتراب. بدون مناورة: " + m(s.encounter.miss_before_m) + " و" + PCX(s.encounter.pc_before) + ". مع المناورة: " + m(v.miss) + " و" + PCX(v.pc) + (v.safe ? " ← عبور آمن." : " ← عبور غير آمن (يُعرض بأمانة)."); },
      recovery: function () { return "الخطوة " + T("13/15") + " · استعادة المهمة: الدفعة 2 تلغي انجراف التجنب وتبدأ انجرافًا طوريًا بطيئًا نحو الموقع الاسمي."; },
      phasing: function (s, v) { return "الخطوة " + T("13/15") + " · العودة الطورية: يعود القمر خلال " + T(String(s.maneuver.k_orbits)) + " مدارًا (نحو " + h(v.rec_end_h) + " بعد " + T("TCA") + ")." + (v.closed_loop ? " ومع أخطاء الدفع والملاحة تُبقي تصحيحات صغيرة الانجراف على هدفه." : ""); },
      restored: function (s, v) { return "الخطوة " + T("14/15") + " · الدفعة 3 توقف الانجراف عند الموقع الاسمي. الخطأ النهائي " + V(v.resid_r, "m", 2) + " / " + V(v.resid_v, "mm/s", 3) + (v.recovered ? " ← ضمن حد التسامح " + X("50 m / 1 mm/s") + "." : " ← خارج حد التسامح."); },
      summary: function () { return "الخطوة " + T("15/15") + " · نتيجة المهمة: تنبؤ ← رصد ← تجنب ← استعادة."; },
      notrigger: function (s) { return s.truth.high_risk ? "لا تنبيه: بقي الخطر المُبلَّغ دون العتبة، فلم تُفعَّل الكاميرا ولا المناورة." : "لا تنبيه: الحدث منخفض الخطر، ويكفي الرصد."; },
      outcome: function (s) { return s.truth.high_risk ? "إخفاق يُعرض بأمانة: أصبح الخطر النهائي " + V(s.truth.final_risk, "", 2) + " (مرتفع) ولم يُكتشف؛ ارتفع خطره متأخرًا بعد وقت القرار." : "صحيح: كان الخطر النهائي " + V(s.truth.final_risk, "", 2) + " (منخفض)، ولم يُستهلك وقود."; }
    }
  };
  g.I18N = { en: EN, ar: AR };
})(window);
