// server/src/middleware/requireAdmin.js
import admin from "../firebaseAdmin.js";
import { config } from "../config.js";

/**
 * requireAdmin
 * - Allows OPTIONS through (so CORS preflight isn't blocked)
 * - Extracts Bearer token from Authorization header and verifies via firebase-admin
 * - Two ways to allow an admin:
 *    1) ADMIN_EMAILS env (comma separated) — e.g. "you@school.edu,other@du.edu"
 *    2) Custom claim or decoded.role === "admin" (set as Firebase custom claim)
 *
 * Returns 401 or 403 with JSON for API routes.
 */

export async function requireAdmin(req, res, next) {
  try {
    // Allow preflight
    if (req.method === "OPTIONS") return next();

    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res
        .status(401)
        .json({ ok: false, error: "Missing Authorization token" });
    }

    // Verify ID token with firebase-admin
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(token, true);
    } catch (err) {
      console.error("requireAdmin: token verify failed", err?.message || err);
      return res.status(401).json({ ok: false, error: "Invalid token" });
    }

    // Allowlist from env (highest priority)
    const allowed = (process.env.ADMIN_EMAILS || config.ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const userEmail = (decoded.email || "").toLowerCase();
    const hasAllowlist = allowed.length > 0;

    // If custom claim was set (e.g., via Firebase admin SDK), allow it too
    const isAdminClaim = decoded.admin === true || decoded.role === "admin";

    if (hasAllowlist) {
      if (!allowed.includes(userEmail)) {
        return res
          .status(403)
          .json({
            ok: false,
            error: "Not authorized (email not in allowlist)",
          });
      }
    } else {
      // no allowlist configured — require admin claim
      if (!isAdminClaim) {
        return res
          .status(403)
          .json({ ok: false, error: "Not authorized (missing admin claim)" });
      }
    }

    // Attach decoded token to request for downstream handlers
    req.user = decoded;
    return next();
  } catch (e) {
    console.error("requireAdmin unexpected error:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
