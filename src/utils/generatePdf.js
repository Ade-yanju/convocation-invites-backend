// server/src/utils/generatePdf.js
import puppeteer from "puppeteer";
import QRCode from "qrcode";

/**
 * Generates a full invite PDF buffer with QR code and event details.
 */
export async function generateInvitePdfBuffer({
  event = {},
  student = {},
  guest = {},
  token = "",
}) {
  // 1️⃣ Build QR Code first
  const qrDataUrl = await QRCode.toDataURL(
    `https://duqrinvitesevents.vercel.app/verify/${token}`
  );

  // 2️⃣ Create HTML content
  const html = `
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Invite</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0b2e4e; background: #fafafa; }
          .box { border: 1px solid #e5e7eb; padding: 24px; border-radius: 8px; background: #fff; }
          .title { font-weight: 800; font-size: 22px; color: #0b2e4e; }
          .qr img { border: 3px solid #0b2e4e; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="box">
          <div class="title">${event.title || "Event Invite"}</div>
          <p><strong>Guest:</strong> ${guest.guestName}</p>
          <p><strong>Student:</strong> ${student.studentName} (${
    student.matricNo
  })</p>
          <p><strong>Date:</strong> ${
            event.date || "-"
          } <strong>Time:</strong> ${event.time || "-"}</p>
          <p><strong>Venue:</strong> ${event.venue || "-"}</p>
          <p><strong>Token:</strong> ${token}</p>
          <div class="qr" style="margin-top: 16px;">
            <img src="${qrDataUrl}" width="180" height="180" />
          </div>
        </div>
      </body>
    </html>
  `;

  // 3️⃣ Use Puppeteer to render and wait until QR is loaded
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.waitForSelector("img", { visible: true });
  await page.waitForTimeout(500); // wait extra for QR load

  const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
  await browser.close();
  return pdfBuffer;
}
