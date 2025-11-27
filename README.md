# Grounded Backend

Express.js backend server with Supabase PostgreSQL and Firebase Authentication for the Grounded mobile application.

> **👋 New here?** Start with **[GET_STARTED.md](./GET_STARTED.md)** to choose your learning path!

## Features

- **Express.js** - Fast, unopinionated web framework
- **TypeScript** - Type-safe development
- **Supabase PostgreSQL** - Managed PostgreSQL database with built-in features
- **Firebase Authentication** - Secure user authentication with token verification
- **User Upsert Pattern** - Seamless user registration and login with PostgreSQL `ON CONFLICT`
- **Database Migrations** - Systematic schema management
- **Error Handling** - Consistent error responses
- **Request Logging** - HTTP request tracking
- **Security** - Helmet and CORS protection

## Prerequisites

- Node.js (LTS version recommended)
- Supabase account and project
- Firebase project with Admin SDK credentials

## Quick Start

**New to this project?** See [QUICKSTART.md](./QUICKSTART.md) for a 10-minute setup guide.

## Installation

1. Clone the repository and navigate to the backend directory:

```bash
cd grounded-backend
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:

```env
NODE_ENV=development
PORT=3000

# Get these from Supabase Project Settings > Database
DB_HOST=db.your-project-ref.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-supabase-db-password

DATABASE_URL=postgresql://postgres:your-supabase-db-password@db.your-project-ref.supabase.co:5432/postgres

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

ALLOWED_ORIGINS=http://localhost:8081,exp://192.168.1.100:8081
```

## Supabase Setup

**📚 Detailed guide**: See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for complete Supabase configuration.

**Quick setup**:

1. Create a Supabase project at [supabase.com](https://supabase.com)

2. Get your database credentials:

   - Go to **Project Settings** > **Database**
   - Copy the **Connection string** (URI format)
   - Or use individual credentials (Host, Database, User, Password)

3. Update your `.env` file with Supabase credentials

4. Run migrations to create tables:

```bash
npm run migrate:up
```

3. To rollback migrations:

```bash
npm run migrate:down
```

**Note**: You can also run migrations directly in Supabase:

- Go to **SQL Editor** in your Supabase dashboard
- Copy and paste the SQL from `migrations/` folder
- Execute the queries

## Development

Start the development server with hot reloading:

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or your configured PORT).

## Building for Production

Compile TypeScript to JavaScript:

```bash
npm run build
```

The compiled files will be in the `dist/` directory.

## Running in Production

After building, start the production server:

```bash
npm start
```

## API Endpoints

### Health Check

**GET** `/health`

Check server and database status.

Response:

```json
{
  "status": "ok",
  "timestamp": "2025-11-26T10:30:00.000Z",
  "uptime": 3600,
  "database": "connected"
}
```

### Authentication

**POST** `/api/auth/google`

Verify Google authentication token (optional endpoint).

Headers:

```
Authorization: Bearer <firebase-id-token>
```

Response:

```json
{
  "success": true,
  "message": "Authentication successful",
  "user": {
    "uid": "abc123...",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### User Management

**POST** `/api/users`

Create or update user profile (upsert operation). This endpoint automatically:

- Creates a new user if they don't exist
- Updates existing user data if they do exist
- Uses PostgreSQL's `ON CONFLICT` clause for atomic operations

Headers:

```
Authorization: Bearer <firebase-id-token>
```

Request Body:

```json
{
  "firebase_uid": "abc123...",
  "email": "user@example.com",
  "display_name": "John Doe"
}
```

Response:

```json
{
  "id": 1,
  "firebase_uid": "abc123...",
  "email": "user@example.com",
  "display_name": "John Doe",
  "created_at": "2025-11-26T10:00:00.000Z",
  "updated_at": "2025-11-26T10:00:00.000Z"
}
```

**GET** `/api/users/me`

Get current user profile (requires Firebase authentication).

Headers:

```
Authorization: Bearer <firebase-id-token>
```

Response:

```json
{
  "id": 1,
  "firebase_uid": "abc123...",
  "email": "user@example.com",
  "display_name": "John Doe",
  "created_at": "2025-11-26T10:00:00.000Z",
  "updated_at": "2025-11-26T10:00:00.000Z"
}
```

## Environment Variables

| Variable                | Description                          | Required |
| ----------------------- | ------------------------------------ | -------- |
| `NODE_ENV`              | Environment (development/production) | Yes      |
| `PORT`                  | Server port                          | Yes      |
| `DB_HOST`               | Supabase database host               | Yes      |
| `DB_PORT`               | Database port (5432)                 | Yes      |
| `DB_NAME`               | Database name (postgres)             | Yes      |
| `DB_USER`               | Database user (postgres)             | Yes      |
| `DB_PASSWORD`           | Supabase database password           | Yes      |
| `DATABASE_URL`          | Full Supabase connection string      | Yes      |
| `FIREBASE_PROJECT_ID`   | Firebase project ID                  | Yes      |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email       | Yes      |
| `FIREBASE_PRIVATE_KEY`  | Firebase private key                 | Yes      |
| `ALLOWED_ORIGINS`       | Comma-separated CORS origins         | Yes      |

## Authentication Architecture

### Firebase Token Verification

All protected endpoints use Firebase Admin SDK to verify ID tokens:

1. Client sends request with `Authorization: Bearer <token>` header
2. Auth middleware extracts and verifies token with Firebase
3. User information is attached to request object
4. Controller processes authenticated request

### User Upsert Pattern

The backend uses PostgreSQL's `ON CONFLICT` clause for seamless user management:

```sql
INSERT INTO users (firebase_uid, email, display_name)
VALUES ($1, $2, $3)
ON CONFLICT (firebase_uid)
DO UPDATE SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name,
  updated_at = CURRENT_TIMESTAMP
RETURNING *
```

**Benefits:**

- Single endpoint handles both registration and login
- No "user already exists" errors
- Atomic operation (no race conditions)
- Automatic data updates on each login
- Efficient (one query instead of two)

### Protected Routes

Add authentication to any route:

```typescript
import { verifyFirebaseToken } from "./middleware/auth";

router.get("/protected", verifyFirebaseToken, (req, res) => {
  // req.user contains authenticated user info
  res.json({ user: req.user });
});
```

## Project Structure

```
grounded-backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   └── server.ts        # Application entry point
├── migrations/          # Database migrations
├── dist/                # Compiled JavaScript (gitignored)
├── .env                 # Environment variables (gitignored)
├── .env.example         # Environment template
├── package.json
└── tsconfig.json
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions (supports various platforms including Vercel, Railway, Render, and traditional hosting).

## Security

- Never commit `.env` file to version control
- Use strong Supabase database passwords
- Keep Firebase private key secure
- Configure CORS to allow only trusted origins
- Use HTTPS in production
- Supabase provides SSL by default
- Enable Row Level Security (RLS) in Supabase for additional protection

## Documentation

### Getting Started

- **[GET_STARTED.md](./GET_STARTED.md)** - Choose your learning path (start here!)
- **[QUICKSTART.md](./QUICKSTART.md)** - Get running in 10 minutes
- **[README.md](./README.md)** - This file (complete documentation)

### Database & Infrastructure

- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Complete Supabase configuration guide
- **[WHY_SUPABASE.md](./WHY_SUPABASE.md)** - Why we chose Supabase (comparison & benefits)

### Deployment

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deploy to Vercel, Railway, Render, or traditional hosting
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Pre-deployment checklist

## License

ISC
