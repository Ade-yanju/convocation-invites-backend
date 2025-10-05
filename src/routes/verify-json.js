import express from "express";
import { prisma } from "../db.js";

const router = express.Router();

// Check status
router.post("/check", async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    if (!token)
      return res.status(400).json({ ok: false, error: "token required" });
    const guest = await prisma.guest.findUnique({
      where: { token },
      include: { student: true },
    });
    if (!guest) return res.status(404).json({ ok: false, error: "Not found" });
    return res.json({
      ok: true,
      status: guest.status,
      usedAt: guest.usedAt || null,
      guest: { guestName: guest.guestName },
      student: {
        studentName: guest.student?.studentName,
        matricNo: guest.student?.matricNo,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// Mark USED (atomic)
router.post("/use", async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    if (!token)
      return res.status(400).json({ ok: false, error: "token required" });
    const updated = await prisma.guest.updateMany({
      where: { token, status: "UNUSED" },
      data: { status: "USED", usedAt: new Date(), usedBy: "scanner" },
    });
    const guest = await prisma.guest.findUnique({
      where: { token },
      include: { student: true },
    });
    if (!guest) return res.status(404).json({ ok: false, error: "Not found" });
    const ok = updated.count > 0; // true if we actually flipped UNUSED->USED
    return res.json({
      ok: true,
      status: guest.status,
      usedAt: guest.usedAt || null,
      guest: { guestName: guest.guestName },
      student: {
        studentName: guest.student?.studentName,
        matricNo: guest.student?.matricNo,
      },
      changed: ok,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

export default router;
