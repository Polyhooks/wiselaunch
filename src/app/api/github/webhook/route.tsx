// app/api/github/webhook/route.ts

import { NextRequest } from "next/server";
import { webhooks } from "@/lib/github-webhooks";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-hub-signature-256") || "";
  const body = await req.text();
  console.log(req);

  try {
    await webhooks.verifyAndReceive({
      id: req.headers.get("x-github-delivery")!,
      name: req.headers.get("x-github-event")!,
      signature,
      payload: body,
    });

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("❌ Webhook verification failed:", err);
    return new Response("Invalid signature", { status: 401 });
  }
}
