import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

export interface ReportColumn {
  key: string;
  header: string;
}

/** CSV بترميز UTF-8 مع BOM ليُعرض العربي بشكل صحيح في Excel */
export function toCsv(rows: Record<string, unknown>[], columns: ReportColumn[]): string {
  const header = columns.map((c) => c.header).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const value = row[c.key] ?? "";
          const str = String(value).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(","),
    )
    .join("\n");
  return `﻿${header}\n${body}`;
}

export async function toXlsx(rows: Record<string, unknown>[], columns: ReportColumn[], sheetName = "Report"): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName, { views: [{ rightToLeft: true }] });
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: 22 }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** توليد PDF مبسّط لتقرير نتائج التصويت — يمكن تعميم النمط نفسه لبقية التقارير لاحقًا */
export function toPdfBuffer(title: string, rows: Record<string, unknown>[], columns: ReportColumn[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).text(title, { align: "center" });
    doc.moveDown();
    doc.fontSize(9);

    const colWidth = 500 / columns.length;
    let y = doc.y;
    columns.forEach((c, i) => doc.text(c.header, 40 + i * colWidth, y, { width: colWidth }));
    doc.moveDown();

    rows.forEach((row) => {
      y = doc.y;
      if (y > 760) {
        doc.addPage();
        y = doc.y;
      }
      columns.forEach((c, i) => doc.text(String(row[c.key] ?? ""), 40 + i * colWidth, y, { width: colWidth }));
      doc.moveDown();
    });

    doc.end();
  });
}
