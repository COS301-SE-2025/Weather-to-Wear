import { PrismaClient } from '@prisma/client';
import EventsController from '../src/modules/events/events.controller';
import { Request, Response, NextFunction } from 'express';

type MockedPrismaEvent = {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
};

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
        }
    };
    return { PrismaClient: jest.fn(() => mPrisma) };
});

const prisma = new PrismaClient() as unknown as { event: MockedPrismaEvent };

describe('EventsController Unit Tests (Mocked Prisma)', () => {
    const mockUser = { id: 'user-123' };

    const mockRes = (): Response => {
        const res: Partial<Response> = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn()
        };
        return res as Response;
    };

    const next = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should fetch all events for authenticated user', async () => {
        const req = { user: mockUser } as Partial<Request> as Request;
        const res = mockRes();

        const mockEvents = [{ id: 'e1', name: 'Mock Event' }];
        prisma.event.findMany.mockResolvedValueOnce(mockEvents);

        await EventsController.getEvents(req, res, next);

        expect(prisma.event.findMany).toHaveBeenCalledWith({
            where: { userId: mockUser.id },
            select: expect.any(Object)
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockEvents);
    });

    it('should get a single event by ID', async () => {
        const req = { user: mockUser, query: { id: 'e1' } } as unknown as Request;
        const res = mockRes();

        const mockEvent = { id: 'e1', name: 'Event One' };
        prisma.event.findFirst.mockResolvedValueOnce(mockEvent);

        await EventsController.getEventById(req, res, next);

        expect(prisma.event.findFirst).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockEvent);
    });

    it('should create a new event', async () => {
        const req = {
            user: mockUser,
            body: {
                name: 'Birthday Bash',
                location: 'Park',
                weather: 'Sunny',
                dateFrom: new Date().toISOString(),
                dateTo: new Date().toISOString(),
                style: 'CASUAL'
            }
        } as Partial<Request> as Request;

        const res = mockRes();

        const createdEvent = { id: 'e2', name: 'Birthday Bash' };
        prisma.event.create.mockResolvedValueOnce(createdEvent);

        await EventsController.createEvent(req, res, next);

        expect(prisma.event.create).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(createdEvent);
    });

    it('should update an existing event', async () => {
        const req = {
            user: mockUser,
            body: {
                id: 'e1',
                name: 'Updated Name'
            }
        } as Partial<Request> as Request;


        const res = mockRes();

        prisma.event.findUnique.mockResolvedValueOnce({ id: 'e1', userId: 'user-123' });
        prisma.event.update.mockResolvedValueOnce({ id: 'e1', name: 'Updated Name' });

        await EventsController.updateEvent(req, res, next);

        expect(prisma.event.update).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ id: 'e1', name: 'Updated Name' });
    });

    it('should delete an event', async () => {
        const req = {
            user: mockUser,
            body: { id: 'e1' }
        } as Partial<Request> as Request;

        const res = mockRes();

        prisma.event.findUnique.mockResolvedValueOnce({ id: 'e1', userId: 'user-123' });
        prisma.event.delete.mockResolvedValueOnce({});

        await EventsController.deleteEvent(req, res, next);

        expect(prisma.event.delete).toHaveBeenCalledWith({ where: { id: 'e1' } });
        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.send).toHaveBeenCalled();
    });
});
