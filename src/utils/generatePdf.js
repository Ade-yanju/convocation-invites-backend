// server/src/utils/generatePdf.js
import PDFDocument from "pdfkit";
import QRCode from "qrcode";

/**
 * Generates an event invite PDF buffer (no Puppeteer required)
 * @param {Object} options
 * @param {Object} options.event - Event details (title, date, venue)
 * @param {Object} options.student - Student details (studentName, matricNo)
 * @param {Object} options.guest - Guest details (guestName)
 * @param {string} options.token - Unique verification token
 * @returns {Promise<Buffer>}
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

      // Listen for data events
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      // HEADER
      doc
        .fontSize(24)
        .fillColor("#0b2e4e")
        .text(event.title || "University Event Invitation", {
          align: "center",
        })
        .moveDown(1);

      doc
        .fontSize(14)
        .fillColor("#333")
        .text(`This serves as an official invitation for the event below:`, {
          align: "center",
        })
        .moveDown(2);

      // MAIN DETAILS
      doc
        .fontSize(16)
        .fillColor("#0b2e4e")
        .text("Event Details", { underline: true })
        .moveDown(0.5);

      doc
        .fontSize(13)
        .fillColor("#222")
        .text(`Event: ${event.title || "—"}`)
        .text(`Date: ${event.date || "—"}`)
        .text(`Time: ${event.time || "—"}`)
        .text(`Venue: ${event.venue || "—"}`)
        .moveDown(1.5);

      doc
        .fontSize(16)
        .fillColor("#0b2e4e")
        .text("Student Information", { underline: true })
        .moveDown(0.5);

      doc
        .fontSize(13)
        .fillColor("#222")
        .text(`Student Name: ${student.studentName || "—"}`)
        .text(`Matric No: ${student.matricNo || "—"}`)
        .moveDown(1.5);

      doc
        .fontSize(16)
        .fillColor("#0b2e4e")
        .text("Guest Information", { underline: true })
        .moveDown(0.5);

      doc
        .fontSize(13)
        .fillColor("#222")
        .text(`Guest Name: ${guest.guestName || "—"}`)
        .moveDown(1.5);

      // TOKEN
      doc
        .fontSize(13)
        .fillColor("#444")
        .text(`Admission Token: ${token}`, { align: "left" })
        .moveDown(1.5);

      // Generate QR Code
      const qrData = `https://duqrinvitesevents.vercel.app/verify/${token}`;
      const qrDataUrl = await QRCode.toDataURL(qrData);
      const qrImage = qrDataUrl.replace(/^data:image\/png;base64,/, "");

      // Add QR to PDF
      const qrImgBuffer = Buffer.from(qrImage, "base64");
      doc.image(qrImgBuffer, {
        align: "center",
        fit: [150, 150],
        valign: "center",
      });

      doc.moveDown(1.5);
      doc
        .fontSize(12)
        .fillColor("#555")
        .text(
          "⚠️ This QR code admits one guest only. Once scanned, it becomes invalid.",
          {
            align: "center",
          }
        );

      // FOOTER
      doc.moveDown(2);
      doc
        .fontSize(10)
        .fillColor("#999")
        .text(
          `Generated for ${
            event.title || "University Event"
          } • ${new Date().toLocaleString()}`,
          { align: "center" }
        );

      // Finalize PDF
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
