import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

/**
 * Verify a Stripe checkout session and confirm it completed successfully.
 * Called by the frontend after a successful checkout redirect.
 *
 * GET /api/stripe/subscription?session_id=cs_...
 */
export async function GET(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  const stripe = new Stripe(stripeKey);

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const isPremium = session.payment_status === "paid" || session.status === "complete";
    return NextResponse.json({
      isPremium,
      email: session.customer_email,
      subscriptionId: session.subscription,
    });
  } catch (err) {
    console.error("Stripe session retrieval error:", err);
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }
}
