// server/src/routes/admin.js
import express from "express";
import { config } from "../config.js";
import { createGuestsAndSave } from "../services/inviteService.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = express.Router();
router.use(requireAdmin);

router.post("/students", async (req, res) => {
  try {
    const { student, guests = [] } = req.body || {};
    if (!student?.matricNo || !student?.studentName) {
      return res
        .status(400)
        .json({
          ok: false,
          error: "student.matricNo and student.studentName required",
        });
    }
    const files = await createGuestsAndSave({
      event: config.EVENT,
      student,
      guests,
    });
    return res.json({ ok: true, files });
  } catch (e) {
    console.error("[/admin/students] error:", e);
    return res
      .status(500)
      .json({ ok: false, error: e.message || "Server error" });
  }
});

router.get("/health", (_req, res) => res.json({ ok: true }));
export default router;
