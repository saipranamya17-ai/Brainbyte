# AdaptiSkill

AI-powered adaptive learning + career-prep platform.

## Stack
- **Frontend:** React + Vite + Tailwind CSS + Recharts
- **Backend:** Node.js + Express + Prisma + Zod
- **Database:** PostgreSQL
- **AI:** Google Gemini API

## Quick Start

### 1. Server
```bash
cd server
cp .env.example .env    # fill in your secrets
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

### 2. Client
```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173 — use the seeded demo user:
- Email: `demo@adaptiskill.com`
- Password: `Demo1234!`
