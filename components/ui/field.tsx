import { ChevronDown, CircleAlert } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export const inputStyles = cn(
  "block w-full rounded-xl border border-line-strong bg-surface px-3.5 text-ink",
  "placeholder:text-ink-muted transition-colors",
  "hover:border-ink-muted/50",
  "focus:border-forest-500 focus:outline-none focus:ring-3 focus:ring-forest-500/15",
  "aria-invalid:border-danger-600 aria-invalid:focus:ring-danger-600/15",
  "disabled:cursor-not-allowed disabled:opacity-60",
);

export function Label({
  children,
  required,
  optionalLabel,
  className,
  ...props
}: ComponentProps<"label"> & { required?: boolean; optionalLabel?: string }) {
  return (
    <label
      className={cn("mb-2 flex items-baseline gap-1.5 text-[15px] font-medium text-ink", className)}
      {...props}
    >
      {children}
      {required && (
        <span aria-hidden="true" className="text-danger-600">
          *
        </span>
      )}
      {optionalLabel && (
        <span className="text-sm font-normal text-ink-muted">({optionalLabel})</span>
      )}
    </label>
  );
}

export function Input({
  className,
  inputSize = "md",
  ...props
}: ComponentProps<"input"> & { inputSize?: "md" | "lg" }) {
  return (
    <input
      className={cn(inputStyles, inputSize === "lg" ? "h-14 font-display text-xl" : "h-12 text-base", className)}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea className={cn(inputStyles, "min-h-28 py-2.5 text-base leading-relaxed", className)} {...props} />
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <div className={cn("relative", className)}>
      <select
        className={cn(inputStyles, "h-12 cursor-pointer appearance-none pr-10 text-base")}
        {...props}
      />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted"
        strokeWidth={1.75}
      />
    </div>
  );
}

export function FieldHint({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <p id={id} className="mt-1.5 text-sm text-ink-muted">
      {children}
    </p>
  );
}

export function FieldError({ children, id }: { children?: ReactNode; id: string }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm text-danger-600">
      <CircleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" strokeWidth={2} />
      {children}
    </p>
  );
}
