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

const allowedOrigins = config.CORS_ORIGIN.split(",");

// server entry (index.js)
app.use(
  cors({
    origin: config.CORS_ORIGIN,
    credentials: true, // <-- allow credentials
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

app.listen(config.PORT, () =>
  console.log(`API on :${config.PORT} (CORS origin: ${config.CORS_ORIGIN})`)
);
