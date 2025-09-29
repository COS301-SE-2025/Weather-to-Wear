import { PrismaClient, Style } from '@prisma/client';
const prisma = new PrismaClient();

export type DaySelCreate = {
  userId: string;
  dateISO: string;             // "YYYY-MM-DD"
  location?: string;
  style?: Style;
  items: { closetItemId: string; layerCategory: string; sortOrder: number }[];
  weather: { avgTemp: number; minTemp: number; maxTemp: number; willRain: boolean; mainCondition: string };
  outfitId?: string | null;
};

export async function upsertForDay(input: DaySelCreate) {
  const dateStart = new Date(input.dateISO + 'T00:00:00.000Z');
  if (isNaN(dateStart.getTime())) {
    throw new Error('Invalid date format');
  }
  return prisma.daySelection.upsert({
    where: { userId_date: { userId: input.userId, date: dateStart } },
    update: {
      location: input.location,
      style: input.style,
      items: input.items as any,
      weatherAvg: input.weather.avgTemp,
      weatherMin: input.weather.minTemp,
      weatherMax: input.weather.maxTemp,
      willRain: input.weather.willRain,
      mainCondition: input.weather.mainCondition,
      outfitId: input.outfitId ?? null,
    },
    create: {
      userId: input.userId,
      date: dateStart,
      location: input.location,
      style: input.style,
      items: input.items as any,
      weatherAvg: input.weather.avgTemp,
      weatherMin: input.weather.minTemp,
      weatherMax: input.weather.maxTemp,
      willRain: input.weather.willRain,
      mainCondition: input.weather.mainCondition,
      outfitId: input.outfitId ?? null,
    },
  });
}

export async function getForDay(userId: string, dateISO: string) {
  const dateStart = new Date(dateISO + 'T00:00:00.000Z');
  return prisma.daySelection.findUnique({
    where: { userId_date: { userId, date: dateStart } },
  });
}

export async function patchById(userId: string, id: string, patch: any) {
  const existing = await prisma.daySelection.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) throw new Error('Not found');
  return prisma.daySelection.update({
    where: { id },
    data: patch,
  });
}

export async function deleteByDate(userId: string, dateISO: string) {
  const dateStart = new Date(dateISO + 'T00:00:00.000Z');
  await prisma.daySelection.delete({
    where: { userId_date: { userId, date: dateStart } },
  }).catch(() => {});
}