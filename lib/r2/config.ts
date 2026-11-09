import "server-only";

/**
 * Configuration Cloudflare R2, lue UNIQUEMENT côté serveur.
 * Ces variables ne doivent jamais être préfixées par NEXT_PUBLIC_ :
 * Next.js ne les envoie donc jamais au navigateur.
 */
export interface R2Env {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** Domaine public du bucket (facultatif), ex. https://audio.exemple.org — sans « / » final. */
  publicUrl: string | null;
}

export function getR2Env(): R2Env | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;

  const rawPublicUrl = process.env.R2_PUBLIC_URL?.trim();
  let publicUrl: string | null = null;
  if (rawPublicUrl) {
    try {
      const url = new URL(rawPublicUrl);
      if (url.protocol === "https:") publicUrl = url.href.replace(/\/+$/, "");
    } catch {
      // URL mal formée : ignorée, les URL signées prennent le relais.
    }
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

export function isR2Configured(): boolean {
  return getR2Env() !== null;
}
