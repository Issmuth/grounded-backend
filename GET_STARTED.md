# 🚀 Get Started with Grounded Backend

Welcome! This guide will help you get your backend up and running quickly.

## What You're Building

An Express.js backend with:

- ✅ **Supabase PostgreSQL** - Managed database
- ✅ **Firebase Authentication** - User authentication
- ✅ **TypeScript** - Type-safe code
- ✅ **RESTful API** - Clean API endpoints
- ✅ **Production Ready** - Error handling, logging, security

## Choose Your Path

### 🏃 Fast Track (10 minutes)

**Best for**: Getting started quickly, learning the system

1. Read **[QUICKSTART.md](./QUICKSTART.md)**
2. Follow the 7 steps
3. Have a running backend!

### 📚 Detailed Setup (30 minutes)

**Best for**: Understanding everything, production setup

1. Read **[README.md](./README.md)** - Full documentation
2. Read **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Database setup
3. Read **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment options

### 🤔 Decision Making

**Not sure about Supabase?**

Read **[WHY_SUPABASE.md](./WHY_SUPABASE.md)** to understand:

- Why we chose Supabase
- Comparison with alternatives
- Cost analysis
- When to use (or not use) Supabase

## Prerequisites Checklist

Before you start, make sure you have:

- [ ] Node.js installed (v18 or higher)
- [ ] npm or yarn installed
- [ ] Code editor (VS Code recommended)
- [ ] Terminal/Command line access
- [ ] Internet connection

## What You'll Need to Create

### 1. Supabase Account (Free)

