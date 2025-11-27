import admin from "firebase-admin";
import { env } from "./env";

// Initialize Firebase Admin SDK
export function initializeFirebase(): void {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        // Replace escaped newlines with actual newlines
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });

    console.log("✓ Firebase Admin SDK initialized successfully");
  } catch (error) {
    console.error("✗ Firebase Admin SDK initialization failed:", error);
    throw new Error("Failed to initialize Firebase Admin SDK");
  }
}

// Export Firebase Admin instance
export { admin };

// Export auth getter function (to be called after initialization)
export const getAuth = () => admin.auth();
