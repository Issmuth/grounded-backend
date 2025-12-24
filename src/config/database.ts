import postgres from "postgres";
import { env } from "./env";

// Create database connection using postgres driver
const connectionString = env.DATABASE_URL;

export const sql = postgres(connectionString);

// Helper function to execute parameterized queries (for compatibility)
export async function query(text: string, params?: any[]): Promise<any> {
  const start = Date.now();
  try {
    // Convert pg-style $1, $2 placeholders to postgres driver format
    const result = await sql.unsafe(text, params || []);
    const duration = Date.now() - start;

    if (env.NODE_ENV === "development") {
      console.log("Executed query", {
        text,
        duration,
        rows: Array.isArray(result) ? result.length : 0,
      });
    }

    // Return in pg-compatible format
    return {
      rows: Array.isArray(result) ? result : [result],
      rowCount: Array.isArray(result) ? result.length : 1,
    };
  } catch (error) {
    console.error("Database query error:", { text, error });
    throw error;
  }
}

// Test database connection
export async function testConnection(): Promise<void> {
  try {
    const result = await sql`SELECT NOW() as now`;
    console.log("✓ Database connection established successfully");
    console.log("  Server time:", result[0].now);
  } catch (error) {
    console.error("✗ Database connection failed:", error);
    throw new Error(
      "Failed to connect to database. Please check your database configuration."
    );
  }
}

// Graceful shutdown
export async function closePool(): Promise<void> {
  await sql.end();
  console.log("Database connection closed");
}

// Export sql for direct use with tagged template literals
export default sql;
