import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Style } from '@prisma/client';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { getWeatherByLocation, getWeatherByDay } from '../weather/weather.service';

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
        select: {
          id: true,
          name: true,
          location: true,
          weather: true,
          dateFrom: true,
          dateTo: true,
          style: true,
        },
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

      const eventId = req.query.id as string;
      if (!eventId) {
        res.status(400).json({ message: 'Event ID is required' });
        return;
      }

      const event = await prisma.event.findFirst({
        where: { id: eventId, userId: user.id },
        select: {
          id: true,
          location: true,
          weather: true,
          dateFrom: true,
          dateTo: true,
          style: true,
          name: true,
        },
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

      const { name, location, dateFrom, dateTo, style } = req.body;
      if (!name || !location || !dateFrom || !dateTo || !style) {
        res.status(400).json({ message: 'Missing required fields' });
        return;
      }

      // use weather api to fetch weather summary
      const weatherDate = new Date(dateFrom).toISOString().split('T')[0];
      const weatherData = await getWeatherByDay(location, weatherDate);
      const weatherSummary = weatherData.summary.mainCondition;

      const newEvent = await prisma.event.create({
        data: {
          userId: user.id,
          name,
          location,
          weather: weatherSummary,
          dateFrom: new Date(dateFrom),
          dateTo: new Date(dateTo),
          style: style as Style,
        },
        select: {
          id: true,
          name: true,
          location: true,
          weather: true,
          dateFrom: true,
          dateTo: true,
          style: true,
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

      const { name, location, dateFrom, dateTo, style } = req.body;

      const existing = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!existing || existing.userId !== user.id) {
        res.status(404).json({ message: 'Event not found' });
        return;
      }

      // Prepare update payload
      const updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (location !== undefined) updateData.location = location;
      if (dateFrom !== undefined) updateData.dateFrom = new Date(dateFrom);
      if (dateTo !== undefined) updateData.dateTo = new Date(dateTo);
      if (style !== undefined) updateData.style = style as Style;

      // If either location or dateFrom changed, refresh weather
      if (location !== undefined || dateFrom !== undefined) {
        const newLocation = location ?? existing.location;
        const newDate = dateFrom !== undefined
          ? new Date(dateFrom).toISOString().split('T')[0]
          : existing.dateFrom.toISOString().split('T')[0];

        const weatherData = await getWeatherByDay(newLocation, newDate);
        //const weatherSummary = weatherData.summary.mainCondition;

        updateData.weather = JSON.stringify(weatherData.summary);
      }

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({ message: 'No fields to update' });
        return;
      }

      const updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: updateData,
        select: {
          id: true,
          name: true,
          location: true,
          weather: true,
          dateFrom: true,
          dateTo: true,
          style: true,
        },
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

      const eventId = req.body.id;
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