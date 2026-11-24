import {
  money,
  type Data,
  totals,
  scheduled,
  completed,
  isFixed,
  sum,
} from "./model.ts";

export function report(rows: Data, from: string, to: string) {
  const { income, expense, rate } = totals(rows, from, to);
  const expenses = scheduled(rows, to, from).filter(
    (e) => e.kind === "expense" && completed(e),
  );
  const fixed = sum(expenses.filter(isFixed), (e) => e.amount);
  return [
    ["Başlangıç", from],
    ["Bitiş", to],
    ["Gerçekleşen gelir", income / 100],
    ["Gerçekleşen gider", expense / 100],
    ["Sabit gider", fixed / 100],
    ["Değişken gider", (expense - fixed) / 100],
    ["Gelir eksi gider", (income - expense) / 100],
    ["Tasarruf oranı (%)", rate],
  ] as [string, string | number][];
}
export async function createReportPdf(
  rows: Data,
  from: string,
  to: string,
  fontBase64: string,
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  doc.addFileToVFS("DejaVuSans-TR.ttf", fontBase64);
  doc.addFont("DejaVuSans-TR.ttf", "DejaVuSans", "normal");
  doc.setFont("DejaVuSans");
  doc.setFontSize(19);
  doc.text("Finans360 · Dönem raporu", 18, 22);
  doc.setFontSize(11);
  for (const [index, [name, value]] of report(rows, from, to).entries()) {
    const y = 39 + index * 9;
    doc.text(name, 18, y);
    const display =
      typeof value === "string"
        ? value
        : name.endsWith("(%)")
          ? value.toLocaleString("tr-TR", { maximumFractionDigits: 2 })
          : money(Math.round(value * 100));
    doc.text(display, 192, y, { align: "right" });
  }
  return doc;
}
export async function exportPdf(rows: Data, from: string, to: string) {
  const { default: font } = await import("./assets/DejaVuSans-TR.ttf?inline");
  const base64 = font.slice(font.indexOf(",") + 1);
  const doc = await createReportPdf(rows, from, to, base64);
  return doc.output("blob");
}
