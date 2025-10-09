// server/src/pdfWithQr.js
import PDFDocument from "pdfkit";
import qrcode from "qrcode";

/**
 * generatePdfBufferForInvite(inv)
 * inv = { studentName, matricNo, guestName, phone, event: { title, date, time, venue, notes }, token }
 * returns Buffer (PDF)
 */
export async function generatePdfBufferForInvite(inv = {}) {
  const token = String(inv.token || "").trim();
  const qrPayload = JSON.stringify({ t: token });

  // Create QR data URL PNG
  const qrDataUrl = await qrcode.toDataURL(qrPayload, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: 400,
  });
  const base64 = qrDataUrl.split(",")[1];
  const qrBuffer = Buffer.from(base64, "base64");

  // Create PDFKit doc and collect buffers
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const bufs = [];
  doc.on("data", (d) => bufs.push(d));
  const finished = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(bufs)));
    doc.on("error", (err) => reject(err));
  });

  // Header
  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .text(inv.event?.title || "Event", { align: "center" });
  doc.moveDown(0.5);

  // Guest / Student block
  doc
    .fontSize(12)
    .font("Helvetica")
    .text(`Guest: ${inv.guestName || ""}`);
  doc.text(`Student: ${inv.studentName || ""}`);
  if (inv.matricNo) doc.text(`Matric No: ${inv.matricNo}`);
  if (inv.phone) doc.text(`Phone: ${inv.phone}`);
  doc.moveDown(0.6);

  doc.text(`Date: ${inv.event?.date || ""}   Time: ${inv.event?.time || ""}`);
  doc.moveDown(0.3);
  doc.text(`Venue: ${inv.event?.venue || ""}`);
  doc.moveDown(0.5);

  if (inv.event?.notes) {
    doc.fontSize(10).fillColor("gray").text(inv.event.notes, { width: 480 });
    doc.fillColor("black");
  }

  // Place QR centered
  doc.moveDown(1.5);
  const qrSize = 220;
  const pageWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const xCenter = doc.page.margins.left + (pageWidth - qrSize) / 2;
  doc.image(qrBuffer, xCenter, doc.y, { width: qrSize });

  doc.moveDown(1.1);
  doc
    .fontSize(10)
    .fillColor("gray")
    .text("Non-transferable • Single entry • Have ID ready", {
      align: "center",
    });
  doc.end();

  return finished;
}
