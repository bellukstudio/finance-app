import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { supabaseServer } from "@/lib/supabase/server";
import { sniffMime } from "@/lib/finance";
import { uploadReceipt, deleteReceipt } from "@/lib/cloudinary";
import { log } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/same-origin";
import { canWrite } from "@/lib/context";
const MAX = 4_000_000;  // batas body Vercel ±4,5 MB
const OK_MSG = "Nota berhasil diunggah.";
const MAX_PER_TX = 10;  // batasi jumlah lampiran per transaksi (anti penyalahgunaan storage)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Form biasa -> redirect ke /transaksi; fetch dari modal (header x-json) -> JSON.
const done = (req: NextRequest, msg: string) => req.headers.get("x-json")
  ? NextResponse.json({ ok: msg === OK_MSG, message: msg }, { status: msg === OK_MSG ? 200 : 400 })
  : NextResponse.redirect(new URL(`/transaksi?e=${encodeURIComponent(msg)}`, req.nextUrl.origin), 303);

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse("Forbidden", { status: 403 });
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (!(await rateLimit(sb, "upload", 20, 60))) return done(req, "Terlalu banyak unggahan, coba lagi sebentar lagi.");
  // Tolak body raksasa sebelum di-parse (Content-Length dari klien; body tanpa header tetap dibatasi di bawah).
  const cl = Number(req.headers.get("content-length") ?? 0);
  if (cl > MAX + 200_000) return done(req, "Ukuran file maksimal 4 MB.");
  const fd = await req.formData().catch(() => null); if (!fd) return done(req, "Permintaan tidak valid.");
  const file = fd.get("file"); const tid = String(fd.get("transaction_id") ?? "");
  if (!(file instanceof File) || !UUID.test(tid)) return done(req, "File tidak ditemukan.");
  if (file.size === 0 || file.size > MAX) return done(req, "Ukuran file maksimal 4 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(bytes);
  if (!mime) return done(req, "Tipe file tidak didukung (JPEG, PNG, WebP, PDF).");
  const { data: tx } = await sb.from("transactions").select("id,family_id").eq("id", tid).maybeSingle();  // RLS: hanya keluarga sendiri
  if (!tx) return done(req, "Transaksi tidak ditemukan.");
  // Cek peran di aplikasi (selain RLS): Viewer tidak boleh mengunggah.
  const { data: mem } = await sb.from("family_members").select("role").eq("family_id", tx.family_id).eq("user_id", user.id).is("deleted_at", null).maybeSingle();
  if (!mem || !canWrite(mem.role)) return done(req, "Anda tidak memiliki izin mengunggah nota.");
  const { count } = await sb.from("attachments").select("id", { count: "exact", head: true }).eq("transaction_id", tx.id).is("deleted_at", null);
  if ((count ?? 0) >= MAX_PER_TX) return done(req, `Maksimal ${MAX_PER_TX} nota per transaksi.`);
  // PDF tidak diproses ulang: tolak yang memuat aksi aktif (JavaScript / Launch / file tertanam).
  if (mime === "application/pdf" && /\/(JavaScript|JS|Launch|EmbeddedFile|OpenAction)\b/.test(Buffer.from(bytes).toString("latin1"))) return done(req, "PDF berisi konten aktif dan tidak diizinkan. Gunakan foto atau PDF biasa.");
  // Kompresi gambar di sisi server (jika format gambar) sebelum dikirim ke Cloudinary
  let uploadBytes = bytes;
  let uploadMime = mime;
  if (mime.startsWith("image/")) {
    try {
      let pipeline = sharp(Buffer.from(bytes), { limitInputPixels: 50_000_000, failOn: "error" })
        .rotate()
        .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true });
      let optBuf: Buffer;
      if (mime === "image/webp") {
        optBuf = await pipeline.webp({ quality: 82, effort: 4 }).toBuffer();
      } else if (mime === "image/png") {
        optBuf = await pipeline.png({ compressionLevel: 8, palette: true, quality: 85 }).toBuffer();
      } else {
        optBuf = await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      }
      if (optBuf.length < bytes.length) {
        uploadBytes = new Uint8Array(optBuf);
      }
    } catch (err) {
      // Fail closed: gambar yang lolos cek magic bytes tapi tidak bisa didekode sharp kemungkinan rusak/berbahaya.
      log("warn", "attachments.compress", { error: String(err) });
      return done(req, "File gambar rusak atau tidak dapat diproses.");
    }
  }

  // storage_path menyimpan public_id Cloudinary: receipts/<family>/<transaksi>/<uuid>
  let publicId: string;
  try { publicId = (await uploadReceipt(uploadBytes, tx.family_id, tx.id)).public_id; }
  catch (err) { log("error", "attachments.upload", { error: String(err) }); return done(req, "Gagal mengunggah ke penyimpanan nota."); }
  const ins = await sb.from("attachments").insert({ family_id: tx.family_id, transaction_id: tx.id, storage_path: publicId, mime_type: uploadMime, size_bytes: uploadBytes.length, created_by: user.id });
  if (ins.error) { await deleteReceipt(publicId).catch(() => false); return done(req, "Gagal menyimpan metadata."); }
  return done(req, OK_MSG);
}
