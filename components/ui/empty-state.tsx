import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  icon: LucideIcon;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-3xl bg-paper-deep/60 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="mb-5 flex size-12 items-center justify-center rounded-full border border-line-strong bg-surface text-gold-700">
        <Icon aria-hidden="true" className="size-5" strokeWidth={1.5} />
      </span>
      <p className="font-display text-[1.6rem] leading-tight text-ink">{title}</p>
      {children && (
        <p className="mt-2 max-w-md text-[15px] leading-relaxed text-ink-muted">{children}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
