// tests/integration/nsfw.middleware.integration.test.ts
import { decideImage, decideText, nsfwText, nsfwImageFromReq } from '../../src/middleware/nsfw.middleware';
import { seCheckText, seCheckImageFromUrl, seCheckImageUpload } from '../../src/utils/sightengine';
import type { Request, Response, NextFunction } from 'express';

jest.mock('../../src/utils/sightengine');

describe('nsfw.middleware', () => {
  describe('decideImage', () => {
    it('BLOCKs explicit images', () => {
      const se = { nudity: { sexual_activity: 0.8 }, offensive: { prob: 0.1 } };
      const result = decideImage(se);
      expect(result.action).toBe('BLOCK');
    });
    it('REVIEWs suggestive images', () => {
      const se = { nudity: { sexual_activity: 0.6, suggestive: 0.6 }, offensive: { prob: 0.1 } };
      const result = decideImage(se);
      expect(result.action).toBe('REVIEW');
    });
    it('ALLOWs safe images', () => {
      const se = { nudity: { sexual_activity: 0.1 }, offensive: { prob: 0.1 } };
      const result = decideImage(se);
      expect(result.action).toBe('ALLOW');
    });
  });

  describe('decideText', () => {
    it('BLOCKs sexual minors', () => {
      const se = { sexual_minors: { matches: [{}] }, moderation_classes: {} };
      const result = decideText(se);
      expect(result.action).toBe('BLOCK');
      expect(result.label).toMatch(/MINORS/);
    });
    it('BLOCKs strong ML signals', () => {
      const se = { moderation_classes: { sexual: 0.7 } };
      const result = decideText(se);
      expect(result.action).toBe('BLOCK');
    });
    it('BLOCKs profanity', () => {
      const se = { moderation_classes: {}, profanity: { matches: [{}] } };
      const result = decideText(se);
      expect(result.action).toBe('BLOCK');
      expect(result.label).toMatch(/PROFANITY/);
    });
    it('REVIEWs sexual section', () => {
      const se = { moderation_classes: {}, sexual: { matches: [{}] } };
      const result = decideText(se);
      expect(result.action).toBe('REVIEW');
    });
    it('REVIEWs medium ML', () => {
      const se = { moderation_classes: { sexual: 0.51 } };
      const result = decideText(se);
      expect(result.action).toBe('REVIEW');
    });
    it('ALLOWs safe text', () => {
      const se = { moderation_classes: { sexual: 0.1 } };
      const result = decideText(se);
      expect(result.action).toBe('ALLOW');
    });
  });

  describe('nsfwText middleware', () => {
    const oldEnv = { ...process.env };
    let req: Partial<Request>, res: Partial<Response>, next: jest.Mock;
    beforeEach(() => {
      req = { body: { text: 'hello' } };
      res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      next = jest.fn();
      process.env.SIGHTENGINE_API_USER = 'user';
      process.env.SIGHTENGINE_API_SECRET = 'secret';
    });
    afterAll(() => { process.env = oldEnv; });

    it('calls next for safe text', async () => {
      (seCheckText as jest.Mock).mockResolvedValue({ moderation_classes: { sexual: 0.1 } });
      await nsfwText('text')(req as Request, res as Response, next as NextFunction);
      expect(next).toHaveBeenCalled();
    });
    it('blocks for BLOCK text', async () => {
      (seCheckText as jest.Mock).mockResolvedValue({ moderation_classes: { sexual: 0.8 } });
      await nsfwText('text')(req as Request, res as Response, next as NextFunction);
      expect((res.status as jest.Mock)).toHaveBeenCalledWith(400);
      expect((res.json as jest.Mock)).toHaveBeenCalledWith(expect.objectContaining({ error: 'NSFW_BLOCKED' }));
    });
    it('reviews for REVIEW text', async () => {
      (seCheckText as jest.Mock).mockResolvedValue({ moderation_classes: { sexual: 0.51 } });
      await nsfwText('text')(req as Request, res as Response, next as NextFunction);
      expect((res.status as jest.Mock)).toHaveBeenCalledWith(202);
      expect((res.json as jest.Mock)).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING_REVIEW' }));
    });
    it('calls next if no credentials', async () => {
      delete process.env.SIGHTENGINE_API_USER;
      delete process.env.SIGHTENGINE_API_SECRET;
      await nsfwText('text')(req as Request, res as Response, next as NextFunction);
      expect(next).toHaveBeenCalled();
    });
    it('calls next on Sightengine error', async () => {
      (seCheckText as jest.Mock).mockRejectedValue(new Error('fail'));
      await nsfwText('text')(req as Request, res as Response, next as NextFunction);
      expect(next).toHaveBeenCalled();
    });
    it('calls next on unexpected error', async () => {
      const badReq: any = null;
      await nsfwText('text')(badReq, res as Response, next as NextFunction);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('nsfwImageFromReq middleware', () => {
    let req: Partial<Request>, res: Partial<Response>, next: jest.Mock;
    beforeEach(() => {
    req = {
        file: {
        fieldname: 'file',
        originalname: 'img.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 123,
        destination: '/tmp',
        filename: 'img.jpg',
        path: '/tmp/img.jpg',
        buffer: Buffer.from('img'),
        stream: {} as any // or use a real stream if needed
        },
        body: {}
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    process.env.SIGHTENGINE_API_USER = 'user';
    process.env.SIGHTENGINE_API_SECRET = 'secret';
    });
    it('calls next for safe image', async () => {
      (seCheckImageUpload as jest.Mock).mockResolvedValue({ nudity: { sexual_activity: 0.1 } });
      await nsfwImageFromReq()(req as Request, res as Response, next as NextFunction);
      expect(next).toHaveBeenCalled();
    });
    it('blocks for BLOCK image', async () => {
      (seCheckImageUpload as jest.Mock).mockResolvedValue({ nudity: { sexual_activity: 0.8 } });
      await nsfwImageFromReq()(req as Request, res as Response, next as NextFunction);
      expect((res.status as jest.Mock)).toHaveBeenCalledWith(400);
      expect((res.json as jest.Mock)).toHaveBeenCalledWith(expect.objectContaining({ error: 'NSFW_BLOCKED' }));
    });
    it('reviews for REVIEW image', async () => {
      (seCheckImageUpload as jest.Mock).mockResolvedValue({ nudity: { sexual_activity: 0.6 } });
      await nsfwImageFromReq()(req as Request, res as Response, next as NextFunction);
      expect((res.status as jest.Mock)).toHaveBeenCalledWith(202);
      expect((res.json as jest.Mock)).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING_REVIEW' }));
    });
    it('calls next if no credentials', async () => {
      delete process.env.SIGHTENGINE_API_USER;
      delete process.env.SIGHTENGINE_API_SECRET;
      await nsfwImageFromReq()(req as Request, res as Response, next as NextFunction);
      expect(next).toHaveBeenCalled();
    });
    it('calls next on Sightengine error', async () => {
      (seCheckImageUpload as jest.Mock).mockRejectedValue(new Error('fail'));
      await nsfwImageFromReq()(req as Request, res as Response, next as NextFunction);
      expect(next).toHaveBeenCalled();
    });
    it('calls next if no file or url', async () => {
      req = { body: {} };
      await nsfwImageFromReq()(req as Request, res as Response, next as NextFunction);
      expect(next).toHaveBeenCalled();
    });
  });
});
