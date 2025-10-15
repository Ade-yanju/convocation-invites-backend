// server/src/index.js
import express from "express";
import cors from "cors";
import { dirname } from "path";
import { fileURLToPath } from "url";
import adminRoutes from "./routes/admin.js";
import verifyRoutes from "./routes/verify.js";
import verifyJsonRoutes from "./routes/verify-json.js";
import verifyViewRoutes from "./routes/verify-view.js";
import downloadRoute from "./routes/download.js";
import { config } from "./config.js";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

(async () => {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully!");
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  }
})();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

const allowedOrigins = config.CORS_ORIGIN
  ? config.CORS_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:3000"];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like Postman, mobile)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS not allowed from this origin"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "20mb" }));

// static assets (optional)
app.use("/assets", express.static(`${__dirname}/../public`));

// health
app.get("/", (_, res) =>
  res.json({ ok: true, name: "Convocation Invites API" })
);

// download proxy (streams remote file back to the browser with proper headers)
app.use(downloadRoute);

// other API routes
app.use("/verify-json", verifyJsonRoutes);
app.use("/verify", verifyRoutes);
app.use("/admin", adminRoutes);
app.use("/verify-view", verifyViewRoutes);

app.listen(config.PORT, () =>
  console.log(`API on :${config.PORT} (CORS origin: ${config.CORS_ORIGIN})`)
);
