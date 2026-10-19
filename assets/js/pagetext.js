(function (g) {
  var T = g.Bidi.ltrToken;
  g.PAGE_TEXT = {
    en: {
      exp_cols: ["Experiment", "Validation L (CV)", "± sd", "Test L", "Test L 95% CI", "F2", "MSE_HR", "PR-AUC", "Precision", "Recall", "TP / FP / FN"],
      exp_names: { P0_LRP_baseline: "Latest-risk baseline", P1_RF_classifier_LRPvalue: "Random Forest classifier", P1b_bestclf_LRPvalue: "ExtraTrees classifier",
        P2_two_stage: "Two-stage classifier → regressor", P2b_two_stage_shrunk: "Two-stage (shrunk to baseline)", P3_hybrid_guarded: "Guarded hybrid + value correction",
        P3a_hybrid_residual_only: "Guarded hybrid, value only", P3b_hybrid_promotion_only: "Guarded hybrid, promotion only",
        P3c_hybrid_region_residual: "Guarded hybrid ★ (selected)", P4_direct_regression: "Direct risk regression", P4b_residual_regression: "Residual regression",
        P5_rule_cascade: "Threshold-rule cascade", P6_gru_two_stage: "GRU temporal two-stage", P6b_gru_guarded: "GRU guarded hybrid" },
      unc_cols: ["Perception", "Margin", "Bearing σ", "Lateral σ (m)", "Safe at TCA", "Recovered (open loop, pre-registered)", "Safe + recovered (open loop)", "Δv vs perfect", "Position error p95 (m)", "Velocity error p95 (mm/s)"],
      unc_case: { perfect_state: "Perfect state (burn errors only)", typical_camera_track: "Typical camera track", including_track_failures: "Including tracking failures" }
    },
    ar: {
      exp_cols: ["التجربة", T("L") + " في التحقق " + T("(CV)"), T("± sd"), T("L") + " في الاختبار", "فترة ثقة " + T("95%") + " لـ " + T("L"), T("F2"), T("MSE_HR"), T("PR-AUC"), "الدقة", "الاستدعاء", T("TP / FP / FN")],
      exp_names: { P0_LRP_baseline: "خط الأساس: آخر خطر مُبلَّغ", P1_RF_classifier_LRPvalue: "مصنِّف " + T("Random Forest"), P1b_bestclf_LRPvalue: "مصنِّف " + T("ExtraTrees"),
        P2_two_stage: "نموذج على مرحلتين: مصنِّف ← انحدار", P2b_two_stage_shrunk: "مرحلتان مع تقريب نحو خط الأساس", P3_hybrid_guarded: "هجين محروس مع تصحيح القيمة",
        P3a_hybrid_residual_only: "هجين محروس، تصحيح القيمة فقط", P3b_hybrid_promotion_only: "هجين محروس، رفع التنبيه فقط",
        P3c_hybrid_region_residual: "الهجين المحروس ★ (المختار)", P4_direct_regression: "انحدار مباشر للخطر", P4b_residual_regression: "انحدار الفرق عن آخر خطر",
        P5_rule_cascade: "سلسلة قواعد عتبات", P6_gru_two_stage: "نموذج زمني " + T("GRU") + " على مرحلتين", P6b_gru_guarded: "هجين محروس بـ " + T("GRU") },
      unc_cols: ["الرصد", "الهامش", "خطأ الاتجاه " + T("σ"), "الخطأ الجانبي " + T("σ (m)"), "آمن عند " + T("TCA"), "استُعيد (توجيه مفتوح، مسجَّل مسبقًا)", "آمن ومُستعاد (توجيه مفتوح)", T("Δv") + " مقارنة بالمثالي", "خطأ الموضع " + T("p95 (m)"), "خطأ السرعة " + T("p95 (mm/s)")],
      unc_case: { perfect_state: "حالة مثالية (أخطاء الدفع فقط)", typical_camera_track: "تتبع الكاميرا المعتاد", including_track_failures: "مع حالات فشل التتبع" }
    }
  };
})(window);
