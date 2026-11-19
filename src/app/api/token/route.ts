import { getAuthenticatedUser } from "@/lib/auth";
import { getVoiceIdentity } from "@/lib/voice";
import { createVoiceAccessToken } from "@/services/twilio.service";

export const runtime = "nodejs";

const TWILIO_SID_PATTERNS = {
  TWILIO_ACCOUNT_SID: /^AC[a-zA-Z0-9]{32}$/,
  TWILIO_API_KEY_SID: /^SK[a-zA-Z0-9]{32}$/,
  TWILIO_TWIML_APP_SID: /^AP[a-zA-Z0-9]{32}$/,
} as const;

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return Response.json({ error: "No autenticado." }, { status: 401 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiKeySid = process.env.TWILIO_API_KEY_SID;
    const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
    const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;
    const missing = [
      ["TWILIO_ACCOUNT_SID", accountSid],
      ["TWILIO_API_KEY_SID", apiKeySid],
      ["TWILIO_API_KEY_SECRET", apiKeySecret],
      ["TWILIO_TWIML_APP_SID", twimlAppSid],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);
    const sidConfigurations: Array<[string, string | undefined, RegExp]> = [
      ["TWILIO_ACCOUNT_SID", accountSid, TWILIO_SID_PATTERNS.TWILIO_ACCOUNT_SID],
      ["TWILIO_API_KEY_SID", apiKeySid, TWILIO_SID_PATTERNS.TWILIO_API_KEY_SID],
      ["TWILIO_TWIML_APP_SID", twimlAppSid, TWILIO_SID_PATTERNS.TWILIO_TWIML_APP_SID],
    ];
    const invalid = sidConfigurations
      .filter(([, value, pattern]) => value !== undefined && !pattern.test(value))
      .map(([name]) => name);
    if (missing.length > 0 || invalid.length > 0) {
      return Response.json(
        {
          error: "La configuración de credenciales de voz está incompleta o no es válida.",
          details: [
            missing.length > 0 ? `Faltan: ${missing.join(", ")}.` : "",
            invalid.length > 0 ? `Formato inválido: ${invalid.join(", ")}.` : "",
          ]
            .filter(Boolean)
            .join(" "),
        },
        { status: 503 },
      );
    }

    if (!accountSid || !apiKeySid || !apiKeySecret || !twimlAppSid) {
      throw new Error("Voice credential validation did not complete.");
    }

    const identity = getVoiceIdentity(user.id);
    return Response.json({
      token: createVoiceAccessToken({
        accountSid,
        apiKeySid,
        apiKeySecret,
        identity,
        twimlAppSid,
      }),
      identity,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error("Voice token creation failed:", error);
    return Response.json(
      { error: "No se pudo generar el token de voz." },
      { status: 500 },
    );
  }
}
