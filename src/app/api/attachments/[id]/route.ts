import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sameOrigin } from "@/lib/same-origin";

// Pratinjau/unduh: signed URL 60 detik (RLS memastikan hanya anggota keluarga)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const sb = await supabaseServer();
  const { data: a } = await sb.from("attachments").select("storage_path").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!a) return new NextResponse("Not found", { status: 404 });
  const { data } = await sb.storage.from("receipts").createSignedUrl(a.storage_path, 60, req.nextUrl.searchParams.has("dl") ? { download: true } : undefined);
  return data ? NextResponse.redirect(data.signedUrl) : new NextResponse("Error", { status: 500 });
}
// Hapus: metadata dulu (RLS: Owner/Admin), lalu file. File yatim dibersihkan job (lihat README).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return new NextResponse("Forbidden", { status: 403 });
  const { id } = await params; const sb = await supabaseServer();
  const { data: a } = await sb.from("attachments").select("storage_path").eq("id", id).maybeSingle();
  const msg = async () => {
    if (!a) return "Lampiran tidak ditemukan.";
    const { data, error } = await sb.from("attachments").delete().eq("id", id).select("id");
    if (error || !data?.length) return "Tidak ada izin menghapus lampiran.";
    const r = await supabaseAdmin().storage.from("receipts").remove([a.storage_path]);
    return r.error ? "Metadata dihapus; file akan dibersihkan job." : "Lampiran dihapus.";
  };
  return NextResponse.redirect(new URL(`/transaksi?e=${encodeURIComponent(await msg())}`, req.nextUrl.origin), 303);
}
