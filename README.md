# Bien-aimés

Archive des prédications d'une église : écoute, recherche et partage.
Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 · Supabase · Cloudflare R2.

| Service | Rôle |
|---|---|
| Next.js | interface et logique applicative |
| Supabase | base PostgreSQL (prédications, métadonnées des audios), connexion, rôles et permissions (RLS) |
| Cloudflare R2 | stockage de tous les fichiers audio |

## Démarrer

```bash
npm install
npm run dev
```

Ouvrez <http://localhost:3000>.

Sans configuration, le site s'affiche sans aucune prédication.
Pour brancher la base de données et l'authentification, suivez
**[supabase/README.md](./supabase/README.md)**, puis la section
**[Cloudflare R2](#cloudflare-r2--stockage-des-fichiers-audio)** ci-dessous pour le stockage audio.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` | build de production |
| `npm run start` | serveur de production (après `build`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | vérification TypeScript |
| `npm test` | tests (envoi, lecture, suppression, permissions, migration) |
| `npm run audio:status` | où sont les fichiers audio (R2 / ancien Supabase) |
| `npm run audio:migrate` | migration des anciens audios vers R2 (`-- --dry-run` pour simuler) |
| `npm run audio:verify` | contrôle de la migration |
| `npm run audio:orphans` | fichiers R2 inutilisés (`-- --delete` pour les supprimer) |

## Organisation

```
app/                  routes (site public, /connexion, /admin + Server Actions)
app/api/audio/[id]/   lecture et téléchargement : vérifie les droits puis redirige vers le fichier
components/           interface : layout, ui, audio, sermons, forms, admin, home
lib/supabase/         clients Supabase (public mis en cache, serveur avec session, navigateur)
lib/r2/               client Cloudflare R2 (serveur uniquement) : URL signées, vérification, suppression
lib/audio/            formats acceptés, envoi avec progression, lecture selon l'emplacement
lib/admin/            session et rôle, données d'administration, enregistrement (envoi + action)
lib/sermons.ts        lecture publique des prédications (cache invalidé à chaque modification)
lib/i18n/             traductions FR / EN
scripts/              migration Supabase Storage → R2, contrôle, fichiers orphelins
supabase/schema.sql   tables, règles RLS, fonctions save_sermon / mark_audio_migrated, ancien bucket
tests/                tests Vitest
proxy.ts              rafraîchissement de session et protection de /admin
```

---

## Cloudflare R2 — stockage des fichiers audio

### Fonctionnement

```
Navigateur ─1. demande d'envoi─▶ Next.js : vérifie le rôle, génère la clé, signe une URL (15 min)
Navigateur ─2. envoi du fichier─▶ R2, directement (progression, reprise après coupure réseau)
Navigateur ─3. enregistrement──▶ Next.js : vérifie sur R2 présence, taille et contenu réel ─▶ Supabase
Visiteur   ─4. /api/audio/<id>─▶ Next.js : publiée ? sinon équipe ? ─302─▶ URL R2 signée (6 h)
```

- Les identifiants R2 ne quittent jamais le serveur (aucune variable `NEXT_PUBLIC_R2_*`).
- Le bucket reste **privé** : un brouillon n'est jamais accessible au public.
- Formats acceptés : MP3, WAV, M4A, AAC, OGG, WebM. Le navigateur filtre l'extension et le type MIME ;
  le serveur vérifie ensuite la signature binaire du fichier reçu et sa taille réelle.
- Clés de stockage : `sermons/<id prédication>/<uuid>.<format>`, générées par le serveur.
  Une clé envoyée par le navigateur est toujours revalidée (dossier de la prédication, format) ;
  la base refuse aussi tout autre format (contrainte SQL) et interdit de modifier une clé après coup.
- Droits : envoyer, remplacer ou retirer un audio → membres de l'équipe ;
  supprimer une prédication et tous ses audios → administrateurs uniquement.

### 1. Créer le bucket (dans votre compte Cloudflare)

1. <https://dash.cloudflare.com> › connectez-vous › menu **R2 Object Storage**.
   La première fois, Cloudflare demande d'activer R2 (un moyen de paiement est requis,
   même dans la limite gratuite : 10 Go stockés par mois, téléchargements gratuits).
2. **Create bucket** :
   - *Bucket name* : `bien-aimes-audios`
   - *Location* : Automatic · *Default storage class* : Standard
   - **Create bucket**.
3. Dans le bucket › **Settings** › *Public access* : laissez le **R2.dev subdomain désactivé**
   et n'ajoutez pas de domaine public (recommandé ; voir « Domaine public » plus bas).

### 2. Autoriser les envois depuis le site (CORS)

Bucket › **Settings** › **CORS Policy** › **Add CORS policy** (ou *Edit*), collez, puis **Save** :

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://VOTRE-DOMAINE"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Remplacez `https://VOTRE-DOMAINE` par l'adresse publique du site. Pour tester depuis un téléphone
sur le réseau local (`npm run dev:https`), ajoutez aussi son adresse exacte, par ex.
`"https://192.168.1.81:3000"`. Seul l'envoi a besoin de CORS : la lecture passe par des redirections.

### 3. Créer la clé d'accès

1. Page **R2 Object Storage** › **Account Details** (colonne de droite) : copiez l'**Account ID**.
2. Même page › **API Tokens** › **Manage** › **Create Account API token** :
   - *Token name* : `bien-aimes-site`
   - *Permissions* : **Object Read & Write**
   - *Specify bucket(s)* : **Apply to specific buckets only** › `bien-aimes-audios`
   - *TTL* : Forever › **Create Account API Token**.
3. Copiez **Access Key ID** et **Secret Access Key** (la clé secrète n'est affichée qu'une fois).

### 4. Renseigner `.env.local`

```bash
R2_ACCOUNT_ID=…            # Account ID
R2_ACCESS_KEY_ID=…         # Access Key ID
R2_SECRET_ACCESS_KEY=…     # Secret Access Key — jamais dans une variable NEXT_PUBLIC_
R2_BUCKET_NAME=bien-aimes-audios
R2_PUBLIC_URL=             # laisser vide
```

Redémarrez `npm run dev`. En production (Vercel…), déclarez les mêmes variables dans les réglages
de l'hébergeur, puis redéployez.

### 5. Mettre à jour la base Supabase (obligatoire avant le premier envoi)

Supabase › **SQL Editor** › **New query** › collez **tout** [`supabase/schema.sql`](./supabase/schema.sql) › **Run**.
Le script est ré-exécutable et ne supprime aucune donnée. Il ajoute :

- la colonne `audio_files.storage_provider` (`supabase` pour les fichiers existants, `r2` pour les nouveaux) ;
- le contrôle du format des clés et l'interdiction de modifier une clé après coup ;
- la nouvelle version de `save_sermon` et la fonction `mark_audio_migrated` (administrateurs).

Tant que ce script n'a pas été exécuté, le site continue de lire les anciens audios, mais refuse
les nouveaux envois (« L'envoi d'audios n'est pas encore activé »).

### 6. Vérifier

Sur ordinateur **et** sur téléphone :

1. **Nouvelle prédication** › importez un MP3 ou un M4A : la barre de progression avance, puis « Prédication publiée ».
2. Enregistrez quelques secondes au micro, écoutez l'aperçu, enregistrez.
3. Sur le site public : l'audio se lit, l'avance rapide fonctionne, le téléchargement propose un nom lisible.
4. Modifiez la prédication › **Remplacer** un audio › enregistrez : le nouvel audio est lu ; dans
   Cloudflare › bucket › *Objects*, l'ancien fichier a disparu.
5. Repassez la prédication en brouillon : son lien `/api/audio/…` renvoie 404 dans une fenêtre privée.
6. Essayez d'importer un `.flac` ou une image renommée en `.mp3` : le fichier est refusé.

### 7. Migrer les anciens audios Supabase vers R2

Le script se connecte avec un compte **administrateur** (`MIGRATION_EMAIL` / `MIGRATION_PASSWORD`,
ou à défaut `TEAM_LOGIN_EMAIL` / `TEAM_LOGIN_ACCOUNT_PASSWORD`). Il n'utilise aucune clé `service_role`.

```bash
npm run audio:status                 # combien de fichiers restent sur Supabase
npm run audio:migrate -- --dry-run   # simulation : n'écrit rien
npm run audio:migrate                # copie vers R2, vérifie, puis bascule chaque fichier
npm run audio:verify                 # doit afficher « ✓ Tous les fichiers sont sur R2 »
```

- **Aucun fichier n'est supprimé** de Supabase Storage.
- La clé R2 est identique au chemin Supabase : pas de doublon. Les identifiants des prédications
  et des fichiers, ainsi que leurs liens, ne changent pas.
- Relançable sans risque : un fichier déjà migré est ignoré, une copie partielle est refaite,
  et l'échec d'un fichier n'empêche pas la migration des autres.
- Un fichier ne passe à `r2` qu'après vérification de la copie (taille identique).

Après la migration, écoutez quelques anciennes prédications sur le site pour valider.

### 8. Retirer l'ancien stockage (plus tard, après validation)

Seulement quand `npm run audio:verify` est vert et que les écoutes ont été validées
(attendez quelques semaines) : Supabase › **Storage** › `sermon-audio` › supprimez les fichiers.
Rien dans le code ne le fait automatiquement. Ne le faites pas tant que `npm run audio:status`
indique des fichiers « encore sur Supabase ».

### Envois interrompus

- Coupure réseau pendant l'envoi : jusqu'à 3 tentatives automatiques ; un envoi bloqué 60 s est relancé.
- Échec définitif ou refus du serveur : les fichiers déjà envoyés sont supprimés, la prédication
  n'est pas modifiée et un message explique quoi faire.
- Onglet fermé en plein envoi : le site prévient avant la fermeture. Un fichier resté sur R2 est
  repéré par `npm run audio:orphans` (fichiers inutilisés depuis plus de 24 h), puis supprimé
  avec `npm run audio:orphans -- --delete`.

### Domaine public (facultatif)

`R2_PUBLIC_URL` permet de servir les audios **publiés** par un domaine public (bucket › *Settings* ›
*Custom Domains*, domaine géré par Cloudflare) au lieu d'URL signées : les fichiers sont mis en cache
par Cloudflare, mais **tout fichier du bucket devient lisible par quiconque connaît sa clé**, brouillons
compris (les clés restent aléatoires et ne sont jamais affichées). Le téléchargement et les brouillons
utilisent toujours des URL signées. Laissez cette variable vide si vous n'en avez pas besoin.
