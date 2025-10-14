// server/src/routes/verify-json.js
import express from "express";
import { prisma } from "../db.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = express.Router();

// public check: no auth required
router.post("/check", async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    if (!token)
      return res.status(400).json({ ok: false, error: "token required" });

    const g = await prisma.guest.findUnique({
      where: { token },
      include: { student: true },
    });
    if (!g) return res.status(404).json({ ok: false, error: "Invalid token" });

    return res.json({
      ok: true,
      status: g.status,
      guest: { guestName: g.guestName, phone: g.phone },
      student: g.student
        ? { studentName: g.student.studentName, matricNo: g.student.matricNo }
        : null,
      usedAt: g.usedAt,
      usedBy: g.usedBy || null,
    });
  } catch (err) {
    console.error("/verify-json/check err:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// admin-only use (keeps previous behavior)
router.post("/use", requireAdmin, async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    if (!token)
      return res.status(400).json({ ok: false, error: "token required" });

    const email = req.user?.email || "admin";
    const updated = await prisma.guest.updateMany({
      where: { token, status: "UNUSED" },
      data: { status: "USED", usedAt: new Date(), usedBy: email },
    });

    if (updated.count === 0) {
      const g = await prisma.guest.findUnique({
        where: { token },
        include: { student: true },
      });
      if (!g)
        return res.status(404).json({ ok: false, error: "Token not found" });
      return res.json({ ok: false, error: "Already used", guest: g });
    }

    const g = await prisma.guest.findUnique({
      where: { token },
      include: { student: true },
    });
    return res.json({ ok: true, guest: g });
  } catch (err) {
    console.error("/verify-json/use err:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

/**
 * Public admit via PIN (for gate staff)
 * Body: { token, pin }
 * PIN must match env VERIFY_ADMIT_PIN (simple approach)
 */
router.post("/use-with-pin", async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const pin = String(req.body?.pin || "").trim();
    const expected = process.env.VERIFY_ADMIT_PIN || "";

    if (!token || !pin)
      return res
        .status(400)
        .json({ ok: false, error: "token and pin required" });
    if (!expected)
      return res
        .status(500)
        .json({ ok: false, error: "Server not configured for PIN admit" });
    if (pin !== expected)
      return res.status(403).json({ ok: false, error: "Invalid PIN" });

    const updated = await prisma.guest.updateMany({
      where: { token, status: "UNUSED" },
      data: { status: "USED", usedAt: new Date(), usedBy: `pin:${pin}` },
    });

    if (updated.count === 0) {
      const g = await prisma.guest.findUnique({
        where: { token },
        include: { student: true },
      });
      if (!g)
        return res.status(404).json({ ok: false, error: "Token not found" });
      return res.json({ ok: false, error: "Already used", guest: g });
    }

    const g = await prisma.guest.findUnique({
      where: { token },
      include: { student: true },
    });
    return res.json({ ok: true, guest: g });
  } catch (err) {
    console.error("/verify-json/use-with-pin err:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

export default router;
