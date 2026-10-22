import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader, SiteTabBar } from "@/components/layout/site-header";
import { MiniPlayer } from "@/components/player/player-controls";
import { PlayerProvider } from "@/components/player/player-provider";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <PlayerProvider>
      <SiteHeader />
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <MiniPlayer />
      <SiteTabBar />
    </PlayerProvider>
  );
}
