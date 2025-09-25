import { Request, Response } from 'express';
import { upsertForDay, getForDay, patchById } from './daySelection.service';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { deleteByDate } from './daySelection.service';


export async function createOrUpdate(req: Request, res: Response) {
    const { user } = req as AuthenticatedRequest;
    if (!user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const { date, location, style, items, weather, outfitId } = req.body;
    if (!date || !Array.isArray(items) || !weather) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const record = await upsertForDay({
        userId: user.id,
        dateISO: String(date),
        location,
        style,
        items,
        weather,
        outfitId: outfitId ?? null,
    });
    res.status(200).json(record);
}

export async function getOne(req: Request, res: Response) {
    const { user } = req as AuthenticatedRequest;
    if (!user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const { date } = req.query as { date?: string };
    if (!date) return res.status(400).json({ error: 'date query param is required' });
    const record = await getForDay(user.id, date);
    res.status(200).json(record ?? null);
}

export async function patchOne(req: Request, res: Response) {
  const { user } = req as AuthenticatedRequest;
  if (!user?.id) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  const rec = await patchById(user.id, id, req.body || {});
  res.status(200).json(rec);
}

export async function deleteOneByDate(req: Request, res: Response) {
  const { user } = req as AuthenticatedRequest;
  if (!user?.id) return res.status(401).json({ error: 'Unauthorized' });
  const { date } = req.params as { date: string };
  if (!date) return res.status(400).json({ error: 'date path param is required' });

  await deleteByDate(user.id, date);
  res.status(204).end();
}