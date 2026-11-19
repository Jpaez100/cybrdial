import { validateTwilioRequest } from "@/services/twilio.service";

type TwilioWebhookResult =
  | { ok: true; params: Record<string, string> }
  | { ok: false; response: Response };

export async function verifyTwilioWebhook(
  request: Request,
  allowedPaths: readonly string[],
): Promise<TwilioWebhookResult> {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const publicUrl =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL;
  const signature = request.headers.get("x-twilio-signature");

  if (!process.env.APP_URL && process.env.NEXT_PUBLIC_APP_URL) {
    console.warn(
      "NEXT_PUBLIC_APP_URL está obsoleto; configura APP_URL en el servidor.",
    );
  }

  if (!authToken || !accountSid || !publicUrl) {
    console.error(
      "Twilio webhook requires TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID, and APP_URL.",
    );
    return {
      ok: false,
      response: Response.json(
        { error: "El webhook de Twilio no está configurado." },
        { status: 500 },
      ),
    };
  }
  if (!signature) {
    return {
      ok: false,
      response: Response.json(
        { error: "Firma requerida." },
        { status: 403 },
      ),
    };
  }
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .includes("application/x-www-form-urlencoded")
  ) {
    return {
      ok: false,
      response: Response.json(
        { error: "Se esperaba un formulario URL-encoded de Twilio." },
        { status: 415 },
      ),
    };
  }

  try {
    const configuredUrl = new URL(publicUrl);
    if (
      configuredUrl.protocol !== "https:" &&
      process.env.NODE_ENV === "production"
    ) {
      throw new Error("APP_URL debe usar HTTPS en producción.");
    }

    const requestUrl = new URL(request.url);
    if (!allowedPaths.includes(requestUrl.pathname)) {
      return {
        ok: false,
        response: Response.json(
          { error: "Ruta de webhook no válida." },
          { status: 400 },
        ),
      };
    }

    const formData = await request.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value !== "string" || Object.hasOwn(params, key)) {
        return {
          ok: false,
          response: Response.json(
            { error: "Los parámetros del webhook no son válidos." },
            { status: 400 },
          ),
        };
      }
      params[key] = value;
    }

    const webhookUrl = new URL(
      `${requestUrl.pathname}${requestUrl.search}`,
      configuredUrl,
    ).toString();
    if (!validateTwilioRequest(authToken, signature, webhookUrl, params)) {
      return {
        ok: false,
        response: Response.json(
          { error: "Firma no válida." },
          { status: 403 },
        ),
      };
    }
    if (params.AccountSid !== accountSid) {
      return {
        ok: false,
        response: Response.json(
          { error: "La solicitud no pertenece a la cuenta Twilio configurada." },
          { status: 403 },
        ),
      };
    }

    return { ok: true, params };
  } catch (error) {
    console.error("Twilio webhook verification failed:", error);
    return {
      ok: false,
      response: Response.json(
        { error: "No se pudo verificar el webhook de Twilio." },
        { status: 500 },
      ),
    };
  }
}
