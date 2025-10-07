import dayjs from "dayjs";
import { customAlphabet } from "nanoid";
import { prisma } from "../db.js";
import { qrDataUrlFromToken } from "./qrService.js";
import { buildInvitePDFBuffer, saveBufferToCloudinary } from "./pdfService.js";
import { config } from "../config.js";
import { toE164 } from "../utils/phone.js"; // optional helper present below

const nano = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 12);

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

export async function createGuestsAndSave({
  event = config.EVENT,
  student,
  guests,
}) {
  const s = await prisma.student.upsert({
    where: { matricNo: student.matricNo },
    update: { studentName: student.studentName, phone: student.phone ?? null },
    create: {
      matricNo: student.matricNo,
      studentName: student.studentName,
      phone: student.phone ?? null,
    },
  });

  const results = [];

  for (const g of guests) {
    if (!g?.guestName || !g?.phone) continue;
    try {
      const token = nano();
      const qrPngDataUrl = await qrDataUrlFromToken(token);

      const pdfBuf = await buildInvitePDFBuffer({
        student: { matricNo: s.matricNo, studentName: s.studentName },
        guest: { guestName: g.guestName, phone: g.phone },
        meta: { ...event, baseUrl: config.BASE_URL },
        token,
      });

      const uploaded = await saveBufferToCloudinary(pdfBuf, {
        guest: g,
        student: s,
      });

      const guestRow = await prisma.guest.create({
        data: {
          studentId: s.id,
          guestName: g.guestName.trim(),
          phone: g.phone.trim(),
          token,
          qrPngDataUrl,
          pdfPath: uploaded.cloudinaryPublicId,
          status: "UNUSED",
          sentAt: dayjs().toDate(),
        },
      });

      const phoneE164 = toE164(guestRow.phone, config.DEFAULT_COUNTRY);
      const caption = buildCaption({
        guestName: guestRow.guestName,
        link: uploaded.downloadUrl || uploaded.publicUrl,
      });
      const whatsappLink = phoneE164 ? waTextLink(phoneE164, caption) : "";

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
      results.push({
        guestName: g.guestName,
        phone: g.phone,
        error: e?.message || "Failed",
      });
    }
  }

  return results;
}
