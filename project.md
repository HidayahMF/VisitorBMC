# Project: Security — BMC Online

Dokumen context untuk AI/model di project lain. Baca ini dulu sebelum mengubah kode.

## 1. Ringkasan

Aplikasi web internal untuk **petugas keamanan (security) BMC Online**. Tujuannya: satu meja operasional untuk memantau siapa karyawan yang sedang keluar kantor hari ini (tugas luar / izin), dan mencatat kepulangan mereka dengan satu klik — real-time, menit-ke-menit.

- Bahasa UI: **Indonesia**
- Sifat: **Internal only** (hanya petugas keamanan)
- Bentuk: SPA front-end (tanpa router; state `page` di `App.jsx`)
- Mode demo: tambahkan `?mock` di URL untuk data dummy tanpa backend

## 2. Tech Stack

| Teknologi | Versi | Keterangan |
|---|---|---|
| React | ^18.3.1 | UI framework |
| Vite | ^6.0.3 | Build tool + dev server (port 5173, host aktif) |
| Tailwind CSS | ^3.4.17 | Utility classes (animasi custom: `spin-slow`, `pulse-soft`) |
| @fontsource/inter | ^5.3.0 | Font body |
| @fontsource/plus-jakarta-sans | ^5.3.0 | Font heading |

**Tidak ada**: router, state manager global, library HTTP (pakai `fetch` murni), test suite.

## 3. Struktur Folder

```
├── index.html              # Entry HTML (berisi komentar "THESIS" — niat desain project)
├── vite.config.js          # Vite + plugin React
├── tailwind.config.js      # Konfigurasi Tailwind
├── src/
│   ├── main.jsx            # Bootstrap React
│   ├── index.css           # Style global + CSS variables (--ink, --signal, dst.)
│   ├── App.jsx             # Shell app: auth gate, nav (rail desktop + TopNav mobile), polling data
│   ├── Login.jsx           # Halaman login (kredensial hard-coded: username "security", password "sec2026")
│   ├── lib/
│   │   └── api.js          # Helper API: base URL, token JWT di localStorage, fetch wrapper, sha1Hex
│   ├── components/
│   │   ├── icons.jsx       # Ikon SVG stroke 1.6 (IconShield, IconExit, IconClock, IconReturn, ...)
│   │   ├── Card.jsx        # StatCard, Sheet
│   │   ├── ui.jsx          # LedgerCard, LedgerRow, NameCell, TimeBlock, RowDetail, EmptyState, SkeletonRows
│   │   ├── ReportView.jsx  # View report mingguan/bulanan + ModeSwitch (panggil API report)
│   │   ├── ConfirmDialog.jsx # Dialog konfirmasi aksi
│   │   ├── Toast.jsx       # Toast + broadcastToast (event-based, lintas komponen)
│   │   ├── TopNav.jsx      # Nav mobile
│   │   ├── Badge.jsx, Button.jsx
│   ├── pages/
│   │   ├── DashboardPage.jsx  # "Ringkasan Gate": 2 stat card (sedang keluar / sudah kembali) + 2 daftar
│   │   ├── TravelPage.jsx     # Tugas luar: daftar + tombol "Catat kembali" (POST) + mode report
│   │   ├── IzinPage.jsx       # Izin: daftar (read-only) + mode report
│   │   └── KembaliPage.jsx    # Daftar yang sudah kembali hari ini + mode report
```

## 4. Konsep Data & Domain

Entitas utama (semuanya karyawan, diidentifikasi dengan `nip` + `nama`):

1. **Travel (Tugas Luar)** — karyawan keluar kantor untuk tugas dinas.
   Field: `id, nip, nama, tujuan, keperluan, jamKeluar` (+ `tanggal`, `jamKembali` di report)
2. **Izin** — karyawan izin tidak masuk / keluar sementara.
   Field: `id, nip, nama, jenis ("Izin Khusus" | "Izin Sehari" | ...), keperluan, jamMulai, jamSelesai`
   `jamMulai/jamSelesai` bisa `null` (izin sehari penuh).
3. **Kembali (Kepulangan)** — catatan karyawan yang sudah kembali.
   Field: `id, nip, nama, tujuan, jamKembali`

Format jam: string `"HH:MM:SS"` (dipotong ke `HH:MM` saat tampil via helper `jam()`).
Format tanggal untuk report query: ISO `YYYY-MM-DD`.

## 5. API Contract (backend eksternal)

Base URL: `VITE_API_URL` (default `http://online.bmc.co.id:47213`). Ada juga backend lokal di repo terkait `bmc-app-backend` (Node/Express — `app.js`, `securityController.js`, `securityModel.js`, `securityRoutes.js`).

| Endpoint | Method | Keterangan |
|---|---|---|
| `/api/security/overview` | GET | Proxy VisitorBMC terautentikasi cookie. Data hari ini: `{counts: {travel, izin, kembali}, travel: [], izin: [], kembali: []}` |
| `/api/travel/depart` | POST | Catat keberangkatan Security. Body `{id, nip, departureTime}`; mengubah status internal menjadi `SEDANG_TUGAS_LUAR`. |
| `/api/travel/return` | POST | Proxy VisitorBMC terautentikasi cookie. Body `{id, nip}` — catat karyawan tugas luar sudah kembali |
| `/api/security/report?type=&start=&end=` | GET | Proxy VisitorBMC terautentikasi cookie. `type`: `travel` \| `izin` \| `kembali`; `start`/`end`: ISO date → `{rows: [...]}` |

