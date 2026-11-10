# Deployment: Vercel + Supabase Cloud

## 1. Supabase
1. Buat project (pilih region dekat pengguna, mis. Singapore). Catat `Project URL`, `anon key`, `service_role key`.
2. Database > Extensions: aktifkan **pg_cron** (wajib sebelum migrasi 0004/0007/0008). Realtime tidak wajib.
3. Di mesin dev: `npx supabase login && npx supabase link --project-ref <ref> && npx supabase db push`
   (membuat tabel, RLS, bucket `receipts`, fungsi, dan jadwal pg_cron). Lalu `npm run types` dan commit `src/types/database.ts`.
4. Auth > URL Configuration: **Site URL** = domain produksi; **Redirect URLs** = `https://domain-anda/**` (tambahkan `https://*-<tim>.vercel.app/**` bila ingin login di preview).

## 2. Google OAuth
Google Cloud Console > Credentials > OAuth client (Web). **Authorized redirect URI** = `https://<ref>.supabase.co/auth/v1/callback` (BUKAN URL Vercel). Salin Client ID/Secret ke Supabase > Auth > Providers > Google.

## 3. Vercel
1. Import repository, framework Next.js (terdeteksi otomatis). `vercel.json` memasang region `sin1` dan cron pembersihan file yatim.
2. Environment Variables (Production, dan Preview bila perlu): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (tanpa NEXT_PUBLIC_), `CRON_SECRET` (acak ≥32 karakter), `APP_URL`.
3. Deploy, tambahkan custom domain (HTTPS otomatis dari Vercel; tidak perlu Nginx/Let's Encrypt).
4. Cek `https://domain/api/health` → `{"ok":true}`.

## 4. Scheduler
- **Transaksi berulang & notifikasi**: pg_cron di Supabase (migrasi 0004 & 0007), tidak bergantung Vercel.
- **Pembersihan file yatim**: Vercel Cron harian (`/api/cron/orphans`, memakai `CRON_SECRET`). Plan Hobby hanya mengizinkan cron harian.
- Fallback manual: `curl -H "Authorization: Bearer $CRON_SECRET" https://domain/api/cron/recurring`.

## 5. Backup
Supabase menyediakan backup harian bawaan sesuai plan (PITR perlu add-on). Tambahan: `.github/workflows/backup.yml` menjalankan pg_dump + salinan bucket Storage tiap hari 02:00 WIB, dienkripsi GPG, disimpan sebagai artifact 14 hari.
Secrets GitHub: `SUPABASE_DB_URL` (pakai **session pooler**, karena runner GitHub tidak punya IPv6), `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BACKUP_PASSPHRASE`.
Artifact GitHub bukan arsip jangka panjang: salin berkala ke penyimpanan lain (S3/Drive) bila perlu. Uji restore: `docs/restore.md`.

## 6. Logging & monitoring
Log JSON terstruktur muncul di Vercel > Logs (`lib/logger.ts`). Untuk error monitoring pasang Sentry dari Vercel Marketplace (belum dipasang di kode ini). Pantau `/api/health` dengan uptime monitor eksternal.

## 7. Keterbatasan Vercel
Body request ±4,5 MB → upload nota maks 4 MB. Fungsi export dibatasi 30 dtk dan 10.000 baris. Rate limit memakai tabel `rate_limits` (bukan memori).
Tes pgTAP (`npx supabase test db`) butuh Docker di mesin dev (bukan di server produksi).
