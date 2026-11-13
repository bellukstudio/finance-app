"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { rupiah } from "@/lib/format";
import { formatBytes } from "@/lib/client-compress";

export type ReceiptModalProps = {
  url: string;
  downloadUrl?: string;
  filename?: string;
  mimeType: string;
  sizeBytes?: number;
  title?: string;
  amount?: number | string;
  date?: string;
  canDelete?: boolean;
  deleteAction?: string;
  onClose: () => void;
};

export function ReceiptModal({
  url,
  downloadUrl,
  filename,
  mimeType,
  sizeBytes,
  title,
  amount,
  date,
  canDelete,
  deleteAction,
  onClose,
}: ReceiptModalProps) {
  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";
  const [zoomed, setZoomed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Tutup dengan tombol Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Label badge format file
  const formatBadge = isPdf
    ? "PDF Dokumen"
    : mimeType.replace("image/", "").toUpperCase();

  const formattedAmount = amount ? rupiah(Number(amount)) : null;

  return (
    <div
      className="mb receipt-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal receipt-modal-box"
        role="dialog"
        aria-modal="true"
        aria-label="Pratinjau Nota"
      >
        <header className="receipt-header">
          <div className="receipt-head-info">
            <div className="receipt-icon-wrap" aria-hidden="true">
              <Icon n={isPdf ? "fileText" : "eye"} />
            </div>
            <div>
              <h2 className="receipt-title">{title || "Pratinjau Nota"}</h2>
              <div className="receipt-sub">
                {formattedAmount && <b className="receipt-amt">{formattedAmount}</b>}
                {date && <span>{date}</span>}
                {filename && <span className="receipt-fn">{filename}</span>}
              </div>
            </div>
          </div>

          <div className="receipt-actions-top">
            {isImage && (
              <button
                type="button"
                className="ib"
                onClick={() => setZoomed((z) => !z)}
                title={zoomed ? "Sesuaikan ukuran layar" : "Perbesar ukuran asli (100%)"}
                aria-label={zoomed ? "Perkecil gambar" : "Perbesar gambar"}
              >
                <Icon n={zoomed ? "zoomOut" : "zoomIn"} />
              </button>
            )}

            {downloadUrl && (
              <a
                href={downloadUrl}
                download={filename || "nota"}
                className="ib"
                title="Unduh file nota"
                aria-label="Unduh nota"
              >
                <Icon n="download" />
              </a>
            )}

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="ib"
              title="Buka di tab baru"
              aria-label="Buka di tab baru"
            >
              <Icon n="external" />
            </a>

            <button
              type="button"
              className="x"
              aria-label="Tutup pratinjau"
              onClick={onClose}
            >
              <Icon n="x" />
            </button>
          </div>
        </header>

        <div className="receipt-body">
          {isImage ? (
            <div className={`receipt-img-canvas ${zoomed ? "is-zoomed" : ""}`}>
              {failed && (
                <div className="receipt-loading" role="alert" style={{ flexDirection: "column", textAlign: "center" }}>
                  <span>Gambar nota gagal dimuat.</span>
                  <button
                    type="button"
                    className="ghost sm"
                    onClick={() => { setFailed(false); setLoading(true); setAttempt((n) => n + 1); }}
                  >
                    Coba lagi
                  </button>
                </div>
              )}
              {loading && !failed && (
                <div className="receipt-loading">
                  <span className="receipt-spinner" /> Memuat gambar nota…
                </div>
              )}
              <img
                key={attempt}
                src={attempt ? `${url}${url.includes("?") ? "&" : "?"}r=${attempt}` : url}
                alt={title || "Foto Nota Transaksi"}
                className="receipt-img"
                style={failed ? { display: "none" } : undefined}
                onLoad={() => setLoading(false)}
                onError={() => { setLoading(false); setFailed(true); }}
                onClick={() => setZoomed((z) => !z)}
                title="Klik gambar untuk memperbesar / memperkecil"
              />
              <div className="receipt-zoom-hint">
                <Icon n={zoomed ? "zoomOut" : "zoomIn"} />
                <span>{zoomed ? "Klik gambar untuk menyesuaikan layar" : "Klik gambar untuk perbesar 100%"}</span>
              </div>
            </div>
          ) : isPdf ? (
            <div className="receipt-pdf-canvas">
              <iframe
                src={url}
                title="Dokumen Nota PDF"
                className="receipt-pdf-frame"
              />
              <div className="receipt-pdf-footer-bar">
                <small className="muted">
                  Browser tertentu membatasi pratinjau PDF langsung di dalam popup. Jika tidak muncul, gunakan tombol di bawah:
                </small>
                <div className="receipt-pdf-acts">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="btn ghost sm">
                    <Icon n="external" /> Buka Tab Baru
                  </a>
                  {downloadUrl && (
                    <a href={downloadUrl} download={filename || "nota.pdf"} className="btn ghost sm">
                      <Icon n="download" /> Unduh PDF
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="receipt-unsupported">
              <p>Format file tidak dapat dipratinjau langsung ({mimeType}).</p>
              {downloadUrl && (
                <a href={downloadUrl} className="btn ghost">
                  <Icon n="download" /> Unduh file nota
                </a>
              )}
            </div>
          )}
        </div>

        <footer className="receipt-footer">
          <div className="receipt-meta">
            <span className="receipt-badge">{formatBadge}</span>
            {sizeBytes ? (
              <span className="receipt-size">{formatBytes(sizeBytes)}</span>
            ) : null}
          </div>

          <div className="receipt-foot-acts">
            {canDelete && deleteAction && (
              <form action={deleteAction} method="post" style={{ margin: 0, padding: 0 }}>
                <button
                  type="submit"
                  className="danger sm"
                  data-confirm="File nota akan dihapus permanen dari penyimpanan Cloudinary."
                  data-confirm-title="Hapus nota transaksi ini?"
                  data-confirm-label="Hapus nota"
                >
                  <Icon n="trash" /> Hapus Nota
                </button>
              </form>
            )}

            <button type="button" className="ghost sm" onClick={onClose}>
              Tutup
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
