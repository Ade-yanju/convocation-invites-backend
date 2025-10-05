// server/src/firebase/admin.js
import admin from "firebase-admin";
import { config } from "../config.js";

let app;
if (!admin.apps.length) {
  let creds;
  if (config.FIREBASE.SA_B64) {
    creds = JSON.parse(
      Buffer.from(config.FIREBASE.SA_B64, "base64").toString("utf8")
    );
  } else {
    creds = {
      project_id: config.FIREBASE.PROJECT_ID,
      client_email: config.FIREBASE.CLIENT_EMAIL,
      private_key: config.FIREBASE.PRIVATE_KEY,
    };
  }

  app = admin.initializeApp({
    credential: admin.credential.cert(creds),
  });
}

export const fbAdmin = admin;
