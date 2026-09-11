# Order Processing System - Frontend

Web application Next.js untuk customer dan admin pada Order Processing System. Frontend terhubung ke Order Service melalui REST API dan menampilkan perubahan status order secara real-time melalui WebSocket.

Backend terkait: [order-processing-system_backend](https://github.com/Salman-artz/order-processing-system_backend).

## Status Project

Fitur yang tersedia saat ini:

- Login dan register customer.
- Katalog produk dan pembuatan order.
- Riwayat serta detail order customer.
- Dashboard admin dengan ringkasan order.
- Daftar order admin dan detail order.
- Visualisasi tahapan Saga melalui `SagaTimeline`.
- Update status order real-time menggunakan WebSocket dengan reconnect otomatis.
- Mock mode untuk development tanpa backend penuh.
- Dockerfile multi-stage dan Docker Compose frontend.

## Tech Stack

| Area | Teknologi |
|---|---|
| Framework | Next.js 16 App Router |
| Bahasa | TypeScript |
| Styling | Tailwind CSS v4 |
| HTTP | Axios |
| Data fetching | TanStack Query |
| State | Zustand |
| Form | React Hook Form + Zod |
| Real-time | Native WebSocket |
| UI feedback | Sonner |
| Chart | Recharts |
| Animation | Framer Motion |

## Prasyarat

- Node.js 20 atau lebih baru
- npm
- Backend Order Service jika menjalankan mode API nyata

## Menjalankan Local Development

```bash
npm install
Copy-Item .env.local.example .env.local
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

Untuk backend yang dijalankan dari repository backend pada port default:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8083/ws
NEXT_PUBLIC_USE_MOCK=false
```

Jalankan pemeriksaan kode:

```bash
npm run lint
npm run build
```

## Mode Mock

Jika backend belum tersedia, aktifkan mock mode:

```env
NEXT_PUBLIC_USE_MOCK=true
```

Mode ini mencegah request API nyata, tetapi data yang ditampilkan bergantung pada implementasi halaman. Untuk alur order end-to-end, gunakan backend Order Service.

Demo credential pada mock mode:

- Customer: email apa pun dan password minimal 8 karakter.
- Admin: email mengandung `admin` dan password minimal 8 karakter.

## Menjalankan dengan Docker

```bash
Copy-Item .env.docker.example .env.docker
docker compose --env-file .env.docker up -d --build
```

Buka [http://localhost:3000](http://localhost:3000), atau port yang ditentukan oleh `FRONTEND_PORT`.

Melihat log dan menghentikan container:

```bash
docker compose logs -f frontend
docker compose down
```

Catatan: variable `NEXT_PUBLIC_*` disisipkan ke bundle saat `next build`. Setelah mengubah nilainya, image harus di-build ulang.

## Environment Variables

| Variable | Fungsi | Contoh |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Base URL REST Order Service | `http://localhost:8080/api/v1` |
| `NEXT_PUBLIC_WS_URL` | Base URL WebSocket Notification Service | `ws://localhost:8083/ws` |
| `NEXT_PUBLIC_USE_MOCK` | Mengaktifkan mock API | `false` |
| `FRONTEND_PORT` | Port host saat Docker | `3000` |

Gunakan `.env.local.example` untuk local development dan `.env.docker.example` untuk Docker. File environment lokal tidak boleh di-commit.

## Struktur Project

```text
app/
  (auth)/login/           # Login
  (auth)/register/        # Register
  admin/dashboard/        # Dashboard admin
  admin/orders/           # Daftar dan detail order admin
  customer/products/      # Katalog dan pembuatan order
  customer/orders/        # Riwayat dan detail order customer
components/
  SagaTimeline.tsx        # Visualisasi status Saga
  Sidebar.tsx             # Navigasi aplikasi
lib/
  api/client.ts           # Axios client dan auth interceptor
  hooks/useOrderSocket.ts # WebSocket order update
  store/useAuthStore.ts   # State autentikasi Zustand
types/
  index.ts                # TypeScript types
Dockerfile                # Multi-stage production image
docker-compose.yml        # Frontend container
```

## Alur Pengguna

### Customer

1. Login atau register.
2. Membuka katalog produk.
3. Memilih produk dan membuat order.
4. Melihat status order serta timeline Saga.
5. Menerima update status melalui WebSocket.

### Admin

1. Login menggunakan akun admin.
2. Melihat dashboard ringkasan.
3. Membuka daftar order.
4. Melihat detail dan timeline proses order.

## Troubleshooting

### API connection refused

- Pastikan backend berjalan dan port Order Service benar-benar `8080`.
- Pastikan `NEXT_PUBLIC_API_BASE_URL` memakai suffix `/api/v1`.
- Pastikan backend mengizinkan origin frontend melalui CORS.

### WebSocket tidak menerima update

- Pastikan Notification Service berjalan pada port `8083`.
- Pastikan `NEXT_PUBLIC_WS_URL` menunjuk ke endpoint WebSocket, bukan REST API.
- Untuk Docker, pastikan port WebSocket di-expose ke host.

### Perubahan environment tidak terlihat

Restart dev server atau rebuild Docker image karena variable `NEXT_PUBLIC_*` diproses saat build.
