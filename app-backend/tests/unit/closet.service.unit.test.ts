jest.mock('../../src/utils/s3', () => ({
  uploadBufferToS3: jest.fn().mockResolvedValue({ key: 'mock-key' }),
  putBufferSmart: jest.fn().mockResolvedValue({ key: 'mock-key', publicUrl: 'https://cdn.test/mock-key' }),
  deleteFromS3: jest.fn().mockResolvedValue(undefined),
  cdnUrlFor: (k: string) => `https://cdn.test/${k}`,
}));

import path from 'path';
import fs from 'fs';
import axios from 'axios';
import closetService from '../../src/modules/closet/closet.service';

jest.mock('fs');
jest.mock('axios');
jest.mock('form-data', () => {
  return jest.fn().mockImplementation(() => ({
    append: jest.fn(),
    getHeaders: jest.fn().mockReturnValue({}),
  }));
});

const prismaMock = {
  closetItem: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  },
};

beforeEach(() => {
  process.env.BG_REMOVAL_URL = 'http://localhost/remove-bg';
  process.env.COLOR_EXTRACT_URL = 'http://localhost/colors';
  process.env.S3_BUCKET_NAME = 'test-bucket';
  process.env.S3_REGION = 'eu-west-1';
  process.env.UPLOADS_CDN_DOMAIN = 'https://cdn.test';

  (closetService as any).prisma = prismaMock;
  jest.clearAllMocks();
});

describe('ClosetService', () => {
  it('saveImagesBatch saves all files', async () => {
    prismaMock.closetItem.create
      .mockResolvedValueOnce({ id: '1' })
      .mockResolvedValueOnce({ id: '2' });

    const files = [
      { path: 'uploads/a.png', filename: 'a.png' },
      { path: 'uploads/b.png', filename: 'b.png' }
    ] as any[];

    (fs.createReadStream as jest.Mock).mockReturnValue({});
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);
    (axios.post as jest.Mock).mockResolvedValue({ data: Buffer.from('image') });

    const res = await closetService.saveImagesBatch(files, 'SHOES', 'footwear', 'uid', {});
    expect(res).toHaveLength(2);
    expect(prismaMock.closetItem.create).toHaveBeenCalledTimes(2);
  });

  it('getImagesByCategory fetches items', async () => {
    prismaMock.closetItem.findMany.mockResolvedValue([{ id: 1 }]);
    const res = await closetService.getImagesByCategory('SHOES', 'uid');
    expect(res).toEqual([{ id: 1 }]);
    expect(prismaMock.closetItem.findMany).toHaveBeenCalledWith({ where: { category: 'SHOES', ownerId: 'uid' } });
  });

  it('deleteImage removes file if exists', async () => {
    prismaMock.closetItem.findFirst.mockResolvedValue({ id: '1', filename: 'a.png' });
    prismaMock.closetItem.delete.mockResolvedValue({});
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);
    await closetService.deleteImage('1', 'uid');
    expect(prismaMock.closetItem.findFirst).toHaveBeenCalled();
    expect(prismaMock.closetItem.delete).toHaveBeenCalled();
    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.unlinkSync).toHaveBeenCalled();
  });

  it('deleteImage throws if not found', async () => {
    prismaMock.closetItem.findFirst.mockResolvedValue(null);
    await expect(closetService.deleteImage('ghost', 'uid')).rejects.toThrow('Item not found');
  });

  it('updateImage updates and returns item', async () => {
    prismaMock.closetItem.findFirst.mockResolvedValue({ id: '1' });
    prismaMock.closetItem.update.mockResolvedValue({ id: '1', filename: 'a.png' });
    const res = await closetService.updateImage('1', 'uid', { category: 'SHOES' });
    expect(res).toEqual({ id: '1', filename: 'a.png' });
    expect(prismaMock.closetItem.update).toHaveBeenCalledWith({ where: { id: '1' }, data: { category: 'SHOES' } });
  });

  it('updateImage throws if not found', async () => {
    prismaMock.closetItem.findFirst.mockResolvedValue(null);
    await expect(closetService.updateImage('ghost', 'uid', {})).rejects.toThrow('Item not found');
  });
});
