// app-backend/src/modules/tryon-self/tryon-self.controller.ts
import { Request, Response } from 'express';
import { runTryOnSelf, getCredits, saveTryOnPhoto, removeTryOnPhoto } from './tryon-self.service';

const tryonSelfController = {
  async run(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || req.body.userId;
      if (!userId) { res.status(401).json({ error: 'Unauthenticated' }); return; }
      const result = await runTryOnSelf(userId, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Try-on failed' });
    }
  },

  async credits(_req: Request, res: Response): Promise<void> {
    try {
      const c = await getCredits();
      res.json(c);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Cannot fetch credits' });
    }
  },

  async setPhoto(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || req.body.userId;
      if (!userId) { res.status(401).json({ error: 'Unauthenticated' }); return; }

      const { imageBase64, imageUrl } = req.body as { imageBase64?: string; imageUrl?: string };
      if (!imageBase64 && !imageUrl) {
        res.status(400).json({ error: 'Provide imageBase64 or imageUrl' }); return;
      }

      let finalUrl: string;
      if (imageBase64) {
        const [meta, b64] = imageBase64.split(',');
        const ct = meta?.includes('image/jpeg') ? 'image/jpeg' : 'image/png';
        const buf = Buffer.from(b64 ?? imageBase64, 'base64');
        finalUrl = await saveTryOnPhoto(userId, buf, ct);
      } else {
        const r = await fetch(imageUrl!);
        if (!r.ok) { res.status(400).json({ error: `Failed to fetch imageUrl: ${r.status}` }); return; }
        const ab = await r.arrayBuffer();
        const buf = Buffer.from(ab);
        finalUrl = await saveTryOnPhoto(userId, buf, r.headers.get('content-type') || 'image/png');
      }

      res.json({ tryOnPhoto: finalUrl });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to set try-on photo' });
    }
  },

  async getPhoto(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || req.query.userId;
      if (!userId) { res.status(401).json({ error: 'Unauthenticated' }); return; }
      const user = await (await import('../../prisma')).default.user.findUnique({ where: { id: String(userId) } });
      res.json({ tryOnPhoto: user?.tryOnPhoto ?? null });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to get try-on photo' });
    }
  },

  async deletePhoto(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || req.body.userId;
      if (!userId) { res.status(401).json({ error: 'Unauthenticated' }); return; }
      await removeTryOnPhoto(userId);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to delete try-on photo' });
    }
  },
};

export default tryonSelfController;
