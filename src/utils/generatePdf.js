import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

/**
 * Generates a Dominion University convocation invite (premium design)
 */
export async function generateInvitePdfBuffer({
  event = {},
  student = {},
  guest = {},
  token = "",
}) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      // === BRAND COLORS ===
      const purple = "#0B2E4E";
      const gold = "#D4AF37";
      const text = "#111827";
      const gray = "#6B7280";

      // === HEADER BACKGROUND ===
      doc
        .rect(0, 0, doc.page.width, 120)
        .fill(purple)
        .strokeColor(gold)
        .lineWidth(2)
        .stroke();

      // === LOGO ===
      const logoPath = path.resolve("server/src/assets/du_logo.png");
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, doc.page.width / 2 - 35, 20, { width: 70 });
      }

      // === UNIVERSITY TITLE ===
      doc
        .fillColor("#fff")
        .fontSize(22)
        .font("Helvetica-Bold")
        .text("Dominion University Ibadan", 0, 95, { align: "center" });

      // === EVENT NAME ===
      doc
        .moveDown(3)
        .fontSize(16)
        .fillColor(purple)
        .font("Helvetica-Bold")
        .text("Official Invitation", { align: "center" })
        .moveDown(0.5)
        .font("Helvetica")
        .fontSize(12)
        .fillColor(gray)
        .text("3rd Convocation Ceremony — The Eagle Set", { align: "center" })
        .moveDown(2);

      // === INVITE BORDER ===
      const boxY = doc.y - 10;
      doc
        .roundedRect(40, boxY, doc.page.width - 80, 420, 16)
        .lineWidth(2)
        .strokeColor(gold)
        .stroke();

      doc.moveDown(1.5);

      // === EVENT DETAILS ===
      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor(purple)
        .text("🎓 Event Details", 60, boxY + 20)
        .moveDown(0.5);

      doc
        .font("Helvetica")
        .fontSize(12)
        .fillColor(text)
        .text(`Event: ${event.title || "Dominion University Convocation 2025"}`)
        .text(`Date: ${event.date || "25th October 2025"}`)
        .text(`Time: ${event.time || "10:00 AM"}`)
        .text(`Venue: ${event.venue || "University Auditorium"}`)
        .moveDown(1.5);

      // === STUDENT INFO ===
      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor(purple)
        .text("🎓 Student Information")
        .moveDown(0.5)
        .font("Helvetica")
        .fontSize(12)
        .fillColor(text)
        .text(`Name: ${student.studentName || "—"}`)
        .text(`Matric No: ${student.matricNo || "—"}`)
        .moveDown(1.5);

      // === GUEST INFO ===
      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor(purple)
        .text("🎟️ Guest Information")
        .moveDown(0.5)
        .font("Helvetica")
        .fontSize(12)
        .fillColor(text)
        .text(`Guest Name: ${guest.guestName || "—"}`)
        .moveDown(1.5);

      // === QR CODE GENERATION ===
      const qrUrl = `https://duqrinvitesevents.vercel.app/verify/${encodeURIComponent(
        token
      )}`;
      const qrDataUrl = await QRCode.toDataURL(qrUrl);
      const qrImage = qrDataUrl.replace(/^data:image\/png;base64,/, "");
      const qrBuffer = Buffer.from(qrImage, "base64");

      const qrX = (doc.page.width - 120) / 2;
      const qrY = doc.y;
      doc.image(qrBuffer, qrX, qrY, { fit: [120, 120] });

      // === QR FRAME ===
      doc
        .rect(qrX - 6, qrY - 6, 132, 132)
        .strokeColor(gold)
        .lineWidth(1.5)
        .stroke();

      doc.moveDown(8);
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(gray)
        .text("Scan this QR code for entry verification", { align: "center" })
        .moveDown(0.5)
        .font("Helvetica-Oblique")
        .fillColor(text)
        .text(`Token: ${token}`, { align: "center" });

      // === FOOTER ===
      doc.moveDown(2);
      doc
        .fontSize(10)
        .fillColor(gray)
        .text(
          `Generated on ${new Date().toLocaleString()} for Dominion University Convocation`,
          { align: "center" }
        );

      // === WATERMARK ===
      doc.rotate(-45, { origin: [100, 400] });
      doc
        .fontSize(60)
        .fillColor("#F3F4F6")
        .text("Dominion University", 80, 400, {
          opacity: 0.2,
        });
      doc.rotate(45, { origin: [100, 400] });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
