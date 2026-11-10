# Family Finance Manager (v0.6 – Phase 1–6, target Vercel)

## Status jujur
SUDAH: skema 18 tabel + constraint + indeks, RLS semua tabel + storage policy, view saldo/budget, RPC atomik
(create_family_with_defaults, create_transfer, pay_debt, run_recurring idempotent, accept_invitation), audit trigger,
pg_cron, login Google, middleware sesi, dashboard (data dari RPC), navigasi, halaman Dompet (tambah/nonaktifkan/hapus), Kategori (hapus-atau-arsip), Transfer (RPC atomik + biaya), Transaksi (tambah, cari, filter, pagination server-side, duplikasi, hapus dengan soft delete), pemetaan error PG, Anggota & undangan (link 7 hari, sekali pakai; role via RPC), Notifikasi (budget ≥70%/terlampaui, jatuh tempo utang, transaksi berulang; pg_cron 30 mnt; polling 60 dtk), Audit log, Pengaturan (ganti nama, logout semua perangkat), Export CSV/Excel/PDF transaksi, rate limit terpusat di Postgres, tes pgTAP (RLS semua tabel utama + RPC transfer/utang/recurring), docs/security-review.md, Aset (riwayat nilai, atomik), Utang & Piutang (bayar via RPC, cegah overpay, status/jatuh tempo), Transaksi Berulang (idempotent, tombol jalankan), Nota (upload dengan cek magic bytes & ukuran, bucket private, signed URL 60 dtk, hapus + cek Origin), Budget (kategori/dompet; mingguan/bulanan/tahunan/kustom; status Aman/Warning/Critical/Over; riwayat), Dashboard (filter periode, kartu, 3 grafik Recharts, budget terpakai), Laporan (cash flow, expense/income by category, wallet balance, budget performance), tes unit status budget & periode (`npm test`), health check, cron endpoint, konfigurasi Vercel, workflow backup, 1 tes pgTAP RLS.
BELUM (perlu dikerjakan di fase berikutnya): edit transaksi/dompet/kategori, konfirmasi hapus (masih tombol langsung), filter kategori/dompet/anggota & Net Worth/Monthly Summary/Transaction History di laporan, grafik riwayat budget, notifikasi budget, edit data, export laporan (selain transaksi), pembersihan file yatim terjadwal, email undangan, multi-keluarga per user, monitoring,
Tailwind+shadcn+Recharts, dark mode, navigasi sidebar, notifikasi, export CSV/Excel/PDF, rate limit terpusat di Postgres, pemetaan error PG ke Bahasa Indonesia,
tes unit & RPC lengkap, tipe hasil `supabase gen types`, restore storage backup.
Build ini belum dijalankan/diuji terhadap Supabase sungguhan.

## Deploy
Lihat `docs/deployment.md` (Vercel + Supabase), `docs/restore.md` (backup & restore), `docs/security-review.md`.
Batas khusus Vercel: upload nota maks 4 MB (batas body serverless ±4,5 MB).
