// server/src/middleware/requireAdmin.js
import admin from "../firebaseAdmin.js"; // your firebase-admin initializer
import { config } from "../config.js";

/**
 * requireAdmin - verifies Firebase ID token from Authorization: Bearer <token>
 * - returns 401 if missing/invalid token
 * - returns 403 if email not in ADMIN_EMAILS
 * - logs errors but does not throw
 */
export async function requireAdmin(req, res, next) {
  try {
    const authHeader = String(req.headers.authorization || "");
    const idToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;

    if (!idToken) {
      return res.status(401).json({ ok: false, error: "Missing auth token" });
    }

    // verify token (wrap in try/catch because admin.auth() may throw if firebase-admin not initialized)
    let decoded = null;
    try {
      if (!admin || !admin.auth) {
        console.error("Firebase admin not initialized.");
        return res
          .status(500)
          .json({ ok: false, error: "Server auth not configured" });
      }
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      console.error("requireAdmin: token verify failed:", err?.message || err);
      return res
        .status(401)
        .json({ ok: false, error: "Invalid or expired token" });
    }

    const email = decoded?.email;
    const allowed = (config.ADMIN_EMAILS || process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (allowed.length > 0 && !allowed.includes(email)) {
      console.warn("requireAdmin: user not in admin list:", email);
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    // attach user info to request
    req.user = { uid: decoded.uid, email };
    return next();
  } catch (err) {
    console.error("requireAdmin fatal:", err);
    return res.status(500).json({ ok: false, error: "Server auth error" });
  }
}
