import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";
import { env } from "../config/env";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    timestamp: string;
    path: string;
    details?: any;
  };
}

// Global error handling middleware
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Default error values
  let statusCode = 500;
  let code = "INTERNAL_SERVER_ERROR";
  let message = "An unexpected error occurred";

  // Check if it's an operational error
  if (err instanceof AppError && err.isOperational) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
  }

  // Log error details
  logger.error("Error occurred", {
    code,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    statusCode,
  });

  // Build error response
  const errorResponse: ErrorResponse = {
    error: {
      code,
      message: env.NODE_ENV === "production" ? message : err.message,
      timestamp: new Date().toISOString(),
      path: req.path,
    },
  };

  // Include additional details in development
  if (env.NODE_ENV === "development") {
    errorResponse.error.details = {
      stack: err.stack,
    };
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
}

// Handle 404 - Not Found
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const errorResponse: ErrorResponse = {
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
      path: req.path,
    },
  };

  res.status(404).json(errorResponse);
}
