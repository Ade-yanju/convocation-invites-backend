// server/src/config.js
import "dotenv/config";

export const config = {
  PORT: process.env.PORT || 8080,
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
  // Allowlist of admin emails (comma separated) — optional
  ADMIN_EMAILS: process.env.ADMIN_EMAILS || "",
  // Firebase admin JSON fallback (you can either supply FIREBASE_ADMIN_JSON env or use file)
  FIREBASE_ADMIN_JSON: process.env.FIREBASE_ADMIN_JSON || null,
  // Cloudinary (if used in pdfService)
  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
    API_KEY: process.env.CLOUDINARY_API_KEY || "",
    API_SECRET: process.env.CLOUDINARY_API_SECRET || "",
    FOLDER: process.env.CLOUDINARY_FOLDER || "invites",
  },
  // Event defaults
  EVENT: {
    title: process.env.EVENT_TITLE || "Dominion University Convocation",
    date: process.env.EVENT_DATE || "",
    time: process.env.EVENT_TIME || "",
    venue: process.env.EVENT_VENUE || "",
    notes: process.env.EVENT_NOTES || "",
  },
  DEFAULT_COUNTRY: process.env.DEFAULT_COUNTRY || "NG",
};
