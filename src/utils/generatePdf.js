// server/src/utils/generatePdf.js
/**
 * Minimal example that returns a PDF buffer.
 * Replace this with your real PDF generation (puppeteer or pdfkit).
 *
 * For demo, we'll return a tiny PDF file header (NOT a valid full PDF)
 * — but in real usage use a proper PDF builder.
 */

import puppeteer from "puppeteer";

export async function generateInvitePdfBuffer({
  event,
  student,
  guest,
  token,
}) {
  // Using puppeteer to render HTML to PDF is typical:
  const html = `
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Invite</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0b2e4e }
          .box { border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px }
          .title { font-weight: 800; font-size: 20px; color: #0b2e4e }
        </style>
      </head>
      <body>
        <div class="box">
          <div class="title">${escapeHtml(event.title || "")}</div>
          <p><strong>Guest:</strong> ${escapeHtml(guest.guestName)}</p>
          <p><strong>Student:</strong> ${escapeHtml(
            student.studentName
          )} (${escapeHtml(student.matricNo)})</p>
          <p><strong>Date:</strong> ${escapeHtml(
            event.date || ""
          )} <strong>Time:</strong> ${escapeHtml(event.time || "")}</p>
          <p>Token: ${escapeHtml(token)}</p>
        </div>
      </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
  await browser.close();
  return pdfBuffer;
}

function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
