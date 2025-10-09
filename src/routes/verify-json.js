// server/src/routes/verify-json.js
import express from "express";
import { prisma } from "../db.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = express.Router();

/**
 * Public check: anyone (scanner) can POST { token } to get status + guestName.
 * This is intentionally read-only and returns limited data.
 */
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

    // limit data returned for public check
    const out = {
      ok: true,
      status: g.status,
      guest: { guestName: g.guestName, phone: g.phone },
      // do not expose sensitive student fields publicly unless you want to
      student: {
        studentName: g.student?.studentName || null,
        matricNo: g.student?.matricNo || null,
      },
      usedAt: g.usedAt,
      usedBy: g.usedBy || null,
    };
    return res.json(out);
  } catch (e) {
    console.error("/verify-json/check err:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

/**
 * Admin-only "use" endpoint - marks an UNUSED token as USED (atomic).
 */
router.post("/use", requireAdmin, async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    if (!token)
      return res.status(400).json({ ok: false, error: "token required" });

    const email = req.user?.email || "admin";

    // atomic update: only update if status is UNUSED
    const updated = await prisma.guest.updateMany({
      where: { token, status: "UNUSED" },
      data: { status: "USED", usedAt: new Date(), usedBy: email },
    });

    if (updated.count === 0) {
      // Already used or doesn't exist
      const g = await prisma.guest.findUnique({
        where: { token },
        include: { student: true },
      });
      if (!g)
        return res.status(404).json({ ok: false, error: "Token not found" });
      return res.json({ ok: false, error: "Already used", guest: g });
    }

    // return the used record
    const g = await prisma.guest.findUnique({
      where: { token },
      include: { student: true },
    });
    return res.json({ ok: true, guest: g });
  } catch (e) {
    console.error("/verify-json/use err:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

export default router;
