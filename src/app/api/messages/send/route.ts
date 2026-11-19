import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readJsonObject } from "@/lib/request";
import { getTwilioClient } from "@/services/twilio.service";
import { isE164PhoneNumber } from "@/lib/phone";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return Response.json({ error: "No autenticado." }, { status: 401 });
    }

    const smsLimit = rateLimit({
      key: `sms-user:${user.id}`,
      limit: 30,
      windowMs: 60 * 60 * 1000,
    });
    if (!smsLimit.ok) {
      return Response.json(
        { error: "Demasiados SMS. Intenta nuevamente más tarde." },
        {
          status: 429,
          headers: { "Retry-After": String(smsLimit.retryAfterSec) },
        },
      );
    }

    const body = await readJsonObject(request);
    if (
      !body ||
      typeof body.contactId !== "string" ||
      typeof body.body !== "string"
    ) {
      return Response.json(
        { error: "Se requiere un contacto y el texto del mensaje." },
        { status: 400 },
      );
    }

    const text = body.body.trim();
    if (!text || text.length > 1600) {
      return Response.json(
        { error: "El mensaje debe tener entre 1 y 1600 caracteres." },
        { status: 400 },
      );
    }

    const contact = await prisma.contact.findFirst({
      where: { id: body.contactId, userId: user.id },
      select: { id: true, phone: true },
    });
    if (!contact) {
      return Response.json(
        { error: "No se encontró el contacto." },
        { status: 404 },
      );
    }

    const sender = await prisma.user.findUnique({
      where: { id: user.id },
      select: { twilioPhoneNumber: true },
    });
    const from = sender?.twilioPhoneNumber ?? "";
    if (!from || !isE164PhoneNumber(from)) {
      return Response.json(
        { error: "La cuenta no tiene un número Twilio E.164 configurado." },
        { status: 503 },
      );
    }

    const message = await prisma.message.create({
      data: {
        userId: user.id,
        contactId: contact.id,
        direction: "OUTBOUND",
        status: "queued",
        fromNumber: from,
        toNumber: contact.phone,
        body: text,
      },
    });

    try {
      const appUrl = process.env.APP_URL;
      if (!appUrl) {
        throw new Error("APP_URL no está configurado.");
      }
      const sentMessage = await getTwilioClient().messages.create({
        body: text,
        from,
        to: contact.phone,
        statusCallback: `${appUrl}/api/webhooks/sms/status`,
      });
      const updatedMessage = await prisma.message.update({
        where: { id: message.id },
        data: {
          messageSid: sentMessage.sid,
          status: sentMessage.status,
        },
      });
      return Response.json({ message: updatedMessage }, { status: 201 });
    } catch (error) {
      await prisma.message.update({
        where: { id: message.id },
        data: { status: "failed" },
      });
      const twilioCode =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof error.code === "number"
          ? error.code
          : undefined;
      if (twilioCode === 21610) {
        return Response.json(
          { error: "El contacto canceló la recepción de mensajes." },
          { status: 409 },
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("SMS send failed:", error);
    return Response.json(
      { error: "No se pudo enviar el mensaje." },
      { status: 502 },
    );
  }
}
