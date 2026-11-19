import { Prisma } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { isE164PhoneNumber } from "@/lib/phone";
import { isValidEmail } from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { readJsonObject } from "@/lib/request";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return Response.json({ error: "No autenticado." }, { status: 401 });
    }

    const contacts = await prisma.contact.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      include: { _count: { select: { messages: true } } },
    });

    return Response.json({ contacts });
  } catch (error) {
    console.error("Contacts list failed:", error);
    return Response.json(
      { error: "No se pudieron cargar los contactos." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return Response.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = await readJsonObject(request);
    if (
      !body ||
      typeof body.name !== "string" ||
      typeof body.phone !== "string" ||
      (body.email !== undefined &&
        body.email !== null &&
        typeof body.email !== "string") ||
      (body.notes !== undefined &&
        body.notes !== null &&
        typeof body.notes !== "string")
    ) {
      return Response.json(
        { error: "Proporciona un nombre y un teléfono válidos." },
        { status: 400 },
      );
    }

    const name = body.name.trim();
    const phone = body.phone.trim();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
    const notes = typeof body.notes === "string" ? body.notes.trim() : null;
    if (
      !name ||
      name.length > 100 ||
      !isE164PhoneNumber(phone) ||
      (email !== null &&
        (email.length > 254 || !isValidEmail(email))) ||
      (notes !== null && notes.length > 2000)
    ) {
      return Response.json(
        {
          error:
            "Verifica el nombre, el teléfono E.164, el correo y las notas.",
        },
        { status: 400 },
      );
    }

    const contact = await prisma.contact.create({
      data: { userId: user.id, name, phone, email, notes },
    });
    return Response.json({ contact }, { status: 201 });
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

    console.error("Contact creation failed:", error);
    return Response.json(
      { error: "No se pudo crear el contacto." },
      { status: 500 },
    );
  }
}
