# Ruang Cuti

Aplikasi sederhana untuk mengajukan dan memantau cuti karyawan dengan peran
karyawan, kepala divisi, HRD, dan administrator.

## Menjalankan secara lokal

1. Gunakan Node.js yang didukung Next.js 16 dan PostgreSQL.
2. Salin `.env.example` menjadi `.env.local`, lalu isi `DATABASE_URL` dan
   `SESSION_SECRET` (minimal 32 karakter acak).
3. Buat database kosong `cuti_karyawan`, lalu jalankan `database/database.sql`
   melalui pgAdmin atau `psql -d cuti_karyawan -f database/database.sql`.
   **Perhatian:** skrip SQL ini menghapus lalu membuat ulang tabel aplikasi;
   gunakan hanya pada database pengembangan yang boleh di-reset.
4. Pasang dependensi dan jalankan aplikasi:

   ```bash
   npm install
   npm run dev
   ```

5. Buka `http://localhost:3000`.

Database demo memiliki password `password123`. Username yang tersedia:
`admin`, `hrd`, `kadiv_it`, `kadiv_mkt`, `andi`, `dewi`, `rudi`, dan `maya`.
Ganti kredensial demo sebelum aplikasi dipakai sungguhan.

## Pemeriksaan koneksi database

Setelah `.env.local` terisi, jalankan `SELECT * FROM users;` melalui pgAdmin
atau `psql` untuk memastikan database seed sudah tersedia.
