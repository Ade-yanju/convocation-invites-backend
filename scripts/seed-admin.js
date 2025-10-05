// server/scripts/seed-admin.js
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

const email = arg("email");
const password = arg("password");

if (!email || !password) {
  console.error(
    'Usage: node scripts/seed-admin.js --email you@school.edu --password "StrongPass"'
  );
  process.exit(1);
}

async function main() {
  console.log("Seeding admin:", email);
  const hash = await bcrypt.hash(password, 12);

  const existing = await prisma.admin.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existing) {
    await prisma.admin.update({
      where: { id: existing.id },
      data: { passwordHash: hash, active: true },
    });
    console.log("Admin updated");
  } else {
    await prisma.admin.create({
      data: { email: email.toLowerCase(), passwordHash: hash, active: true },
    });
    console.log("Admin created");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
