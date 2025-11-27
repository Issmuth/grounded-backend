# Troubleshooting Guide

Common issues and solutions for the Grounded backend.

## Database Connection Issues

### Error: "ENOTFOUND db.xxx.supabase.co"

**Symptoms**:

```
✗ Database connection failed: Error: getaddrinfo ENOTFOUND db.xxx.supabase.co
```

**Possible Causes**:

1. **Supabase Project is Paused** (Most Common)

   - Free tier projects pause after 1 week of inactivity
   - **Solution**:
     - Go to [supabase.com](https://supabase.com)
     - Open your project
     - Click "Restore" if you see a paused message
     - Wait 2-3 minutes for project to wake up
     - Try connecting again

2. **Wrong Database Host**

   - Check your Supabase project reference
   - **Solution**:
     - Go to Supabase Dashboard > Project Settings > Database
     - Copy the correct host from "Connection string"
     - Update `DB_HOST` in `.env`

3. **Network/Firewall Issue**
   - Your network might be blocking the connection
   - **Solution**:
     - Try from a different network
     - Check firewall settings
     - Disable VPN temporarily

### Error: "Connection terminated due to connection timeout"

**Symptoms**:

```
✗ Database connection failed: Error: Connection terminated due to connection timeout
```

**Possible Causes**:

1. **Wrong Password**

   - Database password is incorrect
   - **Solution**:
     - Go to Supabase Dashboard > Project Settings > Database
     - Reset database password if needed
     - Update `DB_PASSWORD` in `.env`

2. **SSL Configuration Issue**

   - Connection requires SSL
   - **Solution**: Already configured correctly in our code

3. **Project Not Ready**
   - Supabase project is still initializing
   - **Solution**: Wait 2-3 minutes and try again

### Error: "password authentication failed"

**Symptoms**:

```
✗ Database connection failed: password authentication failed for user "postgres"
```

**Solution**:

1. Go to Supabase Dashboard
2. Project Settings > Database
3. Click "Reset database password"
4. Copy new password
5. Update `DB_PASSWORD` in `.env`
6. Update `DATABASE_URL` with new password

## Firebase Issues

### Error: "Firebase initialization failed"

**Symptoms**:

```
✗ Firebase Admin SDK initialization failed
```

**Possible Causes**:

1. **Missing Environment Variables**

   - One or more Firebase variables not set
   - **Solution**: Check all three are in `.env`:
     ```env
     FIREBASE_PROJECT_ID=your-project-id
     FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
     FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
     ```

2. **Invalid Private Key Format**

   - Private key not formatted correctly
   - **Solution**:
     - Ensure key is wrapped in quotes
     - Keep `\n` characters (don't replace with actual newlines)
     - Copy entire key including BEGIN/END markers

3. **Wrong Project ID**
   - Project ID doesn't match your Firebase project
   - **Solution**:
     - Go to Firebase Console
     - Check Project Settings > General > Project ID
     - Update `FIREBASE_PROJECT_ID` in `.env`

### Error: "The default Firebase app does not exist"

**Symptoms**:

```
Error: The default Firebase app does not exist
```

**Solution**: This was a code issue that's now fixed. If you still see this:

1. Make sure you have the latest code
2. Restart the server: `npm run dev`

## Environment Variable Issues

### Error: "Missing required environment variables"

**Symptoms**:

```
Missing required environment variables: DB_HOST, DB_PASSWORD, FIREBASE_PROJECT_ID
```

**Solution**:

1. Check `.env` file exists in `grounded-backend/` folder
2. Copy from `.env.example` if needed:
   ```bash
   cp .env.example .env
   ```
3. Fill in all required values
4. Restart server

### Private Key Issues

**Common Mistakes**:

❌ **Wrong** - Split across multiple lines:

```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDbr7zKQXIN7kxE
-----END PRIVATE KEY-----"
```

✅ **Correct** - One line with `\n`:

```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDbr7zKQXIN7kxE\n-----END PRIVATE KEY-----\n"
```

## Port Issues

### Error: "Port 3000 already in use"

**Solution**:

**Windows**:

```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**Mac/Linux**:

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

Or change the port in `.env`:

```env
PORT=3001
```

## TypeScript/Build Issues

### Error: "Cannot find module 'express'"

**Solution**:

```bash
# Install dependencies
npm install

# If still failing, clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Error: "TypeScript compilation failed"

**Solution**:

```bash
# Check for syntax errors
npm run build

# If successful, try running again
npm run dev
```

## Testing Your Setup

### 1. Test Environment Variables

Create a test file `test-env.js`:

```javascript
require("dotenv").config();

console.log("Environment Variables:");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", process.env.PORT);
console.log("DB_HOST:", process.env.DB_HOST);
console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
console.log("FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL);
console.log(
  "FIREBASE_PRIVATE_KEY length:",
  process.env.FIREBASE_PRIVATE_KEY?.length
);
```

Run it:

```bash
node test-env.js
```

All values should be displayed (except private key shows length only).

### 2. Test Database Connection

You can test the database connection separately:

```bash
# Using psql (if installed)
psql "postgresql://postgres:YOUR-PASSWORD@db.xxx.supabase.co:5432/postgres"

# Or using node
node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT NOW()').then(r => console.log('Connected:', r.rows[0])).catch(e => console.error('Error:', e.message));"
```

### 3. Test Firebase Credentials

Create `test-firebase.js`:

```javascript
require("dotenv").config();
const admin = require("firebase-admin");

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
  console.log("✓ Firebase initialized successfully");
} catch (error) {
  console.error("✗ Firebase initialization failed:", error.message);
}
```

Run it:

```bash
node test-firebase.js
```

## Quick Fixes Checklist

When server won't start, check:

- [ ] `.env` file exists
- [ ] All environment variables are set
- [ ] Supabase project is not paused
- [ ] Database password is correct
- [ ] Firebase private key has quotes and `\n` characters
- [ ] No other process using port 3000
- [ ] Dependencies installed (`npm install`)
- [ ] No TypeScript errors (`npm run build`)

## Getting Help

### Check Logs

The server logs show detailed error information:

```bash
npm run dev
```

Look for:

- ✓ marks (successful steps)
- ✗ marks (failed steps)
- Error messages with details

### Supabase Status

Check if Supabase is having issues:

- [status.supabase.com](https://status.supabase.com)

### Firebase Status

Check if Firebase is having issues:

- [status.firebase.google.com](https://status.firebase.google.com)

## Common Solutions Summary

| Issue                          | Quick Fix                                       |
| ------------------------------ | ----------------------------------------------- |
| Database connection failed     | Check if Supabase project is paused, restore it |
| Firebase initialization failed | Verify private key format (quotes + `\n`)       |
| Missing environment variables  | Copy `.env.example` to `.env` and fill values   |
| Port already in use            | Kill process or change PORT in `.env`           |
| Module not found               | Run `npm install`                               |
| Wrong password                 | Reset password in Supabase dashboard            |

## Still Having Issues?

1. Check the specific error message in the logs
2. Search for the error in this guide
3. Verify your Supabase project is active
4. Verify your Firebase credentials are correct
5. Try the test scripts above to isolate the issue

## Useful Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Install dependencies
npm install

# Clear cache and reinstall
rm -rf node_modules package-lock.json && npm install

# Check TypeScript errors
npm run build

# Run migrations
npm run migrate:up
```
