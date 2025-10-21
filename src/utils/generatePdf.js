// server/src/generateInvitePdf.js
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { v2 as cloudinary } from "cloudinary";
import { fb } from "../firebase.js";
import path from "path";
import os from "os";
import fs from "fs";

export async function generateInvitePdf(guest = {}, student = {}, token) {
  if (!token || typeof token !== "string") {
    throw new Error("Invalid token");
  }
  const cleanToken = token
    .toString()
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, "");
  const verifyUrl = `https://convocation-invites.vercel.app/verify/${cleanToken}`;

  // create QR buffer
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 300,
    margin: 0,
  });
  const qrBase64 = qrDataUrl.split(",")[1];
  const qrBuffer = Buffer.from(qrBase64, "base64");

  // create temporary PDF
  const tmpDir = path.join(os.tmpdir(), "invites");
  fs.mkdirSync(tmpDir, { recursive: true });
  const filename = `${cleanToken}.pdf`;
  const pdfPath = path.join(tmpDir, filename);

  const doc = new PDFDocument({ size: "A5", layout: "landscape", margin: 0 });
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  // Simple layout (your existing design can be used)
  const purple = "#4B0082";
  const gold = "#D4AF37";
  const white = "#FFFFFF";

  doc.rect(0, 0, doc.page.width, doc.page.height).fill(purple);
  doc.fontSize(20).fillColor(white).text("DOMINION UNIVERSITY", 40, 40);
  doc.fontSize(12).text("IBADAN", 40, 65);
  // circular emblem
  doc
    .circle(doc.page.width - 90, 80, 50)
    .lineWidth(4)
    .strokeColor(gold)
    .stroke();
  doc
    .fontSize(50)
    .fillColor(gold)
    .text("🦁", doc.page.width - 120, 45);

  // center seal
  const centerX = doc.page.width / 2;
  const centerY = doc.page.height / 2 - 10;
  doc.circle(centerX, centerY, 60).fill(gold);
  doc
    .fontSize(24)
    .fillColor(white)
    .text("3RD", centerX - 25, centerY - 10);
  doc.fontSize(12).text("CONVOCATION", centerX - 60, centerY + 15);
  doc.text("CEREMONY", centerX - 40, centerY + 30);

  // info box
  const boxX = 40,
    boxY = doc.page.height - 150,
    boxW = doc.page.width - 80,
    boxH = 100;
  doc.rect(boxX, boxY, boxW, boxH).fill(white);
  doc
    .fillColor(purple)
    .font("Helvetica-Bold")
    .fontSize(14)
    .text("INVITATION", boxX + boxW / 2 - 40, boxY + 10);

  doc
    .fillColor("black")
    .font("Helvetica")
    .fontSize(11)
    .text(
      `This is to invite ${guest.guestName || "Guest"}`,
      boxX + 20,
      boxY + 35
    );
  doc.text(
    `as a guest to the 3rd Convocation Ceremony of Dominion University, Ibadan.`,
    boxX + 20,
    boxY + 50
  );
  doc
    .fontSize(10)
    .fillColor("#333")
    .text(
      `Invited by ${student.studentName || "Student"} (${
        student.matricNo || "Matric No"
      })`,
      boxX + 20,
      boxY + 70
    );

  // add QR to PDF
  doc.image(qrBuffer, doc.page.width - 150, boxY - 20, { fit: [90, 90] });
  doc
    .fontSize(8)
    .fillColor(white)
    .text("Scan QR for Verification", doc.page.width - 150, boxY - 30);

  doc
    .fontSize(10)
    .fillColor(white)
    .text("Convocation of The Eagle Set", centerX - 90, doc.page.height - 30);
  doc.text("October 21–26, 2025", centerX - 60, doc.page.height - 45);

  doc.end();
  await new Promise((resolve) => stream.on("finish", resolve));

  // Upload PDF to Cloudinary - requires CLOUDINARY_* env vars
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const res = await cloudinary.uploader.upload(pdfPath, {
    folder: "convocation_invites",
    resource_type: "raw",
    public_id: cleanToken,
    overwrite: true,
  });

  const pdfUrl = res.secure_url;

  // Firestore document (collection: invites) with doc id = token
  const inviteData = {
    token: cleanToken,
    guestName: guest.guestName || "",
    guestPhone: guest.phone || "",
    studentName: student.studentName || "",
    matricNo: student.matricNo || "",
    pdfUrl,
    verifyUrl,
    status: "UNUSED",
    createdAt: fb.FieldValue.serverTimestamp(),
    usedAt: null,
    usedBy: null,
  };

  await fb.db.collection("invites").doc(cleanToken).set(inviteData);

  // cleanup
  try {
    fs.unlinkSync(pdfPath);
  } catch (e) {}

  return { ok: true, token: cleanToken, pdfUrl, verifyUrl };
}

// alias for backward compat (controllers that import buildInvitePDFBuffer)
export const buildInvitePDFBuffer = generateInvitePdf;
export default generateInvitePdf;
