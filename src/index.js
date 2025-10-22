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
      if (!origin) return callback(null, true); // allow Postman/mobile
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

// ✅ Health check
app.get("/", (_, res) =>
  res.json({ ok: true, name: "Convocation Invites API" })
);

// ✅ Redirect for QR codes using old domain paths
// e.g. https://duqrinvitesevents.vercel.app/public-verify/:token
app.get("/public-verify/:token", (req, res) => {
  res.redirect(`/verify/${req.params.token}`);
});

// ✅ Download proxy (Cloudinary → Browser)
app.use(downloadRoute);

// ✅ Core backend routes
app.use("/verify-json", verifyJsonRoutes);
app.use("/verify", verifyRoutes);
app.use("/admin", adminRoutes);
app.use("/verify-view", verifyViewRoutes);

app.listen(config.PORT, () =>
  console.log(
    `🚀 API running on port ${config.PORT}\n🌐 Allowed origins: ${config.CORS_ORIGIN}`
  )
);
