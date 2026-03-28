# Awrella — A Private Space for Little Memories

Awrella adalah website private personal space yang fun, hangat, aesthetic, dan terasa eksklusif. Sebuah ruang digital kecil untuk foto, musik, dan kenangan kecil.

## ✨ Features

- **Private Access** - Pengunjung harus login atau daftar untuk mengakses area utama
- **Google Signup** - Pengunjung bisa daftar cepat pakai akun Google
- **Photo Gallery** - Galeri foto dengan grid layout yang bersih dan minimalis
- **Spotify Integration** - Menampilkan lagu atau playlist favorit dengan embed yang elegan
- **Message Wall** - Mini notes untuk komentar pengunjung dengan warna pastel yang lembut
- **Admin Dashboard** - Dashboard lengkap untuk mengelola konten, foto, musik, user, dan komentar
- **Admin Portal Route** - Login/register admin via `/dashboard` (alias typo: `/dassboard`)
- **Multi-Admin System** - Dukungan untuk lebih dari satu admin dengan role-based access control
- **Soft Minimal Aesthetic** - Desain lembut dengan palet warna soft neutral dan muted pastel

## 🎨 Design

### Color Palette

- **Background**: `#F7F4EF`
- **Surface/Card**: `#FFFDF9`
- **Primary Text**: `#2F2A2A`
- **Secondary Text**: `#6E6666`

### Accent Colors

- **Dusty Pink**: `#E8BFCB`
- **Soft Blue**: `#C9DCEB`
- **Sage Green**: `#D7E6D5`
- **Warm Beige**: `#EADCCF`

### Note Colors (for mini comments)

- **Soft Cream**: `#F6EFCF`
- **Pale Blue**: `#DCEAF6`
- **Soft Blush**: `#F4D9DE`
- **Light Sage**: `#E2EEDB`

## 🚀 Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **Database**: Supabase PostgreSQL
- **State Management**: Zustand
- **Password Hashing**: bcryptjs

## 📦 Setup Instructions

### Prerequisites

- Bun or Node.js runtime
- Supabase project

### Installation

1. Install dependencies:
```bash
bun install
# or: npm install
```

2. Setup environment variables:
```bash
cp .env.example .env
```

3. Fill Supabase credentials in `.env`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (required for server API routes)

   Supabase Auth config untuk Google signup:
   - Enable provider Google di Supabase Authentication > Providers.
   - Set Additional Redirect URL: `http://localhost:3010/auth/google/callback`.
   - Untuk production, tambahkan juga URL domain production Anda.

4. Create/update tables and security policies on Supabase by running SQL file `db/supabase.sql` in Supabase SQL Editor.

5. Start development server:
```bash
bun run dev
# or: npm run dev
```
Default port: `3010` (override with `PORT=3020 npm run dev`).

6. Open your browser and navigate to the application URL

## 👤 Default Users

Untuk mode Supabase, tidak ada default user otomatis. Buat akun pertama lewat halaman Sign Up.
Jika masih menggunakan flow Prisma/SQLite lama, Anda bisa menjalankan seed terpisah.

## 📱 User Journey

### For Visitors

1. Buka landing page Awrella
2. Klik "Login" jika sudah punya akun, atau "Sign Up" untuk daftar
3. Setelah login, masuk ke area privat
4. Nikmati foto, musik, dan tinggalkan pesan di message wall
5. Pesan akan tampil sebagai mini note yang manis dan rapi

### For Admins

1. Login dengan akun admin
2. Klik tombol "Admin" di navigasi
3. Akses dashboard untuk:
   - **Overview**: Lihat statistik dan aktivitas terbaru
   - **Photos**: Upload, edit, dan hapus foto
   - **Music**: Tambah dan kelola link Spotify
   - **Comments**: Moderasi dan kelola komentar pengunjung
   - **Users**: Lihat dan kelola user terdaftar
   - **Content** (Super Admin only): Edit konten website

## 🗄️ Database Schema

### User
- `id`: String (CUID)
- `email`: String (unique)
- `password`: String (hashed)
- `name`: String (optional)
- `role`: Enum (USER, ADMIN, SUPER_ADMIN)
- `isActive`: Boolean
- `createdAt`: DateTime
- `updatedAt`: DateTime

### Photo
- `id`: String (CUID)
- `imageUrl`: String
- `caption`: String (optional)
- `order`: Int
- `featured`: Boolean
- `userId`: String (foreign key)
- `createdAt`: DateTime
- `updatedAt`: DateTime

### Music
- `id`: String (CUID)
- `title`: String
- `spotifyUrl`: String
- `type`: String (track/playlist)
- `featured`: Boolean
- `order`: Int
- `createdAt`: DateTime
- `updatedAt`: DateTime

### Comment
- `id`: String (CUID)
- `content`: String (max 150 chars)
- `noteColor`: Enum (CREAM, BLUE, BLUSH, SAGE)
- `hidden`: Boolean
- `userId`: String (foreign key)
- `createdAt`: DateTime
- `updatedAt`: DateTime

### Content
- `id`: String (CUID)
- `key`: String (unique)
- `value`: String
- `createdAt`: DateTime
- `updatedAt`: DateTime

## 🔧 API Routes

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user

### Photos
- `GET /api/photos` - Get all photos
- `POST /api/photos` - Create new photo
- `PUT /api/photos/[id]` - Update photo
- `DELETE /api/photos/[id]` - Delete photo

### Music
- `GET /api/music` - Get all music items
- `POST /api/music` - Create new music item
- `PUT /api/music/[id]` - Update music item
- `DELETE /api/music/[id]` - Delete music item

### Comments
- `GET /api/comments` - Get all visible comments
- `POST /api/comments` - Create new comment

### Users
- `GET /api/users` - Get all users
- `PUT /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user

### Content
- `GET /api/content` - Get all content
- `POST /api/content` - Create/update single content
- `PUT /api/content` - Update multiple content items

## 🎯 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   └── signup/route.ts
│   │   ├── comments/route.ts
│   │   ├── music/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── photos/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── users/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   └── content/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/ui/
├── hooks/
├── lib/
│   ├── db.ts
│   ├── store.ts
│   └── utils.ts
```

## 📝 Notes

- Semua API request menggunakan relative path tanpa port
- z-ai-web-dev-sdk digunakan di backend untuk fitur AI (jika diperlukan)
- Desain responsif dengan mobile-first approach
- Footer selalu sticky di bottom viewport
- Mini notes komentar memiliki maksimal 150 karakter
- User biasa bisa kirim beberapa pesan dengan batas tertentu
- Admin bisa hide atau delete komentar

## 🎨 Design Philosophy

Awrella bukan sekadar website pribadi biasa, tetapi sebuah **private digital memory and music space** yang menggabungkan foto, musik, dan pesan pengunjung dalam suasana yang hangat, lembut, personal, dan eksklusif. Elemen visual tetap minimalis, notes komentar dibuat kecil dan rapi, warna dominan menggunakan soft neutral dan muted pastel, dan keseluruhan pengalaman dirancang agar terasa seperti memasuki ruang kecil yang intim dan curated.

## 📄 License

Private Project - All Rights Reserved

---

**Awrella — Photos, Music, and Quiet Feelings**
