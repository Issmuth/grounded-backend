# Grounded Backend

Express.js backend server with PostgreSQL and Firebase Authentication for the Grounded mobile application.

> **👋 New here?** Start with **[GET_STARTED.md](./GET_STARTED.md)** to choose your learning path!

## Features

- **Express.js** - Fast, unopinionated web framework
- **TypeScript** - Type-safe development
- **PostgreSQL** - Relational database
- **Firebase Authentication** - Secure user authentication with token verification
- **User Upsert Pattern** - Seamless user registration and login with PostgreSQL `ON CONFLICT`
- **Protected Routes** - Middleware-based authentication for API endpoints
- **Database Migrations** - Systematic schema management with node-pg-migrate
- **Error Handling** - Consistent error responses with custom error classes
- **Request Logging** - HTTP request tracking with Morgan
- **Security** - Helmet and CORS protection

## Prerequisites

- Node.js (LTS version recommended)
- PostgreSQL database
- Firebase project with Admin SDK credentials

## Quick Start

**New to this project?** See [QUICKSTART.md](../helper_docs/backend/QUICKSTART.md) for a 10-minute setup guide.

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

**📚 Detailed guide**: See [SUPABASE_SETUP.md](../helper_docs/backend/SUPABASE_SETUP.md) for complete Supabase configuration.

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

Verify Google authentication token and return user information.

**Headers**:

```
Authorization: Bearer <firebase-id-token>
```

**Response**:

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

**Note**: This endpoint is optional. The primary authentication flow uses the `/api/users` endpoint for user creation/updates.

### User Management

**POST** `/api/users`

Create or update user profile using PostgreSQL upsert pattern. This is the primary endpoint for user authentication flow.

**Features**:

- Creates new users automatically on first sign-in
- Updates existing user data on subsequent sign-ins
- Uses PostgreSQL's `ON CONFLICT` clause for atomic operations
- No "user already exists" errors
- Single database query for efficiency

**Headers**:

```
Authorization: Bearer <firebase-id-token>
```

**Request Body**:

```json
{
  "firebase_uid": "abc123...",
  "email": "user@example.com",
  "display_name": "John Doe"
}
```

**Response**:

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

**Database Operation**:

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

**GET** `/api/users/me`

Get current authenticated user's profile.

**Headers**:

```
Authorization: Bearer <firebase-id-token>
```

**Response**:

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

**Error Responses**:

- `401 Unauthorized`: Invalid or missing token
- `404 Not Found`: User not found in database

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

### Overview

The backend implements Firebase Authentication with token verification and PostgreSQL user management.

**Key Components**:

- `middleware/auth.ts` - Firebase token verification middleware
- `controllers/authController.ts` - Authentication endpoint handlers
- `controllers/userController.ts` - User management endpoints
- `models/User.ts` - Database operations with upsert pattern

### Firebase Token Verification

All protected endpoints use Firebase Admin SDK to verify ID tokens:

1. Client sends request with `Authorization: Bearer <token>` header
2. `verifyFirebaseToken` middleware extracts and verifies token
3. Decoded user information is attached to `req.user`
4. Controller processes authenticated request

**Implementation**:

```typescript
import { verifyFirebaseToken } from "./middleware/auth";

router.get("/protected", verifyFirebaseToken, (req, res) => {
  // req.user contains: { uid, email, name }
  res.json({ user: req.user });
});
```

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

**Benefits**:

- Single endpoint handles both registration and login
- No "user already exists" errors
- Atomic operation (no race conditions)
- Automatic data updates on each login
- Efficient (one query instead of two)

### Authentication Flow

1. Mobile app authenticates user with Firebase
2. App receives Firebase ID token
3. App calls `POST /api/users` with token and user data
4. Backend verifies token with Firebase Admin SDK
5. Backend creates or updates user in PostgreSQL
6. Backend returns user data to app

### Error Handling

The authentication middleware handles common errors:

- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Token expired or revoked
- `404 Not Found`: User not found in database
- `500 Internal Server Error`: Firebase or database errors

## Project Structure

```
grounded-backend/
├── src/
│   ├── config/              # Configuration files
│   │   ├── database.ts      # PostgreSQL connection
│   │   ├── firebase.ts      # Firebase Admin SDK setup
│   │   └── env.ts           # Environment validation
│   ├── controllers/         # Request handlers
│   │   ├── authController.ts    # Authentication endpoints
│   │   └── userController.ts    # User management endpoints
│   ├── middleware/          # Express middleware
│   │   ├── auth.ts          # Firebase token verification
│   │   ├── errorHandler.ts  # Global error handling
│   │   └── logger.ts        # Request logging
│   ├── models/              # Database models
│   │   └── User.ts          # User model with upsert
│   ├── routes/              # API routes
│   │   ├── auth.ts          # Authentication routes
│   │   ├── users.ts         # User routes
│   │   ├── health.ts        # Health check
│   │   └── index.ts         # Route aggregation
│   ├── types/               # TypeScript types
│   │   ├── express.d.ts     # Express type extensions
│   │   └── index.ts         # Shared types
│   ├── utils/               # Utility functions
│   │   ├── errors.ts        # Custom error classes
│   │   └── logger.ts        # Winston logger
│   └── server.ts            # Application entry point
├── migrations/              # Database migrations
│   └── 1732638000000_create_users_table.sql
├── dist/                    # Compiled JavaScript (gitignored)
├── .env                     # Environment variables (gitignored)
├── .env.example             # Environment template
├── package.json
└── tsconfig.json
```

## Deployment

See [DEPLOYMENT.md](../helper_docs/backend/DEPLOYMENT.md) for detailed deployment instructions (supports various platforms including Vercel, Railway, Render, and traditional hosting).

## Security

- Never commit `.env` file to version control
- Use strong Supabase database passwords
- Keep Firebase private key secure
- Configure CORS to allow only trusted origins
- Use HTTPS in production
- Supabase provides SSL by default
- Enable Row Level Security (RLS) in Supabase for additional protection

## Documentation

All detailed guides are located in `../helper_docs/backend/`:

### Getting Started

- **[GET_STARTED.md](../helper_docs/backend/GET_STARTED.md)** - Choose your learning path (start here!)
- **[QUICKSTART.md](../helper_docs/backend/QUICKSTART.md)** - Get running in 10 minutes
- **[README.md](./README.md)** - This file (complete documentation)

### Database & Infrastructure

- **[SUPABASE_SETUP.md](../helper_docs/backend/SUPABASE_SETUP.md)** - Complete Supabase configuration guide
- **[WHY_SUPABASE.md](../helper_docs/backend/WHY_SUPABASE.md)** - Why we chose Supabase (comparison & benefits)

### Deployment

- **[DEPLOYMENT.md](../helper_docs/backend/DEPLOYMENT.md)** - Deploy to Vercel, Railway, Render, or traditional hosting
- **[DEPLOYMENT_CHECKLIST.md](../helper_docs/backend/DEPLOYMENT_CHECKLIST.md)** - Pre-deployment checklist

### Troubleshooting

- **[TROUBLESHOOTING.md](../helper_docs/backend/TROUBLESHOOTING.md)** - Common issues and solutions

## License

ISC
