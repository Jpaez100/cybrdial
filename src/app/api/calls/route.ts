import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return Response.json({ error: "No autenticado." }, { status: 401 });
    }

    const requestedLimit = Number(
      new URL(request.url).searchParams.get("limit") ?? 30,
    );
    const limit = Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 30;

    const calls = await prisma.callLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        contact: { select: { id: true, name: true, phone: true } },
      },
    });

    return Response.json({ calls });
  } catch (error) {
    console.error("Call history failed:", error);
    return Response.json(
      { error: "No se pudo cargar el historial de llamadas." },
      { status: 500 },
    );
  }
}
