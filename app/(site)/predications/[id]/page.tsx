import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SermonDetail, SermonDetailSkeleton } from "@/components/sermons/sermon-detail";
import { getRelatedSermons, getSermonById, getSermons } from "@/lib/sermons";

export async function generateStaticParams() {
  const sermons = await getSermons();
  // Cache Components exige au moins un paramètre ; une base encore vide
  // renvoie un identifiant fictif, résolu en « introuvable ».
  if (sermons.length === 0) return [{ id: "aucune" }];
  return sermons.map((sermon) => ({ id: sermon.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/predications/[id]">): Promise<Metadata> {
  const { id } = await params;
  const sermon = await getSermonById(id);
  if (!sermon) return { title: "Prédication introuvable" };
  return {
    title: sermon.title,
    description: sermon.scriptureReferences.join(", "),
  };
}

export default function SermonPage({ params }: PageProps<"/predications/[id]">) {
  return (
    <Suspense fallback={<SermonDetailSkeleton />}>
      <SermonContent params={params} />
    </Suspense>
  );
}

async function SermonContent({ params }: Pick<PageProps<"/predications/[id]">, "params">) {
  const { id } = await params;
  const sermon = await getSermonById(id);
  if (!sermon) notFound();
  const related = await getRelatedSermons(sermon);
  return <SermonDetail sermon={sermon} related={related} />;
}
