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

      // Error handling for not looking too far into future or looking into past
      const fromDate = new Date(dateFrom);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // past date
      if (fromDate < today) {
        res.status(400).json({ message: 'Event start date cannot be in the past.' });
        return;
      }

      // FreeWeatherAPI allows 3 days, OWM 5 days
      const MAX_FORECAST_DAYS = 3;
      const maxAllowedDate = new Date(today);
      maxAllowedDate.setDate(today.getDate() + MAX_FORECAST_DAYS);

      if (fromDate > maxAllowedDate) {
        res.status(400).json({ message: `Event start date is too far in the future. Please select a date within the next ${MAX_FORECAST_DAYS} days.` });
        return;
      }



      // use weather api to fetch weather summaries
      const dateFromObj = new Date(dateFrom);
      const dateToObj = new Date(dateTo);
      const allDates = getAllDatesInRange(dateFromObj, dateToObj);

      const weatherSummaries: { date: string; summary: any }[] = [];
      for (const date of allDates) {
        try {
          const weatherData = await getWeatherByDay(location, date);
          weatherSummaries.push({ date, summary: weatherData.summary });
        } catch (err) {
          weatherSummaries.push({ date, summary: null }); // ! need an error message per chance
        }
      }

      const newEvent = await prisma.event.create({
        data: {
          userId: user.id,
          name,
          location,
          weather: JSON.stringify(weatherSummaries),
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

      // Only check date boundaries if dateFrom is provided (or location is updated, since weather will refresh)
      if (location !== undefined || dateFrom !== undefined) {
        const newLocation = location ?? existing.location;
        const newFromDate = dateFrom !== undefined
          ? new Date(dateFrom)
          : existing.dateFrom;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // past date
        if (newFromDate < today) {
          res.status(400).json({ message: 'Event start date cannot be in the past.' });
          return;
        }

        const MAX_FORECAST_DAYS = 3;
        const maxAllowedDate = new Date(today);
        maxAllowedDate.setDate(today.getDate() + MAX_FORECAST_DAYS);

        if (newFromDate > maxAllowedDate) {
          res.status(400).json({ message: `Event start date is too far in the future. Please select a date within the next ${MAX_FORECAST_DAYS} days.` });
          return;
        }

        const weatherDate = newFromDate.toISOString().split('T')[0];

        let weatherData;
        try {
          weatherData = await getWeatherByDay(newLocation, weatherDate);
        } catch (err: any) {
          res.status(400).json({ message: 'Weather forecast unavailable for the selected date/location.' });
          return;
        }
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

// for events which span multiple days
function getAllDatesInRange(start: Date, end: Date): string[] {
  const dates = [];
  const curr = new Date(start);
  while (curr <= end) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

export default new EventsController();
