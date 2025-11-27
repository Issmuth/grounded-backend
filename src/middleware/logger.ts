import morgan from "morgan";
import { Request, Response } from "express";
import { env } from "../config/env";
import { logger } from "../utils/logger";

// Morgan middleware for HTTP request logging
export const requestLogger = morgan(
  env.NODE_ENV === "production" ? "combined" : "dev",
  {
    stream: {
      write: (message: string) => {
        // Remove trailing newline
        const logMessage = message.trim();

        if (env.NODE_ENV === "production") {
          // In production, use structured logging
          logger.info(logMessage);
        } else {
          // In development, use console output
          console.log(logMessage);
        }
      },
    },
  }
);

// Custom request logger for production with more details
export function customRequestLogger(
  req: Request,
  res: Response,
  next: () => void
): void {
  const start = Date.now();

  // Log after response is sent
  res.on("finish", () => {
    const duration = Date.now() - start;

    if (env.NODE_ENV === "production") {
      logger.info("HTTP Request", {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get("user-agent"),
        ip: req.ip,
      });
    }
  });

  next();
}
