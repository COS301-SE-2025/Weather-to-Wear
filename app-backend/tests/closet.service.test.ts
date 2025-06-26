import closetService from '../src/modules/closet/closet.service';
import path from 'path';
import fs from 'fs';

jest.mock('fs'); 

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
  (closetService as any).prisma = prismaMock;
  jest.clearAllMocks();
});

describe('ClosetService', () => {
  it('saveImagesBatch saves all files', async () => {
    prismaMock.closetItem.create.mockResolvedValueOnce({ id: '1' }).mockResolvedValueOnce({ id: '2' });
    const files = [{ filename: 'a.png' }, { filename: 'b.png' }] as any[];
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