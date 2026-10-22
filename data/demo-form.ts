import type { SermonDraft } from "@/types/sermon";

/** Valeurs d'exemple préremplies dans le formulaire de création. */
export const DEMO_SERMON_DRAFT: SermonDraft = {
  date: "2026-10-18",
  title: "La foi qui déplace les montagnes",
  scriptureReferences: ["Matthieu 17:20"],
  preacher: "",
  notes: "",
  language: "fr",
  published: false,
};

export const EMPTY_SERMON_DRAFT: SermonDraft = {
  date: "",
  title: "",
  scriptureReferences: [""],
  preacher: "",
  notes: "",
  language: "fr",
  published: false,
};
