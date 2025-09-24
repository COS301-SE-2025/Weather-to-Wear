// app-backend/src/modules/tryon-self/tryon-self.service.ts
import prisma from '../../prisma';
import { randomUUID } from 'crypto';
import { RunTryOnRequest, RunTryOnResponse, RunTryOnStep, FashnCategory, TryOnMode } from './tryon-self.types';
import { cdnUrlFor, putBufferSmart } from '../../utils/s3';
import logger from '../../utils/logger';

const FASHN_API_KEY = process.env.FASHN_API_KEY!;
const BASE_URL = process.env.FASHN_BASE_URL || 'https://api.fashn.ai/v1';
const DEFAULT_MODE: TryOnMode = (process.env.FASHN_DEFAULT_MODE as TryOnMode) || 'balanced';
const DEFAULT_RETURN_BASE64 = String(process.env.FASHN_PRIVACY_RETURN_BASE64 || 'false') === 'true';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function fashnRun(inputs: Record<string, any>): Promise<string> {
  const runRes = await fetch(`${BASE_URL}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FASHN_API_KEY}`,
    },
    body: JSON.stringify({
      model_name: 'tryon-v1.6',
      inputs,
    }),
  });

  if (!runRes.ok) {
    const text = await runRes.text();
    throw new Error(`FASHN run error: ${runRes.status} ${text}`);
  }
  const { id } = await runRes.json() as { id: string };
  if (!id) throw new Error('FASHN run did not return an id');

  // poll status
  for (let i = 0; i < 60; i++) {
    const st = await fetch(`${BASE_URL}/status/${id}`, {
      headers: { Authorization: `Bearer ${FASHN_API_KEY}` },
    });
    const data = await st.json() as any;

    if (data.status === 'completed' && data.output?.length) {
      return data.output[0]; // URL or base64 depending on return_base64
    }
    if (data.status === 'failed') {
      const msg = data?.error?.message || JSON.stringify(data.error || {});
      throw new Error(`FASHN status failed: ${msg}`);
    }
    await sleep(3000);
  }
  throw new Error('FASHN try-on timed out');
}

function mapLayerToFashnCategory(layer: string, categoryEnum?: string): FashnCategory {
  if (layer.includes('top') || layer === 'outerwear') return 'tops';
  if (layer.includes('bottom')) return 'bottoms';
  if (categoryEnum === 'SKIRT') return 'bottoms';
  return 'auto';
}

function layeringOrder(a: RunTryOnStep, b: RunTryOnStep) {
  const rank = (s?: RunTryOnStep) => {
    const c = s?.category || 'auto';
    if (c === 'tops') return 10;
    if (c === 'one-pieces') return 15;
    if (c === 'bottoms') return 20;
    return 30;
  };
  return rank(a) - rank(b);
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

export async function runTryOnSelf(userId: string, req: RunTryOnRequest): Promise<RunTryOnResponse> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  let modelImage = req.modelImageUrl;
  if (req.useProfilePhoto) {
    if (!user?.profilePhoto) throw new Error('No profile photo on account');
    modelImage = user.profilePhoto;
  }
  if (!modelImage) throw new Error('No modelImageUrl provided');

  let steps: RunTryOnStep[] = [];
  const skipped: string[] = [];

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
      const url = cdnUrlFor(it.filename);
      steps.push({
        garmentImageUrl: url,
        category: mapLayerToFashnCategory(it.layerCategory, it.category),
        garmentPhotoType: 'flat-lay',
      });
    }
  }

  steps.sort(layeringOrder);

  const mode: TryOnMode = req.mode || DEFAULT_MODE;
  const returnBase64 = req.returnBase64 ?? DEFAULT_RETURN_BASE64;
  const stepOutputs: string[] = [];

  for (const step of steps) {
    const inputs = {
      model_image: modelImage,
      garment_image: step.garmentImageUrl,
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
    const { key: storedKey } = await putBufferSmart({
      key,
      contentType: 'image/png',
      body: buf,
    });
    finalUrl = cdnUrlFor(storedKey);
  }

  return { finalUrl, finalBase64, stepOutputs, skipped };
}

export async function getCredits(): Promise<{ total: number; subscription: number; on_demand: number }> {
  const res = await fetch(`${BASE_URL}/credits`, {
    headers: { Authorization: `Bearer ${FASHN_API_KEY}` },
  });
  if (!res.ok) throw new Error(`FASHN credits error: ${res.status}`);
  const json = await res.json() as any;
  return {
    total: json?.credits?.total ?? 0,
    subscription: json?.credits?.subscription ?? 0,
    on_demand: json?.credits?.on_demand ?? 0,
  };
}
