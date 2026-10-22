import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Conteneur centré. `narrow` : colonne de lecture (listes, page d'une prédication). */
export function Container({ className, narrow = false, ...props }: ComponentProps<"div"> & { narrow?: boolean }) {
  return (
    <div
      className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", narrow ? "max-w-3xl" : "max-w-6xl", className)}
      {...props}
    />
  );
}
