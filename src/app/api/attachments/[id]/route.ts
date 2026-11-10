import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sameOrigin } from "@/lib/same-origin";
import { isCloudinaryPath, receiptUrl, deleteReceipt } from "@/lib/cloudinary";
import { log } from "@/lib/logger";

const FORMAT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

// Pratinjau/unduh: URL bertanda tangan 60 detik (RLS memastikan hanya anggota keluarga yang lolos).
// Lampiran lama (path Supabase Storage) tetap dilayani lewat signed URL Supabase.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const sb = await supabaseServer();
  const { data: a } = await sb.from("attachments").select("storage_path,mime_type").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!a) return new NextResponse("Not found", { status: 404 });
  const dl = req.nextUrl.searchParams.has("dl");
  try {
    if (isCloudinaryPath(a.storage_path)) {
      const res = NextResponse.redirect(receiptUrl(a.storage_path, FORMAT[a.mime_type] ?? "jpg", dl));
      res.headers.set("Cache-Control", "private, no-store"); return res;
    }
    const { data } = await sb.storage.from("receipts").createSignedUrl(a.storage_path, 60, dl ? { download: true } : undefined);
    return data ? NextResponse.redirect(data.signedUrl) : new NextResponse("Error", { status: 500 });
  } catch (err) { log("error", "attachments.get", { error: String(err) }); return new NextResponse("Error", { status: 500 }); }
}
// Hapus: metadata dulu (RLS: Owner/Admin), lalu file. File Supabase yatim dibersihkan job; file Cloudinary dihapus langsung.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return new NextResponse("Forbidden", { status: 403 });
  const { id } = await params; const sb = await supabaseServer();
  const { data: a } = await sb.from("attachments").select("storage_path").eq("id", id).maybeSingle();
  const msg = async () => {
    if (!a) return "Lampiran tidak ditemukan.";
    const { data, error } = await sb.from("attachments").delete().eq("id", id).select("id");
    if (error || !data?.length) return "Tidak ada izin menghapus lampiran.";
    try {
      const ok = isCloudinaryPath(a.storage_path) ? await deleteReceipt(a.storage_path) : !(await supabaseAdmin().storage.from("receipts").remove([a.storage_path])).error;
      return ok ? "Lampiran dihapus." : "Metadata dihapus, tetapi file belum terhapus dari penyimpanan.";
    } catch (err) { log("error", "attachments.delete", { error: String(err) }); return "Metadata dihapus, tetapi file belum terhapus dari penyimpanan."; }
  };
  return NextResponse.redirect(new URL(`/transaksi?e=${encodeURIComponent(await msg())}`, req.nextUrl.origin), 303);
}
