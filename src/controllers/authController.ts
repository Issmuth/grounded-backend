import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

// Google authentication endpoint
// Token verification happens in authMiddleware
export async function googleAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // If we reach here, the token is valid (verified by authMiddleware)
    if (!req.user) {
      throw new Error("User not authenticated");
    }

    const { uid, email, name } = req.user;

    logger.info("Google authentication successful", { uid, email });

    res.status(200).json({
      success: true,
      message: "Authentication successful",
      user: {
        uid,
        email,
        name,
      },
    });
  } catch (error) {
    next(error);
  }
}
