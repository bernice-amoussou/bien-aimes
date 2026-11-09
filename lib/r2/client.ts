import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Env, type R2Env } from "./config";

/**
 * Accès à Cloudflare R2 via son API compatible S3 (SDK AWS v3).
 * Toutes les opérations s'exécutent sur le serveur ; le navigateur ne reçoit
 * que des URL signées, limitées à un objet, une opération et une durée.
 */

/** Durée de validité d'une URL d'envoi. */
export const UPLOAD_URL_TTL_SECONDS = 15 * 60;
/** Durée de validité d'une URL de lecture (une écoute longue avec des retours en arrière doit tenir). */
export const READ_URL_TTL_SECONDS = 6 * 60 * 60;

let cached: { env: R2Env; client: S3Client } | null = null;

function requireR2(): { env: R2Env; client: S3Client } {
  const env = getR2Env();
  if (!env) throw new Error("Cloudflare R2 n'est pas configuré (variables R2_* de .env.local).");
  if (!cached || cached.env.accessKeyId !== env.accessKeyId || cached.env.bucket !== env.bucket) {
    cached = {
      env,
      client: new S3Client({
        region: "auto",
        endpoint: `https://${env.accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey },
        // Recommandé par Cloudflare : sans cela, le SDK ajoute aux URL signées des sommes
        // de contrôle que le navigateur ne peut pas fournir et l'envoi échoue.
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
      }),
    };
  }
  return cached;
}

/** URL signée pour envoyer UN objet avec ce type MIME (requête PUT du navigateur). */
export async function presignAudioUpload(key: string, contentType: string): Promise<string> {
  const { env, client } = requireR2();
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: env.bucket,
      Key: key,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS },
  );
}

/** URL de lecture : domaine public si configuré (lecture seule), sinon URL signée. */
export async function audioReadUrl(
  key: string,
  options: { allowPublic: boolean; downloadName?: string; contentType?: string },
): Promise<string> {
  const { env, client } = requireR2();
  if (options.allowPublic && env.publicUrl && !options.downloadName) {
    return `${env.publicUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
  }
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: env.bucket,
      Key: key,
      ResponseContentType: options.contentType,
      ResponseContentDisposition: options.downloadName ? contentDisposition(options.downloadName) : undefined,
    }),
    { expiresIn: READ_URL_TTL_SECONDS },
  );
}

/** En-tête Content-Disposition compatible avec les accents (RFC 6266 / 5987). */
export function contentDisposition(fileName: string): string {
  const fallback = fileName.normalize("NFD").replace(/[^\x20-\x7e]/g, "").replace(/["\\]/g, "") || "predication";
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export interface StoredObjectInfo {
  size: number;
  contentType: string | null;
}

function isNotFound(error: unknown): boolean {
  const e = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return e?.name === "NotFound" || e?.name === "NoSuchKey" || e?.$metadata?.httpStatusCode === 404;
}

/** Informations sur un objet, ou `null` s'il n'existe pas. */
export async function headAudioObject(key: string): Promise<StoredObjectInfo | null> {
  const { env, client } = requireR2();
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: env.bucket, Key: key }));
    return { size: head.ContentLength ?? 0, contentType: head.ContentType ?? null };
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

/** Premiers octets d'un objet (reconnaissance du format réel). */
export async function readAudioObjectStart(key: string, length: number): Promise<Uint8Array> {
  const { env, client } = requireR2();
  const object = await client.send(
    new GetObjectCommand({ Bucket: env.bucket, Key: key, Range: `bytes=0-${length - 1}` }),
  );
  return object.Body ? await object.Body.transformToByteArray() : new Uint8Array();
}

/** Supprime des objets ; une clé absente n'est pas une erreur. Renvoie les clés en échec. */
export async function deleteAudioObjects(keys: string[]): Promise<string[]> {
  if (keys.length === 0) return [];
  const { env, client } = requireR2();
  const failed: string[] = [];
  for (const key of keys) {
    try {
      await client.send(new DeleteObjectCommand({ Bucket: env.bucket, Key: key }));
    } catch (error) {
      console.error("Suppression R2", key, error);
      failed.push(key);
    }
  }
  return failed;
}
