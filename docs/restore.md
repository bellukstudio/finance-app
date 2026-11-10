# Restore & uji pemulihan
1. Unduh artifact `backup-<id>`, lalu dekripsi: `gpg -o db.dump -d db.dump.gpg` dan `gpg -o storage.tgz -d storage.tgz.gpg` (passphrase = `BACKUP_PASSPHRASE`).
2. **Uji di project Supabase kosong, jangan di produksi**: `pg_restore --no-owner --no-privileges --clean --if-exists -d "<DB_URL_TEST>" db.dump` (gunakan pg_restore versi ≥ server). Error pada skema bawaan Supabase (auth/storage) boleh muncul; periksa tabel `public.*`.
3. Verifikasi: jumlah baris `transactions`, `wallets`; `select * from wallet_balances` cocok dengan saldo yang dicatat sebelum backup.
4. Storage: `tar xzf storage.tgz`, lalu unggah ulang tiap file ke bucket `receipts` dengan path yang sama (script `supabase.storage.from('receipts').upload(path, file)`), lalu jalankan `/api/cron/orphans` untuk memastikan tidak ada yatim.
5. Jadwalkan uji restore minimal tiap kuartal dan catat hasilnya.
6. Pemulihan produksi: bila memakai backup bawaan Supabase, restore dari Dashboard > Database > Backups; tinjau dampak pada user Auth.
