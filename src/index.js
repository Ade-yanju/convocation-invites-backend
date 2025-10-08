// server/src/index.js
import express from "express";
import cors from "cors";
import { dirname } from "path";
import { fileURLToPath } from "url";
import adminRoutes from "./routes/admin.js";
import verifyRoutes from "./routes/verify.js";
import verifyJsonRoutes from "./routes/verify-json.js";
import downloadRoute from "./routes/download.js";
import { config } from "./config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// IMPORTANT: set credentials:true only if client uses fetch with credentials: 'include'.
// We recommend using Authorization Bearer tokens (Firebase id token) instead of cookies.
// If you use cookies, ensure config.CORS_ORIGIN is exact origin (no '*').
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, Postman)
      if (!origin) return callback(null, true);
      if (config.CORS_ORIGIN.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
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

app.listen(config.PORT, () =>
  console.log(`API on :${config.PORT} (CORS origin: ${config.CORS_ORIGIN})`)
);
