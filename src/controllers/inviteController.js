// server/src/controllers/inviteController.js
import { customAlphabet } from "nanoid";
import { fb } from "../firebase.js"; // Firebase Admin wrapper (auth + firestore)
import { config } from "../config.js";
import { toE164, waManualLink } from "../utils/phone.js";

import {
  buildInvitePDFBuffer,
  // NOTE: this uploads to Cloudinary when UPLOAD_STRATEGY=cloudinary
  // (see pdfService.js provided earlier)
  saveBufferToStorage,
} from "../services/pdfService.js";

const nano = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 12);

function messageTemplate({ guestName, publicUrl }) {
  return `Hello ${guestName},

You are invited to ${config.EVENT.title}.
Date: ${config.EVENT.date} • Time: ${config.EVENT.time}
Venue: ${config.EVENT.venue}

Please download your QR invite PDF and bring it to the hall:
${publicUrl}

Thank you.`;
}

export async function createInvites(req, res) {
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
    if (!Array.isArray(guests) || guests.length === 0) {
      return res
        .status(400)
        .json({ ok: false, error: "At least one guest is required" });
    }

    // Upsert student (keyed by matricNo)
    const studentRef = fb.db.collection("students").doc(student.matricNo);
    await studentRef.set(
      {
        matricNo: student.matricNo,
        studentName: student.studentName,
        phone: student.phone || null,
        updatedAt: fb.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Event meta (or use config.EVENT directly)
    const meta = config.EVENT || {
      title: "Dominion University Convocation 2025",
      date: "September 13, 2025",
      time: "10:00 AM",
      venue: "Main Auditorium, Dominion University, Ibadan",
      notes: "Please arrive 45 minutes early with a valid ID.",
    };

    const results = [];
    for (const g of guests) {
      if (!g?.guestName || !g?.phone) continue;

      // Unique token per invite
      const token = nano();

      // Build PDF (your pdf builder renders the QR from token)
      const pdfBuf = await buildInvitePDFBuffer({
        student: {
          matricNo: student.matricNo,
          studentName: student.studentName,
        },
        guest: { guestName: g.guestName },
        meta,
        token,
      });

      const safe = g.guestName.replace(/[^a-z0-9]+/gi, "_");
      const filename = `Invite_${student.matricNo}_${safe}.pdf`;

      // Upload to Cloudinary (or local, depending on UPLOAD_STRATEGY)
      const saved = await saveBufferToStorage(pdfBuf, filename);
      // saved -> { storage, storageId?, filename, pdfPath, publicUrl }

      // Persist invite in Firestore (status: UNUSED)
      const invite = {
        token,
        status: "UNUSED",
        student: {
          matricNo: student.matricNo,
          studentName: student.studentName,
        },
        guest: {
          guestName: g.guestName.trim(),
          phone: g.phone.trim(),
        },
        filename: saved.filename,
        publicUrl: saved.publicUrl,
        cloudinaryId: saved.storageId || null,
        createdAt: fb.FieldValue.serverTimestamp(),
        sentAt: fb.FieldValue.serverTimestamp(),
      };
      await fb.db.collection("invites").doc(token).set(invite);

      // Build WhatsApp manual-share link
      const phoneE164 = toE164(invite.guest.phone, config.DEFAULT_COUNTRY);
      const waMsg = messageTemplate({
        guestName: invite.guest.guestName,
        publicUrl: invite.publicUrl,
      });
      const whatsappLink = phoneE164 ? waManualLink(phoneE164, waMsg) : "";

      results.push({
        id: token,
        token,
        guestName: invite.guest.guestName,
        phone: invite.guest.phone,
        filename: invite.filename,
        publicUrl: invite.publicUrl,
        whatsappLink,
        status: invite.status,
      });
    }

    res.json({ ok: true, files: results });
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json({ ok: false, error: e.message || "Failed to create PDF" });
  }
}
