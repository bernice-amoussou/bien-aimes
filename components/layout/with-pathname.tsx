"use client";

import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";

type Render = (pathname: string | null) => ReactNode;

function PathnameReader({ render }: { render: Render }) {
  return render(usePathname());
}

/**
 * Le chemin courant est une donnée d'URL : avec Cache Components, il doit être lu
 * sous <Suspense>. Le repli est rendu sans chemin (aucun lien marqué comme actif).
 */
export function WithPathname({ render }: { render: Render }) {
  return (
    <Suspense fallback={render(null)}>
      <PathnameReader render={render} />
    </Suspense>
  );
}
