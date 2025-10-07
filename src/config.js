import dotenv from "dotenv";
dotenv.config();

export const config = {
  PORT: process.env.PORT || 8080,
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
  BASE_URL: process.env.BASE_URL || `http://localhost:${process.env.PORT || 8080}`,
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
