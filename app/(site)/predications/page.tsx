import type { Metadata } from "next";
import { SermonLibraryWithQuery } from "@/components/sermons/sermon-library";
import { Container } from "@/components/ui/container";
import { getSermons } from "@/lib/sermons";

export const metadata: Metadata = {
  title: "Prédications",
  description: "Rechercher une prédication par thème, verset ou date.",
};

export default async function SermonsPage() {
  const sermons = await getSermons();

  return (
    <Container narrow className="py-6 sm:py-10">
      <SermonLibraryWithQuery sermons={sermons} />
    </Container>
  );
}
