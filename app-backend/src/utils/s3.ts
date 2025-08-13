import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: process.env.S3_REGION! });

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
    ContentType: contentType,
    CacheControl: cacheControl ?? 'public, max-age=31536000',
  }));
  return { key };
}

export async function deleteFromS3(bucket: string, key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

// export function cdnUrlFor(key: string) {
//   if (process.env.CLOUDFRONT_URL) {
//     return `${process.env.CLOUDFRONT_URL.replace(/\/$/, '')}/${key}`;
//   }
//   return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;
// }

export function cdnUrlFor(key: string) {
  if (!key) return key;
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  if (process.env.CLOUDFRONT_URL) {
    return `${process.env.CLOUDFRONT_URL.replace(/\/$/, '')}/${key}`;
  }
  // fallback for local/tests if S3 envs aren’t set
  if (!process.env.S3_BUCKET_NAME || !process.env.S3_REGION) return `/uploads/${key}`;
  return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;
}