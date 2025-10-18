// server/src/routes/verify-json.js
import express from "express";
import { fb } from "../firebase.js"; // Firestore connection
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = express.Router();

/**
 * 🔹 PUBLIC: Verify QR token
 * Body: { token }
 * Response: { ok, status, guest, student, usedAt, usedBy }
 */
router.post("/check", async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    if (!token)
      return res.status(400).json({ ok: false, error: "token required" });

    const doc = await fb.db.collection("invites").doc(token).get();
    if (!doc.exists)
      return res.status(404).json({ ok: false, error: "Invalid token" });

    const invite = doc.data();

    return res.json({
      ok: true,
      status: invite.status,
      guest: invite.guest,
      student: invite.student,
      usedAt: invite.usedAt || null,
      usedBy: invite.usedBy || null,
    });
  } catch (err) {
    console.error("/verify-json/check error:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

/**
 * 🔹 ADMIN: Mark a token as USED (requires admin auth)
 * Body: { token }
 */
router.post("/use", requireAdmin, async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    if (!token)
      return res.status(400).json({ ok: false, error: "token required" });

    const docRef = fb.db.collection("invites").doc(token);
    const doc = await docRef.get();

    if (!doc.exists)
      return res.status(404).json({ ok: false, error: "Token not found" });

    const invite = doc.data();

    if (invite.status === "USED")
      return res.json({ ok: false, error: "Already used", invite });

    const email = req.user?.email || "admin";

    await docRef.update({
      status: "USED",
      usedAt: fb.FieldValue.serverTimestamp(),
      usedBy: email,
    });

    return res.json({ ok: true, message: "Invite marked as USED" });
  } catch (err) {
    console.error("/verify-json/use error:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

/**
 * 🔹 PUBLIC: Admit via PIN (for event gate staff)
 * Body: { token, pin }
 */
router.post("/use-with-pin", async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const pin = String(req.body?.pin || "").trim();
    const expectedPin = process.env.VERIFY_ADMIT_PIN || "";

    if (!token || !pin)
      return res
        .status(400)
        .json({ ok: false, error: "token and pin required" });

    if (!expectedPin)
      return res
        .status(500)
        .json({ ok: false, error: "PIN not configured on server" });

    if (pin !== expectedPin)
      return res.status(403).json({ ok: false, error: "Invalid PIN" });

    const docRef = fb.db.collection("invites").doc(token);
    const doc = await docRef.get();

    if (!doc.exists)
      return res.status(404).json({ ok: false, error: "Token not found" });

    const invite = doc.data();

    if (invite.status === "USED")
      return res.json({ ok: false, error: "Already used", invite });

    await docRef.update({
      status: "USED",
      usedAt: fb.FieldValue.serverTimestamp(),
      usedBy: `pin:${pin}`,
    });

    return res.json({ ok: true, message: "Invite marked as USED", invite });
  } catch (err) {
    console.error("/verify-json/use-with-pin error:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

export default router;
