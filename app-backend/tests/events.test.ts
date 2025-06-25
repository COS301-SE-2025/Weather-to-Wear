import { PrismaClient } from '@prisma/client';
import EventsController from '../src/modules/events/events.controller';
import { Request, Response, NextFunction } from 'express';
import * as weatherService from '../src/modules/weather/weather.service';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mPrisma = {
    event: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mPrisma) };
});

// Mock weather service
jest.mock('../src/modules/weather/weather.service');
const mockGetWeatherByDay = weatherService.getWeatherByDay as jest.Mock;

const prisma = new PrismaClient() as unknown as { event: Record<string, jest.Mock> };

type MockResponse = Partial<Response>;
const createMockRes = (): Response => {
  const res: MockResponse = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  res.send = jest.fn().mockReturnThis();
  return res as Response;
};

const next: NextFunction = jest.fn();
const mockUser = { id: 'user-123' };

describe('EventsController Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEvents', () => {
    it('should fetch all events for authenticated user', async () => {
      const req = { user: mockUser } as unknown as Request;
      const res = createMockRes();

      const mockEvents = [{ id: 'e1', name: 'Mock Event' }];
      prisma.event.findMany.mockResolvedValueOnce(mockEvents);

      await EventsController.getEvents(req, res, next);

      expect(prisma.event.findMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        select: expect.objectContaining({ id: true, name: true }),
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockEvents);
    });

    it('should return 401 if no user', async () => {
      const req = {} as unknown as Request;
      const res = createMockRes();

      await EventsController.getEvents(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });
  });

  describe('getEventById', () => {
    it('should fetch event by id for authenticated user', async () => {
      const req = { user: mockUser, query: { id: 'e1' } } as unknown as Request;
      const res = createMockRes();

      const mockEvent = { id: 'e1', name: 'Event One' };
      prisma.event.findFirst.mockResolvedValueOnce(mockEvent);

      await EventsController.getEventById(req, res, next);

      expect(prisma.event.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'e1', userId: mockUser.id },
        select: expect.any(Object),
      }));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockEvent);
    });

    it('should return 400 if no id provided', async () => {
      const req = { user: mockUser, query: {} } as unknown as Request;
      const res = createMockRes();

      await EventsController.getEventById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Event ID is required' });
    });

    it('should return 404 if event not found', async () => {
      const req = { user: mockUser, query: { id: 'e2' } } as unknown as Request;
      const res = createMockRes();

      prisma.event.findFirst.mockResolvedValueOnce(null);

      await EventsController.getEventById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Event not found' });
    });
  });

  describe('createEvent', () => {
    it('should create a new event and fetch weather', async () => {
      const today = new Date().toISOString();
      const req = {
        user: mockUser,
        body: {
          name: 'Birthday Bash',
          location: 'Park',
          dateFrom: today,
          dateTo: today,
          style: 'CASUAL',
        },
      } as unknown as Request;
      const res = createMockRes();

      mockGetWeatherByDay.mockResolvedValueOnce({ summary: { mainCondition: 'Sunny' } });
      const createdEvent = { id: 'e2', name: 'Birthday Bash', weather: 'Sunny' };
      prisma.event.create.mockResolvedValueOnce(createdEvent);

      await EventsController.createEvent(req, res, next);

      expect(mockGetWeatherByDay).toHaveBeenCalledWith('Park', expect.any(String));
      expect(prisma.event.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          weather: expect.stringContaining('"mainCondition":"Sunny"')
        })
      }));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(createdEvent);
    });

    it('should return 400 if missing fields', async () => {
      const req = { user: mockUser, body: { name: 'No Location' } } as unknown as Request;
      const res = createMockRes();

      await EventsController.createEvent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing required fields' });
    });
  });

  describe('updateEvent', () => {
    it('should update event and refresh weather on location change', async () => {
      const req = {
        user: mockUser,
        body: { id: 'e1', location: 'Beach' },
      } as unknown as Request;
      const res = createMockRes();

      prisma.event.findUnique.mockResolvedValueOnce({ id: 'e1', userId: mockUser.id, location: 'Old', dateFrom: new Date() });
      mockGetWeatherByDay.mockResolvedValueOnce({ summary: { mainCondition: 'Rainy' } });
      const updated = { id: 'e1', location: 'Beach', weather: 'Rainy' };
      prisma.event.update.mockResolvedValueOnce(updated as any);

      await EventsController.updateEvent(req, res, next);

      expect(mockGetWeatherByDay).toHaveBeenCalledWith('Beach', expect.any(String));
      expect(prisma.event.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          weather: JSON.stringify({ mainCondition: 'Rainy' })
        })
      }));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('should return 400 if no fields to update', async () => {
      const req = { user: mockUser, body: { id: 'e1' } } as unknown as Request;
      const res = createMockRes();

      prisma.event.findUnique.mockResolvedValueOnce({ id: 'e1', userId: mockUser.id });

      await EventsController.updateEvent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'No fields to update' });
    });
  });

  describe('deleteEvent', () => {
    it('should delete an event', async () => {
      const req = { user: mockUser, body: { id: 'e1' } } as unknown as Request;
      const res = createMockRes();

      prisma.event.findUnique.mockResolvedValueOnce({ id: 'e1', userId: mockUser.id });
      prisma.event.delete.mockResolvedValueOnce({});

      await EventsController.deleteEvent(req, res, next);

      expect(prisma.event.delete).toHaveBeenCalledWith({ where: { id: 'e1' } });
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('should return 404 if not found or wrong user', async () => {
      const req = { user: mockUser, body: { id: 'e2' } } as unknown as Request;
      const res = createMockRes();

      prisma.event.findUnique.mockResolvedValueOnce(null);

      await EventsController.deleteEvent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Event not found' });
    });
  });
});
