export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function expirationBadge(dateStr: string | null): {
  label: string;
  tone: "ok" | "warning" | "error";
} | null {
  const days = daysUntil(dateStr);
  if (days === null) return null;
  if (days < 0) return { label: "Expired", tone: "error" };
  if (days <= 30) return { label: `${days}d left`, tone: "warning" };
  return null;
}

export function stockBadge(
  quantity: number,
  threshold: number
): { label: string; tone: "ok" | "warning" | "error" } {
  if (quantity === 0) return { label: "Out of stock", tone: "error" };
  if (quantity <= threshold) return { label: `Low: ${quantity}`, tone: "warning" };
  return { label: `${quantity} in stock`, tone: "ok" };
}
