# Portainer Deployment

Dokumen ini menjelaskan deployment Visitor BMC sebagai Docker Stack di Portainer. Stack ini menjalankan frontend React melalui nginx dan backend Node.js/Express. SQL Server tidak dijalankan oleh stack karena aplikasi menggunakan database SQL Server existing.

## Prasyarat

- Docker Engine dan Portainer sudah terpasang di server target.
- Server Docker dapat mengakses SQL Server pada `DB_SERVER:DB_PORT`.
- Schema database Visitor BMC sudah dijalankan pada database target.
- Source code tersedia di Git repository yang dapat diakses Portainer, atau file compose tersedia untuk upload.

## Persiapan Database

Jalankan migration dari folder `backend/database` secara berurutan pada database `BMC`. Migration tidak dijalankan otomatis ketika container start.

Minimal, pastikan migration terbaru termasuk `009_public_induction_access.sql` sudah dijalankan. Contoh menggunakan `sqlcmd`:

```bash
sqlcmd -S <db-server>,<db-port> -U <db-user> -P '<db-password>' -d BMC -i backend/database/001_initial_schema.sql
```

Lanjutkan dengan migration berikutnya sesuai nomor file yang belum dijalankan.

## Deploy Sebagai Stack

1. Di Portainer buka `Stacks` lalu pilih `Add stack`.
2. Beri nama stack `visitorbmc`.
3. Pilih `Git repository`.
4. Isi repository URL dan branch/tag release yang akan dideploy.
5. Isi `Compose path` dengan `docker-compose.portainer.yml`.
6. Pada bagian environment variables, masukkan nilai dari `portainer.env.example`.
7. Ganti semua nilai placeholder, terutama `DB_PASSWORD` dan `JWT_SECRET`.
8. Set `APP_PORT` ke port host yang ingin dipakai, misalnya `8080`.
9. Klik `Deploy the stack`.

Jika menggunakan file lokal, pilih `Web editor` atau `Upload`, lalu gunakan isi `docker-compose.portainer.yml` yang sama. Untuk update berikutnya, gunakan tag/commit baru dari repository dan klik `Pull and redeploy`.

## Environment Production

Nilai minimum yang wajib diisi:

```env
FRONTEND_URL=https://visitorbmc.example.com
APP_PORT=8080
DB_SERVER=10.19.25.27
DB_PORT=1433
DB_DATABASE=BMC
DB_USER=sa
DB_PASSWORD=<password-database>
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
JWT_SECRET=<secret-random-minimal-64-byte>
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
```

Generate secret JWT dengan:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

`FRONTEND_URL` harus sama dengan origin yang dipakai browser. Karena nginx menjadi entrypoint tunggal, request `/api` dan `/uploads` otomatis diteruskan ke backend melalui network Docker internal.

## Verifikasi Setelah Deploy

1. Pastikan container `visitorbmc-backend-1` berstatus `healthy`.
2. Pastikan container frontend berstatus `healthy`.
3. Buka `http://<server>:<APP_PORT>/healthz`; response harus `ok`.
4. Buka `http://<server>:<APP_PORT>/api/health`; response harus berisi `status: "ok"` dan `database: "connected"`.
5. Buka aplikasi dari browser dan login menggunakan user yang sudah tersedia.

Jika belum ada admin, jalankan command satu kali dari checkout source code yang memiliki dependency project dan environment database yang sama. Image backend production tidak membawa `ts-node` dan source script admin.

```bash
npm run create-admin --workspace=backend -- --name "Admin User" --username admin --password "<password-kuat>"
```

Untuk menjalankannya dari komputer lain, salin environment database ke `backend/.env` secara sementara, jalankan command tersebut, lalu hapus file environment setelah selesai. Jangan menyimpan password atau file `.env` ke repository.

Jangan memakai script `setup-role-users.ts` di production karena password default di script tersebut hanya cocok untuk development.

## Persistensi Dan Update

- File upload disimpan pada named volume `visitorbmc_uploads`, sehingga tidak hilang saat container dibuat ulang.
- Database berada di luar stack dan harus dibackup mengikuti prosedur SQL Server.
- Jangan menghapus volume `visitorbmc_uploads` saat redeploy kecuali memang ingin menghapus seluruh media upload.
- Untuk deployment production, gunakan tag atau commit release yang tetap, bukan branch yang berubah tanpa review.

## Troubleshooting

- Backend `unhealthy`: periksa log backend dan koneksi dari server Docker ke SQL Server, termasuk firewall dan kredensial.
- Health database `disconnected`: pastikan `DB_SERVER`, `DB_PORT`, `DB_DATABASE`, `DB_USER`, dan `DB_PASSWORD` benar.
- Login gagal setelah HTTPS: pastikan `COOKIE_SECURE=true` dan `FRONTEND_URL` memakai URL HTTPS yang benar.
- Upload gagal: periksa ruang disk Docker dan jangan menghapus volume `visitorbmc_uploads`.
- Error kolom migration: jalankan migration database yang belum diterapkan. Backend tidak menjalankan DDL otomatis saat startup.
