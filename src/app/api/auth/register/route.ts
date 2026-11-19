import { Prisma } from "@prisma/client";
import { timingSafeEqual } from "node:crypto";
import {
  createSessionCookie,
  createSessionToken,
  hashPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readJsonObject } from "@/lib/request";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { isValidEmail } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const ipLimit = rateLimit({
      key: `register-ip:${getClientIp(request)}`,
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!ipLimit.ok) {
      return Response.json(
        { error: "Demasiados registros. Intenta nuevamente más tarde." },
        {
          status: 429,
          headers: { "Retry-After": String(ipLimit.retryAfterSec) },
        },
      );
    }
    const registrationInviteCode = process.env.REGISTRATION_INVITE_CODE;
    if (!registrationInviteCode) {
      return Response.json(
        { error: "El registro está cerrado." },
        { status: 403 },
      );
    }
    if (
      !body ||
      typeof body.email !== "string" ||
      typeof body.password !== "string" ||
      typeof body.inviteCode !== "string" ||
      (body.name !== undefined &&
        body.name !== null &&
        typeof body.name !== "string")
    ) {
      return Response.json(
        { error: "Proporciona un correo, una contraseña y el código de invitación válidos." },
        { status: 400 },
      );
    }

    const receivedInviteCode = body.inviteCode;
    const receivedBuffer = Buffer.from(receivedInviteCode, "utf8");
    const expectedBuffer = Buffer.from(registrationInviteCode, "utf8");
    const inviteCodeMatches =
      receivedBuffer.length === expectedBuffer.length &&
      timingSafeEqual(receivedBuffer, expectedBuffer);
    if (!inviteCodeMatches) {
      return Response.json(
        { error: "El código de invitación no es válido." },
        { status: 403 },
      );
    }

    const email = body.email.trim().toLowerCase();
    const password = body.password;
    const name = typeof body.name === "string" ? body.name.trim() : null;
    if (
      !isValidEmail(email) ||
      email.length > 254 ||
      password.length < 12 ||
      new TextEncoder().encode(password).byteLength > 72 ||
      (name !== null && name.length > 100)
    ) {
      return Response.json(
        {
          error:
            "Usa un correo válido, una contraseña de 12 a 72 bytes y un nombre de hasta 100 caracteres.",
        },
        { status: 400 },
      );
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        passwordHash: await hashPassword(password),
      },
      select: { id: true, email: true, name: true },
    });

    const token = await createSessionToken(user.id);
    return Response.json(
      { user },
      {
        status: 201,
        headers: { "Set-Cookie": createSessionCookie(token) },
      },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json(
        { error: "Ya existe una cuenta con ese correo." },
        { status: 409 },
      );
    }

    console.error("Authentication registration failed:", error);
    return Response.json(
      { error: "No se pudo crear la cuenta." },
      { status: 500 },
    );
  }
}
