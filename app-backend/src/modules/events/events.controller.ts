import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Style } from '@prisma/client';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { getWeatherByLocation, getWeatherByDay } from '../weather/weather.service';
import prisma from "../../../src/prisma";

class EventsController {
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
          isTrip: true, 
        },
        orderBy: { dateFrom: 'asc' },
      });
      res.status(200).json(events);
    } catch (err) {
      next(err);
    }
  };

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
          isTrip: true, 
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

  createEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (!user?.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const { name, location, dateFrom, dateTo, style, isTrip } = req.body;
      if (!name || !location || !dateFrom || !dateTo || !style) {
        res.status(400).json({ message: 'Missing required fields' });
        return;
      }

      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (fromDate < today) {
        res.status(400).json({ message: 'Event start date cannot be in the past.' });
        return;
      }
      if (toDate < fromDate) {
        res.status(400).json({ message: 'End date cannot be before start date.' });
        return;
      }

    
      const dateFromObj = new Date(dateFrom);
      const dateToObj = new Date(dateTo);
      const allDates = getAllDatesInRange(dateFromObj, dateToObj);

      const weatherSummaries: { date: string; summary: any }[] = [];
      for (const date of allDates) {
        try {
          const weatherData = await getWeatherByDay(location, date);
          weatherSummaries.push({ date, summary: weatherData.summary });
        } catch {
          weatherSummaries.push({ date, summary: null });
        }
      }

      const newEvent = await prisma.event.create({
        data: {
          userId: user.id,
          name,
          location,
          weather: JSON.stringify(weatherSummaries),
          dateFrom: fromDate,
          dateTo: toDate,
          style: style as Style,
          isTrip: Boolean(isTrip), 
        },
        select: {
          id: true,
          name: true,
          location: true,
          weather: true,
          dateFrom: true,
          dateTo: true,
          style: true,
          isTrip: true, 
        },
      });

      res.status(201).json(newEvent);
    } catch (err) {
      next(err);
    }
  };

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

      const { name, location, dateFrom, dateTo, style, isTrip } = req.body;

      const existing = await prisma.event.findUnique({ where: { id: eventId } });
      if (!existing || existing.userId !== user.id) {
        res.status(404).json({ message: 'Event not found' });
        return;
      }

      const updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (location !== undefined) updateData.location = location;
      if (dateFrom !== undefined) updateData.dateFrom = new Date(dateFrom);
      if (dateTo !== undefined) updateData.dateTo = new Date(dateTo);
      if (style !== undefined) updateData.style = style as Style;
      if (isTrip !== undefined) updateData.isTrip = Boolean(isTrip); // NEW

      if (location !== undefined || dateFrom !== undefined || dateTo !== undefined) {
        const newLocation = location ?? existing.location;
        const newFromDate = dateFrom !== undefined ? new Date(dateFrom) : existing.dateFrom;
        const newToDate = dateTo !== undefined ? new Date(dateTo) : existing.dateTo;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (newFromDate < today) {
          res.status(400).json({ message: 'Event start date cannot be in the past.' });
          return;
        }
        if (newToDate < newFromDate) {
          res.status(400).json({ message: 'End date cannot be before start date.' });
          return;
        }

        const allDates = getAllDatesInRange(newFromDate, newToDate);
        const weatherSummaries: { date: string; summary: any }[] = [];
        for (const date of allDates) {
          try {
            const weatherData = await getWeatherByDay(newLocation, date);
            weatherSummaries.push({ date, summary: weatherData.summary });
          } catch {
            weatherSummaries.push({ date, summary: null });
          }
        }
        updateData.weather = JSON.stringify(weatherSummaries);
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
          isTrip: true, 
        },
      });

      res.status(200).json(updatedEvent);
    } catch (err) {
      next(err);
    }
  };

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

      const existing = await prisma.event.findUnique({ where: { id: eventId } });
      if (!existing || existing.userId !== user.id) {
        res.status(404).json({ message: 'Event not found' });
        return;
      }

      await prisma.event.delete({ where: { id: eventId } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}

function getAllDatesInRange(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const curr = new Date(start);
  curr.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);

  while (curr <= last) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

export default new EventsController();