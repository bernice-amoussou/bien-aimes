# Bien-aimés

Archive des prédications d'une église : écoute, recherche et partage.
Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 · Supabase.

## Démarrer

```bash
npm install
npm run dev
```

Ouvrez <http://localhost:3000>.

Sans configuration, le site s'affiche sans aucune prédication.
Pour brancher la base de données, l'authentification et le stockage audio, suivez
**[supabase/README.md](./supabase/README.md)**.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` | build de production |
| `npm run start` | serveur de production (après `build`) |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | vérification TypeScript |

## Organisation

```
app/                  routes (site public, /connexion, /admin + Server Actions)
components/           interface : layout, ui, audio, sermons, forms, admin, home
lib/supabase/         clients Supabase (public mis en cache, serveur avec session, navigateur)
lib/admin/            session et rôle, données d'administration, enregistrement (upload + action)
lib/sermons.ts        lecture publique des prédications (cache invalidé à chaque modification)
lib/i18n/             traductions FR / EN
supabase/schema.sql   tables, règles RLS, fonction save_sermon, bucket audio
proxy.ts              rafraîchissement de session et protection de /admin
```
