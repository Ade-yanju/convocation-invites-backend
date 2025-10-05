// server/src/index.js
import express from "express";
import cors from "cors";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import { config } from "./config.js";
import adminRoutes from "./routes/admin.js";
import verifyRoutes from "./routes/verify.js";
import verifyJsonRoutes from "./routes/verify-json.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// Use the single allowed origin from config (must be exact if credentials true)
const ALLOWED_ORIGIN = config.CORS_ORIGIN;

// CORS options: allow Authorization header and credentials
const corsOptions = {
  origin: ALLOWED_ORIGIN,
  credentials: true, // allow cookies / credentialed requests if needed
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "X-Requested-With",
    "Origin",
  ],
  optionsSuccessStatus: 204,
};

// Apply CORS globally
app.use(cors(corsOptions));
// Respond to preflight requests for all routes
app.options("*", cors(corsOptions));

// Defensive: ensure Access-Control-Allow-Credentials and origin echoed
app.use((req, res, next) => {
  // echo back allowed origin (don't use '*' when credentials true)
  if (ALLOWED_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  next();
});

app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));

// Local uploads (for local/dev only). Cloudinary uploads are used in prod.
const UPLOAD_DIR = resolve(__dirname, "../uploads");
app.use("/uploads", express.static(UPLOAD_DIR));

// Mount routes (these should use requireAdmin where needed)
app.get("/", (_req, res) =>
  res.json({
    ok: true,
    name: "Convocation Invites API (Firebase+Cloudinary+Prisma)",
  })
);

app.use("/admin", adminRoutes);
app.use("/verify", verifyRoutes);
app.use("/verify-json", verifyJsonRoutes);

app.listen(config.PORT, () => {
  console.log(`API on :${config.PORT} (CORS origin: ${ALLOWED_ORIGIN})`);
});
