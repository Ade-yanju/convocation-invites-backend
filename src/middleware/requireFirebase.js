// server/src/middleware/requireFirebase.js
import admin from "firebase-admin";

if (!admin.apps.length) {
  const json = process.env.FIREBASE_ADMIN_JSON;
  if (!json) throw new Error("FIREBASE_ADMIN_JSON missing");
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(json)),
  });
}

export async function requireFirebase(req, res, next) {
  try {
    const hdr = req.headers.authorization || "";
    const idToken = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
    if (!idToken)
      return res.status(401).json({ ok: false, error: "Missing token" });

    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = { uid: decoded.uid, email: decoded.email || null };
    return next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: "Invalid/expired token" });
  }
}
