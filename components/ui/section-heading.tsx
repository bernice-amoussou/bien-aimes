import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  as: Heading = "h2",
  id,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  as?: "h1" | "h2";
  id?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-3 text-gold-700">{eyebrow}</p>}
        <Heading
          id={id}
          className={cn(
            "font-display text-ink",
            Heading === "h1"
              ? "text-4xl leading-[1.08] sm:text-5xl"
              : "text-3xl leading-tight sm:text-[2.5rem]",
          )}
        >
          {title}
        </Heading>
        {description && (
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-muted sm:text-base">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
