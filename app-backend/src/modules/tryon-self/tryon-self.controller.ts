// app-backend/src/modules/tryon-self/tryon-self.controller.ts
import { Request, Response } from 'express';
import { runTryOnSelf, getCredits } from './tryon-self.service';

const tryonSelfController = {
  async run(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || req.body.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthenticated' });
        return;
      }

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
};

export default tryonSelfController;
