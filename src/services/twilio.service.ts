import twilio, { type Twilio } from "twilio";

let client: Twilio | undefined;

export function getTwilioClient(): Twilio {
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
