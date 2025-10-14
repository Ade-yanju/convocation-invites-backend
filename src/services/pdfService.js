// import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
// import QRCode from "qrcode";
// import fs from "fs/promises";
// import path from "path";
// import { v2 as cloudinary } from "cloudinary";
// import { PassThrough } from "stream";
// import { config } from "../config.js";

// if (!config.CLOUDINARY?.CLOUD_NAME) {
//   console.warn(
//     "Cloudinary not configured; saveBufferToCloudinary will fail if called."
//   );
// }

// cloudinary.config({
//   cloud_name: config.CLOUDINARY?.CLOUD_NAME,
//   api_key: config.CLOUDINARY?.API_KEY,
//   api_secret: config.CLOUDINARY?.API_SECRET,
//   secure: true,
// });

// export async function buildInvitePDFBuffer({
//   student = { matricNo: "", studentName: "" },
//   guest = { guestName: "" },
//   meta = {},
//   token = "",
// }) {
//   const pdf = await PDFDocument.create();
//   const page = pdf.addPage([842, 595]); // landscape

//   const width = page.getWidth();
//   const height = page.getHeight();

//   const navy = rgb(11 / 255, 46 / 255, 78 / 255);
//   const gold = rgb(212 / 255, 175 / 255, 55 / 255);
//   const deep = rgb(0.14, 0.16, 0.21);
//   const textCol = rgb(0.06, 0.08, 0.14);
//   const muted = rgb(0.45, 0.49, 0.55);

//   const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
//   const font = await pdf.embedFont(StandardFonts.Helvetica);
//   const mono = await pdf.embedFont(StandardFonts.Courier);

//   // optional background
//   try {
//     const bgPath = path.join(process.cwd(), "server", "assets", "grad-bg.png");
//     const bgStat = await fs.stat(bgPath).catch(() => null);
//     if (bgStat) {
//       const bgBytes = await fs.readFile(bgPath);
//       const bgImg = await pdf.embedPng(bgBytes);
//       page.drawImage(bgImg, { x: 0, y: 0, width, height, opacity: 0.12 });
//     }
//   } catch {}

//   // card
//   const M = 28;
//   const cardX = M;
//   const cardY = M;
//   const cardW = width - M * 2;
//   const cardH = height - M * 2;

//   page.drawRectangle({
//     x: cardX,
//     y: cardY,
//     width: cardW,
//     height: cardH,
//     color: rgb(1, 1, 1),
//     borderColor: rgb(0.92, 0.92, 0.94),
//     borderWidth: 0.8,
//   });

//   // header band
//   const bandH = 74;
//   page.drawRectangle({
//     x: cardX,
//     y: cardY + cardH - bandH,
//     width: cardW,
//     height: bandH,
//     color: navy,
//   });

//   // logo
//   try {
//     const logoPath = path.join(
//       process.cwd(),
//       "server",
//       "assets",
//       "du-logo.png"
//     );
//     const logoStat = await fs.stat(logoPath).catch(() => null);
//     if (logoStat) {
//       const logoBytes = await fs.readFile(logoPath);
//       let logoImage;
//       const header = logoBytes.slice(0, 8);
//       if (header[0] === 0x89 && header[1] === 0x50) {
//         logoImage = await pdf.embedPng(logoBytes);
//       } else {
//         logoImage = await pdf.embedJpg(logoBytes);
//       }
//       const logoH = 48;
//       const logoW = (logoImage.width / logoImage.height) * logoH;
//       page.drawImage(logoImage, {
//         x: cardX + 20,
//         y: cardY + cardH - bandH + (bandH - logoH) / 2,
//         width: logoW,
//         height: logoH,
//       });
//     }
//   } catch {}

//   // header text
//   page.drawText(
//     meta.title || config.EVENT.title || "Dominion University Convocation 2025",
//     {
//       x: cardX + 120,
//       y: cardY + cardH - 32,
//       size: 18,
//       font: fontBold,
//       color: rgb(1, 1, 1),
//     }
//   );
//   page.drawText("Official Guest Invite", {
//     x: cardX + 120,
//     y: cardY + cardH - 52,
//     size: 11,
//     font,
//     color: rgb(1, 1, 1),
//   });

