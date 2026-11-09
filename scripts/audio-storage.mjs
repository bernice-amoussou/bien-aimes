#!/usr/bin/env node
/**
 * Outils de stockage audio — à lancer depuis la racine du projet :
 *
 *   npm run audio:status                 état : fichiers sur R2 / encore sur Supabase
 *   npm run audio:migrate -- --dry-run   simulation de la migration (n'écrit rien)
 *   npm run audio:migrate                copie Supabase Storage → R2 (relançable)
 *   npm run audio:verify                 contrôle que chaque fichier « r2 » existe sur R2
 *   npm run audio:orphans                liste les fichiers R2 non utilisés (> 24 h)
 *   npm run audio:orphans -- --delete    … et les supprime
 *
 * Variables lues dans .env.local : NEXT_PUBLIC_SUPABASE_URL,
 * NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, R2_* et, pour se connecter en tant
 * qu'administrateur : MIGRATION_EMAIL / MIGRATION_PASSWORD (à défaut
 * TEAM_LOGIN_EMAIL / TEAM_LOGIN_ACCOUNT_PASSWORD). Aucune clé « service_role ».
 *
 * Ce script ne supprime JAMAIS de fichier dans Supabase Storage.
 */
import {
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { findOrphans, migrateRows, verifyRows } from "./lib/audio-migration.mjs";

const LEGACY_BUCKET = "sermon-audio";

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function env(name) {
  return process.env[name]?.trim() || "";
}

function requireEnv(names) {
  const missing = names.filter((name) => !env(name));
  if (missing.length > 0) fail(`Variables manquantes dans .env.local : ${missing.join(", ")}`);
}

function r2() {
  requireEnv(["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"]);
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env("R2_ACCESS_KEY_ID"), secretAccessKey: env("R2_SECRET_ACCESS_KEY") },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  const Bucket = env("R2_BUCKET_NAME");

  return {
    async head(key) {
      try {
        const head = await client.send(new HeadObjectCommand({ Bucket, Key: key }));
        return { size: head.ContentLength ?? 0 };
      } catch (error) {
        if (error?.name === "NotFound" || error?.$metadata?.httpStatusCode === 404) return null;
        throw error;
      }
    },
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
    },
    async list(prefix) {
      const objects = [];
      let ContinuationToken;
      do {
        const page = await client.send(new ListObjectsV2Command({ Bucket, Prefix: prefix, ContinuationToken }));
        for (const item of page.Contents ?? []) {
          objects.push({ key: item.Key, lastModified: item.LastModified ?? null, size: item.Size ?? 0 });
        }
        ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (ContinuationToken);
      return objects;
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
    },
  };
}

async function supabaseAsAdmin() {
  requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]);
  const email = env("MIGRATION_EMAIL") || env("TEAM_LOGIN_EMAIL");
  const password = process.env.MIGRATION_PASSWORD || process.env.TEAM_LOGIN_ACCOUNT_PASSWORD || "";
  if (!email || !password) {
    fail("Renseignez MIGRATION_EMAIL et MIGRATION_PASSWORD (compte administrateur) dans .env.local.");
  }
  const supabase = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
  });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) fail(`Connexion Supabase impossible pour ${email} : ${error.message}`);
  const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin");
  if (roleError) fail(`Vérification du rôle impossible : ${roleError.message}`);
  if (!isAdmin) fail(`${email} n'est pas administrateur (table team_members).`);
  return supabase;
}

async function allAudioRows(supabase) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("audio_files")
      .select("id, sermon_id, storage_path, storage_provider, size_bytes, mime_type, format")
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) {
      if (/storage_provider/.test(error.message)) {
        fail("La colonne storage_provider est absente : exécutez d'abord supabase/schema.sql dans Supabase.");
      }
      fail(`Lecture de audio_files impossible : ${error.message}`);
    }
    rows.push(...data);
    if (data.length < pageSize) return rows;
  }
}

function count(rows) {
  const r2Count = rows.filter((r) => r.storage_provider === "r2").length;
  return { total: rows.length, r2: r2Count, supabase: rows.length - r2Count };
}

async function status() {
  const supabase = await supabaseAsAdmin();
  const c = count(await allAudioRows(supabase));
  console.log(`\nFichiers audio : ${c.total}`);
  console.log(`  sur Cloudflare R2        : ${c.r2}`);
  console.log(`  encore sur Supabase      : ${c.supabase}`);
  console.log(c.supabase === 0 ? "\n✓ Migration terminée (lancez « npm run audio:verify » pour contrôler).\n" : "");
}

