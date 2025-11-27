import { Request, Response, NextFunction } from "express";
import { UserModel } from "../models/User";
import { NotFoundError } from "../utils/errors";
import { logger } from "../utils/logger";

// Create or update user profile
export async function createOrUpdateUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // User info comes from Firebase token (attached by auth middleware)
    if (!req.user) {
      throw new Error("User not authenticated");
    }

    const { uid, email, name } = req.user;

    // Upsert user (create if doesn't exist, update if exists)
    const user = await UserModel.upsert({
      firebase_uid: uid,
      email,
      display_name: name || email,
    });

    logger.info("User synced", {
      uid,
      email,
      action: user.created_at === user.updated_at ? "created" : "updated",
    });

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
}

// Get current user profile
export async function getCurrentUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // User info comes from Firebase token (attached by auth middleware)
    if (!req.user) {
      throw new Error("User not authenticated");
    }

    const { uid } = req.user;

    // Fetch user from database
    const user = await UserModel.findByFirebaseUid(uid);

    if (!user) {
      throw new NotFoundError("User profile not found");
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
}
