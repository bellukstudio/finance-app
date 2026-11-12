import "server-only";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

/** Semua nota disimpan di folder `receipts/` pada Cloudinary (type "authenticated": tidak bisa dibuka tanpa URL bertanda tangan). */
export const RECEIPT_ROOT = "receipts";
/** Lampiran baru berawalan `receipts/` (public_id Cloudinary). Lampiran lama (path Supabase Storage) berawalan UUID keluarga. */
export const isCloudinaryPath = (p: string) => p.startsWith(`${RECEIPT_ROOT}/`);

let ready = false;
function cl() {
  if (!ready) {
    const { CLOUDINARY_CLOUD_NAME: cloud_name, CLOUDINARY_API_KEY: api_key, CLOUDINARY_API_SECRET: api_secret } = process.env;
    if (!cloud_name || !api_key || !api_secret) throw new Error("CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET belum diisi");
    cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
    ready = true;
  }
  return cloudinary;
}

/** Unggah ke `receipts/<family>/<transaksi>/<uuid>`. PDF juga memakai resource_type "image" (Cloudinary memperlakukan PDF sebagai gambar).
 * Kompresi & optimasi otomatis Cloudinary (quality: auto) diterapkan untuk file gambar dan dokumen PDF. */
export function uploadReceipt(bytes: Uint8Array, familyId: string, txId: string): Promise<UploadApiResponse> {
  const folder = `${RECEIPT_ROOT}/${familyId}/${txId}`;
  return new Promise((resolve, reject) => {
    cl().uploader.upload_stream(
      {
        public_id: `${folder}/${crypto.randomUUID()}`,
        asset_folder: folder,
        resource_type: "image",
        type: "authenticated",
        overwrite: false,
        transformation: [{ quality: "auto" }],
      },
      (err, r) => (err || !r ? reject(err ?? new Error("Upload Cloudinary gagal")) : resolve(r)),
    ).end(Buffer.from(bytes));
  });
}

/** URL unduhan bertanda tangan yang kedaluwarsa dalam 60 detik. */
export const receiptUrl = (publicId: string, format: string, download: boolean) =>
  cl().utils.private_download_url(publicId, format, { resource_type: "image", type: "authenticated", expires_at: Math.floor(Date.now() / 1000) + 60, attachment: download });

/** true bila file sudah terhapus (atau memang tidak ada). */
export async function deleteReceipt(publicId: string): Promise<boolean> {
  const r = await cl().uploader.destroy(publicId, { resource_type: "image", type: "authenticated", invalidate: true });
  return r.result === "ok" || r.result === "not found";
}
