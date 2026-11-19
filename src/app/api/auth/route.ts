import {
  createSessionCookie,
  getAuthenticatedUser,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    return Response.json({ user });
  } catch (error) {
    console.error("Authentication session lookup failed:", error);
    return Response.json(
      { error: "No se pudo consultar la sesión." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { sessionVersion: { increment: 1 } },
    });
  }
  return Response.json(
    { success: true },
    { headers: { "Set-Cookie": createSessionCookie("", 0) } },
  );
}
