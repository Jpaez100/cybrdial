import { getAuthenticatedUser } from "@/lib/auth";
import { getVoiceIdentity } from "@/lib/voice";
import { createVoiceAccessToken } from "@/services/twilio.service";

export const runtime = "nodejs";

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
    if (!accountSid || !apiKeySid || !apiKeySecret || !twimlAppSid) {
      return Response.json(
        { error: "La emisión de tokens de voz no está configurada." },
        { status: 503 },
      );
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
