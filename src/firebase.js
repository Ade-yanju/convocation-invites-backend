// server/src/firebase.js
import admin from "firebase-admin";
import fs from "fs";
import path from "path";

function loadServiceAccount() {
  // First try env var (base64 JSON)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const decoded = Buffer.from(
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
      "base64"
    ).toString("utf8");
    return JSON.parse(decoded);
  }

  // Then try a local file at server/serviceAccountKey.b64
  const p = path.resolve("server/serviceAccountKey.b64");
  if (fs.existsSync(p)) {
    const b64 = fs.readFileSync(p, "utf8");
    const decoded = Buffer.from(b64, "base64").toString("utf8");
    return JSON.parse(decoded);
  }

  throw new Error(
    "No Firebase service account provided. Set FIREBASE_SERVICE_ACCOUNT_BASE64 or add server/serviceAccountKey.b64"
  );
}

if (!admin.apps.length) {
  const serviceAccount = loadServiceAccount();
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // storageBucket: process.env.FIREBASE_STORAGE_BUCKET || undefined
  });
  console.log(
    "✅ Firebase Admin initialized for project:",
    serviceAccount.project_id
  );
}

export const fb = {
  admin,
  db: admin.firestore(),
  FieldValue: admin.firestore.FieldValue,
  storage: admin.storage ? admin.storage() : null,
};

export default fb;
