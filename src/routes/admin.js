// server/src/routes/admin.js
import express from "express";
import { generateInvitePdfBuffer } from "../utils/generatePdf.js";
import uploadBufferToCloudinary from "../cloudinary.js";

const router = express.Router();

/**
 * POST /admin/students
 * body: { event, student, guests: [{ guestName, phone }] }
 *
 * This version:
 *  - Generates a PDF per guest
 *  - Uploads each to Cloudinary
 *  - Returns downloadable URLs (for client to download as PDF)
 */
router.get("/generate-invite/:token", async (req, res) => {
  try {
    const token = req.params.token;
    const guest = { guestName: "John Doe" };
    const student = { studentName: "Jane Smith", matricNo: "DU/2020/011" };

    const pdfPath = await generateInvitePdf(guest, student, token);
    res.download(pdfPath);
  } catch (err) {
    console.error("PDF generation failed:", err);
    res.status(500).json({ error: "Failed to generate invite PDF" });
  }
});

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

    const results = [];

    for (const guest of guests) {
      if (!guest.guestName || !guest.phone) continue;

      const token = `t_${Date.now().toString(36)}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      // Generate PDF buffer
      const pdfBuffer = await generateInvitePdfBuffer({
        event,
        student,
        guest,
        token,
      });

      const filename = `${student.matricNo}_${guest.guestName
        .replace(/\s+/g, "_")
        .trim()}.pdf`;

      // Upload to Cloudinary (as raw file)
      const { publicUrl } = await uploadBufferToCloudinary(pdfBuffer, {
        filename,
      });

      results.push({
        ok: true,
        guestName: guest.guestName,
        phone: guest.phone,
        token,
        filename,
        publicUrl,
        downloadUrl: publicUrl, // alias for client
      });
    }

    return res.json({
      ok: true,
      count: results.length,
      files: results,
    });
  } catch (err) {
    console.error("admin/students failed:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
