import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { sniffMime } from "@/lib/finance";
import { uploadReceipt, deleteReceipt } from "@/lib/cloudinary";
import { log } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/same-origin";
const MAX = 4_000_000;  // batas body Vercel ±4,5 MB
const OK_MSG = "Nota berhasil diunggah.";
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
  const fd = await req.formData(); const file = fd.get("file"); const tid = String(fd.get("transaction_id") ?? "");
  if (!(file instanceof File) || !tid) return done(req, "File tidak ditemukan.");
  if (file.size === 0 || file.size > MAX) return done(req, "Ukuran file maksimal 4 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(bytes);
  if (!mime) return done(req, "Tipe file tidak didukung (JPEG, PNG, WebP, PDF).");
  const { data: tx } = await sb.from("transactions").select("id,family_id").eq("id", tid).maybeSingle();  // RLS: hanya keluarga sendiri
  if (!tx) return done(req, "Transaksi tidak ditemukan.");
  // storage_path menyimpan public_id Cloudinary: receipts/<family>/<transaksi>/<uuid>
  let publicId: string;
  try { publicId = (await uploadReceipt(bytes, tx.family_id, tx.id)).public_id; }
  catch (err) { log("error", "attachments.upload", { error: String(err) }); return done(req, "Gagal mengunggah ke penyimpanan nota."); }
  const ins = await sb.from("attachments").insert({ family_id: tx.family_id, transaction_id: tx.id, storage_path: publicId, mime_type: mime, size_bytes: bytes.length, created_by: user.id });
  if (ins.error) { await deleteReceipt(publicId).catch(() => false); return done(req, "Gagal menyimpan metadata."); }
  return done(req, OK_MSG);
}
