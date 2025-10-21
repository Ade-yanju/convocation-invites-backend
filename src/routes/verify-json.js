// server/src/routes/verify-json.js
import express from "express";
import { fb } from "../firebase.js";

const router = express.Router();

function cleanToken(raw = "") {
  return String(raw || "")
    .trim()
    .replace(/^.*\/verify\//, "")
    .replace(/[^A-Za-z0-9_-]/g, "");
}

router.post("/check", async (req, res) => {
  try {
    const token = cleanToken(req.body?.token || "");
    if (!token)
      return res.status(400).json({ ok: false, error: "Token required" });

    const docRef = fb.db.collection("invites").doc(token);
    const snap = await docRef.get();
    if (!snap.exists)
      return res.status(404).json({ ok: false, error: "Invalid token" });

    const invite = snap.data();
    return res.json({ ok: true, invite: { token, ...invite } });
  } catch (err) {
    console.error("/verify-json/check err:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.post("/use", async (req, res) => {
  try {
    const token = cleanToken(req.body?.token || "");
    if (!token)
      return res.status(400).json({ ok: false, error: "Token required" });

    const docRef = fb.db.collection("invites").doc(token);
    const snap = await docRef.get();
    if (!snap.exists)
      return res.status(404).json({ ok: false, error: "Invalid token" });

    const invite = snap.data();
    if (invite.status === "USED")
      return res.status(409).json({ ok: false, error: "Already used", invite });

    await docRef.update({
      status: "USED",
      usedAt: fb.FieldValue.serverTimestamp(),
      usedBy: "scanner",
    });

    return res.json({ ok: true, message: "Guest admitted" });
  } catch (err) {
    console.error("/verify-json/use err:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

export default router;
