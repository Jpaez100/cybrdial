import { getUserIdFromVoiceIdentity, getVoiceIdentity } from "@/lib/voice";
import { prisma } from "@/lib/prisma";
import { validateTwilioRequest } from "@/services/twilio.service";

export const runtime = "nodejs";

const WEBHOOK_PATHS = [
  "/api/webhooks/voice",
  "/api/webhooks/voice/incoming",
  "/api/webhooks/voice/outbound",
  "/api/webhooks/voice/status",
];
const STATUS_WEBHOOK_PATH = "/api/webhooks/voice/status";
const E164_PATTERN = /^\+[1-9]\d{1,14}$/;
const SID_PATTERN = /^[A-Za-z0-9]{1,64}$/;
const COMPLETED_CALL_STATUSES: ReadonlySet<string> = new Set([
  "completed",
  "no-answer",
  "busy",
  "failed",
  "canceled",
]);

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function twimlResponse(content: string): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${content}</Response>`,
    {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/xml; charset=utf-8",
      },
    },
  );
}

function isValidPhoneNumber(value: string | undefined): value is string {
  return value !== undefined && E164_PATTERN.test(value);
}

function getVoiceStatusCallbackUrl(): string {
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!publicUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL no está configurado.");
  }

  const baseUrl = new URL(publicUrl);
  if (baseUrl.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL debe usar HTTPS en producción.");
  }

  return new URL(STATUS_WEBHOOK_PATH, baseUrl).toString();
}

export async function POST(request: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL;
  const signature = request.headers.get("x-twilio-signature");

  if (!authToken || !publicUrl) {
    console.error("Voice webhook requires TWILIO_AUTH_TOKEN and NEXT_PUBLIC_APP_URL.");
    return Response.json(
      { error: "El webhook de voz no está configurado." },
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
    const requestUrl = new URL(request.url);
    if (!WEBHOOK_PATHS.includes(requestUrl.pathname)) {
      return Response.json(
        { error: "Ruta de webhook no válida." },
        { status: 400 },
      );
    }

    const configuredUrl = new URL(publicUrl);
    if (
      configuredUrl.protocol !== "https:" &&
      process.env.NODE_ENV === "production"
    ) {
      throw new Error("NEXT_PUBLIC_APP_URL debe usar HTTPS en producción.");
    }
    const webhookUrl = new URL(
      `${requestUrl.pathname}${requestUrl.search}`,
      configuredUrl,
    ).toString();

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

    if (!validateTwilioRequest(authToken, signature, webhookUrl, params)) {
      return Response.json({ error: "Firma no válida." }, { status: 403 });
    }
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    if (accountSid && params.AccountSid !== accountSid) {
      return Response.json(
        { error: "La llamada no pertenece a la cuenta Twilio configurada." },
        { status: 403 },
      );
    }

    const callSid = params.CallSid;
    if (!callSid || !SID_PATTERN.test(callSid)) {
      return Response.json(
        { error: "Falta un CallSid válido." },
        { status: 400 },
      );
    }

    if (requestUrl.pathname === STATUS_WEBHOOK_PATH) {
      return handleCallCompletion(callSid, params);
    }

    const from = params.From;
    const to = params.To;
    if (!from || !to) {
      return Response.json(
        { error: "Faltan campos requeridos de la llamada." },
        { status: 400 },
      );
    }

    if (from.startsWith("client:")) {
      return handleClientCall({ callSid, from, to });
    }

    return handleIncomingCall({ callSid, from, to });
  } catch (error) {
    console.error("Voice webhook failed:", error);
    return Response.json(
      { error: "No se pudo procesar la llamada." },
      { status: 500 },
    );
  }
}

async function handleCallCompletion(
  callSid: string,
  params: Record<string, string>,
): Promise<Response> {
  const status = params.DialCallStatus ?? params.CallStatus;
  if (!status || !COMPLETED_CALL_STATUSES.has(status)) {
    return Response.json(
      { error: "El estado final de la llamada no es válido." },
      { status: 400 },
    );
  }

  const durationValue = params.DialCallDuration ?? params.CallDuration ?? "0";
  if (!/^\d+$/.test(durationValue)) {
    return Response.json(
      { error: "La duración de la llamada no es válida." },
      { status: 400 },
    );
  }

  const durationSec = Number(durationValue);
  if (!Number.isSafeInteger(durationSec)) {
    return Response.json(
      { error: "La duración de la llamada no es válida." },
      { status: 400 },
    );
  }

  const result = await prisma.callLog.updateMany({
    where: { callSid },
    data: {
      status,
      durationSec,
      endedAt: new Date(),
    },
  });
  if (result.count === 0) {
    console.error("Voice status callback references an unknown CallSid.", {
      callSid,
      status,
    });
    return Response.json(
      { error: "No se encontró el registro de la llamada." },
      { status: 404 },
    );
  }

  return twimlResponse("");
}

async function handleIncomingCall({
  callSid,
  from,
  to,
}: {
  callSid: string;
  from: string;
  to: string;
}): Promise<Response> {
  if (!isValidPhoneNumber(from) || !isValidPhoneNumber(to)) {
    return Response.json(
      { error: "Los números de llamada no usan formato E.164." },
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

  const contact = await prisma.contact.findUnique({
    where: { userId_phone: { userId: owner.id, phone: from } },
    select: { id: true },
  });
  await prisma.callLog.upsert({
    where: { callSid },
    create: {
      callSid,
      contactId: contact?.id,
      direction: "INBOUND",
      fromNumber: from,
      status: "ringing",
      toNumber: to,
      userId: owner.id,
    },
    update: {
      contactId: contact?.id,
      status: "ringing",
    },
  });

  const identity = getVoiceIdentity(owner.id);
  return twimlResponse(
    `<Dial action="${xmlEscape(getVoiceStatusCallbackUrl())}" method="POST" answerOnBridge="true" timeout="30"><Client>${xmlEscape(identity)}</Client></Dial>`,
  );
}

async function handleClientCall({
  callSid,
  from,
  to,
}: {
  callSid: string;
  from: string;
  to: string;
}): Promise<Response> {
  const identity = from.slice("client:".length);
  const userId = getUserIdFromVoiceIdentity(identity);
  if (!userId || getVoiceIdentity(userId) !== identity || !isValidPhoneNumber(to)) {
    return Response.json(
      { error: "La identidad de llamada o el destino no son válidos." },
      { status: 400 },
    );
  }

  const owner = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, twilioPhoneNumber: true },
  });
  if (!owner?.twilioPhoneNumber) {
    return Response.json(
      { error: "La cuenta no tiene un número de voz asignado." },
      { status: 404 },
    );
  }

  const contact = await prisma.contact.findUnique({
    where: { userId_phone: { userId: owner.id, phone: to } },
    select: { id: true },
  });
  await prisma.callLog.upsert({
    where: { callSid },
    create: {
      callSid,
      contactId: contact?.id,
      direction: "OUTBOUND",
      fromNumber: owner.twilioPhoneNumber,
      status: "initiated",
      toNumber: to,
      userId: owner.id,
    },
    update: {
      contactId: contact?.id,
      status: "initiated",
    },
  });

  return twimlResponse(
    `<Dial action="${xmlEscape(getVoiceStatusCallbackUrl())}" method="POST" callerId="${xmlEscape(owner.twilioPhoneNumber)}"><Number>${xmlEscape(to)}</Number></Dial>`,
  );
}
