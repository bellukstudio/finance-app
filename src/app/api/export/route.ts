import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { getOptionalCtx } from "@/lib/context";
import { rateLimit } from "@/lib/rate-limit";
import { csvRow, ddmmyyyy } from "@/lib/export";

export const maxDuration = 30;
const LIMIT = 10000;
export async function GET(req: NextRequest) {
  const ctx = await getOptionalCtx();  // mengikuti catatan aktif (keluarga/pribadi); RLS tetap membatasi akses
  if (!ctx) return new NextResponse("Unauthorized", { status: 401 });
  const { sb, familyId, ledger } = ctx;
  if (!(await rateLimit(sb, "export", 10, 60))) return new NextResponse("Terlalu banyak permintaan", { status: 429 });
  const sp = req.nextUrl.searchParams, fmt = sp.get("format") ?? "csv", from = sp.get("from"), to = sp.get("to");
  let q = sb.from("transactions").select("date,type,amount,description,note,wallet_id,category_id").eq("family_id", familyId).is("deleted_at", null).order("date", { ascending: false }).limit(LIMIT);
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) q = q.gte("date", from);
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) q = q.lte("date", to);
  const [{ data: txs, error }, { data: ws }, { data: cs }] = await Promise.all([q, sb.from("wallets").select("id,name").eq("family_id", familyId), sb.from("categories").select("id,name").eq("family_id", familyId)]);
  if (error) return new NextResponse("Gagal mengambil data", { status: 500 });
  const wn = new Map(ws?.map(w => [w.id, w.name])), cn = new Map(cs?.map(c => [c.id, c.name]));
  const head = ["Tanggal", "Jenis", "Nominal", "Dompet", "Kategori", "Deskripsi", "Catatan"];
  const rows = (txs ?? []).map(t => [ddmmyyyy(t.date), t.type, Number(t.amount), wn.get(t.wallet_id) ?? "", cn.get(t.category_id ?? "") ?? "", t.description ?? "", t.note ?? ""]);
  const name = `transaksi${ledger === "personal" ? "-pribadi" : ""}-${new Date().toISOString().slice(0, 10)}`;
  if (fmt === "xlsx") {
    const wb = new ExcelJS.Workbook(); const sh = wb.addWorksheet("Transaksi");
    sh.addRow(head).font = { bold: true }; rows.forEach(r => sh.addRow(r.map(c => (typeof c === "string" && /^[=+\-@]/.test(c) ? "'" + c : c))));
    sh.getColumn(3).numFmt = "#,##0"; sh.columns.forEach(c => (c.width = 18));
    const buf = await wb.xlsx.writeBuffer();
    return new NextResponse(buf as ArrayBuffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${name}.xlsx"` } });
  }
  if (fmt === "pdf") {
    const doc = new PDFDocument({ size: "A4", margin: 36 }); const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c)); const done = new Promise<void>(r => doc.on("end", () => r()));
    doc.fontSize(14).text("Laporan Transaksi"); doc.moveDown(0.5).fontSize(8);
    rows.slice(0, 600).forEach(r => doc.text(`${r[0]}  ${r[1]}  Rp${new Intl.NumberFormat("id-ID").format(r[2] as number)}  ${r[3]}  ${r[4]}  ${r[5]}`));
    if (rows.length > 600) doc.text(`… ${rows.length - 600} baris lainnya tidak ditampilkan di PDF; gunakan CSV/Excel.`);
    doc.end(); await done;
    return new NextResponse(Buffer.concat(chunks), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}.pdf"` } });
  }
  const csv = "\uFEFF" + [csvRow(head), ...rows.map(csvRow)].join("\r\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.csv"` } });
}
