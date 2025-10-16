// server/src/utils/generatePdf.js
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

/**
 * Generates a beautiful Dominion University event invite PDF
 */
export async function generateInvitePdfBuffer({
  event = {},
  student = {},
  guest = {},
  token = "",
}) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      // === COLORS ===
      const dominionPurple = "#3a0ca3";
      const gold = "#d4af37";
      const textDark = "#111";
      const grey = "#555";

      // === LOGO ===
      const logoPath = path.resolve("server/src/assets/du_logo.png");
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 60, 20, { width: 70 });
      }

      // === HEADER ===
      doc.rect(0, 0, doc.page.width, 80).fill(dominionPurple);

      doc
        .fillColor("white")
        .fontSize(24)
        .font("Helvetica-Bold")
        .text("Dominion University Ibadan", 0, 25, { align: "center" });

      doc
        .fontSize(14)
        .font("Helvetica")
        .fillColor("white")
        .text("3rd Convocation Ceremony — The Eagle Set", 0, 50, {
          align: "center",
        });

      // === TITLE ===
      doc.moveDown(4);
      doc
        .fontSize(22)
        .fillColor(dominionPurple)
        .font("Helvetica-Bold")
        .text("Official Invitation", { align: "center" });

      doc
        .fontSize(12)
        .fillColor(grey)
        .text("This serves as an official invitation for the event below.", {
          align: "center",
        })
        .moveDown(2);

      // === EVENT DETAILS BOX ===
      const boxTop = doc.y;
      doc
        .roundedRect(50, boxTop, doc.page.width - 100, 110, 10)
        .strokeColor(gold)
        .lineWidth(1.5)
        .stroke();

      doc.moveDown(1);
      doc
        .fontSize(15)
        .fillColor(dominionPurple)
        .font("Helvetica-Bold")
        .text("Event Details", 70, boxTop + 10)
        .moveDown(0.4);

      doc
        .fontSize(12)
        .fillColor(textDark)
        .font("Helvetica")
        .text(`Event: ${event.title || "Dominion University Convocation 2025"}`)
        .text(`Date: ${event.date || "2025-10-25"}`)
        .text(`Time: ${event.time || "16:57"}`)
        .text(`Venue: ${event.venue || "Chapel"}`)
        .moveDown(2);

      // === STUDENT INFO ===
      doc
        .fontSize(15)
        .fillColor(dominionPurple)
        .font("Helvetica-Bold")
        .text("Student Information", { underline: true })
        .moveDown(0.5);

      doc
        .fontSize(12)
        .fillColor(textDark)
        .text(`Student Name: ${student.studentName || "—"}`)
        .text(`Matric No: ${student.matricNo || "—"}`)
        .moveDown(1.5);

      // === GUEST INFO ===
      doc
        .fontSize(15)
        .fillColor(dominionPurple)
        .font("Helvetica-Bold")
        .text("Guest Information", { underline: true })
        .moveDown(0.5);

      doc
        .fontSize(12)
        .fillColor(textDark)
        .text(`Guest Name: ${guest.guestName || "—"}`)
        .moveDown(2);

      // === QR CODE SECTION ===
      const qrData = `https://duqrinvitesevents.vercel.app/publicverify/${encodeURIComponent(
        token
      )}`;

      const qrDataUrl = await QRCode.toDataURL(qrData);
      const qrImage = qrDataUrl.replace(/^data:image\/png;base64,/, "");
      const qrImgBuffer = Buffer.from(qrImage, "base64");

      const qrX = (doc.page.width - 150) / 2;
      doc.image(qrImgBuffer, qrX, doc.y, { fit: [150, 150] });
      doc.moveDown(1.5);

      doc
        .fontSize(10)
        .fillColor(grey)
        .text(
          "⚠️ This QR code admits one guest only. Once scanned, it becomes invalid.",
          { align: "center" }
        )
        .moveDown(0.5);

      doc
        .fontSize(11)
        .fillColor(textDark)
        .text(`Admission Token: ${token}`, { align: "center" })
        .moveDown(2);

      // === FOOTER ===
      doc
        .fontSize(10)
        .fillColor(grey)
        .text(
          `Generated for Dominion University Convocation • ${new Date().toLocaleString()}`,
          { align: "center" }
        );

      // === WATERMARK ===
      doc.rotate(-45, { origin: [100, 400] });
      doc
        .fontSize(60)
        .fillColor("#f2f2f2")
        .text("Dominion University", 80, 400, { opacity: 0.3 });
      doc.rotate(45, { origin: [100, 400] });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
