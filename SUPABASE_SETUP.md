# Supabase Setup Guide

Complete guide for setting up Supabase as your PostgreSQL database for the Grounded backend.

## Why Supabase?

- **Managed PostgreSQL**: No server maintenance required
- **Built-in Features**: Authentication, Storage, Realtime subscriptions
- **Free Tier**: Generous free tier for development
- **SSL by Default**: Secure connections out of the box
- **Global CDN**: Fast database access worldwide
- **Automatic Backups**: Daily backups on paid plans
- **Easy Scaling**: Upgrade resources as you grow

## Step-by-Step Setup

### 1. Create Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Click **Start your project**
3. Sign up with GitHub, Google, or email

### 2. Create New Project

1. Click **New Project** in your organization
2. Fill in project details:

   - **Name**: `grounded-backend` (or your preferred name)
   - **Database Password**: Click generate or create a strong password
     - ⚠️ **IMPORTANT**: Save this password! You'll need it for connection
   - **Region**: Choose closest to your users
     - US East (North Virginia) - `us-east-1`
     - Europe (Frankfurt) - `eu-central-1`
     - Asia Pacific (Singapore) - `ap-southeast-1`
     - etc.
   - **Pricing Plan**: Free (or Pro for production)

3. Click **Create new project**
4. Wait 2-3 minutes for project to be provisioned

### 3. Get Database Connection Details

Once your project is ready:

1. Click on **Project Settings** (gear icon in sidebar)
2. Navigate to **Database** section
3. Scroll to **Connection string** section

You'll see several connection string formats. We'll use **URI** format.

#### Connection String Format

```
postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijklmnop.supabase.co:5432/postgres
```

Replace `[YOUR-PASSWORD]` with your actual database password.

#### Individual Connection Parameters

You can also use individual parameters:

- **Host**: `db.abcdefghijklmnop.supabase.co`
- **Database**: `postgres`
- **Port**: `5432`
- **User**: `postgres`
- **Password**: Your database password

### 4. Configure Environment Variables

Update your `.env` file:

```env
# Supabase Database Configuration
DB_HOST=db.abcdefghijklmnop.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-actual-database-password

# Full connection string for migrations
DATABASE_URL=postgresql://postgres:your-actual-database-password@db.abcdefghijklmnop.supabase.co:5432/postgres
```

**Replace**:

- `abcdefghijklmnop` with your actual project reference
- `your-actual-database-password` with your database password

### 5. Test Connection

Run the development server to test connection:

```bash
npm run dev
```

You should see:

```
✓ Supabase database connection established successfully
  Server time: 2025-11-26T10:30:00.000Z
```

### 6. Run Database Migrations

#### Option A: Using Supabase SQL Editor (Recommended for First Time)

1. Go to your Supabase dashboard
2. Click **SQL Editor** in the sidebar
3. Click **New query**
4. Copy the contents of `migrations/1732636800000_create-users-table.sql`
5. Paste into the editor
6. Click **Run** (or press Ctrl/Cmd + Enter)
7. You should see "Success. No rows returned"

#### Option B: Using Migration Tool

```bash
npm run migrate:up
```

### 7. Verify Tables Created

1. Go to **Table Editor** in Supabase dashboard
2. You should see the `users` table
3. Click on it to view structure:
   - `id` (int8, primary key)
   - `firebase_uid` (varchar, unique)
   - `email` (varchar)
   - `display_name` (varchar)
   - `created_at` (timestamp)
   - `updated_at` (timestamp)

### 8. Optional: Enable Row Level Security (RLS)

For additional security, you can enable RLS:

1. Go to **Authentication** > **Policies**
2. Select `users` table
3. Click **Enable RLS**
4. Create policies as needed

**Note**: Since we're using Firebase Authentication, RLS is optional. Our application handles authorization.

## Supabase Features You Can Use

### 1. SQL Editor

Run custom queries directly:

```sql
-- View all users
SELECT * FROM users;

-- Count users
SELECT COUNT(*) FROM users;

-- Find user by email
SELECT * FROM users WHERE email = 'user@example.com';
```

### 2. Table Editor

- View and edit data visually
- Add/remove columns
- Create relationships
- Export data as CSV

