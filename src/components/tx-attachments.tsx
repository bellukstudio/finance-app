"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./icons";
import { ReceiptModal } from "./receipt-modal";
import { compressReceiptFile, formatBytes } from "@/lib/client-compress";

export type AttachmentItem = {
  id: string;
  transaction_id?: string;
  mime_type: string;
  size_bytes?: number;
};

export type TxAttachmentsProps = {
  transactionId: string;
  transactionTitle: string;
  amount: number | string;
  date: string;
  attachments: AttachmentItem[];
  canWrite: boolean;
  canManage: boolean;
};

export function TxAttachments({
  transactionId,
  transactionTitle,
  amount,
  date,
  attachments,
  canWrite,
  canManage,
}: TxAttachmentsProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedAtt, setSelectedAtt] = useState<AttachmentItem | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setErr(null);
    setUploadStatus("Memeriksa file…");

    try {
      setUploadStatus(file.type === "application/pdf" ? "Memeriksa PDF…" : "Mengompresi gambar nota…");
      const comp = await compressReceiptFile(file);
      if (comp.error) {
        setErr(comp.error);
        setUploadStatus(null);
        return;
      }
      const fileToUpload = comp.file;
      setUploadStatus(
        comp.isCompressed
          ? `Terkompresi (${formatBytes(comp.originalSize)} → ${formatBytes(comp.compressedSize)}). Mengunggah…`
          : "Mengunggah nota…",
      );

      startTransition(async () => {
        try {
          const fd = new FormData();
          fd.set("transaction_id", transactionId);
          fd.set("file", fileToUpload);

          const res = await fetch("/api/attachments", {
            method: "POST",
            body: fd,
            headers: { "x-json": "1" },
          });

          const j = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

          if (res.ok && j?.ok) {
            setUploadStatus("Berhasil diunggah!");
            setTimeout(() => setUploadStatus(null), 2500);
            router.refresh();
          } else {
            setErr(j?.message || "Gagal mengunggah nota.");
            setUploadStatus(null);
          }
        } catch {
          setErr("Kesalahan jaringan saat mengunggah nota.");
          setUploadStatus(null);
        }
      });
    } catch {
      setErr("Gagal memproses file nota.");
      setUploadStatus(null);
    }
  };

  return (
    <div className="tx-attachments-row">
      {attachments.map((att) => (
        <span key={att.id} className="tx-att-item">
          <button
            type="button"
            className="btn ghost sm nota-preview-btn"
            onClick={() => setSelectedAtt(att)}
            title="Klik untuk membuka popup pratinjau nota"
          >
            <Icon n={att.mime_type === "application/pdf" ? "fileText" : "eye"} />
            <span>Lihat nota</span>
            {att.size_bytes ? (
              <small className="muted font-mono">{formatBytes(att.size_bytes)}</small>
            ) : null}
          </button>

          <a
            href={`/api/attachments/${att.id}?dl=1`}
            className="ib sm"
            title="Unduh file nota"
            aria-label="Unduh nota"
          >
            <Icon n="download" />
          </a>

          {canManage && (
            <form action={`/api/attachments/${att.id}`} method="post" style={{ margin: 0, padding: 0 }}>
              <button
                type="submit"
                className="ib del sm"
                title="Hapus nota"
                aria-label="Hapus nota"
                data-confirm="File nota akan dihapus permanen dari Cloudinary."
                data-confirm-title="Hapus nota transaksi ini?"
                data-confirm-label="Hapus nota"
              >
                <Icon n="trash" />
              </button>
            </form>
          )}
        </span>
      ))}

      {canWrite && (
        <span className="tx-upload-wrap">
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept="image/*,application/pdf"
            onChange={handleFilePicked}
          />

          <button
            type="button"
            className="btn ghost sm nota-upload-btn"
            disabled={isPending}
            onClick={() => fileInputRef.current?.click()}
            title="Pilih foto atau PDF nota untuk transaksi ini"
          >
            <Icon n="plus" />
            <span>{isPending ? "Mengunggah…" : "Unggah nota"}</span>
          </button>

          {uploadStatus && <small className="tx-upload-status">{uploadStatus}</small>}
          {err && <small className="tx-upload-err">{err}</small>}
        </span>
      )}

      {selectedAtt && (
        <ReceiptModal
          url={`/api/attachments/${selectedAtt.id}`}
          downloadUrl={`/api/attachments/${selectedAtt.id}?dl=1`}
          mimeType={selectedAtt.mime_type}
          sizeBytes={selectedAtt.size_bytes}
          title={transactionTitle}
          amount={amount}
          date={date}
          canDelete={canManage}
          deleteAction={`/api/attachments/${selectedAtt.id}`}
          onClose={() => setSelectedAtt(null)}
        />
      )}
    </div>
  );
}
