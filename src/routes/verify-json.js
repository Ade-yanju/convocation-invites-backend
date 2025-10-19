// server/src/routes/verify-json.js
import express from "express";
import { fb } from "../firebase.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = express.Router();

/* -----------------------------------------------------
   🔹 Utility: Sanitize incoming token
----------------------------------------------------- */
function cleanToken(raw = "") {
  return String(raw)
    .trim()
    .replace(/^.*(Admission Token[:\s]*)/i, "")
    .replace(/^.*\/verify\//, "")
    .replace(/[^A-Za-z0-9_-]/g, "");
}

/* -----------------------------------------------------
   🔹 PUBLIC: Verify QR or Token
   Body: { token }
----------------------------------------------------- */
router.post("/check", async (req, res) => {
  try {
    const rawToken = req.body?.token || "";
    const token = cleanToken(rawToken);

    if (!token)
      return res.status(400).json({ ok: false, error: "Token required" });

    const docRef = fb.db.collection("invites").doc(token);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.warn("❌ Invalid or missing invite for token:", rawToken);
      return res.status(404).json({ ok: false, error: "Invalid token" });
    }

    const invite = docSnap.data();

    return res.json({
      ok: true,
      status: invite.status || "UNUSED",
      invite: {
        token,
        guestName: invite.guestName,
        guestPhone: invite.guestPhone,
        studentName: invite.studentName,
        matricNo: invite.matricNo,
        pdfUrl: invite.pdfUrl,
        verifyUrl: invite.verifyUrl,
        usedAt: invite.usedAt || null,
        usedBy: invite.usedBy || null,
        createdAt: invite.createdAt || null,
      },
    });
  } catch (err) {
    console.error("/verify-json/check error:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

/* -----------------------------------------------------
   🔹 ADMIN: Mark token as USED (requires admin auth)
   Body: { token }
----------------------------------------------------- */
router.post("/use", requireAdmin, async (req, res) => {
  try {
    const token = cleanToken(req.body?.token || "");
    if (!token)
      return res.status(400).json({ ok: false, error: "Token required" });

    const docRef = fb.db.collection("invites").doc(token);
    const docSnap = await docRef.get();

    if (!docSnap.exists)
      return res.status(404).json({ ok: false, error: "Token not found" });

    const invite = docSnap.data();

    if (invite.status === "USED") {
      return res.json({ ok: false, error: "Already used", invite });
    }

    const adminEmail = req.user?.email || "admin";

    await docRef.update({
      status: "USED",
      usedAt: fb.FieldValue.serverTimestamp(),
      usedBy: adminEmail,
    });

    return res.json({
      ok: true,
      message: "Invite marked as USED",
      token,
      updatedBy: adminEmail,
    });
  } catch (err) {
    console.error("/verify-json/use error:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

/* -----------------------------------------------------
   🔹 PUBLIC: Admit via PIN (for staff scanning manually)
   Body: { token, pin }
----------------------------------------------------- */
router.post("/use-with-pin", async (req, res) => {
  try {
    const token = cleanToken(req.body?.token || "");
    const pin = String(req.body?.pin || "").trim();
    const expectedPin = process.env.VERIFY_ADMIT_PIN || "";

    if (!token || !pin)
      return res
        .status(400)
        .json({ ok: false, error: "Token and PIN required" });

    if (!expectedPin)
      return res
        .status(500)
        .json({ ok: false, error: "PIN not configured on server" });

    if (pin !== expectedPin)
      return res.status(403).json({ ok: false, error: "Invalid PIN" });

    const docRef = fb.db.collection("invites").doc(token);
    const docSnap = await docRef.get();

    if (!docSnap.exists)
      return res.status(404).json({ ok: false, error: "Token not found" });

    const invite = docSnap.data();

    if (invite.status === "USED") {
      return res.json({ ok: false, error: "Already used", invite });
    }

    await docRef.update({
      status: "USED",
      usedAt: fb.FieldValue.serverTimestamp(),
      usedBy: `pin:${pin}`,
    });

    return res.json({
      ok: true,
      message: "Invite marked as USED via PIN",
      invite: { ...invite, status: "USED" },
    });
  } catch (err) {
    console.error("/verify-json/use-with-pin error:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

export default router;
