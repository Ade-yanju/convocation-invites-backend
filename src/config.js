// server/src/config.js
import dotenv from "dotenv";
dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

export const config = {
  PORT: process.env.PORT || 8080,

  // ✅ Allow multiple frontend origins (local + Vercel)
  CORS_ORIGIN:
    process.env.CORS_ORIGIN ||
    "http://localhost:3000,https://duqrinvitesevents.vercel.app",

  // ✅ Base URL for your Render backend
  BASE_URL:
    process.env.BASE_URL ||
    (isProduction
      ? "https://invite-server-0gv6.onrender.com"
      : `http://localhost:${process.env.PORT || 8080}`),

  // ✅ Public URL used for download links
  PUBLIC_API_BASE:
    process.env.PUBLIC_API_BASE ||
    (isProduction
      ? "https://invite-server-0gv6.onrender.com"
      : `http://localhost:${process.env.PORT || 8080}`),

  DATABASE_URL: process.env.DATABASE_URL,

  FIREBASE_ADMIN_JSON: process.env.FIREBASE_ADMIN_JSON,
  FIREBASE_ADMIN_PATH: process.env.FIREBASE_ADMIN_PATH,

  ADMIN_EMAILS: process.env.ADMIN_EMAILS || "",
  VERIFY_PIN: process.env.VERIFY_PIN || "",
  DEFAULT_COUNTRY: process.env.DEFAULT_COUNTRY || "NG",

  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    API_KEY: process.env.CLOUDINARY_API_KEY,
    API_SECRET: process.env.CLOUDINARY_API_SECRET,
    FOLDER: process.env.CLOUDINARY_FOLDER || "invites",
  },

  EVENT: {
    title: process.env.EVENT_TITLE || "Dominion University Convocation 2025",
    date: process.env.EVENT_DATE || "",
    time: process.env.EVENT_TIME || "",
    venue: process.env.EVENT_VENUE || "",
    notes: process.env.EVENT_NOTES || "",
  },
};
