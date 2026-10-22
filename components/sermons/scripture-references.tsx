import { BookOpen } from "lucide-react";
import { cn } from "@/lib/cn";

export function ScriptureReferences({
  references,
  label,
  className,
  tone = "default",
}: {
  references: string[];
  label: string;
  className?: string;
  tone?: "default" | "light";
}) {
  if (references.length === 0) return null;
  return (
    <p
      className={cn(
        "flex items-start gap-2 text-sm",
        tone === "light" ? "text-paper/80" : "text-ink-soft",
        className,
      )}
    >
      <BookOpen
        aria-hidden="true"
        className={cn("mt-0.5 size-3.5 shrink-0", tone === "light" ? "text-gold-400" : "text-gold-500")}
        strokeWidth={1.75}
      />
      <span className="sr-only">{label} : </span>
      <span>
        {references.map((reference, index) => (
          <span key={reference}>
            {index > 0 && (
              <span aria-hidden="true" className="mx-1.5 opacity-50">
                ·
              </span>
            )}
            <span className="whitespace-nowrap">{reference}</span>
          </span>
        ))}
      </span>
    </p>
  );
}
