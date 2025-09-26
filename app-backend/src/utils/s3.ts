import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import path from "path";
import fs from "fs/promises";
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const region = process.env.S3_REGION || 'eu-west-1';
const s3 = new S3Client({ region });

const BUCKET = process.env.S3_BUCKET_NAME;
const REGION = process.env.S3_REGION || 'eu-west-1';
const CDN = (process.env.UPLOADS_CDN_DOMAIN || '').replace(/\/$/, '');

export async function uploadBufferToS3(params: {
  bucket: string;
  key: string;
  contentType: string;
  body: Buffer;
  cacheControl?: string;
}) {
  const { bucket, key, contentType, body, cacheControl } = params;
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType || 'application/octet-stream',
    CacheControl: cacheControl ?? 'public, max-age=31536000, immutable',
  }));
  return { key };
}

export async function deleteFromS3(bucket: string, key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export function cdnUrlFor(key: string) {
  if (!key) return key;
  if (/^https?:\/\//i.test(key)) return key;

  const cdn = process.env.UPLOADS_CDN_DOMAIN; 
  if (cdn) return `${cdn.replace(/\/$/, '')}/${key}`;

  const bucket = process.env.S3_BUCKET_NAME;
  if (bucket) return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

  return `/uploads/${key}`;
}

// Stores a buffer either to S3 (if configured) or to /uploads (dev). Returns the public URL.
export async function putBufferSmart(params: {
  key: string;
  contentType: string;
  body: Buffer;
  cacheControl?: string;
}): Promise<{ key: string; publicUrl: string }> {
  const { key, contentType, body, cacheControl } = params;

  // if (process.env.S3_BUCKET_NAME && process.env.S3_REGION) {
  //   await uploadBufferToS3({
  //     bucket: process.env.S3_BUCKET_NAME!,
  //     key,
  //     contentType,
  //     body,
  //     cacheControl,
  //   });
  //   return { key, publicUrl: cdnUrlFor(key) };
  // }

  const haveS3Config = !!process.env.S3_BUCKET_NAME && !!process.env.S3_REGION;
const haveAwsCredHint =
  !!process.env.AWS_ACCESS_KEY_ID ||
  !!process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI ||
  !!process.env.AWS_WEB_IDENTITY_TOKEN_FILE;

if (haveS3Config && haveAwsCredHint) {
  try {
    await uploadBufferToS3({ bucket: process.env.S3_BUCKET_NAME!, key, contentType, body, cacheControl });
    return { key, publicUrl: cdnUrlFor(key) };
  } catch (err: any) {
    if (err?.name !== 'CredentialsProviderError') throw err;
    // else fall through to local
  }
}

  // Local dev: write under /uploads/key
  const uploadsRoot = path.join(__dirname, "..", "..", "uploads");
  const absPath = path.join(uploadsRoot, key);
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, body);
  return { key, publicUrl: `/uploads/${key}` };
}


// create a short-lived pre-signed GET URL for a private S3 object key
export async function presignGetUrlForKey(
  key: string,
  opts: { expiresIn?: number; responseContentType?: string } = {}
): Promise<string> {
  if (!BUCKET) throw new Error('S3_BUCKET_NAME not set (cannot presign)');

  const { expiresIn = 900, responseContentType } = opts;
  const cmd = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ...(responseContentType ? { ResponseContentType: responseContentType } : {}),
  });
  return await getSignedUrl(s3, cmd, { expiresIn });
}


// derive the S3 key from a CDN or S3 URL you previously generated.
// returns null if it's not one of the bucket/CDN URLs (or a local /uploads/ URL).
export function keyFromUrl(u: string): string | null {
  if (!u || u.startsWith('data:')) return null;

  try {
    // handle absolute URLs
    const url = new URL(u);

    // CloudFront (UPLOADS_CDN_DOMAIN)
    if (CDN && url.host === new URL(CDN).host) {
      return decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    }

    // Virtual-hosted–style S3 URLs: https://bucket.s3.region.amazonaws.com/key
    const s3Host = `${BUCKET}.s3.${REGION}.amazonaws.com`;
    if (BUCKET && url.host === s3Host) {
      return decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    }

    // Path-style legacy: https://s3.region.amazonaws.com/bucket/key
    if (url.host === `s3.${REGION}.amazonaws.com`) {
      const parts = url.pathname.replace(/^\/+/, '').split('/');
      if (parts[0] === BUCKET && parts.length > 1) {
        return decodeURIComponent(parts.slice(1).join('/'));
      }
    }

    // Not our URL
    return null;
  } catch {
    // Possibly a local path like "/uploads/..." -> not presignable
    if (u.startsWith('/uploads/')) return null;
    return null;
  }
}