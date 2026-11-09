/**
 * Logique de migration des fichiers audio Supabase Storage → Cloudflare R2.
 * Sans dépendance : les accès réseau sont fournis par l'appelant (testable).
 *
 * Garanties :
 * - aucun fichier n'est supprimé, ni dans Supabase, ni dans R2 ;
 * - la clé R2 est identique au chemin Supabase : pas de doublon, et une relance
 *   reprend là où la précédente s'est arrêtée ;
 * - une ligne n'est basculée vers R2 qu'après vérification de la copie (taille) ;
 * - l'échec d'un fichier n'arrête pas les autres.
 */

/** Même format que isValidStoredKey (lib/audio/formats.ts). */
const STORED_KEY_PATTERN =
  /^sermons\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9_-]{1,64}\.[a-z0-9]{1,8}$/;

const CONTENT_TYPES = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/ogg",
  webm: "audio/webm",
  flac: "audio/flac",
};

export function isValidStoredKey(key) {
  return typeof key === "string" && STORED_KEY_PATTERN.test(key);
}

export function contentTypeFor(row) {
  return row.mime_type || CONTENT_TYPES[String(row.format).toLowerCase()] || "application/octet-stream";
}

function sizeOf(row) {
  return row.size_bytes === null || row.size_bytes === undefined ? null : Number(row.size_bytes);
}

/**
 * @param {Array<{id: string, storage_path: string, storage_provider: string, size_bytes: number|null, mime_type: string|null, format: string}>} rows
 * @param {{
 *   head: (key: string) => Promise<{size: number} | null>,
 *   download: (path: string) => Promise<Uint8Array>,
 *   put: (key: string, body: Uint8Array, contentType: string) => Promise<void>,
 *   markMigrated: (id: string) => Promise<boolean>,
 * }} deps
 * @param {{ dryRun?: boolean, log?: (message: string) => void }} [options]
 */
export async function migrateRows(rows, deps, { dryRun = false, log = () => {} } = {}) {
  const report = { pending: 0, copied: 0, reused: 0, marked: 0, alreadyMigrated: 0, planned: 0, failed: [] };

  for (const row of rows) {
    if (row.storage_provider !== "supabase") {
      report.alreadyMigrated += 1;
      continue;
    }
    report.pending += 1;
    const key = row.storage_path;

    try {
      if (!isValidStoredKey(key)) throw new Error("clé de stockage invalide");

      let existing = await deps.head(key);
      const expected = sizeOf(row);
      let reuse = existing !== null && expected !== null && existing.size === expected;

      if (!reuse) {
        const body = await deps.download(key);
        if (!body || body.byteLength === 0) throw new Error("fichier source vide ou introuvable");
        if (expected !== null && body.byteLength !== expected) {
          log(`  ! ${key} : taille source ${body.byteLength} ≠ taille enregistrée ${expected} (copie quand même)`);
        }
        if (existing !== null && existing.size === body.byteLength) {
          reuse = true;
        } else if (dryRun) {
          report.planned += 1;
          log(`  → copierait ${key} (${body.byteLength} octets)`);
          continue;
        } else {
          await deps.put(key, body, contentTypeFor(row));
          existing = await deps.head(key);
          if (!existing || existing.size !== body.byteLength) {
            throw new Error("vérification de la copie sur R2 échouée");
          }
          report.copied += 1;
          log(`  ✓ copié ${key}`);
        }
      }

      if (reuse) {
        report.reused += 1;
        log(`  = déjà sur R2 ${key}`);
      }
      // Simulation : rien n'est écrit, ni sur R2 ni en base.
      if (dryRun) continue;
      if (await deps.markMigrated(row.id)) report.marked += 1;
    } catch (error) {
      report.failed.push({ id: row.id, path: key, error: error instanceof Error ? error.message : String(error) });
      log(`  ✗ ${key} : ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return report;
}

/**
 * Contrôle après migration : chaque fichier « r2 » existe sur R2 avec la bonne taille.
 * @param {Array<{id: string, storage_path: string, storage_provider: string, size_bytes: number|null}>} rows
 * @param {{ head: (key: string) => Promise<{size: number} | null> }} deps
 */
export async function verifyRows(rows, deps) {
  const report = { ok: 0, pending: [], missing: [], sizeMismatch: [] };
  for (const row of rows) {
    if (row.storage_provider !== "r2") {
      report.pending.push(row.storage_path);
      continue;
    }
    const head = isValidStoredKey(row.storage_path) ? await deps.head(row.storage_path) : null;
    const expected = sizeOf(row);
    if (!head) report.missing.push(row.storage_path);
    else if (expected !== null && head.size !== expected) report.sizeMismatch.push(row.storage_path);
    else report.ok += 1;
  }
  return report;
}

/**
 * Objets R2 qui ne correspondent à aucun fichier enregistré (envoi interrompu, onglet fermé…).
 * Les objets récents sont ignorés : un envoi peut être en cours.
 * @param {Array<{key: string, lastModified: Date | null}>} objects
 * @param {Set<string>} referencedKeys
 */
export function findOrphans(objects, referencedKeys, { now = new Date(), minAgeMs = 24 * 3600 * 1000 } = {}) {
  return objects.filter(
    (object) =>
      object.key.startsWith("sermons/") &&
      !referencedKeys.has(object.key) &&
      object.lastModified !== null &&
      now.getTime() - object.lastModified.getTime() >= minAgeMs,
  );
}