async function migrate(dryRun) {
  const supabase = await supabaseAsAdmin();
  const target = r2();
  const rows = await allAudioRows(supabase);
  const before = count(rows);
  console.log(`\n${dryRun ? "SIMULATION — rien ne sera écrit." : "Migration Supabase Storage → Cloudflare R2"}`);
  console.log(`${before.supabase} fichier(s) à migrer, ${before.r2} déjà sur R2.\n`);

  const report = await migrateRows(
    rows,
    {
      head: (key) => target.head(key),
      put: (key, body, contentType) => target.put(key, body, contentType),
      async download(path) {
        const { data, error } = await supabase.storage.from(LEGACY_BUCKET).download(path);
        if (error || !data) throw new Error(`téléchargement Supabase impossible (${error?.message ?? "vide"})`);
        return new Uint8Array(await data.arrayBuffer());
      },
      async markMigrated(id) {
        const { data, error } = await supabase.rpc("mark_audio_migrated", { p_id: id });
        if (error) throw new Error(`mise à jour de la base impossible (${error.message})`);
        return data === true;
      },
    },
    { dryRun, log: (message) => console.log(message) },
  );

  console.log("\nRésumé");
  console.log(`  copiés vers R2              : ${report.copied}`);
  console.log(`  déjà présents sur R2        : ${report.reused}`);
  if (dryRun) console.log(`  seraient copiés             : ${report.planned}`);
  else console.log(`  basculés vers R2 en base    : ${report.marked}`);
  console.log(`  en échec                    : ${report.failed.length}`);
  for (const failure of report.failed) console.log(`    - ${failure.path} : ${failure.error}`);
  console.log("\nAucun fichier n'a été supprimé de Supabase Storage.");
  if (report.failed.length > 0) {
    console.log("Corrigez la cause puis relancez la commande : les fichiers déjà migrés sont ignorés.\n");
    process.exit(1);
  }
  console.log(dryRun ? "" : "Étape suivante : npm run audio:verify\n");
}

async function verify() {
  const supabase = await supabaseAsAdmin();
  const target = r2();
  const report = await verifyRows(await allAudioRows(supabase), { head: (key) => target.head(key) });
  console.log(`\nVérifiés sur R2       : ${report.ok}`);
  console.log(`Absents de R2         : ${report.missing.length}`);
  for (const key of report.missing) console.log(`  - ${key}`);
  console.log(`Taille différente     : ${report.sizeMismatch.length}`);
  for (const key of report.sizeMismatch) console.log(`  - ${key}`);
  console.log(`Encore sur Supabase   : ${report.pending.length}`);
  const ok = report.missing.length === 0 && report.sizeMismatch.length === 0 && report.pending.length === 0;
  console.log(ok ? "\n✓ Tous les fichiers sont sur R2.\n" : "\n✗ Migration incomplète : voir ci-dessus.\n");
  if (!ok) process.exit(1);
}

async function orphans(remove, minAgeHours) {
  const supabase = await supabaseAsAdmin();
  const target = r2();
  const rows = await allAudioRows(supabase);
  const referenced = new Set(rows.map((row) => row.storage_path));
  const found = findOrphans(await target.list("sermons/"), referenced, { minAgeMs: minAgeHours * 3600 * 1000 });
  console.log(`\nFichiers R2 non utilisés depuis plus de ${minAgeHours} h : ${found.length}`);
  for (const object of found) console.log(`  - ${object.key} (${object.size} octets)`);
  if (!remove) {
    if (found.length > 0) console.log("\nPour les supprimer : npm run audio:orphans -- --delete\n");
    return;
  }
  for (const object of found) await target.remove(object.key);
  console.log(`\n✓ ${found.length} fichier(s) supprimé(s) de R2.\n`);
}

const [command, ...args] = process.argv.slice(2);
const flag = (name) => args.includes(name);
const minAgeArg = args.find((a) => a.startsWith("--min-age-hours="));
const minAgeHours = minAgeArg ? Math.max(1, Number(minAgeArg.split("=")[1]) || 24) : 24;

const commands = {
  status: () => status(),
  migrate: () => migrate(flag("--dry-run")),
  verify: () => verify(),
  orphans: () => orphans(flag("--delete"), minAgeHours),
};

if (!commands[command]) {
  console.log("Usage : node scripts/audio-storage.mjs <status|migrate|verify|orphans> [--dry-run] [--delete]");
  process.exit(command ? 1 : 0);
}

commands[command]().catch((error) => fail(error instanceof Error ? error.message : String(error)));
