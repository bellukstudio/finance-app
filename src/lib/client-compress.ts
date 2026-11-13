export type CompressionResult = {
  file: File;
  originalSize: number;
  compressedSize: number;
  savedPercent: number;
  isCompressed: boolean;
  /** Terisi bila file tidak bisa dipakai (format tidak didukung / tetap terlalu besar). */
  error: string | null;
};

/** Batas kirim ke server (Vercel ±4,5 MB). Dikurangi sedikit untuk overhead multipart. */
export const MAX_UPLOAD_BYTES = 4_000_000;
/** Target aman setelah kompresi, agar selalu di bawah MAX_UPLOAD_BYTES. */
const TARGET_BYTES = 3_500_000;
/** Gambar yang sudah kecil dan formatnya didukung server tidak perlu dikompres ulang. */
const SKIP_BELOW = 120 * 1024;

const SERVER_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const formatBytes = (bytes: number) => {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1_000))} KB`;
};

/** Kamera/galeri di sebagian perangkat mengirim `type` kosong atau HEIC; tentukan tipe efektifnya. */
function effectiveType(file: File): string {
  if (file.type) return file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg": case "jpeg": return "image/jpeg";
    case "png": return "image/png";
    case "webp": return "image/webp";
    case "heic": return "image/heic";
    case "heif": return "image/heif";
    case "pdf": return "application/pdf";
    default: return "";
  }
}

const fail = (file: File, error: string): CompressionResult => ({
  file, originalSize: file.size, compressedSize: file.size, savedPercent: 0, isCompressed: false, error,
});
const pass = (file: File): CompressionResult => ({
  file, originalSize: file.size, compressedSize: file.size, savedPercent: 0, isCompressed: false, error: null,
});

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    // Foto kamera menyimpan orientasi di EXIF; pastikan hasilnya tegak.
    try { return await createImageBitmap(file, { imageOrientation: "from-image" }); } catch {}
    try { return await createImageBitmap(file); } catch {}
  }
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Gagal memuat gambar")); };
    img.src = url;
  });
}

const toBlob = (canvas: HTMLCanvasElement, type: string, q: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, q));

/**
 * Menyiapkan file nota sebelum diunggah. Validasi ukuran dilakukan SETELAH kompresi,
 * sehingga foto kamera (sering 4–12 MB) tidak ditolak sebelum sempat diperkecil.
 * Gambar diperkecil bertahap (dimensi & kualitas) sampai di bawah TARGET_BYTES.
 * PDF tidak bisa dikompres di browser: hanya divalidasi ukurannya.
 */
export async function compressReceiptFile(file: File): Promise<CompressionResult> {
  const type = effectiveType(file);
  const originalSize = file.size;

  if (type === "application/pdf") {
    return originalSize > MAX_UPLOAD_BYTES
      ? fail(file, `PDF terlalu besar (${formatBytes(originalSize)}). Maksimal 4 MB.`)
      : pass(file);
  }

  if (!type.startsWith("image/")) {
    return fail(file, "Tipe file tidak didukung (JPEG, PNG, WebP, PDF).");
  }

  // Sudah kecil & format didukung server -> langsung pakai
  if (originalSize < SKIP_BELOW && SERVER_IMAGE_TYPES.includes(type)) return pass(file);

  let bitmap: ImageBitmap | HTMLImageElement;
  try {
    bitmap = await decode(file);
  } catch {
    const heic = type === "image/heic" || type === "image/heif";
    return fail(
      file,
      heic
        ? "Format HEIC tidak bisa diproses browser ini. Ubah kamera ke format JPEG/“Paling Kompatibel”, lalu coba lagi."
        : "Gambar tidak bisa dibaca. Coba foto ulang atau pilih file lain.",
    );
  }

  const origW = bitmap.width, origH = bitmap.height;
  const longest = Math.max(origW, origH);
  let best: Blob | null = null;

  try {
    for (const maxDim of [1600, 1280, 1024]) {
      const scale = Math.min(1, maxDim / longest);
      const w = Math.max(1, Math.round(origW * scale));
      const h = Math.max(1, Math.round(origH * scale));

      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("Canvas context 2D tidak tersedia");
      ctx.fillStyle = "#ffffff"; // PNG transparan tetap terbaca
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(bitmap, 0, 0, w, h);

      for (const q of [0.82, 0.72, 0.62, 0.5]) {
        // WebP dulu; Safari lama akan mengembalikan PNG/JPEG -> jatuh ke JPEG
        let blob = await toBlob(canvas, "image/webp", q);
        if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", q);
        if (!blob) continue;
        if (!best || blob.size < best.size) best = blob;
        if (blob.size <= TARGET_BYTES) { best = blob; break; }
      }
      if (best && best.size <= TARGET_BYTES) break;
    }
  } catch (err) {
    console.warn("Kompresi gambar di browser gagal:", err);
  } finally {
    if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();
  }

  // Jika hasil kompresi tidak lebih kecil tapi file asli sudah aman, pakai file asli
  const originalOk = originalSize <= MAX_UPLOAD_BYTES && SERVER_IMAGE_TYPES.includes(type);
  if (!best || (best.size >= originalSize && originalOk)) {
    return originalOk
      ? pass(file)
      : fail(file, `Gambar terlalu besar (${formatBytes(originalSize)}) dan gagal dikompres. Coba foto ulang dengan resolusi lebih rendah.`);
  }
  if (best.size > MAX_UPLOAD_BYTES) {
    return fail(file, "Gambar masih lebih dari 4 MB setelah dikompres. Coba foto ulang dengan resolusi lebih rendah.");
  }

  const ext = best.type === "image/webp" ? "webp" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "nota";
  const out = new File([best], `${baseName}.${ext}`, { type: best.type, lastModified: Date.now() });
  return {
    file: out,
    originalSize,
    compressedSize: out.size,
    savedPercent: Math.max(0, Math.round(((originalSize - out.size) / originalSize) * 100)),
    isCompressed: true,
    error: null,
  };
}
