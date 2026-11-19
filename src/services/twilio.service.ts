import twilio from "twilio";

export type TwilioClient = ReturnType<typeof twilio>;

let client: TwilioClient | undefined;

export function getTwilioClient(): TwilioClient {
  if (client) {
    return client;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error(
      "Faltan TWILIO_ACCOUNT_SID y/o TWILIO_AUTH_TOKEN en el entorno.",
    );
  }

  client = twilio(accountSid, authToken);
  return client;
}

export function validateTwilioRequest(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
): boolean {
  return twilio.validateRequest(authToken, signature, url, params);
}

export function createVoiceAccessToken(options: {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
  identity: string;
  twimlAppSid: string;
}): string {
  const accessToken = new twilio.jwt.AccessToken(
    options.accountSid,
    options.apiKeySid,
    options.apiKeySecret,
    { identity: options.identity, ttl: 3600 },
  );
  accessToken.addGrant(
    new twilio.jwt.AccessToken.VoiceGrant({
      outgoingApplicationSid: options.twimlAppSid,
      incomingAllow: true,
    }),
  );

  return accessToken.toJwt();
}
