# Mise en service de Supabase — Bien-aimés

Ce guide prend environ 15 minutes. Tant que ces étapes ne sont pas faites, le site
n'affiche aucune prédication et l'espace `/admin` indique qu'il n'est pas encore activé.

---

## 1. Créer le projet

1. Allez sur <https://supabase.com/dashboard> et connectez-vous (ou créez un compte).
2. **New project** :
   - *Name* : `bien-aimes`
   - *Database password* : générez-en un et conservez-le (gestionnaire de mots de passe).
   - *Region* : la plus proche de vos visiteurs (ex. *Central EU (Frankfurt)* ou *West EU (Paris)*).
3. Attendez la fin de la création (1 à 2 minutes).

## 2. Créer les tables, les règles de sécurité et le stockage

1. Menu de gauche › **SQL Editor** › **New query**.
2. Copiez **tout** le contenu de [`schema.sql`](./schema.sql), collez-le, puis **Run**.
3. Résultat attendu : `Success. No rows returned`.

Le script crée :

| Élément | Rôle |
|---|---|
| `sermons` | prédications : date, thème, versets, notes, langue, publiée ou non |
| `audio_files` | fichiers audio liés à une prédication (plusieurs par prédication) |
| `team_members` | membres de l'équipe et leur rôle (`admin` ou `member`) |
| `save_sermon()` | enregistrement d'une prédication et de ses fichiers en une seule transaction |
| bucket `sermon-audio` | stockage des fichiers audio |
| règles RLS | voir le tableau des droits ci-dessous |

Le script est ré-exécutable : vous pouvez le relancer sans perdre de données.

## 3. Sécuriser l'authentification

**Authentication › Sign In / Providers** (selon la version du tableau de bord : *Authentication › Providers* ou *Settings*) :

- **Email** : activé.
- **Allow new users to sign up** : **désactivé** (recommandé). Les comptes de l'équipe sont créés par vous.
  Même si l'inscription restait ouverte, un nouveau compte n'aurait **aucun droit** : seuls les
  comptes présents dans `team_members` peuvent gérer les prédications.

## 4. Créer votre compte et vous déclarer administrateur

1. **Authentication › Users › Add user › Create new user**
   - Saisissez votre e-mail et un mot de passe solide.
   - Cochez **Auto Confirm User**.
2. **SQL Editor › New query**, remplacez l'adresse puis **Run** :

```sql
insert into public.team_members (user_id, email, role)
select id, email, 'admin' from auth.users where email = 'vous@exemple.org'
on conflict (user_id) do update set role = 'admin';
```

Résultat attendu : `Success. 1 row affected`. Si `0 rows`, l'adresse ne correspond à aucun compte.

**Ajouter ensuite un membre de l'équipe** (peut ajouter et modifier, pas supprimer) :
créez son compte comme ci-dessus, puis :

```sql
insert into public.team_members (user_id, email, role)
select id, email, 'member' from auth.users where email = 'membre@exemple.org'
on conflict (user_id) do nothing;
```

## 5. Taille maximale des fichiers audio

**Storage › Settings › Upload file size limit** : 50 Mo sur l'offre gratuite (un MP3 d'une heure
à 96 kbit/s fait environ 43 Mo). Sur une offre payante, vous pouvez l'augmenter ; reportez alors la
même valeur dans `NEXT_PUBLIC_AUDIO_MAX_MB` (étape 6).

## 6. Renseigner les variables d'environnement

1. **Project Settings › API Keys** (ou le bouton **Connect** en haut du tableau de bord) :
   - *Project URL* → `NEXT_PUBLIC_SUPABASE_URL`
   - *Publishable key* (`sb_publishable_…`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
     (sur un ancien projet : la clé **anon public** convient aussi).
2. Ouvrez le fichier `.env.local` à la racine du projet (déjà créé, vide) et complétez :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxx
NEXT_PUBLIC_AUDIO_MAX_MB=50
```

> **Ne copiez jamais la clé `service_role` / `secret`** dans ce fichier ni ailleurs dans le projet.
> L'application n'en a pas besoin : toute la sécurité repose sur les règles RLS.
> `.env.local` est exclu de Git (`.gitignore`).

3. Redémarrez le serveur : arrêtez `npm run dev` (Ctrl+C) puis relancez-le.
   Les variables `NEXT_PUBLIC_*` sont lues au démarrage et au build.

## 7. Vérifier

1. <http://localhost:3000> : la liste des prédications indique « Aucune prédication pour le moment »
   (ou affiche vos prédications publiées).
2. <http://localhost:3000/admin> : redirection vers la connexion.
3. Connectez-vous avec le compte de l'étape 4 : le tableau de bord affiche votre e-mail et « Administrateur ».
4. **Nouvelle prédication** : ajoutez un fichier ou enregistrez quelques secondes, cochez
   **Publier sur le site**, validez.
5. La prédication apparaît sur le site public et son audio se lit.

## Droits appliqués (RLS)

| Action | Visiteur | Compte hors équipe | Membre | Administrateur |
|---|:-:|:-:|:-:|:-:|
| Lire les prédications publiées et leurs audios | ✓ | ✓ | ✓ | ✓ |
| Lire les brouillons | – | – | ✓ | ✓ |
| Créer / modifier une prédication, ajouter des audios | – | – | ✓ | ✓ |
| Supprimer une prédication | – | – | – | ✓ |
| Voir toute l'équipe, gérer les rôles (SQL) | – | – | – | ✓ |

Les fichiers audio sont servis par des URL publiques (bucket public en lecture) : c'est ce qui permet
au lecteur et au téléchargement de fonctionner sans connexion. Les chemins contiennent des identifiants
aléatoires ; un fichier rattaché à un brouillon n'est référencé nulle part sur le site public.

## Mise en ligne (Vercel ou autre hébergeur)

Déclarez les trois mêmes variables dans les réglages d'environnement de l'hébergeur, puis redéployez.
Dans Supabase, **Authentication › URL Configuration › Site URL** : indiquez l'adresse publique du site.

## Régénérer les types TypeScript (facultatif)

`lib/supabase/database.types.ts` est écrit à la main d'après `schema.sql` et exporte aussi des types
utilisés par l'application (`SermonRow`, `SaveSermonPayload`…). Si vous modifiez le schéma, générez les
types dans un **autre** fichier, puis reportez les différences à la main :

```bash
npx supabase login
npx supabase gen types typescript --project-id <id-du-projet> > lib/supabase/generated.types.ts
```
