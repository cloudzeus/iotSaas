# DGSmart Hub — Deployment Guide

## Prerequisites
- Node.js 22+
- MySQL 8 database: `iotdgsmart` on `144.91.72.159`
- Docker + Coolify on VPS
- Milesight Developer Platform account

---

## 1. Local Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run database migration (creates all tables in iotdgsmart)
npm run db:migrate

# Seed initial data (plans, super admin, demo tenant)
npm run db:seed

# Start dev server
npm run dev
```

Open http://localhost:3000

**Super admin:** `admin@dgsmart.gr` / `ChangeMe123!`
**Demo customer:** `demo@acme-logistics.gr` / `Demo1234!`

---

## 2. Environment Variables

Edit `.env` before running:

```env
# REQUIRED — already filled with real credentials
DATABASE_URL="mysql://root:Erika%4015%401f1femsk@144.91.72.159:3306/iotdgsmart"

# REQUIRED — generate with: openssl rand -base64 32
NEXTAUTH_SECRET="<generate>"
NEXTAUTH_URL="https://hub.dgsmart.gr"   # production URL

# Milesight — already filled
MILESIGHT_BASE_URL="https://eu-openapi.milesight.com"
MILESIGHT_CLIENT_ID="bbdbfdfa-86c7-4b26-b919-57d69f734ac4"
MILESIGHT_CLIENT_SECRET="llKeYb7t4EqUZqo0ImUaAyqMwxlmMV/O"
MILESIGHT_UUID="8d27ede6-acd4-4a6a-87c7-f3d2b0493c46"
MILESIGHT_WEBHOOK_SECRET="4/2tp2u5rQ0J1+P+fVGVMihqUa4J7c6w"

# Viva Wallet — fill in
VIVA_MERCHANT_ID="..."
VIVA_API_KEY="..."
VIVA_CLIENT_ID="..."
VIVA_CLIENT_SECRET="..."
VIVA_SOURCE_CODE="..."
VIVA_WEBHOOK_KEY="..."

# Mailgun SMTP — fill in
MAILGUN_SMTP_USER="..."
MAILGUN_SMTP_PASS="..."
```

---

## 3. Milesight Webhook Setup

In Milesight Developer Platform:
- Webhook URL: `https://hub.dgsmart.gr/api/milesight/webhook`
- Method: POST
- HMAC Secret: `4/2tp2u5rQ0J1+P+fVGVMihqUa4J7c6w`

---

## 4. Viva Wallet Webhook Setup

In Viva Wallet merchant portal:
- Webhook URL: `https://hub.dgsmart.gr/api/viva/webhook`
- Event: Transaction Completed (1796)

---

## 5. Docker Build & Deploy (Coolify)

```bash
# Build image
docker build -t dgsmart-hub .

# Or push to registry and deploy via Coolify
docker tag dgsmart-hub registry.yourdomain.com/dgsmart-hub:latest
docker push registry.yourdomain.com/dgsmart-hub:latest
```

In Coolify: create a new service pointing to this repo, set all env vars, and deploy.

---

## 6. Database Safety

⚠️ **IMPORTANT**: The DB server at `144.91.72.159` hosts multiple databases.
This application ONLY touches the `iotdgsmart` database.
- All migrations target `iotdgsmart` only
- Never run migrations without `DATABASE_URL` pointing to `iotdgsmart`
- The Prisma schema uses `datasource db { url = env("DATABASE_URL") }`

---

## 7. First Login

1. Open the app URL
2. Sign in as `admin@dgsmart.gr` / `ChangeMe123!`
3. **Change the password immediately** in Settings
4. Create tenants via Admin → Tenants → New Tenant
5. Create users for each tenant via API or DB seed
