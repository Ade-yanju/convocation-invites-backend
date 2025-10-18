// server/src/routes/verify.js

import express from "express";
import { prisma } from "../db.js";

const router = express.Router();

/* ============================================================
   ✅ JSON VERIFY ROUTES (used by React QR scanner or API calls)
   ============================================================ */

/**
 * @route POST /verify/json/check
 * @desc Check if QR token is valid and return guest info
 */
router.post("/json/check", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token)
      return res.status(400).json({ ok: false, error: "Missing token" });

    const guest = await prisma.guest.findUnique({
      where: { token },
      include: { student: true },
    });

    if (!guest)
      return res.status(404).json({ ok: false, error: "Invalid QR code" });

    return res.json({
      ok: true,
      guest: {
        guestName: guest.guestName,
        studentName: guest.student?.studentName,
        matricNo: guest.student?.matricNo,
        phone: guest.phone,
        status: guest.status,
        usedAt: guest.usedAt,
        usedBy: guest.usedBy,
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

    const guest = await prisma.guest.findUnique({ where: { token } });
    if (!guest)
      return res.status(404).json({ ok: false, error: "Invalid QR code" });

    if (guest.status === "USED")
      return res.status(409).json({ ok: false, error: "Already used" });

    const updated = await prisma.guest.update({
      where: { token },
      data: { status: "USED", usedAt: new Date(), usedBy: "scanner" },
    });

    return res.json({
      ok: true,
      message: "Guest admitted",
      guest: {
        guestName: updated.guestName,
        status: updated.status,
        usedAt: updated.usedAt,
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

    // 🔐 PIN check (set in your .env file, e.g. GATE_PIN=1234)
    if (pin !== process.env.GATE_PIN)
      return res.status(403).json({ ok: false, error: "Invalid PIN" });

    const guest = await prisma.guest.findUnique({ where: { token } });
    if (!guest)
      return res.status(404).json({ ok: false, error: "Invalid QR code" });

    if (guest.status === "USED")
      return res.status(409).json({ ok: false, error: "Already used" });

    const updated = await prisma.guest.update({
      where: { token },
      data: { status: "USED", usedAt: new Date(), usedBy: "gate-pin" },
    });

    return res.json({
      ok: true,
      message: "Guest admitted via gate PIN",
      guest: {
        guestName: updated.guestName,
        usedAt: updated.usedAt,
        status: updated.status,
      },
    });
  } catch (e) {
    console.error("verify-json/use-with-pin failed:", e);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

/* ============================================================
   ✅ HTML VERIFY ROUTE (when QR is scanned by smartphone camera)
   ============================================================ */

router.get("/:token", async (req, res) => {
  res.set("Cache-Control", "no-store");

  try {
    const token = String(req.params.token || "").trim();
    const mark = String(req.query.mark || "");
    if (!token)
      return sendHtml(res, 400, htmlPage("Invalid QR", "No token provided."));

    // Fetch guest and student details
    const guest = await prisma.guest.findUnique({
      where: { token },
      include: { student: true },
    });

    if (!guest)
      return sendHtml(
        res,
        404,
        htmlPage("Invalid QR", "This code is not recognized.")
      );

    // If already used and no remark
    if (guest.status === "USED" && mark !== "1") {
      return sendHtml(
        res,
        200,
        htmlPage(
          "Already Used ❌",
          detailsBlock(guest) +
            (guest.usedAt
              ? `<div style="margin-top:8px;color:#64748b;font-size:14px">
                   Used at: ${new Date(guest.usedAt).toLocaleString()}
                 </div>`
              : "")
        )
      );
    }

    // Mark as used if ?mark=1
    if (mark === "1") {
      const usedBy = (req.user && req.user.email) || "web-verify";

      // safer since token is unique
      const updated = await prisma.guest.update({
        where: { token },
        data: { status: "USED", usedAt: new Date(), usedBy },
      });

      const done = await prisma.guest.findUnique({
        where: { token },
        include: { student: true },
      });

      return sendHtml(
        res,
        200,
        htmlPage(
          "Admitted ✅",
          detailsBlock(done) +
            (done.usedAt
              ? `<div style="margin-top:8px;color:#64748b;font-size:14px">
                   Marked used at: ${new Date(done.usedAt).toLocaleString()}
                 </div>`
              : "")
        )
      );
    }

    // Otherwise, show "Valid Code" with Admit button
    return sendHtml(
      res,
      200,
      htmlPage(
        "Valid Code ✅",
        detailsBlock(guest) +
          `<div style="margin-top:14px;text-align:center">
             <a href="/verify/${guest.token}?mark=1"
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

function detailsBlock(guest) {
  if (!guest) return `<div>Record not found.</div>`;
  return `
    <div style="margin-top:10px;font-size:16px;line-height:1.6">
      <div><b>Guest:</b> ${escapeHtml(guest.guestName || "-")}</div>
      <div><b>Student:</b> ${escapeHtml(
        guest.student?.studentName || "-"
      )}</div>
      <div><b>Matric No:</b> ${escapeHtml(guest.student?.matricNo || "-")}</div>
      <div><b>Status:</b> ${
        guest.status === "USED"
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
