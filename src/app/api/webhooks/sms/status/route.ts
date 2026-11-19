import { prisma } from "@/lib/prisma";
import { verifyTwilioWebhook } from "@/lib/twilio-webhook";

export const runtime = "nodejs";

const WEBHOOK_PATHS = ["/api/webhooks/sms/status"];

export async function POST(request: Request) {
  try {
    const verified = await verifyTwilioWebhook(request, WEBHOOK_PATHS);
    if (!verified.ok) {
      return verified.response;
    }
    const messageSid = verified.params.MessageSid;
    const status = verified.params.MessageStatus;
    if (
      messageSid &&
      /^[A-Za-z0-9]{1,64}$/.test(messageSid) &&
      status
    ) {
      await prisma.message.updateMany({
        where: { messageSid, direction: "OUTBOUND" },
        data: { status },
      });
    }
    return Response.json({ success: true });
  } catch (error) {
    console.error("SMS status webhook failed:", error);
    return Response.json(
      { error: "No se pudo actualizar el estado del SMS." },
      { status: 500 },
    );
  }
}
