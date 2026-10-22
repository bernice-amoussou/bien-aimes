import type { Metadata } from "next";
import { Suspense } from "react";
import { CollaboratorsView } from "@/components/admin/collaborators-view";
import { getTeamMembers } from "@/lib/admin/data";

export const metadata: Metadata = { title: "Collaborateurs" };

export default function CollaboratorsPage() {
  return (
    <Suspense fallback={<div aria-hidden="true" className="h-64 animate-pulse rounded-lg bg-line/50" />}>
      <CollaboratorsContent />
    </Suspense>
  );
}

async function CollaboratorsContent() {
  const members = await getTeamMembers();
  return <CollaboratorsView members={members} />;
}
