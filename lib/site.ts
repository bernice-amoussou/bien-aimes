/** Configuration générale du site. */
export const SITE = {
  name: "Bien-aimés",
  /** Année affichée dans la mention de droits d'auteur (valeur fixe, évite toute horloge au prérendu). */
  copyrightYear: 2026,
  /**
   * Contact public de l'église. Laissé vide tant qu'aucune information réelle
   * n'est fournie : le pied de page n'affiche alors aucun lien de contact.
   */
  contactEmail: null as string | null,
} as const;
