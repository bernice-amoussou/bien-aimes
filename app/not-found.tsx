import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { NotFoundView } from "@/components/layout/not-found-view";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="contenu" className="flex-1">
        <NotFoundView />
      </main>
      <SiteFooter />
    </>
  );
}
