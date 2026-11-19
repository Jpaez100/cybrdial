import { Prisma } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { isE164PhoneNumber } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { readJsonObject } from "@/lib/request";

type RouteContext = { params: Promise<{ contactId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return Response.json({ error: "No autenticado." }, { status: 401 });
    }

    const { contactId } = await params;
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, userId: user.id },
    });
    if (!contact) {
      return Response.json(
        { error: "No se encontró el contacto." },
        { status: 404 },
      );
    }

    return Response.json({ contact });
  } catch (error) {
    console.error("Contact lookup failed:", error);
    return Response.json(
      { error: "No se pudo cargar el contacto." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return Response.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = await readJsonObject(request);
    if (!body) {
      return Response.json({ error: "JSON inválido." }, { status: 400 });
    }

    const data: {
      name?: string;
      phone?: string;
      email?: string | null;
      notes?: string | null;
    } = {};
    if (body.name !== undefined) {
      if (
        typeof body.name !== "string" ||
        !body.name.trim() ||
        body.name.trim().length > 100
      ) {
        return Response.json(
          { error: "Nombre inválido." },
          { status: 400 },
        );
      }
      data.name = body.name.trim();
    }
    if (body.phone !== undefined) {
      if (
        typeof body.phone !== "string" ||
        !isE164PhoneNumber(body.phone.trim())
      ) {
        return Response.json(
          { error: "El teléfono debe estar en formato E.164." },
          { status: 400 },
        );
      }
      data.phone = body.phone.trim();
    }
    if (body.email !== undefined) {
      if (
        body.email !== null &&
        (typeof body.email !== "string" ||
          body.email.trim().length > 254 ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()))
      ) {
        return Response.json({ error: "Correo inválido." }, { status: 400 });
      }
      data.email =
        typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
    }
    if (body.notes !== undefined) {
      if (
        body.notes !== null &&
        (typeof body.notes !== "string" || body.notes.trim().length > 2000)
      ) {
        return Response.json({ error: "Notas inválidas." }, { status: 400 });
      }
      data.notes = typeof body.notes === "string" ? body.notes.trim() : null;
    }
    if (Object.keys(data).length === 0) {
      return Response.json(
        { error: "Indica al menos un campo para actualizar." },
        { status: 400 },
      );
    }

    const { contactId } = await params;
    const result = await prisma.contact.updateMany({
      where: { id: contactId, userId: user.id },
      data,
    });
    if (result.count === 0) {
      return Response.json(
        { error: "No se encontró el contacto." },
        { status: 404 },
      );
    }

    const contact = await prisma.contact.findUniqueOrThrow({
      where: { id: contactId },
    });
    return Response.json({ contact });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json(
        { error: "Ya existe un contacto con ese teléfono." },
        { status: 409 },
      );
    }

    console.error("Contact update failed:", error);
    return Response.json(
      { error: "No se pudo actualizar el contacto." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return Response.json({ error: "No autenticado." }, { status: 401 });
    }

    const { contactId } = await params;
    const result = await prisma.contact.deleteMany({
      where: { id: contactId, userId: user.id },
    });
    if (result.count === 0) {
      return Response.json(
        { error: "No se encontró el contacto." },
        { status: 404 },
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Contact deletion failed:", error);
    return Response.json(
      { error: "No se pudo eliminar el contacto." },
      { status: 500 },
    );
  }
}
