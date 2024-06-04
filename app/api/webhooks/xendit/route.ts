/* eslint-disable camelcase */
import { createTransaction } from "@/lib/actions/transaction.action";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  const body = await request.text();

  const sig = request.headers.get("x-callback-token") as string;
  const endpointSecret = process.env.XENDIT_WEBHOOK_TOKEN!;

  const hmac = crypto.createHmac("sha256", endpointSecret);
  const digest = hmac.update(body).digest("hex");

  if (sig !== digest) {
    return NextResponse.json({ message: "Webhook error: Invalid signature" }, { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch (err) {
    return NextResponse.json({ message: "Webhook error: Invalid JSON", error: err }, { status: 400 });
  }

  const eventType = event.event;

  // CREATE
  if (eventType === "invoice.paid") {
    const { id, amount, metadata } = event.data;

    const transaction = {
      xenditId: id,
      amount: amount || 0,
      plan: metadata?.plan || "",
      credits: Number(metadata?.credits) || 0,
      buyerId: metadata?.buyerId || "",
      createdAt: new Date(),
    };

    const newTransaction = await createTransaction(transaction);

    return NextResponse.json({ message: "OK", transaction: newTransaction });
  }

  return new Response("", { status: 200 });
}
