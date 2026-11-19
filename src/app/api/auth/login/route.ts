import {
  createSessionCookie,
  createSessionToken,
  verifyPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readJsonObject } from "@/lib/request";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    if (
      !body ||
      typeof body.email !== "string" ||
      typeof body.password !== "string"
    ) {
      return Response.json(
        { error: "Proporciona un correo y una contraseña válidos." },
        { status: 400 },
      );
    }

    const email = body.email.trim().toLowerCase();
    const password = body.password;
    if (
      email.length > 254 ||
      password.length === 0 ||
      new TextEncoder().encode(password).byteLength > 72
    ) {
      return Response.json(
        { error: "Correo o contraseña inválidos." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return Response.json(
        { error: "Correo o contraseña incorrectos." },
        { status: 401 },
      );
    }

    const token = await createSessionToken(user.id);
    return Response.json(
      { user: { id: user.id, email: user.email, name: user.name } },
      { headers: { "Set-Cookie": createSessionCookie(token) } },
    );
  } catch (error) {
    console.error("Authentication login failed:", error);
    return Response.json(
      { error: "No se pudo iniciar sesión." },
      { status: 500 },
    );
  }
}