### 3. Database Logs

Monitor your database:

1. Go to **Database** > **Logs**
2. View query logs
3. Check slow queries
4. Monitor connection pool

### 4. Database Backups

**Free Plan**: No automatic backups
**Pro Plan**: Daily automatic backups

To create manual backup:

1. Go to **Database** > **Backups**
2. Click **Create backup**

### 5. Connection Pooler

For better performance with many connections:

1. Go to **Project Settings** > **Database**
2. Find **Connection Pooling** section
3. Use pooler connection string for production

Format:

```
postgresql://postgres:[PASSWORD]@db.abcdefghijklmnop.supabase.co:6543/postgres?pgbouncer=true
```

Note the different port: `6543` instead of `5432`

## Best Practices

### Security

1. **Never commit database password**: Keep it in `.env` file
2. **Use strong passwords**: Generate random passwords
3. **Rotate passwords regularly**: Change every 90 days
4. **Enable RLS if needed**: For additional table-level security
5. **Monitor access logs**: Check for suspicious activity

### Performance

1. **Use indexes**: Already created on `firebase_uid` and `email`
2. **Connection pooling**: Use Supabase pooler for production
3. **Optimize queries**: Use EXPLAIN ANALYZE for slow queries
4. **Monitor usage**: Check dashboard for performance metrics

### Monitoring

1. **Set up alerts**: Configure email alerts for issues
2. **Check logs regularly**: Review database logs
3. **Monitor disk usage**: Upgrade plan if approaching limits
4. **Track query performance**: Identify and optimize slow queries

## Troubleshooting

### Connection Refused

**Problem**: Cannot connect to database

**Solutions**:

1. Verify project is active (not paused)
2. Check credentials are correct
3. Ensure SSL is enabled in connection config
4. Verify network allows outbound connections on port 5432

### Authentication Failed

**Problem**: `password authentication failed for user "postgres"`

**Solutions**:

1. Double-check database password
2. Ensure no extra spaces in password
3. Try resetting database password in Supabase settings
4. Verify you're using the correct project

### SSL Connection Error

**Problem**: SSL-related connection errors

**Solutions**:

1. Ensure `ssl: { rejectUnauthorized: false }` is in config
2. Supabase requires SSL connections
3. Check if your environment supports SSL

### Project Paused

**Problem**: Free tier projects pause after inactivity

**Solutions**:

1. Go to Supabase dashboard
2. Click **Restore** on paused project
3. Consider upgrading to Pro plan for always-on
4. Set up health check to keep project active

### Migration Errors

**Problem**: Migration fails to run

**Solutions**:

1. Check SQL syntax
2. Verify table doesn't already exist
3. Run migrations in order
4. Check Supabase logs for detailed error

## Upgrading Plans

### Free Plan

- 500 MB database
- 2 GB bandwidth
- 50 MB file storage
- Pauses after 1 week inactivity

### Pro Plan ($25/month)

- 8 GB database
- 50 GB bandwidth
- 100 GB file storage
- No pausing
- Daily backups
- Email support

### Enterprise

- Custom resources
- SLA guarantees
- Priority support
- Custom contracts

## Additional Resources

- **Documentation**: [docs.supabase.com](https://docs.supabase.com)
- **API Reference**: [supabase.com/docs/reference](https://supabase.com/docs/reference)
- **Community**: [github.com/supabase/supabase/discussions](https://github.com/supabase/supabase/discussions)
- **Status Page**: [status.supabase.com](https://status.supabase.com)
- **Support**: support@supabase.io

## Next Steps

After setting up Supabase:

1. ✅ Database connection configured
2. ✅ Tables created via migrations
3. 📝 Deploy your backend (see [DEPLOYMENT.md](./DEPLOYMENT.md))
4. 📝 Connect your mobile app
5. 📝 Set up monitoring and alerts
6. 📝 Configure backups (Pro plan)

## Quick Reference

### Connection String Template

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### Common SQL Queries

```sql
-- View all tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- View table structure
\d users

-- Count records
SELECT COUNT(*) FROM users;

-- Recent users
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;
```

### Useful Supabase CLI Commands

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Pull remote schema
supabase db pull

# Push local migrations
supabase db push
```
