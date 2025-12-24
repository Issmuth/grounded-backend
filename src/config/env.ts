import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

interface EnvironmentConfig {
  NODE_ENV: string;
  PORT: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DATABASE_URL: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  ALLOWED_ORIGINS: string[];
  GEMINI_API_KEY: string;
}

const requiredEnvVars = [
  "NODE_ENV",
  "PORT",
  "DATABASE_URL",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "ALLOWED_ORIGINS",
  "GEMINI_API_KEY",
];

export function validateEnvironment(): void {
  const missingVars: string[] = [];

  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}\n` +
        "Please check your .env file and ensure all required variables are set."
    );
  }
}

export const env: EnvironmentConfig = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "3000", 10),
  DB_HOST: process.env.DB_HOST || "",
  DB_PORT: parseInt(process.env.DB_PORT || "5432", 10),
  DB_NAME: process.env.DB_NAME || "",
  DB_USER: process.env.DB_USER || "",
  DB_PASSWORD: process.env.DB_PASSWORD || "",
  DATABASE_URL: process.env.DATABASE_URL || "",
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || "",
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || "",
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || "",
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(",") || [],
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
};
