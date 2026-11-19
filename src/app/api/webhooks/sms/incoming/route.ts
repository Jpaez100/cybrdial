import { isE164PhoneNumber } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { validateTwilioRequest } from "@/services/twilio.service";

const TWILIO_RESPONSE =
  '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
const WEBHOOK_PATHS = [
  "/api/webhooks/sms/incoming",
  "/api/webhooks/sms",
];

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const signature = request.headers.get("x-twilio-signature");
  if (!authToken || !appUrl) {
    console.error("Incoming SMS webhook requires Twilio credentials and app URL.");
    return Response.json(
      { error: "El webhook de SMS no está configurado." },
      { status: 500 },
    );
  }
  if (!signature) {
    return Response.json({ error: "Firma requerida." }, { status: 403 });
  }
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .includes("application/x-www-form-urlencoded")
  ) {
    return Response.json(
      { error: "Se esperaba un formulario URL-encoded de Twilio." },
      { status: 415 },
    );
  }

  try {
    const configuredUrl = new URL(appUrl);
    if (
      configuredUrl.protocol !== "https:" &&
      process.env.NODE_ENV === "production"
    ) {
      throw new Error("NEXT_PUBLIC_APP_URL debe usar HTTPS en producción.");
    }

    const formData = await request.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value !== "string" || Object.hasOwn(params, key)) {
        return Response.json(
          { error: "Los parámetros del webhook no son válidos." },
          { status: 400 },
        );
      }
      params[key] = value;
    }

    const requestUrl = new URL(request.url);
    if (!WEBHOOK_PATHS.includes(requestUrl.pathname)) {
      return Response.json(
        { error: "Ruta de webhook no válida." },
        { status: 400 },
      );
    }
    const webhookUrl = new URL(
      `${requestUrl.pathname}${requestUrl.search}`,
      configuredUrl,
    ).toString();
    if (!validateTwilioRequest(authToken, signature, webhookUrl, params)) {
      return Response.json({ error: "Firma no válida." }, { status: 403 });
    }
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    if (accountSid && params.AccountSid !== accountSid) {
      return Response.json(
        { error: "El mensaje no pertenece a la cuenta Twilio configurada." },
        { status: 403 },
      );
    }

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
