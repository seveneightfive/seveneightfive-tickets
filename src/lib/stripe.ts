import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
  typescript: true,
});

export function platformFeeBps(): number {
  return parseInt(process.env.STRIPE_PLATFORM_FEE_BPS ?? "200", 10);
}

export function computePlatformFee(subtotalCents: number): number {
  return Math.round((subtotalCents * platformFeeBps()) / 10000);
}
