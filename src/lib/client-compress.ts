export type CompressionResult = {
  file: File;
  originalSize: number;
  compressedSize: number;
  savedPercent: number;
  isCompressed: boolean;
};

export const formatBytes = (bytes: number) => {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1_000))} KB`;
};

/**
 * Mengompresi file nota (gambar) di browser sebelum diunggah ke server / Cloudinary.
 * Merampingkan dimensi besar (maks 1600px) dan mengonversi ke format WebP/JPEG efisien.
 * Dokumen PDF dilewatkan untuk dioptimasi secara otomatis di sisi Cloudinary.
 */
export async function compressReceiptFile(file: File): Promise<CompressionResult> {
  const originalSize = file.size;

  if (!file.type.startsWith("image/")) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      savedPercent: 0,
      isCompressed: false,
    };
  }

  // Jika ukuran file gambar sudah sangat kecil (< 120 KB), kompresi tidak diperlukan
  if (originalSize < 120 * 1024) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      savedPercent: 0,
      isCompressed: false,
    };
  }

  try {
    const bitmap = await (async () => {
      if (typeof createImageBitmap === "function") {
        try {
          return await createImageBitmap(file);
        } catch {}
      }
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Gagal memuat gambar")); };
        img.src = url;
      });
    })();

    const origW = bitmap.width;
    const origH = bitmap.height;
    const maxDim = 1600;
    let targetW = origW;
    let targetH = origH;

    if (origW > maxDim || origH > maxDim) {
      if (origW >= origH) {
        targetW = maxDim;
        targetH = Math.round((origH * maxDim) / origW);
      } else {
        targetH = maxDim;
        targetW = Math.round((origW * maxDim) / origH);
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas context 2D tidak tersedia");

    // Latar putih agar nota dengan latar transparan (PNG) tetap jelas terbaca
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);

    if ("close" in bitmap && typeof bitmap.close === "function") {
      bitmap.close();
    }

    // Coba WebP terlebih dahulu (rasio kompresi sangat baik)
    let blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
    let ext = "webp";
    let mime = "image/webp";

    // Fallback ke JPEG jika WebP tidak didukung
    if (!blob || blob.type !== "image/webp") {
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
      ext = "jpg";
      mime = "image/jpeg";
    }

    if (blob && blob.size < originalSize) {
      const baseName = file.name.replace(/\.[^.]+$/, "");
      const compressedFile = new File([blob], `${baseName}.${ext}`, {
        type: mime,
        lastModified: Date.now(),
      });
      const savedPercent = Math.max(1, Math.round(((originalSize - compressedFile.size) / originalSize) * 100));
      return {
        file: compressedFile,
        originalSize,
        compressedSize: compressedFile.size,
        savedPercent,
        isCompressed: true,
      };
    }
  } catch (err) {
    console.warn("Kompresi gambar di browser dilewati:", err);
  }

  return {
    file,
    originalSize,
    compressedSize: originalSize,
    savedPercent: 0,
    isCompressed: false,
  };
}
