Nous passons maintenant à la phase fonctionnelle du projet **Bien-aimés**. L'interface existe déjà. Je veux connecter le site à une véritable base de données sans détruire le design actuel.

**Technologies :** Next.js, TypeScript, Supabase (PostgreSQL, Auth et stockage audio).

### Travail à réaliser

1. Inspecte d'abord le projet existant et identifie les pages et fonctionnalités déjà présentes.
2. Prépare la connexion à Supabase avec des variables d'environnement dans `.env.local`. Ne mets aucune clé secrète dans le code frontend et ne supprime pas les variables existantes.
3. Crée le schéma SQL pour les prédications : date, thème, versets bibliques, prédicateur facultatif, notes facultatives, langue et fichiers audio associés.
4. Configure les règles de sécurité RLS pour que les visiteurs puissent consulter les prédications publiées, mais que seuls les utilisateurs autorisés puissent les gérer.
5. Prépare les rôles administrateur et membre de l'équipe. L'inscription publique ne doit pas donner automatiquement des droits d'administration.
6. Connecte les pages existantes aux données réelles : liste, recherche, détails d'une prédication et lecteur audio.
7. Implémente l'ajout, la modification et la suppression des prédications dans l'espace d'administration.
8. Configure Supabase Storage pour les fichiers audio, avec les contrôles d'accès appropriés.
9. Préserve l'enregistrement audio depuis le navigateur et l'importation de fichiers audio existants. Si ces fonctionnalités ne sont pas encore opérationnelles, implémente-les.
10. Préserve le design actuel, le responsive et les langues française et anglaise.

### Méthode de travail

- Ne réécris pas inutilement les pages qui fonctionnent déjà.
- Crée un fichier SQL prêt à exécuter dans Supabase.
- Fournis les étapes exactes pour créer le projet Supabase et configurer les variables d'environnement.
- Si une action nécessite mes identifiants ou une intervention manuelle, arrête-toi à cette étape et explique-moi quoi faire.
- Lance les vérifications TypeScript, ESLint et le build, puis corrige les erreurs.

Commence par examiner le projet et réalise les modifications directement dans les fichiers. Ne te contente pas de me donner des exemples de code.