// src/utils/date.ts
export function formatMonthDay(d: string | number | Date, locale: string = 'en-US') {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString(locale, { month: 'long', day: 'numeric' });
}

export function formatShortMonthDay(d: string | number | Date) {
  const dt = new Date(d);
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sept","Oct","Nov","Dec"];
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
}