// import prisma from "../../../src/prisma";
import prisma from '../../prisma';
import { getWeatherByDay } from "../weather/weather.service";

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

export async function backfillWeatherForUpcomingEvents() {
  const now = new Date();
  const threeDays = new Date(now);
  threeDays.setDate(now.getDate() + 3);

  const events = await prisma.event.findMany({
    where: {
      dateFrom: { gte: now, lte: threeDays },
      OR: [{ weather: null }, { weather: '' }],
    },
    select: {
      id: true,
      location: true,
      dateFrom: true,
      dateTo: true,
    },
  });

  for (const ev of events) {
    try {
      const allDates = getAllDatesInRange(ev.dateFrom, ev.dateTo);
      const summaries: { date: string; summary: any }[] = [];

      for (const date of allDates) {
        try {
          const w = await getWeatherByDay(ev.location, date);
          summaries.push({ date, summary: w.summary });
        } catch {
          summaries.push({ date, summary: null });
        }
      }

      await prisma.event.update({
        where: { id: ev.id },
        data: { weather: JSON.stringify(summaries) },
      });
    } catch (e) {
      console.error(`Weather backfill failed for event ${ev.id}`, e);
    }
  }
}
