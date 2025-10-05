// server/src/models/inviteRepo.js
import { db, F } from "./firestore.js";

// STUDENTS
export async function upsertStudent({ matricNo, studentName, phone }) {
  const ref = db.collection("students").doc(matricNo);
  await ref.set(
    {
      matricNo,
      studentName,
      phone: phone || null,
      updatedAt: F.serverTimestamp(),
      createdAt: F.serverTimestamp(),
    },
    { merge: true }
  );
  return (await ref.get()).data();
}

// INVITES
export async function createInviteDoc(invite) {
  // invite: { token, status, guest, student, publicUrl, filename, cloudinaryId }
  const ref = db.collection("invites").doc(invite.token);
  const payload = {
    ...invite,
    createdAt: F.serverTimestamp(),
    updatedAt: F.serverTimestamp(),
    sentAt: F.serverTimestamp(),
  };
  await ref.set(payload, { merge: true });
  return (await ref.get()).data();
}

export async function getInviteByToken(token) {
  const snap = await db.collection("invites").doc(token).get();
  return snap.exists ? snap.data() : null;
}

// Atomic “mark used” — prevents double admission
export async function markInviteUsed(token) {
  const ref = db.collection("invites").doc(token);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Invite not found");
    const data = snap.data();
    if (data.status === "USED") {
      return { ok: false, alreadyUsed: true, data };
    }
    tx.update(ref, { status: "USED", updatedAt: F.serverTimestamp() });
    return { ok: true, data: { ...data, status: "USED" } };
  });
}

// Listing for CSV (optionally filter by student)
export async function listInvites({ matricNo } = {}) {
  let q = db.collection("invites").orderBy("createdAt", "desc");
  if (matricNo) q = q.where("student.matricNo", "==", matricNo);
  const snap = await q.get();
  return snap.docs.map((d) => d.data());
}