- Go to [supabase.com](https://supabase.com)
- Sign up (takes 1 minute)
- Create a project (takes 2 minutes)
- Get connection credentials

**Cost**: Free for development, $25/month for production

### 2. Firebase Project (Free)

- Go to [console.firebase.google.com](https://console.firebase.google.com)
- Create project
- Enable Authentication
- Download service account credentials

**Cost**: Free for most use cases

## Quick Decision Tree

```
Do you want to start coding NOW?
├─ Yes → Follow QUICKSTART.md
└─ No, I want to understand first
   ├─ Want to know about Supabase? → Read WHY_SUPABASE.md
   ├─ Want detailed setup? → Read SUPABASE_SETUP.md
   └─ Want to deploy? → Read DEPLOYMENT.md
```

## Documentation Overview

| Document                                     | Purpose        | Time   | When to Read        |
| -------------------------------------------- | -------------- | ------ | ------------------- |
| **[GET_STARTED.md](./GET_STARTED.md)**       | This file      | 2 min  | Start here          |
| **[QUICKSTART.md](./QUICKSTART.md)**         | Fast setup     | 10 min | Want to code now    |
| **[README.md](./README.md)**                 | Full docs      | 15 min | Need complete info  |
| **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** | Database setup | 10 min | Setting up database |
| **[WHY_SUPABASE.md](./WHY_SUPABASE.md)**     | Decision guide | 5 min  | Evaluating options  |
| **[DEPLOYMENT.md](./DEPLOYMENT.md)**         | Deploy guide   | 20 min | Ready to deploy     |

## Common Questions

### "I'm new to backend development"

Start with:

1. **[QUICKSTART.md](./QUICKSTART.md)** - Get it running
2. **[README.md](./README.md)** - Understand the code
3. Experiment with the API
4. Read about deployment when ready

### "I'm experienced but new to Supabase"

Start with:

1. **[WHY_SUPABASE.md](./WHY_SUPABASE.md)** - Understand the choice
2. **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Set up database
3. **[QUICKSTART.md](./QUICKSTART.md)** - Quick setup
4. **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deploy

### "I want to deploy to production"

Start with:

1. **[QUICKSTART.md](./QUICKSTART.md)** - Get it running locally
2. Test thoroughly
3. **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Choose platform
4. Deploy and monitor

### "I'm migrating from another database"

Start with:

1. **[WHY_SUPABASE.md](./WHY_SUPABASE.md)** - Compare options
2. **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Set up Supabase
3. Export your current data
4. Import to Supabase
5. Update connection strings

## Project Structure at a Glance

```
grounded-backend/
├── 📄 Documentation
│   ├── GET_STARTED.md      ← You are here
│   ├── QUICKSTART.md       ← Start coding in 10 min
│   ├── README.md           ← Full documentation
│   ├── SUPABASE_SETUP.md   ← Database setup guide
│   ├── WHY_SUPABASE.md     ← Decision guide
│   └── DEPLOYMENT.md       ← Deploy to production
│
├── 🔧 Configuration
│   ├── .env.example        ← Environment template
│   ├── package.json        ← Dependencies
│   ├── tsconfig.json       ← TypeScript config
│   └── vercel.json         ← Vercel deployment
│
├── 💾 Database
│   └── migrations/         ← Database schema
│
└── 💻 Source Code
    └── src/
        ├── config/         ← Database, Firebase setup
        ├── controllers/    ← Business logic
        ├── middleware/     ← Auth, errors, logging
        ├── models/         ← Database models
        ├── routes/         ← API endpoints
        ├── types/          ← TypeScript types
        ├── utils/          ← Helper functions
        └── server.ts       ← Entry point
```

## What Happens After Setup?

Once you complete the setup:

1. **Backend Running**: Server on `http://localhost:3000`
2. **Database Ready**: Supabase PostgreSQL with tables
3. **API Available**:
   - `GET /health` - Check status
   - `POST /api/users` - Create/update user
   - `GET /api/users/me` - Get current user

## Next Steps After Setup

### 1. Test the API

```bash
# Health check
curl http://localhost:3000/health

# Test with Firebase token
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR-FIREBASE-TOKEN"
```

### 2. Connect Your Mobile App

Update your mobile app to use:

```
API_URL=http://localhost:3000
```

### 3. Add More Features

- Add new database tables
- Create new API endpoints
- Implement business logic
- Add more middleware

### 4. Deploy to Production

Choose a platform:

- **Vercel** - Easiest, zero config
- **Railway** - Simple CLI
- **Render** - Free tier
- **Traditional** - cPanel/VPS

## Getting Help

### Documentation

- All guides in this folder
- Code comments in `src/`
- TypeScript types for reference

### External Resources

- **Supabase**: [docs.supabase.com](https://docs.supabase.com)
- **Firebase**: [firebase.google.com/docs](https://firebase.google.com/docs)
- **Express**: [expressjs.com](https://expressjs.com)
- **TypeScript**: [typescriptlang.org](https://typescriptlang.org)

### Common Issues

Check **[DEPLOYMENT.md](./DEPLOYMENT.md)** > Troubleshooting section for:

- Connection errors
- Authentication issues
- CORS problems
- Build errors

## Ready to Start?

### Option 1: Quick Start (Recommended)

```bash
# Open the quick start guide
cat QUICKSTART.md

# Or in your browser
open QUICKSTART.md
```

### Option 2: Detailed Setup

```bash
# Read full documentation
cat README.md

# Or in your browser
open README.md
```

### Option 3: Learn About Supabase First

```bash
# Understand the technology choice
cat WHY_SUPABASE.md

# Or in your browser
open WHY_SUPABASE.md
```

## Success Checklist

After setup, you should have:

- [ ] Node.js and npm installed
- [ ] Supabase project created
- [ ] Firebase project set up
- [ ] `.env` file configured
- [ ] Dependencies installed (`npm install`)
- [ ] Database tables created (migrations run)
- [ ] Server running (`npm run dev`)
- [ ] Health check passing (`/health` returns 200)
- [ ] Can create users (with Firebase token)

## What's Included

This backend provides:

✅ **User Management**

- Create/update user profiles
- Sync with Firebase Authentication
- Store user data in PostgreSQL

✅ **Security**

- Firebase token verification
- CORS protection
- Helmet security headers
- SQL injection prevention

✅ **Developer Experience**

- TypeScript for type safety
- Hot reload in development
- Structured error handling
- Request logging

✅ **Production Ready**

- Environment-based configuration
- Database connection pooling
- Graceful shutdown
- Health check endpoint

## Time Estimates

- **Setup**: 10-30 minutes
- **First deployment**: 15-30 minutes
- **Add new feature**: 30-60 minutes
- **Production deployment**: 30-60 minutes

## Let's Go! 🚀

Choose your starting point:

1. **[QUICKSTART.md](./QUICKSTART.md)** - Start coding now
2. **[WHY_SUPABASE.md](./WHY_SUPABASE.md)** - Learn about Supabase
3. **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Detailed database setup
4. **[README.md](./README.md)** - Complete documentation

Happy coding! 🎉
