import admin from "../firebaseAdmin.js";
import { config } from "../config.js";

export async function requireAdmin(req, res, next) {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token)
      return res.status(401).json({ ok: false, error: "Missing token" });

    if (!admin || !admin.auth) {
      return res
        .status(500)
        .json({ ok: false, error: "Server auth not configured" });
    }

    const decoded = await admin.auth().verifyIdToken(token, true);
    req.user = decoded;

    // allowlist emails OR custom claim (role/admin)
    const allowed = (config.ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const email = (decoded.email || "").toLowerCase();
    const isAdminClaim = decoded.role === "admin" || decoded.admin === true;

    if (allowed.length > 0) {
      if (!allowed.includes(email))
        return res
          .status(403)
          .json({
            ok: false,
            error: "Not authorized (email not in allowlist)",
          });
    } else {
      if (!isAdminClaim)
        return res.status(403).json({ ok: false, error: "Not authorized" });
    }

    next();
  } catch (e) {
    console.error("requireAdmin error:", e);
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }
}
