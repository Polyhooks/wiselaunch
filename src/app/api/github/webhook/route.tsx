import { Webhooks, createNodeMiddleware } from "@octokit/webhooks";
import { NextRequest, NextResponse } from "next/server";

// Optional: Initialize Webhooks handler
const webhooks = new Webhooks({
  secret: process.env.GITHUB_WEBHOOK_SECRET || "foo",
});

// Add event listeners
webhooks.onAny(({ id, name, payload }) => {
  console.log(`Received event: ${name}`, payload);
});

export async function POST(req: NextRequest) {
  const body = await req.text();

  const signature = req.headers.get("x-hub-signature-256") || "";
  const event = req.headers.get("x-github-event") || "";
  const deliveryId = req.headers.get("x-github-delivery") || "";

  try {
    await webhooks.verifyAndReceive({
      id: deliveryId,
      name: event,
      payload: body,
      signature,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new NextResponse("Signature mismatch or invalid payload", {
      status: 400,
    });
  }
}
