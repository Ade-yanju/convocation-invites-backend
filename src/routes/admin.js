// server/src/routes/admin.js
import express from "express";
const router = express.Router();
import { generateInvitePdfBuffer } from "../utils/generatePdf.js";
import { uploadBufferToCloudinary } from "../cloudinary.js";
import { config } from "../config.js";

/**
 * POST /admin/students
 * body: { event, student, guests: [{ guestName, phone }] }
 *
 * This route:
 *  - generates a PDF per guest (awaits generation),
 *  - uploads the PDF to Cloudinary (awaits upload),
 *  - returns array of files with publicUrl and downloadUrl (server proxy).
 *
 * Note: You should add authentication middleware (requireAdmin) here.
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

    const files = [];
    for (const guest of guests) {
      // create a token (unique per invite)
      const token = `t_${Date.now().toString(36)}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      // 1) Generate PDF buffer (await)
      const pdfBuffer = await generateInvitePdfBuffer({
        event,
        student,
        guest,
        token,
      });

      // 2) Upload to Cloudinary (await)
      const filename = `${student.matricNo}_${(
        guest.guestName || "guest"
      ).replace(/\s+/g, "_")}.pdf`;
      const uploadOpts = {
        public_id: `invites/${student.matricNo}_${token}`,
        resource_type: "auto",
      };
      const uploadResult = await uploadBufferToCloudinary(
        pdfBuffer,
        uploadOpts
      );

      if (!uploadResult || !uploadResult.secure_url) {
        throw new Error("Upload failed");
      }

      const publicUrl = uploadResult.secure_url;
      // Create a server-proxied download URL (so client can fetch /admin/download?url=...)
      const base = config.PUBLIC_API_BASE || `http://localhost:${config.PORT}`;
      const downloadUrl = `${base}/admin/download?url=${encodeURIComponent(
        publicUrl
      )}&filename=${encodeURIComponent(filename)}`;

      files.push({
        guestName: guest.guestName,
        phone: guest.phone,
        token,
        publicUrl,
        downloadUrl,
        filename,
        id: uploadResult.public_id || null,
      });
    }

    return res.json({ ok: true, files });
  } catch (err) {
    console.error("admin/students failed:", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Server error" });
  }
});

export default router;
