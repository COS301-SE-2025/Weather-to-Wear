import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

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
