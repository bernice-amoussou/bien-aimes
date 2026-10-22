import type { Metadata } from "next";
import { PageIntro } from "@/components/layout/page-intro";
import { SermonLibrary } from "@/components/sermons/sermon-library";
import { Container } from "@/components/ui/container";
import { getSermons } from "@/lib/sermons";

export const metadata: Metadata = {
  title: "Prédications",
  description: "Rechercher une prédication par thème, verset, prédicateur ou date.",
};

export default async function SermonsPage() {
  const sermons = await getSermons();

  return (
    <>
      <PageIntro section="library" />
      <Container className="py-10 sm:py-14">
        <SermonLibrary sermons={sermons} />
      </Container>
    </>
  );
}
