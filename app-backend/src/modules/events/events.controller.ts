import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Style } from '@prisma/client';
import { AuthenticatedRequest } from '../auth/auth.middleware';

const prisma = new PrismaClient();

class EventsController {
  // GET all events for authenticated user
  getEvents = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (!user?.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const events = await prisma.event.findMany({
        where: { userId: user.id },
      });
      res.status(200).json(events);
    } catch (err) {
      next(err);
    }
  };

  // GET single event by ID
  getEventById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (!user?.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const eventId = req.query.id as string; // Get ID from query params
      if (!eventId) {
        res.status(400).json({ message: 'Event ID is required' });
        return;
      }

      const event = await prisma.event.findFirst({
        where: { id: eventId, userId: user.id },
      });

      if (!event) {
        res.status(404).json({ message: 'Event not found' });
        return;
      }

      res.status(200).json(event);
    } catch (err) {
      next(err);
    }
  };

  // POST create new event
  createEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (!user?.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const { location, weather, dateFrom, dateTo, style } = req.body;
      const newEvent = await prisma.event.create({
        data: {
          userId: user.id,
          location,
          weather,
          dateFrom: new Date(dateFrom),
          dateTo: new Date(dateTo),
          style: style as Style,
        },
      });
      res.status(201).json(newEvent);
    } catch (err) {
      next(err);
    }
  };

  // PUT update existing event
  updateEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (!user?.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const eventId = req.body.id;
      if (!eventId) {
        res.status(400).json({ message: 'Event ID is required' });
        return;
      }

      // Only destructure the fields that might be provided
      const { location, weather, dateFrom, dateTo, style } = req.body;

      const existing = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!existing || existing.userId !== user.id) {
        res.status(404).json({ message: 'Event not found' });
        return;
      }

      // Create update data object with only provided fields
      const updateData: any = {};

      if (location !== undefined) updateData.location = location;
      if (weather !== undefined) updateData.weather = weather;
      if (dateFrom !== undefined) updateData.dateFrom = new Date(dateFrom);
      if (dateTo !== undefined) updateData.dateTo = new Date(dateTo);
      if (style !== undefined) updateData.style = style as Style;

      // Ensure at least one field is being updated
      if (Object.keys(updateData).length === 0) {
        res.status(400).json({ message: 'No fields to update' });
        return;
      }

      const updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: updateData,
      });

      res.status(200).json(updatedEvent);
    } catch (err) {
      next(err);
    }
  };

  // DELETE event
  deleteEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (!user?.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const eventId = req.body.id; // Get ID from request body
      if (!eventId) {
        res.status(400).json({ message: 'Event ID is required' });
        return;
      }

      const existing = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!existing || existing.userId !== user.id) {
        res.status(404).json({ message: 'Event not found' });
        return;
      }

      await prisma.event.delete({
        where: { id: eventId },
      });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}

export default new EventsController();