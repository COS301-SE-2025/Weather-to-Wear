import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import path from "path";
import fs from "fs/promises";

const region = process.env.S3_REGION || 'eu-west-1';
const s3 = new S3Client({ region });

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

/** Stores a buffer either to S3 (if configured) or to /uploads (dev). Returns the public URL. */
export async function putBufferSmart(params: {
  key: string;              // e.g. users/uid/closet/123.png
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
    // If this is a real S3 outage you may prefer to rethrow.
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