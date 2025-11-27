# Quick Start Guide

Get your Grounded backend up and running in 10 minutes.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account (free)
- Firebase project with Admin SDK

## Step 1: Install Dependencies (2 min)

```bash
cd grounded-backend
npm install
```

## Step 2: Set Up Supabase (3 min)

1. Go to [supabase.com](https://supabase.com) and create account
2. Click **New Project**
3. Fill in:
   - Name: `grounded-backend`
   - Password: Generate strong password (save it!)
   - Region: Choose closest to you
4. Wait for project to be ready (~2 min)

## Step 3: Get Supabase Credentials (1 min)

1. In Supabase dashboard, go to **Project Settings** > **Database**
2. Find **Connection string** section
3. Copy the **URI** format
4. Note your project reference (e.g., `abcdefghijklmnop`)

## Step 4: Configure Environment (2 min)

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. Update `.env` with your Supabase credentials:

```env
# Server
NODE_ENV=development
PORT=3000

# Supabase Database
DB_HOST=db.YOUR-PROJECT-REF.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-supabase-password

DATABASE_URL=postgresql://postgres:your-password@db.YOUR-PROJECT-REF.supabase.co:5432/postgres

# Firebase (get from Firebase Console)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# CORS
ALLOWED_ORIGINS=http://localhost:8081,exp://192.168.1.100:8081
```

## Step 5: Run Migrations (1 min)

**Option A: Supabase SQL Editor (Recommended)**

1. Go to Supabase dashboard > **SQL Editor**
2. Click **New query**
3. Copy contents from `migrations/1732636800000_create-users-table.sql`
4. Paste and click **Run**

**Option B: Command Line**

```bash
npm run migrate:up
```

## Step 6: Start Server (1 min)

```bash
npm run dev
```

You should see:

```
✓ Environment variables validated
✓ Firebase Admin SDK initialized successfully
✓ Supabase database connection established successfully
🚀 Server is running on port 3000
```

## Step 7: Test API

Open another terminal and test:

```bash
# Health check
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2025-11-26T10:30:00.000Z",
  "uptime": 10,
  "database": "connected"
}
```

## 🎉 Success!

Your backend is now running locally!

## Next Steps

### Test with Firebase Authentication

1. Get a Firebase ID token from your mobile app
2. Test user creation:

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR-FIREBASE-TOKEN" \
  -H "Content-Type: application/json"
```

3. Test get user:

```bash
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR-FIREBASE-TOKEN"
```

### Deploy to Production

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment options:

- **Vercel** (Recommended) - Zero config, auto-scaling
- **Railway** - Simple CLI deployment
- **Render** - Free tier with auto-deploy
- **Traditional Hosting** - cPanel/VPS

### View Data in Supabase

1. Go to Supabase dashboard
2. Click **Table Editor**
3. Select `users` table
4. View your data

## Troubleshooting

### "Cannot connect to database"

- Verify Supabase credentials in `.env`
- Check if Supabase project is active (not paused)
- Ensure SSL is enabled in config

### "Firebase initialization failed"

- Verify Firebase credentials in `.env`
- Check private key formatting (newlines as `\n`)
- Ensure service account has proper permissions

### "Port 3000 already in use"

```bash
# Kill process on port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

Or change PORT in `.env`:

```env
PORT=3001
```

## Useful Commands

```bash
# Development with hot reload
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Run migrations
npm run migrate:up

# Rollback migrations
npm run migrate:down
```

## Project Structure

```
grounded-backend/
├── src/
│   ├── config/          # Database, Firebase, env config
│   ├── controllers/     # Business logic
│   ├── middleware/      # Auth, error handling, logging
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── types/           # TypeScript types
│   ├── utils/           # Utilities (errors, logger)
│   └── server.ts        # Entry point
├── migrations/          # Database migrations
├── .env                 # Environment variables (not in Git)
└── package.json
```

## Documentation

- **[README.md](./README.md)** - Full documentation
- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Detailed Supabase guide
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment instructions
- **[QUICKSTART.md](./QUICKSTART.md)** - This file

## Support

- **Supabase Issues**: [docs.supabase.com](https://docs.supabase.com)
- **Firebase Issues**: [firebase.google.com/docs](https://firebase.google.com/docs)
- **Backend Issues**: Check application logs

## What's Next?

1. ✅ Backend running locally
2. 📱 Connect your mobile app
3. 🚀 Deploy to production
4. 📊 Set up monitoring
5. 🔒 Configure security rules
6. 📈 Scale as needed

Happy coding! 🎉
