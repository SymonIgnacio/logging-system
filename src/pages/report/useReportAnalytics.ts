import { useMemo } from "react";
import {
  type DateRange,
  type Log,
  type Period,
  type ReportAnalyticsResult,
  type ScheduleRow,
  type TableFilters,
} from "./types";
import {
  clampPercentage,
  formatMonthDay,
  getDayLabel,
  normalizeSearchText,
  sortGradeValues,
  sortScheduleRows,
} from "./utils";

export const DEFAULT_TABLE_ITEMS_PER_PAGE = 10;

interface UseReportAnalyticsParams {
  logs: Log[];
  periods: Period[];
  dateRange: DateRange;
  statsGradeFilter: string;
  tableFilters: TableFilters;
  tablePage: number;
  tableItemsPerPage?: number;
}

export function useReportAnalytics({
  logs,
  periods,
  dateRange,
  statsGradeFilter,
  tableFilters,
  tablePage,
  tableItemsPerPage = DEFAULT_TABLE_ITEMS_PER_PAGE,
}: UseReportAnalyticsParams): ReportAnalyticsResult {
  const filteredLogs = useMemo<Log[]>(() => {
    return logs.filter((log) => {
      if (dateRange.start && log.date < dateRange.start) return false;
      if (dateRange.end && log.date > dateRange.end) return false;
      if (statsGradeFilter && log.grade !== statsGradeFilter) return false;
      return true;
    });
  }, [logs, dateRange, statsGradeFilter]);

  const uniqueGrades = useMemo<string[]>(() => {
    const grades = new Set(periods.map((period) => period.grade));
    return Array.from(grades).sort(sortGradeValues);
  }, [periods]);

  const gradeStats = useMemo(() => {
    return uniqueGrades.map((grade) => {
      const gradeLogs = filteredLogs.filter((log) => log.grade === grade);
      const total = gradeLogs.length;
      const present = gradeLogs.filter((log) => log.status === "present").length;
      const late = gradeLogs.filter((log) => log.status === "late").length;
      const absent = gradeLogs.filter((log) => log.status === "absent").length;
      const rate = total > 0 ? ((present + late) / total) * 100 : 0;

      return { grade, total, present, late, absent, rate };
    });
  }, [uniqueGrades, filteredLogs]);

  const teacherStats = useMemo(() => {
    const teachers = Array.from(new Set(periods.map((period) => period.teacher))).sort();
    return teachers
      .map((teacher) => {
        const teacherLogs = filteredLogs.filter((log) => log.teacher === teacher);
        const total = teacherLogs.length;
        const present = teacherLogs.filter((log) => log.status === "present").length;
        const late = teacherLogs.filter((log) => log.status === "late").length;
        const absent = teacherLogs.filter((log) => log.status === "absent").length;
        const rate = total > 0 ? ((present + late) / total) * 100 : 0;

        return { teacher, total, present, late, absent, rate };
      })
      .filter((teacher) => teacher.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [periods, filteredLogs]);

  const stats = useMemo(() => {
    const total = filteredLogs.length;
    const present = filteredLogs.filter((log) => log.status === "present").length;
    const late = filteredLogs.filter((log) => log.status === "late").length;
    const absent = filteredLogs.filter((log) => log.status === "absent").length;
    const attendanceRate = total > 0 ? ((present + late) / total) * 100 : 0;

    return { total, present, late, absent, attendanceRate };
  }, [filteredLogs]);

  const statusSegments = useMemo(
    () => [
      { label: "Present", value: stats.present, colorHex: "#16a34a", colorClass: "bg-emerald-500" },
      { label: "Late", value: stats.late, colorHex: "#f59e0b", colorClass: "bg-amber-500" },
      { label: "Absent", value: stats.absent, colorHex: "#ef4444", colorClass: "bg-rose-500" },
    ],
    [stats]
  );

  const donutStyle = useMemo(() => {
    if (stats.total === 0) {
      return { background: "conic-gradient(#e2e8f0 0% 100%)" };
    }

    const presentPercent = clampPercentage((stats.present / stats.total) * 100);
    const latePercent = clampPercentage((stats.late / stats.total) * 100);
    const presentEnd = presentPercent;
    const lateEnd = clampPercentage(presentPercent + latePercent);

    return {
      background: `conic-gradient(
        #16a34a 0% ${presentEnd}%,
        #f59e0b ${presentEnd}% ${lateEnd}%,
        #ef4444 ${lateEnd}% 100%
      )`,
    };
  }, [stats]);

  const dailyVolumePoints = useMemo(() => {
    const grouped = new Map<string, { total: number; attended: number }>();

    filteredLogs.forEach((log) => {
      const current = grouped.get(log.date);
      const attendedIncrement = log.status === "present" || log.status === "late" ? 1 : 0;

      if (current) {
        current.total += 1;
        current.attended += attendedIncrement;
      } else {
        grouped.set(log.date, { total: 1, attended: attendedIncrement });
      }
    });

    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([date, values]) => ({
        date,
        shortDate: formatMonthDay(date),
        total: values.total,
        attended: values.attended,
      }));
  }, [filteredLogs]);

  const maxDailyTotal = useMemo<number>(() => {
    if (dailyVolumePoints.length === 0) return 1;
    return Math.max(1, ...dailyVolumePoints.map((point) => point.total));
  }, [dailyVolumePoints]);

  const gradeChartStats = useMemo(() => {
    return [...gradeStats]
      .filter((grade) => grade.total > 0)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 8);
  }, [gradeStats]);

  const teacherChartStats = useMemo(() => {
    return teacherStats.slice(0, 8);
  }, [teacherStats]);

  const scheduleRows = useMemo<ScheduleRow[]>(() => {
    const rows: ScheduleRow[] = logs
      .filter((log) => Boolean(log.grade && log.section && log.period && log.date))
      .map((log) => ({
        id: log.id,
        grade: log.grade,
        section: log.section,
        schedule: log.period,
        date: log.date,
        day: getDayLabel(log.date),
      }));

    return sortScheduleRows(rows);
  }, [logs]);

  const scheduleGradeOptions = useMemo<string[]>(() => {
    return Array.from(new Set(scheduleRows.map((row) => row.grade))).sort(sortGradeValues);
  }, [scheduleRows]);

  const scheduleSectionOptions = useMemo<string[]>(() => {
    return Array.from(
      new Set(
        scheduleRows
          .filter((row) => !tableFilters.grade || row.grade === tableFilters.grade)
          .map((row) => row.section)
      )
    ).sort();
  }, [scheduleRows, tableFilters.grade]);

  const normalizedTableSearch = normalizeSearchText(tableFilters.search);

  const filteredScheduleRows = useMemo<ScheduleRow[]>(() => {
    return scheduleRows.filter((row) => {
      if (tableFilters.grade && row.grade !== tableFilters.grade) return false;
      if (tableFilters.section && row.section !== tableFilters.section) return false;
      if (tableFilters.date && row.date !== tableFilters.date) return false;
      if (!normalizedTableSearch) return true;

      const searchableText =
        `${row.grade} ${row.section} ${row.schedule} ${row.date} ${row.day}`.toLowerCase();
      return searchableText.includes(normalizedTableSearch);
    });
  }, [scheduleRows, tableFilters, normalizedTableSearch]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredScheduleRows.length / tableItemsPerPage)
  );
  const effectivePage = Math.min(tablePage, totalPages);
  const startIndex = (effectivePage - 1) * tableItemsPerPage;
  const endIndex = Math.min(startIndex + tableItemsPerPage, filteredScheduleRows.length);
  const pageRows = filteredScheduleRows.slice(startIndex, startIndex + tableItemsPerPage);

  const tableActiveFilters = useMemo<string[]>(() => {
    const items: string[] = [];
    if (tableFilters.grade) items.push(`Grade ${tableFilters.grade}`);
    if (tableFilters.section) items.push(`Section ${tableFilters.section}`);
    if (tableFilters.date) items.push(`Date ${tableFilters.date}`);
    if (normalizedTableSearch) items.push(`Search: ${tableFilters.search.trim()}`);
    return items;
  }, [tableFilters, normalizedTableSearch]);

  return {
    filteredLogs,
    uniqueGrades,
    stats,
    gradeStats,
    teacherStats,
    statusSegments,
    donutStyle,
    dailyVolumePoints,
    maxDailyTotal,
    gradeChartStats,
    teacherChartStats,
    scheduleGradeOptions,
    scheduleSectionOptions,
    filteredScheduleRows,
    tableActiveFilters,
    tablePagination: {
      effectivePage,
      totalPages,
      startIndex,
      endIndex,
      pageRows,
    },
  };
}
