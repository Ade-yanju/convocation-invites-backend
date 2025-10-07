import express from "express";
import { prisma } from "../db.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = express.Router();

// check token info (protected)
router.post("/check", requireAdmin, async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    if (!token) return res.json({ ok: false, error: "token required" });
    const g = await prisma.guest.findUnique({
      where: { token },
      include: { student: true },
    });
    if (!g) return res.json({ ok: false, error: "Invalid token" });
    return res.json({
      ok: true,
      status: g.status,
      guest: { guestName: g.guestName, phone: g.phone },
      student: g.student
        ? { studentName: g.student.studentName, matricNo: g.student.matricNo }
        : null,
      usedAt: g.usedAt,
      usedBy: g.usedBy,
    });
  } catch (e) {
    console.error("/verify-json/check err:", e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// mark USED (atomic)
router.post("/use", requireAdmin, async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    if (!token) return res.json({ ok: false, error: "token required" });
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
      return res.json({ ok: false, error: "Already used", guest: g });
    }
    const g = await prisma.guest.findUnique({
      where: { token },
      include: { student: true },
    });
    return res.json({ ok: true, guest: g });
  } catch (e) {
    console.error("/verify-json/use err:", e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

export default router;
