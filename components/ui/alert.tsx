import { CircleAlert, CircleCheck, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "info" | "success" | "error" | "notice";

const TONES: Record<Tone, { box: string; icon: typeof Info }> = {
  info: { box: "border-line bg-paper-deep/70 text-ink-soft", icon: Info },
  notice: { box: "border-gold-400/40 bg-sand-100 text-ink-soft", icon: Info },
  success: { box: "border-forest-300/60 bg-forest-50 text-forest-900", icon: CircleCheck },
  error: { box: "border-danger-600/25 bg-danger-50 text-danger-700", icon: CircleAlert },
};

export function Alert({
  tone = "info",
  title,
  children,
  action,
  className,
  role,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  role?: "status" | "alert";
}) {
  const { box, icon: Icon } = TONES[tone];
  return (
    <div role={role} className={cn("flex gap-3 rounded-md border px-4 py-3 text-sm", box, className)}>
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
      <div className="min-w-0 flex-1 leading-relaxed">
        {title && <p className="font-medium text-current">{title}</p>}
        {children && <div className={cn(title ? "mt-0.5" : undefined, "opacity-90")}>{children}</div>}
        {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  );
}
