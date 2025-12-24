import { Request, Response, NextFunction } from "express";
import { getAuth } from "../config/firebase";
import { AuthenticationError } from "../utils/errors";
import { logger } from "../utils/logger";

// Authentication middleware to verify Firebase ID tokens
export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AuthenticationError("No authentication token provided");
    }

    // Get token (remove 'Bearer ' prefix)
    const token = authHeader.substring(7);

    if (!token) {
      throw new AuthenticationError("Invalid authentication token format");
    }

    // Verify token with Firebase Admin SDK
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);

    // Attach user info to request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || "",
      name: decodedToken.name,
    };

    logger.debug("User authenticated", {
      uid: req.user.uid,
      email: req.user.email,
    });

    next();
  } catch (error: any) {
    // Handle Firebase-specific errors
    if (error.code === "auth/id-token-expired") {
      next(new AuthenticationError("Authentication token has expired"));
    } else if (error.code === "auth/argument-error") {
      next(new AuthenticationError("Invalid authentication token"));
    } else if (error instanceof AuthenticationError) {
      next(error);
    } else {
      logger.error("Authentication error", { error: error.message });
      next(new AuthenticationError("Authentication failed"));
    }
  }
}
