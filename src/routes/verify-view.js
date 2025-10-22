import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

/**
 * @route GET /verify/view?t=<token>
 * @desc Public QR verification page
 */
router.get("/view", async (req, res) => {
  const token = req.query.t;
  if (!token)
    return res
      .status(400)
      .send(renderPage("Invalid QR Code", "No token found."));

  try {
    // ✅ Correct API endpoint
    const apiUrl = `${
      process.env.BASE_URL || "http://localhost:8080"
    }/verify-json/check`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const result = await response.json();
    const invite = result?.invite;

    if (!result.ok || !invite) {
      return res
        .status(404)
        .send(
          renderPage(
            "Invalid QR Code ❌",
            "This QR code is not recognized or expired."
          )
        );
    }

    if (invite.status === "USED") {
      return res.send(
        renderPage(
          "QR Code Already Used ❌",
          `
        <b>Guest:</b> ${invite.guestName}<br/>
        <b>Student:</b> ${invite.studentName}<br/>
        <b>Status:</b> <span style="color:#b91c1c;">USED</span>
      `
        )
      );
    }

    return res.send(
      renderPage(
        "Valid QR Code ✅",
        `
      <b>Guest:</b> ${invite.guestName}<br/>
      <b>Student:</b> ${invite.studentName}<br/>
      <b>Status:</b> <span style="color:#16a34a;">UNUSED</span><br/>
      <button onclick="markUsed()" style="margin-top:10px;padding:10px 20px;background:#0B2E4E;color:#fff;border:none;border-radius:8px;cursor:pointer;">✅ Admit Guest</button>
      <script>
        async function markUsed() {
          const pin = prompt('Enter gate PIN:');
          if (!pin) return alert('PIN required');
          const resp = await fetch('/verify-json/use-with-pin', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ token:'${token}', pin })
          });
          const data = await resp.json();
          if (data.ok) { alert('Guest admitted!'); location.reload(); }
          else alert(data.error || 'Error');
        }
      </script>
    `
      )
    );
  } catch (e) {
    console.error("verify-view error:", e);
    return res
      .status(500)
      .send(renderPage("Server Error", "Unable to verify QR code."));
  }
});

function renderPage(title, html) {
  return `
  <!doctype html><html><head><meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title}</title></head>
  <body style="font-family:sans-serif;padding:30px;background:#f8fafc;">
  <div style="max-width:700px;margin:auto;background:white;padding:20px;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.1)">
  <h2 style="color:#0B2E4E;">${title}</h2>
  <div style="font-size:16px;">${html}</div></div></body></html>`;
}

export default router;
