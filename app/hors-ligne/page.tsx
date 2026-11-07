import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { OfflineView } from "@/components/pwa/offline-view";

export const metadata: Metadata = {
  title: "Hors ligne",
  robots: { index: false },
};

/** Page affichée par le service worker quand le réseau est indisponible. */
export default function OfflinePage() {
  return (
    <>
      <SiteHeader />
      <main id="contenu" className="flex-1">
        <OfflineView />
      </main>
      <SiteFooter />
    </>
  );
}
