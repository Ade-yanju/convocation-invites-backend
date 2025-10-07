// server/src/firebaseAdmin.js
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { config } from "./config.js";

/**
 * Robust firebase-admin initialization:
 * Supports:
 *  - FIREBASE_ADMIN_PATH -> filesystem path to service account JSON (recommended for local dev)
 *  - FIREBASE_ADMIN_JSON -> one-line JSON (may contain escaped \n)
 *  - FIREBASE_ADMIN_B64  -> base64-encoded JSON
 *
 * If no valid credentials found, export a shim that throws when used.
 */

// helpers
const tryParseJson = (s) => {
  if (typeof s !== "string") return null;
  try {
    const parsed = JSON.parse(s);
    // unescape private_key newlines if necessary
    if (
      parsed &&
      parsed.private_key &&
      parsed.private_key.indexOf("\\n") !== -1
    ) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return parsed;
  } catch {
    return null;
  }
};

const tryReadFileAsJson = (p) => {
  try {
    const resolved = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
    if (!fs.existsSync(resolved)) return null;
    const raw = fs.readFileSync(resolved, "utf8");
    return tryParseJson(raw);
  } catch {
    return null;
  }
};

let exported = null; // will hold final exported object (admin or shim)
let serviceAccount = null;

// 1) Try explicit path (recommended)
const saPath = process.env.FIREBASE_ADMIN_PATH ?? config.FIREBASE_ADMIN_PATH;
if (saPath) {
  serviceAccount = tryReadFileAsJson(saPath);
  if (!serviceAccount) {
    console.warn(
      `FIREBASE_ADMIN_PATH provided but failed to read/parse: ${saPath}`
    );
  }
}

// 2) Try FIREBASE_ADMIN_JSON
if (!serviceAccount) {
  const rawJson =
    process.env.FIREBASE_ADMIN_JSON ?? config.FIREBASE_ADMIN_JSON ?? null;
  if (rawJson) {
    const trimmed = String(rawJson).trim();
    if (!trimmed.startsWith("{")) {
      // maybe base64 encoded string inside FIREBASE_ADMIN_JSON — try decode
      try {
        const decoded = Buffer.from(trimmed, "base64").toString("utf8");
        serviceAccount = tryParseJson(decoded) || tryParseJson(trimmed);
      } catch {
        serviceAccount = tryParseJson(trimmed);
      }
    } else {
      serviceAccount = tryParseJson(trimmed);
    }
    if (!serviceAccount) {
      console.warn(
        "FIREBASE_ADMIN_JSON provided but parsing failed. Consider using FIREBASE_ADMIN_PATH or FIREBASE_ADMIN_B64."
      );
    }
  }
}

// 3) Try FIREBASE_ADMIN_B64
if (!serviceAccount) {
  const rawB64 = process.env.FIREBASE_ADMIN_B64 ?? config.FIREBASE_ADMIN_B64;
  if (rawB64) {
    try {
      const decoded = Buffer.from(String(rawB64).trim(), "base64").toString(
        "utf8"
      );
      serviceAccount = tryParseJson(decoded);
      if (!serviceAccount) {
        console.warn("FIREBASE_ADMIN_B64 provided but parsed JSON invalid.");
      }
    } catch (e) {
      console.warn("FIREBASE_ADMIN_B64 decode failed:", e.message || e);
    }
  }
}

// If no credentials -> export shim that throws on use (safer than crashing at import)
if (!serviceAccount) {
  console.warn(
    "No valid Firebase admin credentials found. Admin routes will throw when used."
  );
  const err = new Error(
    "Missing Firebase admin credentials. Set FIREBASE_ADMIN_PATH, FIREBASE_ADMIN_JSON or FIREBASE_ADMIN_B64."
  );
  const shim = {
    auth() {
      throw err;
    },
    app() {
      throw err;
    },
    credential: {
      cert() {
        throw err;
      },
    },
  };
  exported = shim;
} else {
  // validate serviceAccount shape
  if (!serviceAccount.project_id) {
    throw new Error("Parsed service account JSON is missing project_id.");
  }

  // initialize once
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log(
      "firebase-admin initialized for project:",
      serviceAccount.project_id
    );
  }
  exported = admin;
}

export default exported;
