// server/src/services/inviteService.js
import dayjs from "dayjs";
import { customAlphabet } from "nanoid";
import { prisma } from "../db.js";
import { qrDataUrlFromToken } from "./qrService.js";
import { buildInvitePDFBuffer, saveBufferToCloudinary } from "./pdfService.js";
import { config } from "../config.js";
import { toE164 } from "../utils/phone.js";

const nano = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 12);

/* ---------- WhatsApp caption ---------- */
function buildCaption({ guestName, link }) {
  return `Hello ${guestName},

You are invited to ${config.EVENT.title}.
Date: ${config.EVENT.date} • Time: ${config.EVENT.time}
Venue: ${config.EVENT.venue}

Please download your QR invite PDF and bring it to the hall:
${link}

NOTES
• Arrive 45 minutes early with a valid ID
• This pass is single-entry and non-transferable
• Keep your QR code private

Thank you.`;
}
const waTextLink = (e164, text) => {
  const digits = String(e164 || "").replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
};

/* ---------- Main ---------- */
/**
 * createGuestsAndSave
 * - event: optional meta object (title, date, time, venue, notes)
 * - student: { matricNo, studentName, phone? }
 * - guests: [{ guestName, phone }]
 *
 * Returns: Array of result objects (one per guest). Each success result contains:
 *  { id, guestName, phone, phoneE164, token, filename, publicUrl, downloadUrl, caption, whatsappLink, cloudinaryPublicId }
 *
 * Failure entries include { guestName, phone, error } so UI can show which ones failed.
 */
export async function createGuestsAndSave({
  event = config.EVENT,
  student,
  guests,
}) {
  if (!student || !student.matricNo || !student.studentName) {
    throw new Error("student.matricNo and student.studentName are required");
  }

  // Upsert student (returns student row)
  const s = await prisma.student.upsert({
    where: { matricNo: student.matricNo },
    update: {
      studentName: student.studentName,
      phone: student.phone ?? null,
    },
    create: {
      matricNo: student.matricNo,
      studentName: student.studentName,
      phone: student.phone ?? null,
    },
  });

  const results = [];

  // Process guests sequentially to reduce concurrent upload pressure.
  // If you want speed you can parallelize with Promise.all but handle rate limits.
  for (const g of guests || []) {
    // basic validation
    if (!g || !g.guestName || !g.phone) {
      results.push({
        guestName: g?.guestName || null,
        phone: g?.phone || null,
        error: "Missing guestName or phone",
      });
      continue;
    }

    // normalize & trim
    const guestName = String(g.guestName).trim();
    const phoneRaw = String(g.phone).trim();

    try {
      // 1) create token + QR data (we keep PNG data for audit)
      const token = nano();
      const qrPngDataUrl = await qrDataUrlFromToken(token);

      // 2) render PDF buffer (embed token so QR encodes it)
      const pdfBuf = await buildInvitePDFBuffer({
        student: { matricNo: s.matricNo, studentName: s.studentName },
        guest: { guestName },
        meta: event,
        token,
      });

      // 3) upload the PDF to Cloudinary (raw)
      const uploaded = await saveBufferToCloudinary(pdfBuf, {
        guest: { guestName, phone: phoneRaw },
        student: s,
      });
      // uploaded = { cloudinaryPublicId, publicUrl, downloadUrl, filename }

      // 4) create guest record (store cloudinary public id in pdfPath for compatibility)
      const guestRow = await prisma.guest.create({
        data: {
          studentId: s.id,
          guestName,
          phone: phoneRaw,
          token,
          qrPngDataUrl,
          pdfPath: uploaded.cloudinaryPublicId,
          status: "UNUSED",
          sentAt: dayjs().toDate(),
        },
      });

      // 5) build whatsapp + caption (prefer downloadUrl for nicer filename)
      const phoneE164 = toE164(guestRow.phone, config.DEFAULT_COUNTRY);
      const link = uploaded.downloadUrl || uploaded.publicUrl;
      const caption = buildCaption({ guestName: guestRow.guestName, link });
      const whatsappLink = phoneE164 ? waTextLink(phoneE164, caption) : "";

      // 6) push result
      results.push({
        id: guestRow.id,
        guestName: guestRow.guestName,
        phone: guestRow.phone,
        phoneE164,
        token: guestRow.token,
        filename: uploaded.filename,
        publicUrl: uploaded.publicUrl,
        downloadUrl: uploaded.downloadUrl,
        caption,
        whatsappLink,
        cloudinaryPublicId: uploaded.cloudinaryPublicId,
      });
    } catch (e) {
      // keep other guests going — surface error for UI
      results.push({
        guestName,
        phone: phoneRaw,
        error: e?.message || "Failed to generate/upload invite",
      });
      console.error("[createGuestsAndSave] guest error:", guestName, e);
    }
  }

  return results;
}

export default { createGuestsAndSave };
