// generateInvitePdf.js
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

/**
 * Generates a styled convocation invitation PDF
 * with a functional QR code for public verification.
 */
export async function generateInvitePdf(guest, student, token) {
  try {
    // --- 🔍 Step 1: Validate and sanitize token ---
    if (!token || typeof token !== "string") {
      throw new Error("Invalid token: token is missing or not a string");
    }

    // Remove any non-safe characters (in case of copy/paste or extra slash)
    const cleanToken = token
      .toString()
      .normalize("NFKD") // remove Unicode accents
      .replace(/[^\w-]/g, "") // allow only letters, numbers, underscore, hyphen
      .substring(0, 120) // keep safe length
      .trim();

    console.log("🪪 Generating QR for token:", cleanToken);

    // --- Step 2: Create PDF document ---
    const doc = new PDFDocument({
      size: "A5",
      layout: "landscape",
      margin: 0,
    });

    const outputPath = path.join(
      process.cwd(),
      `public/invites/${guest?.guestName || "invite"}.pdf`
    );
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // --- Step 3: Design colors ---
    const purple = "#4B0082";
    const gold = "#D4AF37";
    const white = "#FFFFFF";

    // --- Step 4: Background ---
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(purple);

    // --- Header ---
    doc
      .fontSize(22)
      .fillColor(white)
      .font("Helvetica-Bold")
      .text("DOMINION UNIVERSITY", 40, 40);
    doc.fontSize(16).text("IBADAN", 40, 65);
    doc
      .fontSize(10)
      .font("Helvetica")
      .text("...Raising Generational Leaders", 40, 85);

    // --- Lion emblem substitute ---
    doc
      .circle(doc.page.width - 90, 80, 50)
      .lineWidth(6)
      .strokeColor(gold)
      .stroke();
    doc
      .fontSize(50)
      .fillColor(gold)
      .text("🦁", doc.page.width - 120, 45);

    // --- Gold seal ---
    const centerX = doc.page.width / 2;
    const centerY = doc.page.height / 2 - 10;
    doc.circle(centerX, centerY, 60).fill(gold);
    doc
      .fontSize(24)
      .fillColor(white)
      .font("Helvetica-Bold")
      .text("3RD", centerX - 25, centerY - 10);
    doc
      .fontSize(12)
      .font("Helvetica")
      .text("CONVOCATION", centerX - 60, centerY + 15);
    doc.text("CEREMONY", centerX - 40, centerY + 30);

    // --- White info box ---
    const boxX = 40,
      boxY = doc.page.height - 150,
      boxW = doc.page.width - 80,
      boxH = 100;
    doc.rect(boxX, boxY, boxW, boxH).fill(white);

    doc.fillColor(purple).font("Helvetica-Bold").fontSize(14);
    doc.text("INVITATION", boxX + boxW / 2 - 40, boxY + 10);

    doc.fillColor("black").font("Helvetica").fontSize(11);
    doc.text(
      `This is to invite ${guest?.guestName || "Guest Name"}`,
      boxX + 20,
      boxY + 35
    );
    doc.text(
      `as a guest to the 3rd Convocation Ceremony of Dominion University, Ibadan.`,
      boxX + 20,
      boxY + 50
    );
    doc.fontSize(10).fillColor("#333");
    doc.text(
      `Invited by ${student?.studentName || "Student Name"} (${
        student?.matricNo || "Matric No"
      })`,
      boxX + 20,
      boxY + 70
    );

    // --- ✅ Step 5: Generate QR URL ---
    const verifyUrl = `https://convocation-invites.vercel.app/verify/${cleanToken}`;
    console.log("🔗 Verify URL embedded in QR:", verifyUrl);

    // --- Step 6: Generate QR Code image ---
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 120,
      margin: 0,
      color: { dark: "#000000", light: "#FFFFFF00" },
    });
    const qrImage = qrDataUrl.split(",")[1];
    const qrBuffer = Buffer.from(qrImage, "base64");

    // --- Add QR Code to PDF ---
    doc.image(qrBuffer, doc.page.width - 150, boxY - 20, { fit: [90, 90] });
    doc
      .fontSize(8)
      .fillColor(white)
      .text("Scan QR for Verification", doc.page.width - 150, boxY - 30);

    // --- Footer ---
    doc.fontSize(10).fillColor(white);
    doc.text(
      "Convocation of The Eagle Set",
      centerX - 90,
      doc.page.height - 30
    );
    doc.text("October 21–26, 2025", centerX - 60, doc.page.height - 45);

    // --- Finalize document ---
    doc.end();

    // --- Step 7: Wait for write stream to finish ---
    await new Promise((resolve) => stream.on("finish", resolve));

    console.log("✅ PDF generated successfully at:", outputPath);
    return outputPath;
  } catch (err) {
    console.error("❌ Error generating invite PDF:", err.message);
    throw err;
  }
}