//   // left content
//   const leftX = cardX + 28;
//   let y = cardY + cardH - bandH - 30;
//   page.drawText(guest.guestName || "Guest Name", {
//     x: leftX,
//     y,
//     size: 28,
//     font: fontBold,
//     color: textCol,
//   });
//   y -= 36;
//   page.drawText(`For: ${student.studentName || "-"}`, {
//     x: leftX,
//     y,
//     size: 16,
//     font: fontBold,
//     color: deep,
//   });
//   y -= 22;
//   page.drawText(`Matric No: ${student.matricNo || "-"}`, {
//     x: leftX,
//     y,
//     size: 12,
//     font,
//     color: muted,
//   });
//   y -= 26;

//   // event info box
//   const infoBoxW = 420;
//   const infoBoxH = 92;
//   page.drawRectangle({
//     x: leftX,
//     y: y - infoBoxH + 8,
//     width: infoBoxW,
//     height: infoBoxH,
//     color: rgb(0.997, 0.997, 1),
//     borderColor: rgb(0.94, 0.94, 0.96),
//     borderWidth: 0.6,
//   });
//   const infoY = y - 14;
//   page.drawText("DATE:", {
//     x: leftX + 12,
//     y: infoY,
//     size: 11,
//     font: fontBold,
//     color: deep,
//   });
//   page.drawText(meta.date || config.EVENT.date || "-", {
//     x: leftX + 80,
//     y: infoY,
//     size: 11,
//     font,
//     color: deep,
//   });
//   page.drawText("TIME:", {
//     x: leftX + 12,
//     y: infoY - 20,
//     size: 11,
//     font: fontBold,
//     color: deep,
//   });
//   page.drawText(meta.time || config.EVENT.time || "-", {
//     x: leftX + 80,
//     y: infoY - 20,
//     size: 11,
//     font,
//     color: deep,
//   });
//   page.drawText("VENUE:", {
//     x: leftX + 12,
//     y: infoY - 40,
//     size: 11,
//     font: fontBold,
//     color: deep,
//   });
//   page.drawText(meta.venue || config.EVENT.venue || "-", {
//     x: leftX + 80,
//     y: infoY - 40,
//     size: 10.5,
//     font,
//     color: deep,
//     maxWidth: infoBoxW - 96,
//   });

//   y = y - infoBoxH - 6;
//   page.drawText(
//     meta.notes ||
//       config.EVENT.notes ||
//       "Please arrive 45 minutes early with a valid ID.",
//     { x: leftX, y: y - 8, size: 9.5, font, color: muted, maxWidth: infoBoxW }
//   );

//   // right: QR
//   const qrBox = 220;
//   const qrX = cardX + cardW - qrBox - 36;
//   const qrY = cardY + 110;

//   const baseUrl =
//     (meta && meta.baseUrl) || config.BASE_URL || "http://localhost:8080";
//   const verifyUrl = `${String(baseUrl).replace(
//     /\/$/,
//     ""
//   )}/verify/${encodeURIComponent(String(token))}`;
//   const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
//     width: qrBox,
//     margin: 1,
//     errorCorrectionLevel: "M",
//   });
//   const qrImage = await pdf.embedPng(qrDataUrl);

//   page.drawRectangle({
//     x: qrX - 10,
//     y: qrY - 10,
//     width: qrBox + 20,
//     height: qrBox + 20,
//     color: rgb(0.99, 0.99, 1),
//     borderColor: rgb(0.94, 0.94, 0.96),
//     borderWidth: 0.8,
//   });
//   page.drawImage(qrImage, { x: qrX, y: qrY, width: qrBox, height: qrBox });

//   page.drawText(`Token: ${String(token).slice(0, 12)}…`, {
//     x: qrX,
//     y: qrY - 20,
//     size: 10,
//     font: mono,
//     color: muted,
//   });

