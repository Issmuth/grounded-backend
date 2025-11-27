import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import { validateEnvironment, env } from "./config/env";
import { initializeFirebase } from "./config/firebase";
import { testConnection, closePool } from "./config/database";
import { requestLogger } from "./middleware/logger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import routes from "./routes";
import { logger } from "./utils/logger";

async function startServer(): Promise<void> {
  try {
    // 1. Validate environment variables
    logger.info("Validating environment variables...");
    validateEnvironment();

    // 2. Initialize Firebase Admin SDK
    logger.info("Initializing Firebase Admin SDK...");
    initializeFirebase();

    // 3. Test database connection
    logger.info("Testing database connection...");
    await testConnection();

    // 4. Create Express application
    const app: Application = express();

    // 5. Security middleware
    app.use(helmet());

    // 6. CORS configuration
    app.use(
      cors({
        origin: (origin, callback) => {
          // Allow requests with no origin (mobile apps, Postman, etc.)
          if (!origin) {
            return callback(null, true);
          }

          if (env.ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error("Not allowed by CORS"));
          }
        },
        credentials: true,
      })
    );

    // 7. Body parsing middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // 8. Request logging
    app.use(requestLogger);

    // 9. Routes
    app.use("/", routes);

    // 10. 404 handler
    app.use(notFoundHandler);

    // 11. Error handling middleware (must be last)
    app.use(errorHandler);

    // 12. Start server
    const server = app.listen(env.PORT, () => {
      logger.info(`Server started successfully`, {
        port: env.PORT,
        environment: env.NODE_ENV,
      });
      console.log(`\n🚀 Server is running on port ${env.PORT}`);
      console.log(`📊 Environment: ${env.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${env.PORT}/health\n`);
    });

    // 13. Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        logger.info("HTTP server closed");

        try {
          await closePool();
          logger.info("Database connections closed");
          process.exit(0);
        } catch (error) {
          logger.error("Error during shutdown", error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error: any) {
    logger.error("Failed to start server", { error: error.message });
    console.error("❌ Server startup failed:", error.message);
    process.exit(1);
  }
}

// Start the server
startServer();
