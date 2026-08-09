/** Set to true to restore ChMS routes, forms, and navigation. */
export const CHMS_ENABLED = false;

export function isChmsPath(pathname: string): boolean {
  return (
    pathname.startsWith("/chms") ||
    pathname.startsWith("/api/chms") ||
    pathname.startsWith("/forms/connect") ||
    pathname.startsWith("/forms/prayer") ||
    pathname.startsWith("/forms/practice")
  );
}