//   // gold badge
//   page.drawRectangle({
//     x: qrX,
//     y: qrY + qrBox + 12,
//     width: 160,
//     height: 36,
//     color: gold,
//   });
//   page.drawText("SINGLE ENTRY • NON-TRANSFERABLE", {
//     x: qrX + 10,
//     y: qrY + qrBox + 20,
//     size: 10,
//     font: fontBold,
//     color: navy,
//   });

//   // footer
//   page.drawText(
//     "Please present this QR and a valid ID at the entrance. Keep this invite private.",
//     {
//       x: leftX,
//       y: cardY + 22,
//       size: 9,
//       font,
//       color: muted,
//       maxWidth: cardW - (qrBox + 120),
//     }
//   );

//   const bytes = await pdf.save();
//   return Buffer.from(bytes);
// }

// export async function saveBufferToCloudinary(buf, { guest, student }) {
//   const safe = (s) =>
//     String(s || "")
//       .replace(/[^a-z0-9\-]+/gi, "_")
//       .replace(/_+/g, "_");
//   const base = `Invite_${safe(student.matricNo)}_${safe(guest.guestName)}`;
//   const folder = config.CLOUDINARY.FOLDER || "invites";

//   const upload = () =>
//     new Promise((resolve, reject) => {
//       const stream = cloudinary.uploader.upload_stream(
//         {
//           folder,
//           public_id: base,
//           resource_type: "raw",
//           overwrite: true,
//           use_filename: false,
//           unique_filename: false,
//         },
//         (err, result) => (err ? reject(err) : resolve(result))
//       );
//       const pass = new PassThrough();
//       pass.end(buf);
//       pass.pipe(stream);
//     });

//   const result = await upload();
//   const downloadUrl = cloudinary.url(result.public_id, {
//     resource_type: "raw",
//     flags: `attachment:${base}.pdf`,
//     secure: true,
//   });

//   return {
//     cloudinaryPublicId: result.public_id,
//     publicUrl: result.secure_url,
//     downloadUrl,
//     filename: `${base}.pdf`,
//   };
// }

// export default { buildInvitePDFBuffer, saveBufferToCloudinary };

// server/src/services/pdfService.js
import { generateInvitePdfBuffer } from "../utils/generatePdf.js";
import { v2 as cloudinary } from "cloudinary";
import { PassThrough } from "stream";
import { config } from "../config.js";

// Ensure Cloudinary configured
if (!config.CLOUDINARY?.CLOUD_NAME) {
  console.warn("⚠️ Cloudinary not configured properly.");
}

cloudinary.config({
  cloud_name: config.CLOUDINARY?.CLOUD_NAME,
  api_key: config.CLOUDINARY?.API_KEY,
  api_secret: config.CLOUDINARY?.API_SECRET,
  secure: true,
});

// 🧠 Step 1: Build the invite PDF (calls generateInvitePdfBuffer)
export async function buildInvitePDFBuffer({
  student,
  guest,
  meta,
  token,
  event,
}) {
  const pdfBuffer = await generateInvitePdfBuffer({
    student,
    guest,
    meta,
    token,
    event,
  });
  return pdfBuffer;
}

// 🧠 Step 2: Upload the generated PDF buffer to Cloudinary
export async function saveBufferToStorage(buffer, filename) {
  const folder = config.CLOUDINARY?.FOLDER || "invites";

  const upload = () =>
    new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: filename.replace(/\.pdf$/, ""),
          resource_type: "raw",
          overwrite: true,
          use_filename: false,
          unique_filename: false,
        },
        (err, result) => (err ? reject(err) : resolve(result))
      );
      const pass = new PassThrough();
      pass.end(buffer);
      pass.pipe(stream);
    });

  const result = await upload();

  const downloadUrl = cloudinary.url(result.public_id, {
    resource_type: "raw",
    flags: `attachment:${filename}`,
    secure: true,
  });

  return {
    storage: "cloudinary",
    storageId: result.public_id,
    filename,
    publicUrl: result.secure_url,
    downloadUrl,
  };
}

export default { buildInvitePDFBuffer, saveBufferToStorage };
