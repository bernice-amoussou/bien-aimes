import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link" | "inverse" | "ghostInverse";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-forest-700 text-paper hover:bg-forest-800 active:bg-forest-900 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]",
  secondary:
    "border border-line-strong bg-surface text-ink hover:border-ink-muted/60 hover:bg-paper",
  ghost: "text-ink-soft hover:bg-paper-deep hover:text-ink",
  danger: "bg-danger-600 text-white hover:bg-danger-700",
  link: "text-forest-700 underline-offset-4 hover:underline px-0! h-auto!",
  /* Sur fond vert forêt */
  inverse: "bg-paper text-forest-800 hover:bg-sand-100 active:bg-sand-200",
  ghostInverse: "text-paper/85 hover:bg-white/10 hover:text-paper",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-3 text-[13px]",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-12 gap-2.5 px-6 text-[15px]",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors",
    "disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

type StyleProps = { variant?: Variant; size?: Size };

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & StyleProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, className })}
      {...props}
    />
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={buttonStyles({ variant, size, className })} {...props} />;
}

/** Bouton carré ne contenant qu'une icône : `label` est obligatoire pour l'accessibilité. */
export function IconButton({
  label,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { label: string }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-md text-ink-soft transition-colors",
        "hover:bg-paper-deep hover:text-ink disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}
