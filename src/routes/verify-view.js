// server/src/routes/verify-view.js
import express from "express";
import { prisma } from "../db.js";

const router = express.Router();

// Simple public HTML view: /verify/view?t=TOKEN
router.get("/view", async (req, res) => {
  try {
    const token = String(req.query.t || "").trim();
    if (!token) return res.status(400).send("token required");

    const g = await prisma.guest.findUnique({
      where: { token },
      include: { student: true },
    });
    if (!g) return res.status(404).send("Invalid token");

    // Simple HTML page with admit form (uses fetch to /verify-json/use-with-pin)
    const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Invite: ${g.guestName}</title>
<style>
  body{font-family:system-ui,Arial;margin:20px;color:#111}
  .card{max-width:720px;margin:20px auto;padding:18px;border:1px solid #e6e6e6;border-radius:12px}
  .btn{display:inline-block;padding:10px 14px;border-radius:8px;background:#0B2E4E;color:white;border:none;cursor:pointer}
  .danger{background:#dc2626}
  .muted{color:#666;font-size:13px}
  input{padding:8px;border-radius:8px;border:1px solid #ddd;width:120px}
</style>
</head>
<body>
<div class="card">
  <h2>Guest Invite</h2>
  <div><strong>Guest:</strong> ${escapeHtml(g.guestName)}</div>
  <div><strong>Student:</strong> ${escapeHtml(
    g.student?.studentName || ""
  )}</div>
  <div class="muted"><strong>Matric:</strong> ${escapeHtml(
    g.student?.matricNo || ""
  )}</div>
  <div style="margin-top:8px"><strong>Status:</strong> <span id="status">${
    g.status
  }</span></div>
  ${g.usedAt ? `<div style="margin-top:6px">Used at: ${g.usedAt}</div>` : ""}
  <hr/>
  <div>
    <label>Gate PIN: <input id="pin" type="password" /></label>
    <button class="btn" id="admitBtn">Admit</button>
    <button class="btn danger" id="refreshBtn">Refresh</button>
  </div>
  <div id="msg" style="margin-top:12px;color:#b00"></div>
</div>

<script>
const token = ${JSON.stringify(token)};

document.getElementById('admitBtn').addEventListener('click', async ()=>{
  const pin = document.getElementById('pin').value || '';
  if(!pin){ document.getElementById('msg').textContent='Enter PIN'; return; }
  try{
    const r = await fetch('/verify-json/use-with-pin', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ token, pin })
    });
    const j = await r.json();
    if(j.ok){
      document.getElementById('msg').style.color='green';
      document.getElementById('msg').textContent = 'Admitted ✓';
      document.getElementById('status').textContent = 'USED';
    } else {
      document.getElementById('msg').textContent = j.error || 'Failed';
    }
  }catch(e){
    document.getElementById('msg').textContent = 'Network error';
  }
});

document.getElementById('refreshBtn').addEventListener('click', async ()=>{
  try{
    const r = await fetch('/verify-json/check', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ token })
    });
    const j = await r.json();
    if(j.ok){
      document.getElementById('status').textContent = j.status;
      document.getElementById('msg').textContent = '';
    } else {
      document.getElementById('msg').textContent = j.error || 'Error';
    }
  }catch(e){
    document.getElementById('msg').textContent = 'Network error';
  }
});

function escapeHtml(s){ return String(s||'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
</script>
</body>
</html>
    `;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    console.error("/verify/view error:", err);
    res.status(500).send("Server error");
  }
});

export default router;
