import { Prisma } from "@prisma/client";
import {
  createSessionCookie,
  createSessionToken,
  hashPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readJsonObject } from "@/lib/request";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    if (
      !body ||
      typeof body.email !== "string" ||
      typeof body.password !== "string" ||
      (body.name !== undefined &&
        body.name !== null &&
        typeof body.name !== "string")
    ) {
      return Response.json(
        { error: "Proporciona un correo y una contraseña válidos." },
        { status: 400 },
      );
    }

    const email = body.email.trim().toLowerCase();
    const password = body.password;
    const name = typeof body.name === "string" ? body.name.trim() : null;
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
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
