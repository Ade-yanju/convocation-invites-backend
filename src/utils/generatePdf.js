// server/src/generateInvitePdf.js
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { v2 as cloudinary } from "cloudinary";
import { fb } from "./firebase.js";
import path from "path";
import os from "os";
import fs from "fs";

/**
 * Generates an invitation PDF, uploads it to Cloudinary,
 * and stores metadata in Firestore.
 */
export async function generateInvitePdf(guest, student, token) {
  try {
    if (!token || typeof token !== "string") {
      throw new Error("Invalid token: token is missing or not a string");
    }

    const cleanToken = token
      .toString()
      .normalize("NFKD")
      .replace(/[^\w-]/g, "")
      .substring(0, 120)
      .trim();

    console.log("🪪 Generating QR for token:", cleanToken);

    // === Generate Verify URL ===
    const verifyUrl = `https://convocation-invites.vercel.app/verify/${cleanToken}`;

    // === Generate QR Code ===
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 120,
      margin: 0,
      color: { dark: "#000000", light: "#FFFFFF00" },
    });
    const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");

    // === Create PDF Locally ===
    const tempDir = path.join(os.tmpdir(), "invites");
    fs.mkdirSync(tempDir, { recursive: true });
    const filename = `${cleanToken}.pdf`;
    const pdfPath = path.join(tempDir, filename);

    const doc = new PDFDocument({ size: "A5", layout: "landscape", margin: 0 });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    const purple = "#4B0082";
    const gold = "#D4AF37";
    const white = "#FFFFFF";

    doc.rect(0, 0, doc.page.width, doc.page.height).fill(purple);
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

    // Circular logo
    doc
      .circle(doc.page.width - 90, 80, 50)
      .lineWidth(6)
      .strokeColor(gold)
      .stroke();
    doc
      .fontSize(50)
      .fillColor(gold)
      .text("🦁", doc.page.width - 120, 45);

    // Title Circle
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

    // Invitation Box
    const boxX = 40,
      boxY = doc.page.height - 150,
      boxW = doc.page.width - 80,
      boxH = 100;
    doc.rect(boxX, boxY, boxW, boxH).fill(white);

    doc.fillColor(purple).font("Helvetica-Bold").fontSize(14);
    doc.text("INVITATION", boxX + boxW / 2 - 40, boxY + 10);

    doc.fillColor("black").font("Helvetica").fontSize(11);
    doc.text(
      `This is to invite ${guest?.guestName || "Guest"}`,
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
      `Invited by ${student?.studentName || "Student"} (${
        student?.matricNo || "Matric No"
      })`,
      boxX + 20,
      boxY + 70
    );

    // QR code
    doc.image(qrBuffer, doc.page.width - 150, boxY - 20, { fit: [90, 90] });
    doc
      .fontSize(8)
      .fillColor(white)
      .text("Scan QR for Verification", doc.page.width - 150, boxY - 30);

    doc.fontSize(10).fillColor(white);
    doc.text(
      "Convocation of The Eagle Set",
      centerX - 90,
      doc.page.height - 30
    );
    doc.text("October 21–26, 2025", centerX - 60, doc.page.height - 45);

    doc.end();
    await new Promise((resolve) => stream.on("finish", resolve));

    console.log("✅ PDF created locally:", pdfPath);

    // === Upload to Cloudinary ===
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const uploadResponse = await cloudinary.uploader.upload(pdfPath, {
      folder: "convocation_invites",
      resource_type: "raw",
      public_id: cleanToken,
      overwrite: true,
    });

    const pdfUrl = uploadResponse.secure_url;
    console.log("📤 Uploaded to Cloudinary:", pdfUrl);

    // === Save Metadata to Firestore ===
    const inviteData = {
      token: cleanToken,
      guestName: guest?.guestName || "",
      guestPhone: guest?.phone || "",
      studentName: student?.studentName || "",
      matricNo: student?.matricNo || "",
      pdfUrl,
      verifyUrl,
      status: "UNUSED",
      createdAt: fb.FieldValue.serverTimestamp(),
      usedAt: null,
      usedBy: null,
    };

    await fb.db.collection("invites").doc(cleanToken).set(inviteData);
    console.log(`📦 Firestore document saved for token ${cleanToken}`);

    // cleanup local file
    fs.unlinkSync(pdfPath);

    return { ok: true, pdfUrl, verifyUrl };
  } catch (err) {
    console.error("❌ Error generating invite PDF:", err);
    return { ok: false, error: err.message };
  }
}
