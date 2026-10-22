import type { Metadata } from "next";
import { Suspense } from "react";
import { EditSermonView } from "@/components/admin/sermon-editor";

export const metadata: Metadata = { title: "Modifier une prédication" };

export default function EditSermonPage({ params }: PageProps<"/admin/predications/[id]/modifier">) {
  return (
    <Suspense fallback={<div aria-hidden="true" className="h-64 animate-pulse rounded-lg bg-line/50" />}>
      <EditSermonContent params={params} />
    </Suspense>
  );
}

async function EditSermonContent({
  params,
}: Pick<PageProps<"/admin/predications/[id]/modifier">, "params">) {
  const { id } = await params;
  return <EditSermonView id={decodeURIComponent(id)} />;
}
