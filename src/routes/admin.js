// server/src/routes/admin.js
import express from "express";
import crypto from "crypto";
import { prisma } from "../db.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { generatePdfBufferForInvite } from "../pdfWithQr.js";
import uploadBufferToCloudinary from "../cloudinary.js";

const router = express.Router();

function makeToken() {
  return crypto.randomBytes(10).toString("hex");
}

router.post("/students", requireAdmin, async (req, res) => {
  try {
    const { event = {}, student = {}, guests = [] } = req.body;
    if (!student?.matricNo || !student?.studentName) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing student details" });
    }

    // Upsert student by matricNo (assumes matricNo is unique)
    const studentRecord = await prisma.student.upsert({
      where: { matricNo: student.matricNo },
      update: { studentName: student.studentName, phone: student.phone || "" },
      create: {
        matricNo: student.matricNo,
        studentName: student.studentName,
        phone: student.phone || "",
      },
    });

    // ensure guests array
    const guestsArr = Array.isArray(guests) ? guests : [guests];

    const files = [];
    for (const g of guestsArr) {
      const token = makeToken();

      // create guest row with token and UNUSED status
      const guestRecord = await prisma.guest.create({
        data: {
          guestName: g.guestName || "Guest",
          phone: g.phone || "",
          token,
          status: "UNUSED",
          studentId: studentRecord.id,
        },
      });

      // prepare invite object for PDF generation
      const invite = {
        studentName: studentRecord.studentName,
        matricNo: studentRecord.matricNo,
        guestName: guestRecord.guestName,
        phone: guestRecord.phone,
        event,
        token,
      };

      // generate PDF buffer with QR embedded
      const pdfBuffer = await generatePdfBufferForInvite(invite);
      const filename = `${studentRecord.matricNo}_${
        guestRecord.guestName || "guest"
      }_${token}.pdf`.replace(/\s+/g, "_");

      // upload to Cloudinary (raw)
      let uploadInfo = { publicUrl: "", secure_url: "" };
      try {
uploadInfo = await uploadBufferToCloudinary(pdfBuffer, {
  folder: process.env.CLOUDINARY_FOLDER || "invites",
  public_id: filename.replace('.pdf', ''),  // Remove extension, Cloudinary adds it
  resource_type: 'raw'  // Important for PDFs
});
      } catch (err) {
        console.error("cloud upload failed for", filename, err);
        // do not abort entire batch — attach empty URL and continue
      }

      // update guest record with URL info (if cloud upload succeeded)
      if (uploadInfo?.publicUrl) {
        await prisma.guest.update({
          where: { id: guestRecord.id },
          data: {
            publicUrl: uploadInfo.publicUrl,
            filename,
          },
        });
      }

      files.push({
        token,
        guestName: guestRecord.guestName,
        phone: guestRecord.phone,
        filename,
        publicUrl: uploadInfo.publicUrl || "",
        downloadUrl: uploadInfo.publicUrl || "",
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
