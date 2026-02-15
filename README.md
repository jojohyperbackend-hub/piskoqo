# piskoqo — AI Pendamping Curhat

Aplikasi web pendamping curhat berbasis AI dengan memory percakapan dan autentikasi Google.

---

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Database + Storage)
- Firebase Auth (Google Login)
- OpenRouter AI API

---

## Cara Install Project

### 1. Clone repository

```bash
git clone https://github.com/jojohyperbackend-hub/piskoqo.git

cd piskoqo
```

### 2. Install dependencies

```bash
npm install
```

### 3. Buat file environment

Buat file:

```
.env.local
```

Isi dengan:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENROUTER_API_KEY=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

### 4. Jalankan project

```bash
npm run dev
```

---

## Setup Database Supabase

Masuk ke:
Supabase Dashboard → SQL Editor → Run Query

### Buat tabel chats

```sql
create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  message text not null,
  sender text not null,
  timestamp timestamptz default now()
);
```

### Aktifkan akses delete

```sql
alter table chats enable row level security;

create policy "allow all"
on chats
for all
using (true)
with check (true);
```

---

## Struktur Tabel

| field | type |
|------|-----|
| id | uuid |
| user_id | text |
| message | text |
| sender | text |
| timestamp | timestamptz |

---

## Fitur

- Login Google
- Chat AI real-time
- Memory percakapan
- Hapus chat per user
- UI responsive full screen

---

## Dev
dev dikembangkan
izivansatoru / jojohyperbackend
