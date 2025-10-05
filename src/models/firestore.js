// server/src/models/firestore.js
import { getFirestore, FieldValue } from "firebase-admin/firestore";
export const db = getFirestore();
export const F = FieldValue;
