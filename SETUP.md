# DGSmart Hub — Developer Setup

## Prerequisites
- Node 20+
- MySQL 8 on `144.91.72.159` — database `iotdgsmart` (do NOT touch any other DB on that server)

## 1. Environment

Copy `.env.example` to `.env.local` and fill in:

```env
DATABASE_URL="mysql://USER:PASS@144.91.72.159:3306/iotdgsmart"
NEXTAUTH_SECRET="<random 32-char string>"
NEXTAUTH_URL="http://localhost:3000"

# Mailgun
MAILGUN_API_KEY=""
MAILGUN_DOMAIN=""

# Viva Wallet
VIVA_MERCHANT_ID=""
VIVA_API_KEY=""
VIVA_WEBHOOK_SECRET=""
VIVA_BASE_URL="https://api.vivapayments.com"

# Milesight Webhook shared secret
MILESIGHT_SECRET=""
```

## 2. Install dependencies

```bash
npm install
```

## 3. Generate Prisma client

```bash
npx prisma generate
```

This is **required** before the first build; it produces the typed client in `node_modules/.prisma/client`.

## 4. Push schema to MySQL

> ⚠️ Use `db push` — **not** `migrate dev` — because the MySQL instance doesn't support advisory locks / shadow databases required by `migrate dev`.

```bash
npx prisma db push
```

This syncs the schema to `iotdgsmart` non-destructively. Re-run it any time the schema changes.

## 5. Run dev server

```bash
npm run dev
```

## Schema change workflow

1. Edit `prisma/schema.prisma`
2. `npx prisma generate`   ← regenerates the TS types
3. `npx prisma db push`    ← applies DDL changes to MySQL

## Type-check

```bash
npx tsc --noEmit
```

All errors should resolve once `prisma generate` has been run.
