import { hashPassword } from "../src/lib/password";
import { isE164PhoneNumber } from "../src/lib/phone";
import { prisma } from "../src/lib/prisma";

async function main() {
  const password = process.env.DEMO_USER_PASSWORD;
  const passwordLength = password
    ? new TextEncoder().encode(password).byteLength
    : 0;
  if (!password || passwordLength < 12 || passwordLength > 72) {
    throw new Error(
      "Define DEMO_USER_PASSWORD con entre 12 y 72 bytes antes de sembrar el usuario demo.",
    );
  }

  const phone = process.env.TWILIO_PHONE_NUMBER;
  if (phone && !isE164PhoneNumber(phone)) {
    throw new Error("TWILIO_PHONE_NUMBER debe estar en formato E.164.");
  }

  const data = {
    name: "CybrDial Agent",
    passwordHash: await hashPassword(password),
    twilioPhoneNumber: phone ?? null,
  };

  await prisma.user.upsert({
    where: { email: "agent@cybrdial.io" },
    create: {
      email: "agent@cybrdial.io",
      ...data,
    },
    update: data,
  });
}

main()
  .catch((error: unknown) => {
    console.error("Demo user seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch (error) {
      console.error("Demo user seed disconnect failed:", error);
      process.exitCode = 1;
    }
  });
