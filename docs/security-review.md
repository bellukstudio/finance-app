# Security review (v0.5)
Temuan & perbaikan: (1) Admin bisa menaikkan role sendiri lewat UPDATE langsung → policy tulis `family_members` dihapus, perubahan lewat RPC (migrasi 0007).
(2) `created_by` bisa dipalsukan → trigger memaksa nilai. (3) `digest()` pada fungsi SECURITY DEFINER → search_path diperbaiki.
Sudah: RLS semua tabel, signed URL 60 dtk, magic-bytes, cek Origin di route handler (Server Actions dicek Next.js), rate limit in-memory, CSV formula-injection guard.
Belum/risiko: rate limit tidak dibagi antar-proses; hanya satu keluarga per user dalam UI; tes pgTAP belum dijalankan; belum ada email undangan; link undangan tampil di URL pesan; tidak ada log monitoring eksternal.
