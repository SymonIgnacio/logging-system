export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getPeriodStartMinutes(period: string): number {
  const [startTime] = period.split("-");
  if (!startTime) return Number.POSITIVE_INFINITY;

  const [startHourText, startMinuteText] = startTime.split(":");
  const hour = Number(startHourText);
  const minute = Number(startMinuteText);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return Number.POSITIVE_INFINITY;
  }

  return hour * 60 + minute;
}
