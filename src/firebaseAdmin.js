// server/src/firebaseAdmin.js
import admin from "firebase-admin";
import { config } from "./config.js";

/**
 * Robust firebase-admin initialization:
 * - Accepts FIREBASE_ADMIN_JSON (stringified JSON) OR
 * - FIREBASE_ADMIN_B64 (base64 of the JSON).
 *
 * If FIREBASE_ADMIN_JSON looks base64 (no '{' at start), we will try to base64-decode it.
 */

if (!admin.apps.length) {
  const rawJson =
    process.env.FIREBASE_ADMIN_JSON ?? config.FIREBASE_ADMIN_JSON ?? null;
  const rawB64 = process.env.FIREBASE_ADMIN_B64 ?? null;

  if (!rawJson && !rawB64) {
    throw new Error(
      "Missing FIREBASE_ADMIN_JSON or FIREBASE_ADMIN_B64 in env for firebase-admin initialization"
    );
  }

  let jsonString = rawJson ?? null;

  // helper: attempt parse JSON string, return parsed or throw
  const tryParse = (s) => {
    try {
      return JSON.parse(s);
    } catch (e) {
      throw e;
    }
  };

  // If FIREBASE_ADMIN_JSON exists but doesn't start with '{' try decode as base64 automatically
  if (
    jsonString &&
    typeof jsonString === "string" &&
    jsonString.trim().length > 0
  ) {
    const trimmed = jsonString.trim();
    if (!trimmed.startsWith("{")) {
      // probably base64 — try decode
      try {
        const decoded = Buffer.from(trimmed, "base64").toString("utf8");
        // if decode yields JSON, use it
        try {
          jsonString = decoded;
          const parsed = tryParse(jsonString);
          jsonString = JSON.stringify(parsed); // normalize
        } catch (e) {
          // decode didn't give JSON -> leave original rawJson and we'll try rawJson below
        }
      } catch (e) {
        // ignore decode error; we'll try other fallbacks
      }
    }
  }

  // If still no usable jsonString, prefer rawB64
  if (!jsonString && rawB64) {
    try {
      jsonString = Buffer.from(rawB64, "base64").toString("utf8");
    } catch (e) {
      console.error("Failed to decode FIREBASE_ADMIN_B64:", e.message || e);
      throw new Error("Invalid FIREBASE_ADMIN_B64");
    }
  }

  // final parse
  let serviceAccount;
  try {
    if (!jsonString) throw new Error("No JSON string available to parse");
    serviceAccount = tryParse(jsonString);
  } catch (e) {
    console.error("Invalid FIREBASE_ADMIN_JSON (parse error):", e.message || e);
    throw new Error(
      "Invalid FIREBASE_ADMIN_JSON (cannot parse JSON). If your env contains base64, set FIREBASE_ADMIN_B64 instead."
    );
  }

  if (!serviceAccount || !serviceAccount.project_id) {
    console.error("Service account parsed object (partial):", {
      ...(serviceAccount ? { project_id: serviceAccount.project_id } : {}),
    });
    throw new Error(
      "FIREBASE_ADMIN JSON must include a project_id property (service account JSON)"
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log(
    "firebase-admin initialized for project:",
    serviceAccount.project_id
  );
}

export default admin;
