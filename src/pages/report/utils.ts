import { getPeriodStartMinutes } from "../../utils/dateTime";
import { type ScheduleRow } from "./types";

export function sortGradeValues(a: string, b: string): number {
  const aNumber = Number(a);
  const bNumber = Number(b);
  const bothNumeric = !Number.isNaN(aNumber) && !Number.isNaN(bNumber);

  if (bothNumeric) {
    return aNumber - bNumber;
  }

  return a.localeCompare(b);
}

export function getDayLabel(dateText: string): string {
  const parsedDate = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }
  return parsedDate.toLocaleDateString(undefined, { weekday: "long" });
}

export function formatMonthDay(dateText: string): string {
  const parsedDate = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return dateText;
  }
  return parsedDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase();
}

export function sortScheduleRows(rows: ScheduleRow[]): ScheduleRow[] {
  return [...rows].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;

    const gradeCompare = sortGradeValues(a.grade, b.grade);
    if (gradeCompare !== 0) return gradeCompare;

    const sectionCompare = a.section.localeCompare(b.section);
    if (sectionCompare !== 0) return sectionCompare;

    return getPeriodStartMinutes(a.schedule) - getPeriodStartMinutes(b.schedule);
  });
}
