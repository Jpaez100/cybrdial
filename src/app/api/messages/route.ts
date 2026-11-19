import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return Response.json({ error: "No autenticado." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get("contactId");
    const requestedLimit = Number(searchParams.get("limit") ?? 100);
    const limit = Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 100;

    if (contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: contactId, userId: user.id },
        select: { id: true },
      });
      if (!contact) {
        return Response.json(
          { error: "No se encontró el contacto." },
          { status: 404 },
        );
      }
    }

    const messages = await prisma.message.findMany({
      where: {
        userId: user.id,
        ...(contactId ? { contactId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        contact: { select: { id: true, name: true, phone: true } },
      },
    });

    return Response.json({ messages: messages.reverse() });
  } catch (error) {
    console.error("Messages list failed:", error);
    return Response.json(
      { error: "No se pudieron cargar los mensajes." },
      { status: 500 },
    );
  }
}
