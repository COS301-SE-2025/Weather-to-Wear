// app-backend/src/modules/tryon-self/tryon-self.service.ts
import prisma from '../../prisma';
import { randomUUID, createHash } from 'crypto';
import {
  RunTryOnRequest, RunTryOnResponse, RunTryOnStep,
  FashnCategory, TryOnMode
} from './tryon-self.types';
import { cdnUrlFor, putBufferSmart } from '../../utils/s3';
import path from 'path';
import fs from 'fs/promises';

const PUBLIC_BASE_URL =
  process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 5001}`;
const INLINE_IMAGES = String(process.env.FASHN_DEV_INLINE_IMAGES || 'false') === 'true';

const DIST_ROOT = path.join(__dirname, '../../..');
const UPLOADS_FS_ROOT = path.join(DIST_ROOT, 'uploads'); // matches app.ts
const UPLOADS_PREFIX = '/uploads/';

const FASHN_API_KEY = process.env.FASHN_API_KEY!;
const BASE_URL = process.env.FASHN_BASE_URL || 'https://api.fashn.ai/v1';
const DEFAULT_MODE: TryOnMode = (process.env.FASHN_DEFAULT_MODE as TryOnMode) || 'balanced';
const DEFAULT_RETURN_BASE64 = String(process.env.FASHN_PRIVACY_RETURN_BASE64 || 'false') === 'true';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function toAbsUrl(u?: string): string {
  if (!u) return '';
  if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) return u;
  if (!u.startsWith('/')) u = `/${u}`;
  return `${PUBLIC_BASE_URL}${u}`;
}

function itemsHashFromIds(ids: string[]) {
  const joined = ids.map(String).sort().join(',');
  return createHash('sha1').update(joined).digest('hex');
}

async function toDataUri(absUrl: string): Promise<string> {
  try {
    // If this URL points to our own /uploads/ path, read from disk directly
    const afterBase = absUrl.startsWith(PUBLIC_BASE_URL)
      ? absUrl.slice(PUBLIC_BASE_URL.length)
      : absUrl;

    if (afterBase.startsWith(UPLOADS_PREFIX)) {
      const relPath = afterBase.replace(/^\//, ''); // remove leading slash
      const fsPath = path.join(DIST_ROOT, relPath); // e.g., dist/uploads/users/...
      const buf = await fs.readFile(fsPath);

      // infer a content-type
      const lower = fsPath.toLowerCase();
      const mime =
        lower.endsWith('.jpg') || lower.endsWith('.jpeg') ? 'image/jpeg'
          : lower.endsWith('.webp') ? 'image/webp'
            : 'image/png';

      return `data:${mime};base64,${buf.toString('base64')}`;
    }

    // Otherwise, fetch externally (e.g., FASHN URLs)
    const r = await fetch(absUrl);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const ct = r.headers.get('content-type') || 'image/png';
    const buf = Buffer.from(await r.arrayBuffer());
    const mime = ct.split(';')[0];
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch (e: any) {
    throw new Error(`inline failed for ${absUrl}: ${e.message}`);
  }
}

// dev: inline; prod: leave as URL 
async function externalize(u: string): Promise<string> {
  if (!u) return u;
  if (u.startsWith('data:')) return u;
  const abs = toAbsUrl(u);
  return INLINE_IMAGES ? await toDataUri(abs) : abs;
}

async function fashnRun(inputs: Record<string, any>): Promise<string> {
  let runRes: Response;
  try {
    runRes = await fetch(`${BASE_URL}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${FASHN_API_KEY}`,
      },
      body: JSON.stringify({ model_name: 'tryon-v1.6', inputs }),
    });
  } catch (e: any) {
    throw new Error(`FASHN /run fetch failed: ${e.message}`);
  }

  if (!runRes.ok) {
    const text = await runRes.text().catch(() => '');
    throw new Error(`FASHN /run error: ${runRes.status} ${text}`);
  }

  let id: string | undefined;
  try {
    ({ id } = (await runRes.json()) as { id?: string });
  } catch {
    throw new Error('FASHN /run returned non-JSON');
  }
  if (!id) throw new Error('FASHN /run did not return an id');

  for (let i = 0; i < 60; i++) {
    let st: Response;
    try {
      st = await fetch(`${BASE_URL}/status/${id}`, {
        headers: { Authorization: `Bearer ${FASHN_API_KEY}` },
      });
    } catch (e: any) {
      throw new Error(`FASHN /status fetch failed: ${e.message}`);
    }

    const data = (await st.json().catch(() => ({}))) as any;

    if (data.status === 'completed' && data.output?.length) {
      return data.output[0];
    }
    if (data.status === 'failed') {
      const msg = data?.error?.message || JSON.stringify(data.error || {});
      throw new Error(`FASHN status failed: ${msg}`);
    }
    await sleep(3000);
  }
  throw new Error('FASHN try-on timed out');
}

const LAYER_ORDER: Record<string, number> = {
  base_top: 10,
  mid_top: 20,
  outerwear: 30,
  base_bottom: 40,
  mid_bottom: 50,
  headwear: 90,
  footwear: 95,
  accessory: 99,
};

function mapLayerToFashnCategory(layer: string, categoryEnum?: string): FashnCategory {
  if (layer.includes('top') || layer === 'outerwear') return 'tops';
  if (layer.includes('bottom')) return 'bottoms';
  if (categoryEnum === 'SKIRT') return 'bottoms';
  return 'auto';
}

function layeringOrder(a: RunTryOnStep, b: RunTryOnStep) {
  const ra = LAYER_ORDER[a.layerHint || 'zzz'] ?? 999;
  const rb = LAYER_ORDER[b.layerHint || 'zzz'] ?? 999;
  if (ra !== rb) return ra - rb;
  const ca = (a.category || 'auto') < (b.category || 'auto') ? -1 : 1;
  return ca;
}

async function downloadToBuffer(urlOrData: string): Promise<Buffer> {
  if (urlOrData.startsWith('data:image/')) {
    const b64 = urlOrData.split(',')[1];
    return Buffer.from(b64, 'base64');
  }
  const res = await fetch(urlOrData);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

export async function saveTryOnPhoto(userId: string, imageBuf: Buffer, contentType: string = 'image/png'): Promise<string> {
  const key = `users/${userId}/tryon/self-${Date.now()}-${randomUUID()}.png`;
  const { key: storedKey } = await putBufferSmart({ key, contentType, body: imageBuf });
  const url = cdnUrlFor(storedKey);
  const abs = toAbsUrl(url);
  await prisma.user.update({ where: { id: userId }, data: { tryOnPhoto: abs } });
  return abs;
}

export async function removeTryOnPhoto(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { tryOnPhoto: null } });
}

export async function runTryOnSelf(userId: string, req: RunTryOnRequest): Promise<RunTryOnResponse> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  let modelImage = req.modelImageUrl;
  if (req.useTryOnPhoto) {
    if (!user?.tryOnPhoto) throw new Error('No try-on photo on account');
    modelImage = user.tryOnPhoto;
  }
  if (!modelImage) throw new Error('No modelImageUrl provided');

  if (!modelImage.startsWith('data:')) {
    modelImage = toAbsUrl(modelImage);
  }

  let steps: RunTryOnStep[] = [];
  const skipped: string[] = [];
  const includeFootwear = req.includeFootwear === true;
  const includeHeadwear = req.includeHeadwear === true;

  if (req.steps?.length) {
    steps = req.steps.slice();
  } else if (req.closetItemIds?.length) {
    const items = await prisma.closetItem.findMany({
      where: { id: { in: req.closetItemIds } },
      select: { id: true, filename: true, layerCategory: true, category: true },
    });

    for (const it of items) {
      if (['footwear', 'headwear', 'accessory'].includes(it.layerCategory)) {
        skipped.push(it.id);
        continue;
      }
      if (it.layerCategory === 'accessory') { skipped.push(it.id); continue; }
      if (it.layerCategory === 'footwear' && !includeFootwear) { skipped.push(it.id); continue; }
      if (it.layerCategory === 'headwear' && !includeHeadwear) { skipped.push(it.id); continue; }
      const url = cdnUrlFor(it.filename);
      steps.push({
        garmentImageUrl: url,
        category: mapLayerToFashnCategory(it.layerCategory, it.category),
        garmentPhotoType: 'flat-lay',
        layerHint: it.layerCategory as any,
      });
    }
  }

  steps.sort(layeringOrder);

  const mode: TryOnMode = req.mode || DEFAULT_MODE;
  const returnBase64 = req.returnBase64 ?? DEFAULT_RETURN_BASE64;
  const stepOutputs: string[] = [];

  for (const step of steps) {
    const modelRef = await externalize(modelImage);
    const garmentRef = await externalize(step.garmentImageUrl);

    const inputs = {
      model_image: modelRef,
      garment_image: garmentRef,
      category: step.category || 'auto',
      garment_photo_type: step.garmentPhotoType || 'auto',
      mode,
      return_base64: returnBase64,
      segmentation_free: true,
      ...(req.numSamples ? { num_samples: req.numSamples } : {}),
      ...(typeof req.seed === 'number' ? { seed: req.seed } : {}),
      output_format: 'png',
    };

    const out = await fashnRun(inputs);
    stepOutputs.push(out);
    modelImage = out; // chain
  }

  let finalUrl: string | undefined;
  let finalBase64: string | undefined;

  if (returnBase64) {
    finalBase64 = modelImage!;
  } else {
    const buf = await downloadToBuffer(modelImage!);
    const key = `users/${userId}/tryon/${Date.now()}-${randomUUID()}.png`;
    const { key: storedKey } = await putBufferSmart({ key, contentType: 'image/png', body: buf });
    finalUrl = cdnUrlFor(storedKey);
  }

  // ===== Cache to Outfit if outfitId provided =====
  if (req.outfitId) {
    let idsForHash: string[] = [];
    if (req.closetItemIds?.length) {
      idsForHash = req.closetItemIds;
    } else {
      const o = await prisma.outfit.findUnique({
        where: { id: req.outfitId },
        include: { outfitItems: true },
      });
      idsForHash = (o?.outfitItems || []).map((oi: { closetItemId: string }) => oi.closetItemId);
    }
    const itemsHash = itemsHashFromIds(idsForHash);

    if (!finalUrl) {
      const buf = await downloadToBuffer(finalBase64!);
      const keyDet = `users/${userId}/tryon/results/${req.outfitId}/final-${itemsHash}.png`;
      const { key: storedKeyDet } = await putBufferSmart({ key: keyDet, contentType: 'image/png', body: buf });
      finalUrl = cdnUrlFor(storedKeyDet);
    } else {

    }

    try {
      await prisma.outfit.update({
        where: { id: req.outfitId },
        data: {
          tryOnFinalUrl: finalUrl,
          tryOnItemsHash: itemsHash,
          tryOnGeneratedAt: new Date(),
          tryOnStepImageUrls: stepOutputs as any,
        },
      });
    } catch (e) {
      // non-fatal
      console.error('Failed to update Outfit try-on cache:', e);
    }
  }

  return { finalUrl, finalBase64, stepOutputs, skipped };
}


export async function getCredits(): Promise<{ total: number; subscription: number; on_demand: number }> {
  const res = await fetch(`${BASE_URL}/credits`, { headers: { Authorization: `Bearer ${FASHN_API_KEY}` } });
  if (!res.ok) throw new Error(`FASHN credits error: ${res.status}`);
  const json = await res.json() as any;
  return {
    total: json?.credits?.total ?? 0,
    subscription: json?.credits?.subscription ?? 0,
    on_demand: json?.credits?.on_demand ?? 0,
  };
}

export async function findCachedTryOn(userId: string, outfitId: string) {
  const outfit = await prisma.outfit.findUnique({
    where: { id: outfitId },
    include: { outfitItems: true },
  });
  if (!outfit || outfit.userId !== userId) return null;
  const ids = (outfit.outfitItems || []).map((oi: { closetItemId: string }) => oi.closetItemId);
  if (!ids.length) return null;
  const hash = itemsHashFromIds(ids);
  if (!outfit.tryOnFinalUrl || outfit.tryOnItemsHash !== hash) return null;
  return {
    finalImageUrl: outfit.tryOnFinalUrl,   // stored as CDN absolute URL
    createdAt: outfit.tryOnGeneratedAt ?? outfit.createdAt,
    itemsHash: hash,
    stepImageUrls: outfit.tryOnStepImageUrls ?? [],
  };
}

export async function clearCachedTryOnForOutfit(userId: string, outfitId: string) {
  const outfit = await prisma.outfit.findUnique({ where: { id: outfitId } });
  if (!outfit || outfit.userId !== userId) return false;
  await prisma.outfit.update({
    where: { id: outfitId },
    data: {
      tryOnFinalUrl: null,
      tryOnItemsHash: null,
      tryOnGeneratedAt: null,
      tryOnStepImageUrls: [],
    },
  });
  return true;
}
