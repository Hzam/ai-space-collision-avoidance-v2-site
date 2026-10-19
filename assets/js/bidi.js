/* Bidirectional-text helpers. Every Latin/scientific term shown inside Arabic text is wrapped in an isolated
   LTR element so that numbers, units, model names, parentheses and equations keep their visual order.
   Parentheses that belong to a technical expression stay INSIDE the isolated element. Used by static binding and by
   all JavaScript-generated content (same treatment in both languages; harmless in English). */
(function (g) {
  "use strict";
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  // generic LTR isolate: model names, abbreviations, English phrases
  function ltrToken(text, cls) {
    return '<bdi dir="ltr" class="ltr' + (cls ? " " + cls : "") + '">' + esc(text) + "</bdi>";
  }
  // value + unit, e.g. ltrValue(0.95, "cm/s", 2) -> "0.95 cm/s" isolated as one unit
  function ltrValue(value, unit, digits) {
    var v = typeof value === "number" ? fmtNum(value, digits) : String(value);
    return ltrToken(unit ? v + " " + unit : v, "num");
  }
  // formula / expression, parentheses included: ltrExpression("(F2 = 0.739)")
  function ltrExpression(expr) {
    return ltrToken(expr, "expr");
  }
  // parenthetical scientific phrase kept as one isolated unit: ltrParen("Random Forest") -> "(Random Forest)"
  function ltrParen(text) {
    return ltrToken("(" + text + ")", "expr");
  }
  function fmtNum(x, digits) {
    if (x === null || x === undefined || (typeof x === "number" && !isFinite(x))) return "—";
    if (typeof x !== "number") return String(x);
    if (digits === "e") return x.toExponential(1).replace("e-", "×10⁻").replace(/×10⁻0?(\d+)/, function (m, d) {
      return "×10" + toSup("-" + d);
    });
    if (digits === "pct") return (x * 100).toFixed(1) + "%";
    if (digits === "pct0") return (x * 100).toFixed(0) + "%";
    var d = digits === undefined ? 3 : digits;
    var s = x.toFixed(d);
    return s.replace("-", "−"); // true minus sign
  }
  function toSup(s) {
    var m = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
    return String(s).split("").map(function (c) { return m[c] || c; }).join("");
  }
  // Pc as 10^x notation, isolated
  function ltrPc(p) {
    if (p === null || p === undefined) return ltrToken("—");
    if (p <= 0) return ltrToken("< 10" + toSup("-30"), "num");
    var e = Math.floor(Math.log10(p)), m = p / Math.pow(10, e);
    return ltrToken(m.toFixed(1) + "×10" + toSup(String(e)), "num");
  }
  function pcText(p) {
    if (p === null || p === undefined) return "—";
    if (p <= 0) return "< 10" + toSup("-30");
    var e = Math.floor(Math.log10(p)), m = p / Math.pow(10, e);
    return m.toFixed(1) + "×10" + toSup(String(e));
  }
  // whole expression in ONE isolate, e.g. "Pc = 3.3×10⁻⁶"
  function ltrPcExpr(p) { return ltrToken("Pc = " + pcText(p), "expr"); }
  g.Bidi = { ltrPcExpr: ltrPcExpr, pcText: pcText, esc: esc, ltrToken: ltrToken, ltrValue: ltrValue, ltrExpression: ltrExpression, ltrParen: ltrParen,
             fmtNum: fmtNum, ltrPc: ltrPc, toSup: toSup };
})(window);
