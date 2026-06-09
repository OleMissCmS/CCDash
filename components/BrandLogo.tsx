import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  showSubtitle?: boolean;
  href?: string | null;
  size?: "sm" | "md";
};

export function BrandLogo({
  showSubtitle = false,
  href = "/dashboard",
  size = "md",
}: BrandLogoProps) {
  const iconSize = size === "sm" ? 32 : 40;

  const content = (
    <div className="flex items-center gap-3 min-w-0">
      <div className="shrink-0 rounded-md bg-white p-1 shadow-sm ring-1 ring-black/5">
        <Image
          src="/brand/cc-icon.png"
          alt="Community Church"
          width={iconSize}
          height={iconSize}
          className="rounded-sm"
          priority
        />
      </div>
      <div className="min-w-0 leading-tight">
        <p
          className={`navbar-logo-text font-bold tracking-tight truncate ${
            size === "sm" ? "text-sm" : "text-base"
          }`}
        >
          Community Church
        </p>
        {showSubtitle && (
          <p className="navbar-logo-sub text-xs truncate">
            Operations dashboard
          </p>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
