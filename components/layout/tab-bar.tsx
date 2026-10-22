"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { MouseEvent } from "react";
import { cn } from "@/lib/cn";
import { WithPathname } from "./with-pathname";

export interface TabItem {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
  /** Action mise en avant (ex. « Ajouter ») : pastille pleine. */
  prominent?: boolean;
  onClick?: (event: MouseEvent<HTMLAnchorElement>, pathname: string | null) => void;
}

function Tabs({ items, pathname }: { items: TabItem[]; pathname: string | null }) {
  return (
    <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((item) => {
        const active = pathname !== null && item.isActive(pathname);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={(event) => item.onClick?.(event, pathname)}
              className={cn(
                "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                active ? "text-forest-800" : "text-ink-muted hover:text-ink",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                  item.prominent
                    ? "bg-forest-700 text-paper"
                    : active && "bg-forest-100 text-forest-800",
                )}
              >
                <Icon aria-hidden="true" className="size-[22px]" strokeWidth={active || item.prominent ? 2 : 1.75} />
              </span>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Barre d'onglets fixée en bas de l'écran sur mobile : les destinations
 * principales restent à portée du pouce. Masquée à partir de la tablette.
 */
export function TabBar({ items, label }: { items: TabItem[]; label: string }) {
  return (
    <>
      <div aria-hidden="true" className="h-[calc(4rem+env(safe-area-inset-bottom))] md:hidden" />
      <nav
        aria-label={label}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <WithPathname render={(pathname) => <Tabs items={items} pathname={pathname} />} />
      </nav>
    </>
  );
}
