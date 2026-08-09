/** When true, POS data lives in ./data/pos/ — no Supabase or Stripe required. */
export function isLocalPos(): boolean {
  return process.env.NEXT_PUBLIC_POS_LOCAL === "true";
}
