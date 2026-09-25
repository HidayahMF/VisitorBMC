# AGENTS.md — Aturan untuk Coding Agent

## Baca dulu

**Seluruh context project ada di [`project.md`](./project.md).** Baca file itu SEBELUM mengubah kode apa pun. Dokumen ini hanya ringkasan aturan kerja; `project.md` adalah sumber kebenaran untuk arsitektur, API contract, dan style guide.

## Prinsip Integrasi (PALING PENTING)

File ini ditulis untuk dipakai di **project tujuan** (project lain tempat fitur aplikasi Security BMC Online akan diintegrasikan). Aturan mutlaknya:

1. **JANGAN mengubah, memodifikasi, atau me-refactor kode & fitur yang sudah ada** di project tujuan. Anggap semua kode existing sebagai **read-only**.
2. **HANYA MENAMBAHKAN** — pekerjaan di sini adalah menambahkan fitur dari project Security (lihat `project.md`: halaman Tugas Luar, Izin, Kembali, dashboard ringkasan, login security) ke dalam project tujuan.
3. **Isolasi maksimal** — kode baru ditaruh di file/folder baru (mis. folder `security/` atau prefix nama file `security-`) sesedikit mungkin menyentuh file existing. Jika suatu file existing HARUS diubah (mis. menambah satu rute navigasi), ubah sesedikit mungkin, additive-only, dan jelaskan alasannya.
4. **Jangan mengubah perilaku yang sudah jalan** di project tujuan: styling, routing, state, build config, dependency — biarkan apa adanya.
5. **Konflik dependency/style diselesaikan dengan adaptasi ke project tujuan**, bukan sebaliknya (lihat bagian Adaptasi di bawah).
6. Uji secara terpisah: fitur baru boleh diverifikasi lewat mode `?mock` agar tidak mengganggu data/flow existing project tujuan.

### Adaptasi Saat Integrasi

Project Security ini punya stack sendiri (React 18 + Vite + Tailwind 3, CSS variables sendiri). Di project tujuan, yang di-prioritaskan adalah konsistensi dengan project tujuan:

- Ikuti struktur folder, pola routing, dan konvensi **project tujuan**.
- CSS variables dari Security (`--ink`, `--signal`, dst.) di-scoped ke halaman/komponen Security saja (mis. wrapper class `.bmc-security`) agar tidak menimpa style existing.
- Jika project tujuan pakai router, halaman Security menjadi rute baru — jangan paksa pola `useState page` seperti di sini.
- Jika nama dependency bertabrakan, pakai versi yang sudah ada di project tujuan.

## Perintah Penting

```bash
npm install       # instal dependency (HARUS sebelum build/dev)
npm run dev       # dev server di http://localhost:5173
npm run build     # build produksi ke dist/ — gunakan ini untuk verifikasi perubahan
npm run preview   # preview hasil build
```

- **Tidak ada test suite dan tidak ada linter** di project ini. Verifikasi perubahan dengan `npm run build` (harus sukses tanpa error) + cek manual via `npm run dev`.
- Verifikasi visual tanpa backend: buka `http://localhost:5173/?mock` (mode data dummy, tidak hit API).

## Aturan Kode

1. **React function components + hooks saja.** Jangan membuat class component.
2. **Jangan tambahkan dependency baru** (router, state manager, axios, dsb.) tanpa persetujuan eksplisit. Project ini sengaja minimal: fetch murni, state `useState` lokal.
3. **Data mengalir dari `App.jsx` ke pages via props** (`data`, `blank`, `onChanged`). Jangan membuat fetch terpisah di dalam pages; polling `GET /api/security/overview` sudah ditangani `App.jsx` tiap 20 detik.
4. **Tidak ada global store / Context API.** Komunikasi lintas komponen pakai pola yang sudah ada (contoh: toast via `broadcastToast()` di `src/components/Toast.jsx`).
5. **Bahasa UI: Indonesia.** Semua string yang tampil ke pengguna dalam bahasa Indonesia.
6. **Helper format** `jam()` (HH:MM:SS → HH:MM) dan `tgl()` didefinisikan inline per file — ikuti pola ini, jangan bikin file util baru untuk hal kecil.

## Aturan Style (WAJIB)

1. **Warna hanya via CSS variables** yang didefinisikan di `src/index.css` (contoh: `var(--ink)`, `var(--signal)`, `var(--emerald)`). **Larang hard-code hex/rgb** di komponen.
2. Styling = kombinasi **Tailwind class + inline `style` untuk CSS variables**. Jangan membuat file CSS baru per komponen.
3. Daftar/kartu data **wajib pakai komponen ledger** yang sudah ada: `LedgerCard`, `LedgerRow`, `NameCell`, `TimeBlock`, `RowDetail`, `EmptyState`, `SkeletonRows` (dari `src/components/ui.jsx`). Jangan membuat pola daftar baru.
4. Ikon **wajib dari `src/components/icons.jsx`** (SVG stroke 1.6). Jangan impor library ikon eksternal.
5. State kosong/belum termuat (`blank`) → tampilkan `SkeletonRows`, bukan layar kosong.
6. Breakpoint utama: `lg` (sidebar rail desktop ↔ TopNav mobile). Mobile-first.
7. Komentar niat desain di `index.html` (blok THESIS/OWN-WORLD/STORY) adalah bagian dari identitas project — jaga saat redesain.

## Aturan API

- Semua request lewat helper `api()` di `src/lib/api.js` — **jangan panggil `fetch` langsung**.
- Kontrak endpoint dan bentuk field respons terdokumentasi di `project.md` bagian 5. Field dipakai **persis namanya** (mis. `jamKeluar`, `jamSelesai` bisa `null` untuk izin sehari penuh).
- Token: `localStorage` key `bmc.security.token`, otomatis terkirim via header `Authorization: Bearer`. Perilaku 401 (hapus token + reload) sudah ditangani helper — jangan duplikasi.
- Endpoint baru harus ditambahkan ke tabel di `project.md` bagian 5.

## Hal yang Jangan Dilakukan

- Jangan mengubah key localStorage, nama field API, atau struktur respons tanpa koordinasi dengan backend (`bmc-app-backend`, repo terpisah — TIDAK ada di project ini).
- Jangan menambahkan fitur auth baru — login sudah hard-coded ke kredensial petugas (`src/Login.jsx`) dan itu keputusan yang disengaja untuk aplikasi internal.
- Jangan menambahkan router — navigasi antar 4 halaman (dashboard/travel/izin/kembali) pakai state `page` di `App.jsx`.
- Jangan menghapus mode `?mock` — itu alat verifikasi utama tanpa backend.
- Jangan commit `.env` atau isi kredensial ke repo.

## Saat Menyelesaikan Tugas

1. Jalankan `npm run build` — wajib lulus.
2. Jika mengubah UI, verifikasi di `?mock` mode (desktop + mobile viewport).
3. Jika mengubah perilaku data/API, update `project.md` (bagian 4/5/6) agar dokumen tidak basi.
4. Pesan commit dan UI text dalam bahasa Indonesia.