**Aturan klien (`src/lib/api.js`)**:
- Semua request mengirim cookie JWT VisitorBMC melalui `credentials: include`.
- Tidak ada token Security tambahan di `localStorage`.
- Response `401` → reload halaman (paksa login ulang melalui VisitorBMC).
- Error non-OK → throw `Error(data.error)`.

## 6. Perilaku Aplikasi

- **Auth**: Security memakai `AuthContext` VisitorBMC. User login sekali melalui `/login`; role `ADMIN`, `SECURITY`, atau `MONITORING` dapat mengakses Security.
- **Polling**: `GET /api/security/overview` otomatis tiap **20 detik**; tombol "Perbarui" untuk manual refresh (dengan animasi ikon `pulse`).
- **Stale handling**: kalau refresh manual gagal, tampilkan banner amber "Menampilkan data terakhir saat koneksi putus" + data terakhir tetap ditampilkan.
- **Nav**: 4 halaman — `dashboard` (Ringkasan), `travel` (Tugas Luar), `izin` (Izin), `kembali` (Kembali). Desktop: sidebar rail kiri; mobile: TopNav atas. Badge angka per menu dari `data.counts`.
- **Aksi tulis**: "Catat Berangkat" (`POST /api/travel/depart`) untuk approval yang belum keluar, dan "Catat Kembali" (`POST /api/travel/return`) hanya untuk status `SEDANG_TUGAS_LUAR`.
- **Toast**: `broadcastToast({type: 'ok'|'error', message, auto})` dari `Toast.jsx` — pakai custom event, jadi bisa dipanggil dari mana saja.
- **Mock mode**: data Security tetap dapat memakai dummy data dengan `?mock`, tetapi route tetap mensyaratkan autentikasi VisitorBMC.

## 7. Desain / Style Guide

- **Tema warna via CSS variables** di `index.css` (jangan hard-code warna). Yang terpakai:
  `--canvas, --canvas-2, --card, --hair-light, --hair-mid, --ink, --ink-soft, --ink-faint, --signal, --signal-soft, --amber, --amber-soft, --emerald, --emerald-soft, --whiteout, --haze-2`
- Palet: rail navy (#0d2440), konten putih/slate, aksi safir BMC (#2563eb), emerald = kepulangan, amber = izin.
- Komponen ledger (`LedgerCard`/`LedgerRow`) dipakai konsisten di semua daftar; aksi di baris kanan (`sm:order-last`).
- Font: Plus Jakarta Sans (heading), Inter (body). Ikon SVG custom dari `icons.jsx` (stroke 1.6).
- Animasi ringan: `rise`, `stagger`, `fadeup`, `count-up` angka stat (di DashboardPage), `spin-slow`/`pulse-soft` (Tailwind config).
- Responsive: grid mobile-first; layout berubah di breakpoint `lg`.
- `index.html` berisi komentar "THESIS/OWN-WORLD/STORY/FINISH" — ini niat desain project, jaga saat redesain.

## 8. Konvensi Kode

- React **function components** + hooks saja (tanpa class).
- State: `useState` lokal per komponen; tidak ada context/store global.
- Data di-fetch di `App.jsx`, diturunkan ke pages via props: `data`, `blank`, `onChanged`.
- `blank` = data belum termuat (belum ada response pertama) → tampilkan `SkeletonRows`.
- Helper format jam/tanggal didefinisikan inline per file (`jam()`, `tgl()`).
- UI text dalam bahasa Indonesia.
- File style: JSX + Tailwind class + inline `style` untuk CSS variables.

## 9. Cara Menjalankan

```bash
npm install
npm run dev        # dev server di http://localhost:5173 (host: true)
npm run build      # production build ke dist/
npm run preview    # preview hasil build
```

- Env: `VITE_API_URL` (opsional; default `http://online.bmc.co.id:47213`).
- Tanpa backend, gunakan `?mock` di URL untuk melihat UI dengan data dummy.

## 10. Catatan Integrasi (untuk project penerima)

- Project ini **front-end murni**; semua data datang dari API backend `bmc-app-backend` (Node/Express).
- **Prinsip integrasi: ADDITIVE-ONLY.** Di project tujuan, kode & fitur existing **tidak boleh diubah** — project ini hanya **menambahkan** fitur baru (halaman Tugas Luar, Izin, Kembali, dashboard ringkasan, login security). Kode existing project tujuan diperlakukan read-only.
- **Isolasi**: taruh kode Security di folder/file terpisah (mis. `security/`) dengan CSS variables di-scoped (mis. wrapper `.bmc-security`) supaya tidak menimpa style existing project tujuan.
- **Adaptasi ke project tujuan**: jika project tujuan pakai router, halaman Security menjadi rute baru (jangan paksa pola `useState page`); jika dependency bertabrakan, pakai versi project tujuan.
- Bila dipindah/integrasikan ke monorepo lain:
  1. Salin folder `src/`, `index.html`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `package.json`.
  2. Pastikan `VITE_API_URL` di-set ke base URL backend yang benar (file `.env`).
  3. CSS variables di `src/index.css` wajib ikut — komponen tidak akan tampil benar tanpa itu.
   4. Security memakai cookie auth global VisitorBMC; jangan menambahkan token Security terpisah di browser.
  5. Kontrak API di bagian 5 harus tetap dipenuhi backend; field respons dipakai persis namanya (mis. `jamKeluar`, `jamSelesai` bisa `null`).
- Tidak ada test/konfigurasi lint di project ini — verifikasi perubahan dengan `npm run build` + cek manual (atau mode `?mock`).
