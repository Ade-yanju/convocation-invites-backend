import express from "express";
import { fb } from "../firebase.js"; // ✅ Use fb, not db

const router = express.Router();

/* ============================================================
   ✅ JSON VERIFY ROUTES (used by React QR scanner or API calls)
   ============================================================ */

/**
 * @route POST /verify/json/check
 * @desc Check if QR token is valid and return invite info
 */
router.post("/json/check", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token)
      return res.status(400).json({ ok: false, error: "Missing token" });

    const docRef = fb.db.collection("invites").doc(token);
    const docSnap = await docRef.get();

    if (!docSnap.exists)
      return res.status(404).json({ ok: false, error: "Invalid QR code" });

    const invite = docSnap.data();

    return res.json({
      ok: true,
      invite: {
        guestName: invite.guestName,
        studentName: invite.studentName,
        matricNo: invite.matricNo,
        guestPhone: invite.guestPhone,
        status: invite.status,
        usedAt: invite.usedAt,
        usedBy: invite.usedBy,
      },
    });
  } catch (e) {
    console.error("verify-json/check failed:", e);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

/**
 * @route POST /verify/json/use
 * @desc Mark QR token as used (for app scanners)
 */
router.post("/json/use", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token)
      return res.status(400).json({ ok: false, error: "Missing token" });

    const ref = fb.db.collection("invites").doc(token);
    const snap = await ref.get();
    if (!snap.exists)
      return res.status(404).json({ ok: false, error: "Invalid QR code" });

    const invite = snap.data();

    if (invite.status === "USED")
      return res.status(409).json({ ok: false, error: "Already used" });

    const usedAt = new Date().toISOString();
    await ref.update({ status: "USED", usedAt, usedBy: "scanner" });

    return res.json({
      ok: true,
      message: "Guest admitted",
      invite: {
        guestName: invite.guestName,
        status: "USED",
        usedAt,
      },
    });
  } catch (e) {
    console.error("verify-json/use failed:", e);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

/**
 * @route POST /verify/json/use-with-pin
 * @desc Mark QR token as used but requires a gate PIN for verification
 */
router.post("/json/use-with-pin", async (req, res) => {
  try {
    const { token, pin } = req.body;
    if (!token || !pin)
      return res.status(400).json({ ok: false, error: "Missing token or PIN" });

    if (pin !== process.env.GATE_PIN)
      return res.status(403).json({ ok: false, error: "Invalid PIN" });

    const ref = fb.db.collection("invites").doc(token);
    const snap = await ref.get();
    if (!snap.exists)
      return res.status(404).json({ ok: false, error: "Invalid QR code" });

    const invite = snap.data();

    if (invite.status === "USED")
      return res.status(409).json({ ok: false, error: "Already used" });

    const usedAt = new Date().toISOString();
    await ref.update({ status: "USED", usedAt, usedBy: "gate-pin" });

    return res.json({
      ok: true,
      message: "Guest admitted via gate PIN",
      invite: {
        guestName: invite.guestName,
        usedAt,
        status: "USED",
      },
    });
  } catch (e) {
    console.error("verify-json/use-with-pin failed:", e);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

/* ============================================================
   ✅ HTML VERIFY ROUTE (for camera scanned links)
   ============================================================ */

router.get("/:token", async (req, res) => {
  res.set("Cache-Control", "no-store");

  try {
    const token = String(req.params.token || "").trim();
    const mark = String(req.query.mark || "");
    if (!token)
      return sendHtml(res, 400, htmlPage("Invalid QR", "No token provided."));

    const ref = fb.db.collection("invites").doc(token);
    const snap = await ref.get();

    if (!snap.exists)
      return sendHtml(
        res,
        404,
        htmlPage("Invalid QR", "This code is not recognized.")
      );

    const invite = snap.data();

    // If already used
    if (invite.status === "USED" && mark !== "1") {
      return sendHtml(
        res,
        200,
        htmlPage(
          "Already Used ❌",
          detailsBlock(invite) +
            `<div style="margin-top:8px;color:#64748b;font-size:14px">
              Used at: ${invite.usedAt || ""}
            </div>`
        )
      );
    }

    // Mark as used if ?mark=1
    if (mark === "1") {
      const usedAt = new Date().toISOString();
      await ref.update({ status: "USED", usedAt, usedBy: "web-verify" });
      const updatedInvite = { ...invite, status: "USED", usedAt };

      return sendHtml(
        res,
        200,
        htmlPage(
          "Admitted ✅",
          detailsBlock(updatedInvite) +
            `<div style="margin-top:8px;color:#64748b;font-size:14px">
              Marked used at: ${usedAt}
            </div>`
        )
      );
    }

    // Otherwise show valid
    return sendHtml(
      res,
      200,
      htmlPage(
        "Valid Code ✅",
        detailsBlock(invite) +
          `<div style="margin-top:14px;text-align:center">
             <a href="/verify/${invite.token}?mark=1"
                style="display:inline-block;padding:12px 20px;background:#0B2E4E;color:#fff;border-radius:10px;text-decoration:none;font-weight:800">
                Admit & Mark Used
             </a>
           </div>`
      )
    );
  } catch (e) {
    console.error("HTML verify failed:", e);
    sendHtml(res, 500, htmlPage("Server Error", "Please try again later."));
  }
});

/* ============================================================
   ✅ Helper Functions
   ============================================================ */

function detailsBlock(invite) {
  if (!invite) return `<div>Record not found.</div>`;
  return `
    <div style="margin-top:10px;font-size:16px;line-height:1.6">
      <div><b>Guest:</b> ${escapeHtml(invite.guestName || "-")}</div>
      <div><b>Student:</b> ${escapeHtml(invite.studentName || "-")}</div>
      <div><b>Matric No:</b> ${escapeHtml(invite.matricNo || "-")}</div>
      <div><b>Status:</b> ${
        invite.status === "USED"
          ? `<span style="color:#dc2626;font-weight:800">USED</span>`
          : `<span style="color:#16a34a;font-weight:800">UNUSED</span>`
      }</div>
    </div>
  `;
}

function htmlPage(title, body) {
  const primary = "#0B2E4E";
  const line = "#e5e7eb";

  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(title)}</title>
</head>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Arial,sans-serif;margin:0;background:#f8fafc;color:#0f172a">
  <div style="max-width:720px;margin:0 auto;padding:20px">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <img src="/du-logo.png" alt="Dominion University" style="height:40px"/>
      <div style="font-weight:900;color:${primary};font-size:20px">
        Dominion University • Verification
      </div>
    </div>
    <div style="border:1px solid ${line};background:#fff;border-radius:16px;box-shadow:0 1px 2px rgba(0,0,0,.04)">
      <div style="padding:14px 18px;border-bottom:1px solid ${line};font-weight:900;color:${primary}">
        ${escapeHtml(title)}
      </div>
      <div style="padding:18px">${body}</div>
    </div>
    <div style="margin-top:10px;font-size:12px;color:#64748b;text-align:center">
      Tip: Bookmark this page for quick gate admissions.
    </div>
  </div>
</body>
</html>`;
}

function sendHtml(res, code, html) {
  res.status(code).type("html").send(html);
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default router;
