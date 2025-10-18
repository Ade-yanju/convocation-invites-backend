// server/src/routes/verify-view.js

import express from "express";
import fetch from "node-fetch"; // For server-side API calls
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

/**
 * @route GET /verify/view?t=<token>
 * @desc Public page that displays the status of a QR code (used for smartphone camera scans)
 */
router.get("/view", async (req, res) => {
  const token = req.query.t;
  if (!token)
    return res
      .status(400)
      .send(renderPage("Invalid QR Code", "No token found in the link."));

  try {
    // 🔍 Check token validity by calling your internal verify-json/check API
    const apiUrl = `${
      process.env.BASE_URL || "http://localhost:5000"
    }/verify/json/check`;
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const result = await response.json();

    // Handle invalid token
    if (!result.ok || !result.guest) {
      return res
        .status(404)
        .send(
          renderPage(
            "Invalid QR Code ❌",
            "This QR code is not recognized or expired."
          )
        );
    }

    const { guest } = result;

    // If already used
    if (guest.status === "USED") {
      return res.status(200).send(
        renderPage(
          "QR Code Already Used ❌",
          `
          <div style="font-size:16px;margin-top:8px">
            Guest: <b>${escapeHtml(guest.guestName)}</b><br/>
            Student: <b>${escapeHtml(guest.studentName || "-")}</b><br/>
            Matric No: <b>${escapeHtml(guest.matricNo || "-")}</b><br/>
            <span style="color:#b91c1c;font-weight:bold;">Status: USED</span><br/>
            <small style="color:#64748b;">Used At: ${
              guest.usedAt ? new Date(guest.usedAt).toLocaleString() : "N/A"
            }</small>
          </div>
        `
        )
      );
    }

    // ✅ Valid token — show Admit button
    return res.status(200).send(
      renderPage(
        "Valid QR Code ✅",
        `
        <div style="font-size:16px;margin-top:8px;line-height:1.6">
          Guest: <b>${escapeHtml(guest.guestName)}</b><br/>
          Student: <b>${escapeHtml(guest.studentName || "-")}</b><br/>
          Matric No: <b>${escapeHtml(guest.matricNo || "-")}</b><br/>
          <span style="color:#16a34a;font-weight:bold;">Status: UNUSED</span>
        </div>
        <div style="margin-top:18px;text-align:center">
          <button onclick="markUsed()" style="
            background:#0B2E4E;
            color:#fff;
            border:none;
            border-radius:8px;
            padding:12px 20px;
            font-size:16px;
            cursor:pointer;
            font-weight:bold;">
            ✅ Admit Guest
          </button>
        </div>

        <script>
          async function markUsed() {
            const pin = prompt('Enter gate PIN:');
            if (!pin) return alert('PIN required to admit guest.');

            const resp = await fetch('/verify/json/use-with-pin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: '${token}', pin })
            });
            const data = await resp.json();

            if (data.ok) {
              alert('Guest admitted successfully!');
              location.reload();
            } else {
              alert(data.error || 'Failed to mark as used.');
            }
          }
        </script>
      `
      )
    );
  } catch (err) {
    console.error("verify-view error:", err);
    return res
      .status(500)
      .send(
        renderPage(
          "Server Error",
          "Unable to verify QR code. Please try again."
        )
      );
  }
});

/* ============================================================
   Helper Functions
   ============================================================ */

function renderPage(title, content) {
  const primary = "#0B2E4E";
  const border = "#e5e7eb";
  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(title)}</title>
</head>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Arial,sans-serif;margin:0;background:#f8fafc;color:#0f172a">
  <div style="max-width:720px;margin:0 auto;padding:20px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <img src="/du-logo.png" alt="Dominion University" style="height:42px"/>
      <div style="font-weight:900;color:${primary};font-size:20px">
        Dominion University • Verification Portal
      </div>
    </div>

    <div style="border:1px solid ${border};background:#fff;border-radius:16px;box-shadow:0 1px 2px rgba(0,0,0,.04)">
      <div style="padding:14px 18px;border-bottom:1px solid ${border};font-weight:900;color:${primary}">
        ${escapeHtml(title)}
      </div>
      <div style="padding:18px">${content}</div>
    </div>

    <div style="margin-top:10px;font-size:12px;color:#64748b;text-align:center">
      Powered by Dominion Event System © ${new Date().getFullYear()}
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default router;
