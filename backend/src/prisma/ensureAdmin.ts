import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "../prisma";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !email.includes("@")) {
    throw new Error("ADMIN_EMAIL must be set to a valid admin email address");
  }
  if (!password || password.length < 12) {
    throw new Error("ADMIN_PASSWORD must be set and contain at least 12 characters");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      password: passwordHash,
      firstName: "Nancy",
      lastName: "Admin",
      userType: "admin"
    },
    update: {
      password: passwordHash,
      userType: "admin",
      isActive: true
    }
  });

  console.log("Admin credentials provisioned.");
}

main()
  .catch((error) => {
    console.error("Unable to provision admin credentials:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
