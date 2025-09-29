import { S3Client, PutObjectCommand, DeleteObjectCommand} from '@aws-sdk/client-s3';
import path from "path";
import fs from "fs/promises";
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const region = process.env.S3_REGION || 'eu-west-1';
const s3 = new S3Client({ region });

// const BUCKET = process.env.S3_BUCKET_NAME;
// const REGION = process.env.S3_REGION || 'eu-west-1';
// const CDN = (process.env.UPLOADS_CDN_DOMAIN || '').replace(/\/$/, '');

export async function uploadBufferToS3(params: {
  bucket: string;
  key: string;
  contentType: string;
  body: Buffer;
  cacheControl?: string;
}) {
  const { bucket, key, contentType, body, cacheControl } = params;
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType || 'application/octet-stream',
    CacheControl: cacheControl ?? 'public, max-age=31536000, immutable',
    // optional but nice-to-have, matches your “SSE-S3” note
    ServerSideEncryption: 'AES256',
  });
  await s3.send(cmd);
  return { key };
}

export async function deleteFromS3(bucket: string, key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export function cdnUrlFor(key: string) {
  if (!key) return key;
  if (/^https?:\/\//i.test(key)) return key;

  const cdn = process.env.UPLOADS_CDN_DOMAIN; // MUST include https:// and no trailing slash
  if (cdn) return `${cdn.replace(/\/$/, '')}/${key}`;

  const bucket = process.env.S3_BUCKET_NAME;
  if (bucket) return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

  // Dev fallback only
  return `/uploads/${key}`;
}

/**
 * Store to S3 when configured; otherwise dev/local fallback.
 * In production: if S3 is configured but the upload fails, throw (don’t silently write local).
 */
export async function putBufferSmart(params: {
  key: string;
  contentType: string;
  body: Buffer;
  cacheControl?: string;
}): Promise<{ key: string; publicUrl: string }> {
  const { key, contentType, body, cacheControl } = params;
  const bucket = process.env.S3_BUCKET_NAME;

  if (bucket) {
    try {
      await uploadBufferToS3({
        bucket,
        key,
        contentType,
        body,
        cacheControl,
      });
      console.log(`[s3 put] s3://${bucket}/${key} (${body.length} bytes)`);
      return { key, publicUrl: cdnUrlFor(key) };
    } catch (err: any) {
      console.error('[s3 put] FAILED to upload to S3', {
        name: err?.name,
        message: err?.message,
        code: err?.$metadata?.httpStatusCode,
      });
      if ((process.env.NODE_ENV || 'production') === 'production') {
        // Prevent silent “success” that points CDN at a non-existent key
        throw new Error('Upload to S3 failed');
      }
      // else fall through to local for dev
    }
  }

  // Dev/local fallback
  const uploadsRoot = path.join(__dirname, '..', '..', 'uploads');
  const absPath = path.join(uploadsRoot, key);
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, body);
  console.log('[local put] wrote', absPath);
  return { key, publicUrl: `/uploads/${key}` };
}


// export async function presignGetUrlForKey(
//   key: string,
//   opts: { expiresIn?: number; responseContentType?: string } = {}
// ): Promise<string> {
//   if (!BUCKET) throw new Error('S3_BUCKET_NAME not set (cannot presign)');

//   const { expiresIn = 900, responseContentType } = opts;
//   const cmd = new GetObjectCommand({
//     Bucket: BUCKET,
//     Key: key,
//     ...(responseContentType ? { ResponseContentType: responseContentType } : {}),
//   });
//   return await getSignedUrl(s3, cmd, { expiresIn });
// }



// export function keyFromUrl(u: string): string | null {
//   if (!u || u.startsWith('data:')) return null;

//   try {
//     const url = new URL(u);

//     if (CDN && url.host === new URL(CDN).host) {
//       return decodeURIComponent(url.pathname.replace(/^\/+/, ''));
//     }

//     const s3Host = `${BUCKET}.s3.${REGION}.amazonaws.com`;
//     if (BUCKET && url.host === s3Host) {
//       return decodeURIComponent(url.pathname.replace(/^\/+/, ''));
//     }

//     if (url.host === `s3.${REGION}.amazonaws.com`) {
//       const parts = url.pathname.replace(/^\/+/, '').split('/');
//       if (parts[0] === BUCKET && parts.length > 1) {
//         return decodeURIComponent(parts.slice(1).join('/'));
//       }
//     }

//     return null;
//   } catch {
//     if (u.startsWith('/uploads/')) return null;
//     return null;
//   }
// }