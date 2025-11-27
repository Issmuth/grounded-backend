import { Router, Request, Response } from "express";
import sql from "../config/database";

const router = Router();

// Server start time for uptime calculation
const startTime = Date.now();

// Health check endpoint
router.get("/", async (req: Request, res: Response) => {
  let databaseStatus = "connected";
  let statusCode = 200;

  try {
    // Test database connection
    await sql`SELECT 1`;
  } catch (error) {
    databaseStatus = "disconnected";
    statusCode = 503;
  }

  const healthCheck = {
    status: statusCode === 200 ? "ok" : "error",
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000), // uptime in seconds
    database: databaseStatus,
  };

  res.status(statusCode).json(healthCheck);
});

export default router;
