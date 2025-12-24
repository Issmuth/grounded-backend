import { Request, Response, NextFunction } from "express";
import { UserModel } from "../models/User";
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

    // Sync user with database
    const user = await UserModel.upsert({
      firebase_uid: uid,
      email,
      display_name: name || email,
    });

    logger.info("Google authentication successful", { uid, email });

    res.status(200).json({
      success: true,
      message: "Authentication successful",
      user: {
        ...user,
        uid, // Keep uid for backward compatibility if needed, though user.firebase_uid exists
      },
    });
  } catch (error) {
    next(error);
  }
}
