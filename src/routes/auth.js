// server/src/routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../models/firestore.js"; // getFirestore() wrapper exporting `db`

const router = express.Router();

function setAuthCookie(res, token) {
  res.cookie("auth", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 8, // 8h
    path: "/",
  });
}

async function getAdminByEmail(emailRaw) {
  const email = String(emailRaw || "").toLowerCase();
  if (!email) return null;
  const snap = await db.collection("admins").doc(email).get();
  return snap.exists ? snap.data() : null;
}

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res
        .status(400)
        .json({ ok: false, error: "email and password required" });
    }

    const admin = await getAdminByEmail(email);
    if (!admin || admin.active === false) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    // admin document expected shape:
    // { email, passwordHash, role: "admin", active: true }
    const ok = await bcrypt.compare(password, admin.passwordHash || "");
    if (!ok) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    if (!process.env.JWT_SECRET) {
      return res
        .status(500)
        .json({ ok: false, error: "Missing JWT_SECRET env" });
    }

    const token = jwt.sign(
      { email: admin.email.toLowerCase(), role: admin.role || "admin" },
      process.env.JWT_SECRET,
      {
        subject: admin.email.toLowerCase(),
        expiresIn: "8h",
        audience: "convocation-admin",
        issuer: "convocation-api",
      }
    );

    setAuthCookie(res, token);
    return res.json({
      ok: true,
      admin: { email: admin.email.toLowerCase(), role: admin.role || "admin" },
    });
  } catch (e) {
    console.error("[/auth/login] error:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.get("/me", async (req, res) => {
  try {
    const token = req.cookies?.auth;
    if (!token || !process.env.JWT_SECRET) {
      return res.json({ ok: true, authenticated: false });
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      audience: "convocation-admin",
      issuer: "convocation-api",
    });

    // Ensure the account is still active
    const admin = await getAdminByEmail(payload.email);
    if (!admin || admin.active === false) {
      return res.json({ ok: true, authenticated: false });
    }

    return res.json({
      ok: true,
      authenticated: true,
      admin: { email: payload.email, role: payload.role },
    });
  } catch {
    return res.json({ ok: true, authenticated: false });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("auth", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res.json({ ok: true });
});

export default router;
