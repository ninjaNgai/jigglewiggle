import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

/**
 * Stripe webhook handler.
 * Verifies the Stripe signature and handles subscription events.
 *
 * Set the raw body parser in next.config.ts if needed (Next.js App Router
 * already provides the raw body via req.text() / req.arrayBuffer()).
 */
export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const stripe = new Stripe(stripeKey);
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle subscription lifecycle events
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`[Stripe] Checkout completed for customer: ${session.customer_email}`);
      // In a production app: persist subscription status in a database here
      break;
    }
    case "customer.subscription.deleted":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      console.log(`[Stripe] Subscription ${event.type}: ${sub.id} status=${sub.status}`);
      // In a production app: update subscription status in database here
      break;
    }
    default:
      // Ignore unhandled events
      break;
  }

  return NextResponse.json({ received: true });
}
