// server/src/routes/admin.js
import express from "express";
import { generateInvitePdfBuffer } from "../utils/generatePdf.js";
const router = express.Router();

/**
 * POST /admin/students
 * body: { event, student, guests: [{ guestName, phone }] }
 *
 * This route:
 *  - generates a PDF per guest (awaits generation)
 *  - returns the PDF as a downloadable file directly
 */
router.post("/students", async (req, res) => {
  try {
    const payload = req.body || {};
    const { event = {}, student = {}, guests = [] } = payload;

    if (!student.matricNo || !student.studentName) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing student details" });
    }
    if (!Array.isArray(guests) || guests.length === 0) {
      return res.status(400).json({ ok: false, error: "No guests provided" });
    }

    // For simplicity, handle one guest at a time
    const guest = guests[0];

    // Create a unique token
    const token = `t_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    // 1️⃣ Generate PDF buffer
    const pdfBuffer = await generateInvitePdfBuffer({
      event,
      student,
      guest,
      token,
    });

    // 2️⃣ Set headers to trigger file download
    const filename = `${student.matricNo}_${guest.guestName
      .replace(/\s+/g, "_")
      .trim()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error("admin/students failed:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
