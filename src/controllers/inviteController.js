// server/src/controllers/inviteController.js
import { customAlphabet } from "nanoid";
import { fb } from "../firebase.js";
import { config } from "../config.js";
import { toE164, waManualLink } from "../utils/phone.js";
import {
  buildInvitePDFBuffer,
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
      return res.status(400).json({
        ok: false,
        error: "student.matricNo and student.studentName are required.",
      });
    }
    if (!Array.isArray(guests) || guests.length === 0) {
      return res
        .status(400)
        .json({ ok: false, error: "At least one guest is required." });
    }

    // Upsert student
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

    // Meta info
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

      const token = nano();

      // Generate invite PDF (includes QR)
      const pdfBuf = await buildInvitePDFBuffer({
        student,
        guest: g,
        meta,
        token,
        event: meta,
      });

      const safeGuest = g.guestName.replace(/[^a-z0-9]+/gi, "_");
      const filename = `Invite_${student.matricNo}_${safeGuest}.pdf`;

      // Upload to Cloudinary
      const saved = await saveBufferToStorage(pdfBuf, filename);

      // Save to Firestore
      const invite = {
        token,
        status: "UNUSED",
        student,
        guest,
        filename: saved.filename,
        publicUrl: saved.publicUrl,
        cloudinaryId: saved.storageId || null,
        createdAt: fb.FieldValue.serverTimestamp(),
        sentAt: fb.FieldValue.serverTimestamp(),
      };
      await fb.db.collection("invites").doc(token).set(invite);

      const phoneE164 = toE164(invite.guest.phone, config.DEFAULT_COUNTRY);
      const waMsg = messageTemplate({
        guestName: invite.guest.guestName,
        publicUrl: invite.publicUrl,
      });
      const whatsappLink = phoneE164 ? waManualLink(phoneE164, waMsg) : "";

      results.push({
        id: token,
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
    console.error("❌ Invite creation failed:", e);
    res
      .status(500)
      .json({ ok: false, error: e.message || "Failed to create PDF invite" });
  }
}
