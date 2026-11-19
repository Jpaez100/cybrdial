import { isE164PhoneNumber } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { verifyTwilioWebhook } from "@/lib/twilio-webhook";

const TWILIO_RESPONSE =
  '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
const WEBHOOK_PATHS = [
  "/api/webhooks/sms/incoming",
  "/api/webhooks/sms",
];

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const verified = await verifyTwilioWebhook(request, WEBHOOK_PATHS);
    if (!verified.ok) {
      return verified.response;
    }
    const params = verified.params;

    const messageSid = params.MessageSid;
    const from = params.From;
    const to = params.To;
    const text = params.Body;
    if (
      !messageSid ||
      !/^[A-Za-z0-9]{1,64}$/.test(messageSid) ||
      !from ||
      !to ||
      text === undefined ||
      text.length > 1600 ||
      !isE164PhoneNumber(from) ||
      !isE164PhoneNumber(to)
    ) {
      return Response.json(
        { error: "Los campos del mensaje entrante no son válidos." },
        { status: 400 },
      );
    }

    const owner = await prisma.user.findUnique({
      where: { twilioPhoneNumber: to },
      select: { id: true },
    });
    if (!owner) {
      return Response.json(
        { error: "El número de destino no está asignado a una cuenta." },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (transaction) => {
      const contact = await transaction.contact.upsert({
        where: {
          userId_phone: { userId: owner.id, phone: from },
        },
        create: {
          userId: owner.id,
          name: from,
          phone: from,
        },
        update: {},
        select: { id: true },
      });

      await transaction.message.upsert({
        where: { messageSid },
        create: {
          userId: owner.id,
          contactId: contact.id,
          messageSid,
          direction: "INBOUND",
          status: params.SmsStatus || "received",
          fromNumber: from,
          toNumber: to,
          body: text,
        },
        update: {
          status: params.SmsStatus || "received",
        },
      });
    });

    return new Response(TWILIO_RESPONSE, {
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  } catch (error) {
    console.error("Incoming SMS webhook failed:", error);
    return Response.json(
      { error: "No se pudo procesar el mensaje entrante." },
      { status: 500 },
    );
  }
}
