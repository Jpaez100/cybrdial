import { afterEach, describe, expect, it } from "vitest";
import twilio from "twilio";
import { verifyTwilioWebhook } from "./twilio-webhook";

const originalEnv = {
  APP_URL: process.env.APP_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
};

function configureTwilio(): void {
  process.env.APP_URL = "https://example.com";
  process.env.TWILIO_ACCOUNT_SID = "AC00000000000000000000000000000000";
  process.env.TWILIO_AUTH_TOKEN = "test-auth-token";
  delete process.env.NEXT_PUBLIC_APP_URL;
}

afterEach(() => {
  process.env.APP_URL = originalEnv.APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = originalEnv.NEXT_PUBLIC_APP_URL;
  process.env.TWILIO_ACCOUNT_SID = originalEnv.TWILIO_ACCOUNT_SID;
  process.env.TWILIO_AUTH_TOKEN = originalEnv.TWILIO_AUTH_TOKEN;
});

describe("verifyTwilioWebhook", () => {
  it("acepta una firma válida", async () => {
    configureTwilio();
    const params = {
      AccountSid: "AC00000000000000000000000000000000",
      MessageSid: "SM00000000000000000000000000000000",
    };
    const url = "https://example.com/api/webhooks/sms/status";
    const signature = twilio.getExpectedTwilioSignature(
      process.env.TWILIO_AUTH_TOKEN!,
      url,
      params,
    );
    const body = new URLSearchParams(params);
    const request = new Request(url, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-twilio-signature": signature,
      },
      body: body.toString(),
    });
    const result = await verifyTwilioWebhook(request, [
      "/api/webhooks/sms/status",
    ]);
    expect(result.ok).toBe(true);
  });

  it("rechaza una firma inválida", async () => {
    configureTwilio();
    const url = "https://example.com/api/webhooks/sms/status";
    const request = new Request(url, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-twilio-signature": "invalid",
      },
      body: "AccountSid=AC00000000000000000000000000000000",
    });
    const result = await verifyTwilioWebhook(request, [
      "/api/webhooks/sms/status",
    ]);
    expect(result.ok).toBe(false);
  });

  it("rechaza una firma ausente", async () => {
    configureTwilio();
    const request = new Request(
      "https://example.com/api/webhooks/sms/status",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "AccountSid=AC00000000000000000000000000000000",
      },
    );
    const result = await verifyTwilioWebhook(request, [
      "/api/webhooks/sms/status",
    ]);
    expect(result.ok).toBe(false);
  });

  it("rechaza parámetros duplicados", async () => {
    configureTwilio();
    const params = {
      AccountSid: "AC00000000000000000000000000000000",
      MessageSid: "SM00000000000000000000000000000000",
    };
    const url = "https://example.com/api/webhooks/sms/status";
    const signature = twilio.getExpectedTwilioSignature(
      process.env.TWILIO_AUTH_TOKEN!,
      url,
      params,
    );
    const request = new Request(url, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-twilio-signature": signature,
      },
      body: "MessageSid=one&MessageSid=two&AccountSid=AC00000000000000000000000000000000",
    });
    const result = await verifyTwilioWebhook(request, [
      "/api/webhooks/sms/status",
    ]);
    expect(result.ok).toBe(false);
  });
});
