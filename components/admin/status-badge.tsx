"use client";

import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/locale-provider";

export function StatusBadge({ published, className }: { published: boolean; className?: string }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-[11px] font-medium",
        published ? "bg-forest-50 text-forest-700" : "bg-sand-200 text-gold-700",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", published ? "bg-forest-500" : "bg-gold-500")}
      />
      {published ? t.admin.status.published : t.admin.status.draft}
    </span>
  );
}
