import { Request, Response } from 'express';
import OutfitController from '../../src/modules/outfit/outfit.controller'; 
import { LayerCategory } from '@prisma/client';
import { getItemsForOutfit, addItemToOutfit, removeItemFromOutfit } from '../../src/modules/outfit/outfit.service'; 

jest.mock('../../src/modules/outfit/outfit.service', () => ({
  getItemsForOutfit: jest.fn(),
  addItemToOutfit: jest.fn(),
  removeItemFromOutfit: jest.fn(),
}));

const mockUser = { id: 'user-1' };

const mockRes = (): Response => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn()
  };
  return res as Response;
};

const next = jest.fn();

describe('OutfitController Unit Tests (Mocked)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch items for an outfit', async () => {
    const req = {
      user: mockUser,
      params: { id: 'outfit-1' }
    } as Partial<Request> as Request;

    const res = mockRes();
    const items = [{ id: 'item-1', name: 'Jacket' }];
    (getItemsForOutfit as jest.Mock).mockResolvedValueOnce(items);

    await OutfitController.getItems(req, res, next);

    expect(getItemsForOutfit).toHaveBeenCalledWith('outfit-1', mockUser.id);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(items);
  });

  it('should add an item to an outfit', async () => {
    const req = {
      user: mockUser,
      params: { id: 'outfit-1' },
      body: {
        closetItemId: 'closet-123',
        layerCategory: LayerCategory.outerwear,
        sortOrder: 1
      }
    } as Partial<Request> as Request;

    const res = mockRes();
    const addedItem = { id: 'item-2', closetItemId: 'closet-123' };

    (addItemToOutfit as jest.Mock).mockResolvedValueOnce(addedItem);

    await OutfitController.addItem(req, res, next);

    expect(addItemToOutfit).toHaveBeenCalledWith('outfit-1', mockUser.id, {
      closetItemId: 'closet-123',
      layerCategory: LayerCategory.outerwear,
      sortOrder: 1
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(addedItem);
  });

  it('should not add item if layerCategory is invalid', async () => {
    const req = {
      user: mockUser,
      params: { id: 'outfit-1' },
      body: {
        closetItemId: 'closet-123',
        layerCategory: 'INVALID_CATEGORY',
        sortOrder: 1
      }
    } as Partial<Request> as Request;

    const res = mockRes();

    await OutfitController.addItem(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid layerCategory' });
    expect(addItemToOutfit).not.toHaveBeenCalled();
  });

  it('should remove item from an outfit', async () => {
    const req = {
      user: mockUser,
      params: {
        id: 'outfit-1',
        itemId: 'item-123'
      }
    } as Partial<Request> as Request;

    const res = mockRes();
    const removalResult = { success: true };

    (removeItemFromOutfit as jest.Mock).mockResolvedValueOnce(removalResult);

    await OutfitController.removeItem(req, res, next);

    expect(removeItemFromOutfit).toHaveBeenCalledWith('outfit-1', 'item-123', mockUser.id);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(removalResult);
  });
});