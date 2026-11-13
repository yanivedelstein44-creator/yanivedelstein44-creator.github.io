// "הדוח של Claude": an article card with a serif headline (the summary's first sentence) and the rest as the body.
import { h } from "../dom.js";
import { fmtClock, splitFirstSentence } from "../format.js";

export const DISCLAIMER = "הנתונים והציונים מוצגים לצורכי מידע בלבד ואינם מהווים ייעוץ השקעות.";

export function reportCard(report, { compact = false } = {}) {
  if (!report) return null;
  const err = report.error;
  const when = report.generated_at ? `נכתב ב-${fmtClock(report.generated_at)}` : null;
  const foot = h("p", { class: "report__foot" }, ["לא ייעוץ השקעות", when].filter(Boolean).join(" · "));
  if (err) {
    return h(
      "article",
      { class: "card report report--error" + (compact ? " report--compact" : ""), "data-testid": "report" },
      h("span", { class: "kicker" }, "הדוח של Claude"),
      h("p", { class: "report__error" }, `הדוח לא נוצר: ${typeof err === "string" ? err : err.message_he || "שגיאה לא ידועה"}`),
      foot
    );
  }
  const { head, rest } = splitFirstSentence(report.summary_he || "");
  return h(
    "article",
    { class: "card report" + (compact ? " report--compact" : ""), "data-testid": "report" },
    h("span", { class: "kicker" }, "הדוח של Claude"),
    h("h2", { class: "report__head" }, head || "אין סיכום זמין"),
    rest ? h("p", { class: "report__body" }, rest) : null,
    foot
  );
}

export const disclaimer = () => h("p", { class: "disclaimer", "data-testid": "disclaimer" }, DISCLAIMER);
