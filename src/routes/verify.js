// server/src/routes/verify.js
import express from "express";
import { prisma } from "../db.js";

const router = express.Router();

router.get("/:token", async (req, res) => {
  // avoid caching of admit result pages
  res.set("Cache-Control", "no-store");

  try {
    const token = String(req.params.token || "").trim();
    const mark = String(req.query.mark || "");
    if (!token) {
      return sendHtml(res, 400, htmlPage("Invalid QR", "No token provided."));
    }

    // Fetch guest (to show names even if already used)
    const guest = await prisma.guest.findUnique({
      where: { token },
      include: { student: true },
    });

    if (!guest) {
      return sendHtml(
        res,
        404,
        htmlPage("Invalid QR", "This code is not recognized.")
      );
    }

    // If already used and no (re)mark, show used info
    if (guest.status === "USED" && mark !== "1") {
      return sendHtml(
        res,
        200,
        htmlPage(
          "Already Used",
          detailsBlock(guest) +
            (guest.usedAt
              ? `<div style="margin-top:8px;color:#64748b;font-size:14px">Used at: ${new Date(
                  guest.usedAt
                ).toLocaleString()}</div>`
              : "")
        )
      );
    }

    // If ?mark=1 then try to flip UNUSED -> USED atomically
    if (mark === "1") {
      // Attempt atomic admit
      const usedBy = (req.user && req.user.email) || "web-verify";
      const updated = await prisma.guest.updateMany({
        where: { token, status: "UNUSED" },
        data: { status: "USED", usedAt: new Date(), usedBy },
      });

      if (updated.count === 0) {
        // Either already USED (race) or status not UNUSED
        const refreshed = await prisma.guest.findUnique({
          where: { token },
          include: { student: true },
        });
        const wasUsed =
          refreshed && refreshed.status === "USED"
            ? `<div style="margin-top:8px;color:#64748b;font-size:14px">Already used${
                refreshed.usedAt
                  ? ` at ${new Date(refreshed.usedAt).toLocaleString()}`
                  : ""
              }.</div>`
            : "";
        return sendHtml(
          res,
          200,
          htmlPage("Already Used", detailsBlock(refreshed || guest) + wasUsed)
        );
      }

      // Success; fetch to show final state
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
              ? `<div style="margin-top:8px;color:#64748b;font-size:14px">Marked used at: ${new Date(
                  done.usedAt
                ).toLocaleString()}</div>`
              : "")
        )
      );
    }

    // Otherwise show "Valid Code" with an Admit button
    return sendHtml(
      res,
      200,
      htmlPage(
        "Valid Code",
        detailsBlock(guest) +
          `<div style="margin-top:14px">
             <a href="/verify/${guest.token}?mark=1"
                style="display:inline-block;padding:12px 16px;background:#0B2E4E;color:#fff;border-radius:10px;text-decoration:none;font-weight:800">
                Admit & Mark Used
             </a>
           </div>`
      )
    );
  } catch (e) {
    console.error(e);
    return sendHtml(res, 500, htmlPage("Server error", "Please try again."));
  }
});

export default router;

// --------- helpers ---------

function detailsBlock(guest) {
  // Defensive if guest vanished between reads
  if (!guest) return `<div>Record not found.</div>`;
  return `
    <div style="margin-top:10px;font-size:16px;line-height:1.5">
      <div><b>Guest:</b> ${escapeHtml(guest.guestName || "-")}</div>
      <div><b>Student:</b> ${escapeHtml(
        guest.student?.studentName || "-"
      )}</div>
      <div><b>Matric:</b> ${escapeHtml(guest.student?.matricNo || "-")}</div>
      <div><b>Status:</b> ${
        guest.status === "USED"
          ? `<span style="color:#dc2626;font-weight:800">USED</span>`
          : `<span style="color:#16a34a;font-weight:800">UNUSED</span>`
      }</div>
    </div>
  `;
}

function htmlPage(title, body) {
  // Dominion palette
  const primary = "#0B2E4E"; // navy
  const accent = "#D4AF37"; // gold
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
      <div style="font-weight:900;color:${primary};font-size:20px">Dominion University • Verification</div>
    </div>
    <div style="border:1px solid ${line};background:#fff;border-radius:16px;box-shadow:0 1px 2px rgba(0,0,0,.04)">
      <div style="padding:14px 18px;border-bottom:1px solid ${line};font-weight:900;color:${primary}">${escapeHtml(
    title
  )}</div>
      <div style="padding:18px">${body}</div>
    </div>
    <div style="margin-top:10px;font-size:12px;color:#64748b">
      Tip: bookmark this page on scanners for quick admits.
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
