// server/src/utils/generatePdf.js
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export async function generateInvitePdfBuffer({
  event,
  student,
  guest,
  token,
}) {
  const html = `
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Invite</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 24px;
            color: #0b2e4e;
            background-color: #f9fafb;
          }
          .container {
            border: 2px solid #0b2e4e;
            border-radius: 12px;
            padding: 24px;
            width: 90%;
            margin: auto;
            background: white;
          }
          h1 {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            color: #0b2e4e;
          }
          p { font-size: 14px; line-height: 1.6; }
          .token {
            margin-top: 20px;
            text-align: center;
            font-weight: bold;
            font-size: 16px;
            color: #2563eb;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${escapeHtml(event.title || "Event Invitation")}</h1>
          <p><strong>Guest:</strong> ${escapeHtml(guest.guestName)}</p>
          <p><strong>Student:</strong> ${escapeHtml(
            student.studentName
          )} (${escapeHtml(student.matricNo)})</p>
          <p><strong>Date:</strong> ${escapeHtml(event.date || "TBA")}</p>
          <p><strong>Time:</strong> ${escapeHtml(event.time || "TBA")}</p>
          <p class="token">Your Access Token: ${escapeHtml(token)}</p>
        </div>
      </body>
    </html>
  `;

  // 🧠 Use the Chromium binary that works on Render/Vercel
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath:
      process.env.CHROME_EXECUTABLE_PATH || (await chromium.executablePath()),
    headless: chromium.headless,
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
  });
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
