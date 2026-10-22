import Link from "next/link";
import { cn } from "@/lib/cn";

/** Symbole : une fenêtre en arc, avec un meneau central — discret, lisible en petit. */
export function LogoMark({
  className,
  accent = true,
}: {
  className?: string;
  /** Point doré de la rosace ; désactivé pour un usage en filigrane. */
  accent?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className ?? "size-6"}
    >
      <path
        d="M5 21V10.5a7 7 0 0 1 14 0V21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M12 21v-7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3.5 21h17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {accent && <circle cx="12" cy="9.25" r="1.25" className="fill-gold-500" />}
    </svg>
  );
}

export function Logo({
  href = "/",
  className,
  tone = "dark",
}: {
  href?: string;
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2.5 rounded-sm",
        tone === "dark" ? "text-forest-700" : "text-paper",
        className,
      )}
    >
      <LogoMark />
      <span
        className={cn(
          "font-display text-[1.375rem] leading-none font-medium tracking-tight",
          tone === "dark" ? "text-ink" : "text-paper",
        )}
      >
        Bien-aimés
      </span>
    </Link>
  );
}
