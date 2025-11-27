# Deployment Guide

This guide provides deployment instructions for the Grounded backend with Supabase PostgreSQL database.

## Table of Contents

- [Supabase Setup](#supabase-setup)
- [Deployment Options](#deployment-options)
  - [Vercel (Recommended)](#vercel-recommended)
  - [Railway](#railway)
  - [Render](#render)
  - [Traditional Hosting (cPanel/VPS)](#traditional-hosting-cpanelvps)
- [Environment Variables](#environment-variables)
- [Database Migrations](#database-migrations)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Supabase Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **New Project**
3. Fill in project details:
   - **Name**: grounded-backend
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
4. Click **Create new project**

### 2. Get Database Credentials

Once your project is ready:

1. Go to **Project Settings** (gear icon)
2. Navigate to **Database** section
3. Find **Connection string** section
4. Copy the **URI** format connection string
5. Replace `[YOUR-PASSWORD]` with your actual database password

Example connection string:

```
postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijklmnop.supabase.co:5432/postgres
```

### 3. Configure Database Connection

You'll need these values for your `.env` file:

```env
DB_HOST=db.abcdefghijklmnop.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-actual-password
DATABASE_URL=postgresql://postgres:your-actual-password@db.abcdefghijklmnop.supabase.co:5432/postgres
```

### 4. Run Migrations

You can run migrations in two ways:

**Option A: Using SQL Editor in Supabase Dashboard**

1. Go to **SQL Editor** in Supabase dashboard
2. Click **New query**
3. Copy contents from `migrations/1732636800000_create-users-table.sql`
4. Paste and click **Run**

**Option B: Using Migration Tool Locally**

```bash
# Set DATABASE_URL in your .env file first
npm run migrate:up
```

### 5. Verify Tables Created

1. Go to **Table Editor** in Supabase dashboard
2. You should see the `users` table
3. Check the structure matches your migration

## Deployment Options

### Vercel (Recommended)

Vercel is excellent for Node.js backends with zero configuration.

#### Prerequisites

- GitHub/GitLab/Bitbucket account
- Vercel account (free tier available)

#### Steps

1. **Push code to Git repository**

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin your-repo-url
git push -u origin main
```

2. **Deploy to Vercel**

- Go to [vercel.com](https://vercel.com)
- Click **Add New** > **Project**
- Import your Git repository
- Configure project:
  - **Framework Preset**: Other
  - **Build Command**: `npm run build`
  - **Output Directory**: `dist`
  - **Install Command**: `npm install`

3. **Add Environment Variables**

In Vercel project settings > Environment Variables, add:

```
NODE_ENV=production
PORT=3000
DB_HOST=db.your-project-ref.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-supabase-password
DATABASE_URL=postgresql://postgres:password@db.your-ref.supabase.co:5432/postgres
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

4. **Configure for Node.js**

Create `vercel.json` in project root:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/server.js"
    }
  ]
}
```

5. **Deploy**

- Click **Deploy**
- Vercel will build and deploy automatically
- Get your deployment URL (e.g., `https://your-app.vercel.app`)

6. **Test Deployment**

```bash
curl https://your-app.vercel.app/health
```

### Railway

Railway offers simple deployment with built-in PostgreSQL (though we're using Supabase).

#### Steps

1. **Install Railway CLI**

```bash
npm install -g @railway/cli
```

2. **Login to Railway**

```bash
railway login
```

3. **Initialize Project**

```bash
railway init
```

4. **Add Environment Variables**

```bash
railway variables set NODE_ENV=production
railway variables set DB_HOST=db.your-ref.supabase.co
railway variables set DB_PASSWORD=your-password
# ... add all other variables
```

Or use Railway dashboard to add variables.

5. **Deploy**

```bash
railway up
```

6. **Get Deployment URL**

```bash
railway domain
```

### Render

Render provides free tier with automatic deployments.

#### Steps

1. **Create Render Account**

Go to [render.com](https://render.com) and sign up

2. **Create New Web Service**

- Click **New** > **Web Service**
- Connect your Git repository
- Configure:
  - **Name**: grounded-backend
  - **Environment**: Node
  - **Build Command**: `npm install && npm run build`
  - **Start Command**: `npm start`
  - **Plan**: Free (or paid for better performance)

3. **Add Environment Variables**

In service settings > Environment, add all variables from `.env.example`

4. **Deploy**

Render will automatically deploy on every push to main branch

5. **Custom Domain (Optional)**

- Go to **Settings** > **Custom Domain**
- Add your domain and configure DNS

### Traditional Hosting (cPanel/VPS)

For shared hosting or VPS with cPanel.

#### Prerequisites

- cPanel with Node.js support
- SSH access (recommended)

#### Steps

1. **Build Application Locally**

```bash
npm run build
```

2. **Upload Files**

Upload via FTP/SFTP:

- `dist/` folder
- `node_modules/` folder (or install on server)
- `package.json`
- `package-lock.json`
- `.env` file (with production values)

3. **Setup Node.js App in cPanel**

- Go to **Setup Node.js App**
- Click **Create Application**
- Configure:
  - **Node.js version**: Latest LTS
  - **Application mode**: Production
  - **Application root**: `/home/username/grounded-backend`
  - **Application startup file**: `dist/server.js`

4. **Install Dependencies**

Via SSH:

```bash
cd ~/grounded-backend
npm install --production
```

Or use cPanel's **Run NPM Install** button

5. **Start Application**

Click **Restart** in cPanel Node.js interface

## Environment Variables

All deployment platforms require these environment variables:

### Required Variables

```env
# Server
NODE_ENV=production
PORT=3000

# Supabase Database
DB_HOST=db.your-project-ref.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-supabase-db-password
DATABASE_URL=postgresql://postgres:password@db.your-ref.supabase.co:5432/postgres

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
```

### Optional Variables (for future use)

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Database Migrations

### Running Migrations

**Method 1: Supabase SQL Editor (Recommended)**

1. Open Supabase dashboard
2. Go to **SQL Editor**
3. Copy SQL from `migrations/` folder
4. Execute queries

**Method 2: Command Line**

```bash
# Ensure DATABASE_URL is set
npm run migrate:up
```

**Method 3: Programmatic (Future Enhancement)**

You could add a migration endpoint:

```typescript
// Only accessible with admin key
app.post("/admin/migrate", async (req, res) => {
  // Run migrations programmatically
});
```

### Creating New Migrations

1. Create new SQL file in `migrations/` folder
2. Name format: `timestamp_description.sql`
3. Write SQL for schema changes
4. Test locally first
5. Run in production

## Monitoring

### Health Checks

Set up monitoring for your `/health` endpoint:

**Using UptimeRobot (Free)**

1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Add new monitor
3. URL: `https://your-api.com/health`
4. Check interval: 5 minutes
5. Get alerts via email/SMS

**Using Better Uptime**

1. Go to [betteruptime.com](https://betteruptime.com)
2. Create new monitor
3. Configure health check endpoint

### Application Logs

**Vercel**: View logs in Vercel dashboard > Logs
**Railway**: `railway logs`
**Render**: View logs in service dashboard
**cPanel**: Check Passenger log file

### Supabase Monitoring

1. Go to Supabase dashboard
2. Navigate to **Database** > **Logs**
3. Monitor query performance
4. Check connection pool usage

## Troubleshooting

### Database Connection Errors

**Error**: `Failed to connect to database`

**Solutions**:

1. Verify Supabase credentials are correct
2. Check if Supabase project is active
3. Ensure SSL is enabled in connection config
4. Verify DATABASE_URL format is correct
5. Check if IP is whitelisted (Supabase allows all by default)

### Firebase Authentication Errors

**Error**: `Failed to initialize Firebase Admin SDK`

**Solutions**:

1. Verify Firebase credentials are correct
2. Check private key formatting (newlines as `\n`)
3. Ensure service account has proper permissions
4. Verify Firebase project is active

### CORS Errors

**Error**: `Not allowed by CORS`

**Solutions**:

1. Add your frontend domain to `ALLOWED_ORIGINS`
2. Include protocol (https://)
3. Don't include trailing slash
4. Restart server after changes

### Port Binding Errors

**Error**: `Port already in use`

**Solutions**:

1. Use `process.env.PORT` (already configured)
2. Don't hardcode port 3000 in production
3. Let platform assign port automatically

### Migration Errors

**Error**: `Migration failed`

**Solutions**:

1. Check SQL syntax
2. Verify table doesn't already exist
3. Run migrations in correct order
4. Check Supabase logs for details

### Build Errors

**Error**: `TypeScript compilation failed`

**Solutions**:

1. Run `npm install` to ensure all dependencies are installed
2. Check `tsconfig.json` is correct
3. Verify all imports are correct
4. Run `npm run build` locally first

## Performance Optimization

### Connection Pooling

Already configured with optimal settings:

- Max connections: 20
- Idle timeout: 30s
- Connection timeout: 2s

### Supabase Optimization

1. **Indexes**: Already created on `firebase_uid` and `email`
2. **Connection Pooling**: Use Supabase connection pooler for better performance
3. **Query Optimization**: Use EXPLAIN ANALYZE for slow queries

### Caching (Future Enhancement)

Consider adding Redis for:

- Session caching
- API response caching
- Rate limiting

## Security Best Practices

1. **Environment Variables**: Never commit `.env` to Git
2. **Supabase RLS**: Enable Row Level Security for additional protection
3. **CORS**: Whitelist only trusted domains
4. **HTTPS**: Always use SSL in production (Supabase provides this)
5. **Rate Limiting**: Add rate limiting middleware
6. **Input Validation**: Validate all user inputs
7. **SQL Injection**: Use parameterized queries (already implemented)
8. **Secrets Rotation**: Regularly rotate database passwords and API keys

## Backup Strategy

### Supabase Backups

Supabase provides automatic daily backups on paid plans.

**Manual Backup**:

1. Go to Supabase dashboard
2. Navigate to **Database** > **Backups**
3. Click **Create backup**

**Restore from Backup**:

1. Go to **Backups** section
2. Select backup
3. Click **Restore**

### Application Backup

1. Keep code in Git repository
2. Tag releases: `git tag v1.0.0`
3. Document configuration changes
4. Backup `.env` securely (not in Git)

## Scaling

### Horizontal Scaling

- Deploy multiple instances behind load balancer
- Use Vercel/Railway auto-scaling
- Supabase handles database scaling

### Vertical Scaling

- Upgrade Supabase plan for more resources
- Increase connection pool size if needed
- Optimize queries for better performance

### Database Scaling

Supabase offers:

- **Free**: 500 MB database, 2 GB bandwidth
- **Pro**: 8 GB database, 50 GB bandwidth
- **Enterprise**: Custom resources

## Support Resources

- **Supabase**: [docs.supabase.com](https://docs.supabase.com)
- **Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **Railway**: [docs.railway.app](https://docs.railway.app)
- **Render**: [render.com/docs](https://render.com/docs)
- **Firebase**: [firebase.google.com/docs](https://firebase.google.com/docs)
