import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { collection, getFirestore, onSnapshot, Timestamp } from "firebase/firestore";
import * as XLSX from "xlsx";
import { FiBarChart2, FiDownload, FiFilter, FiRefreshCw, FiSearch } from "react-icons/fi";
import { getLocalDateString, getPeriodStartMinutes } from "../utils/dateTime";

const db = getFirestore();
const TABLE_ITEMS_PER_PAGE = 10;

interface Log {
  id: string;
  teacher: string;
  grade: string;
  section: string;
  subject: string;
  period: string;
  status: "present" | "absent" | "late";
  startTime: Timestamp | null;
  date: string;
}

interface Period {
  id: string;
  teacher: string;
  grade: string;
  section: string;
  subject: string;
  period: string;
}

interface DateRange {
  start: string;
  end: string;
}

interface ScheduleRow {
  id: string;
  grade: string;
  section: string;
  schedule: string;
  date: string;
  day: string;
}

interface DailyVolumePoint {
  date: string;
  shortDate: string;
  total: number;
  attended: number;
}

function sortGradeValues(a: string, b: string): number {
  const aNumber = Number(a);
  const bNumber = Number(b);
  const bothNumeric = !Number.isNaN(aNumber) && !Number.isNaN(bNumber);
  if (bothNumeric) {
    return aNumber - bNumber;
  }
  return a.localeCompare(b);
}

function getDayLabel(dateText: string): string {
  const parsedDate = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }
  return parsedDate.toLocaleDateString(undefined, { weekday: "long" });
}

function formatMonthDay(dateText: string): string {
  const parsedDate = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return dateText;
  }
  return parsedDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase();
}

export default function Report() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"stats" | "export">("stats");
  const [dateRange, setDateRange] = useState<DateRange>({ start: "", end: "" });
  const [statsGradeFilter, setStatsGradeFilter] = useState<string>("");
  const [tableGradeFilter, setTableGradeFilter] = useState<string>("");
  const [tableSectionFilter, setTableSectionFilter] = useState<string>("");
  const [tableDateFilter, setTableDateFilter] = useState<string>("");
  const [tableSearch, setTableSearch] = useState<string>("");
  const [tablePage, setTablePage] = useState<number>(1);

  useEffect(() => {
    let isInitialLoad = true;
    
    const unsubscribeLogs = onSnapshot(collection(db, "logs"), (snapshot) => {
      const logsData: Log[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Log[];
      setLogs(logsData);
      if (isInitialLoad) {
        setLoading(false);
        isInitialLoad = false;
      }
    });

    const unsubscribePeriods = onSnapshot(collection(db, "periods"), (snapshot) => {
      const periodsData: Period[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Period[];
      setPeriods(periodsData);
    });

    return () => {
      unsubscribeLogs();
      unsubscribePeriods();
    };
  }, []);

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

  const donutStyle = useMemo<CSSProperties>(() => {
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

  const dailyVolumePoints = useMemo<DailyVolumePoint[]>(() => {
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
    return logs
      .filter((log) => Boolean(log.grade && log.section && log.period && log.date))
      .map((log) => ({
        id: log.id,
        grade: log.grade,
        section: log.section,
        schedule: log.period,
        date: log.date,
        day: getDayLabel(log.date),
      }))
      .sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;

        const gradeCompare = sortGradeValues(a.grade, b.grade);
        if (gradeCompare !== 0) return gradeCompare;

        const sectionCompare = a.section.localeCompare(b.section);
        if (sectionCompare !== 0) return sectionCompare;

        return getPeriodStartMinutes(a.schedule) - getPeriodStartMinutes(b.schedule);
      });
  }, [logs]);

  const scheduleGradeOptions = useMemo<string[]>(() => {
    return Array.from(new Set(scheduleRows.map((row) => row.grade))).sort(sortGradeValues);
  }, [scheduleRows]);

  const scheduleSectionOptions = useMemo<string[]>(() => {
    return Array.from(
      new Set(
        scheduleRows
          .filter((row) => !tableGradeFilter || row.grade === tableGradeFilter)
          .map((row) => row.section)
      )
    ).sort();
  }, [scheduleRows, tableGradeFilter]);

  const normalizedTableSearch = normalizeSearchText(tableSearch);

  const filteredScheduleRows = useMemo<ScheduleRow[]>(() => {
    return scheduleRows.filter((row) => {
      if (tableGradeFilter && row.grade !== tableGradeFilter) return false;
      if (tableSectionFilter && row.section !== tableSectionFilter) return false;
      if (tableDateFilter && row.date !== tableDateFilter) return false;
      if (!normalizedTableSearch) return true;

      const searchableText =
        `${row.grade} ${row.section} ${row.schedule} ${row.date} ${row.day}`.toLowerCase();
      return searchableText.includes(normalizedTableSearch);
    });
  }, [
    scheduleRows,
    tableGradeFilter,
    tableSectionFilter,
    tableDateFilter,
    normalizedTableSearch,
  ]);

  const totalTablePages = Math.max(
    1,
    Math.ceil(filteredScheduleRows.length / TABLE_ITEMS_PER_PAGE)
  );
  const effectiveTablePage = Math.min(tablePage, totalTablePages);
  const tableStartIndex = (effectiveTablePage - 1) * TABLE_ITEMS_PER_PAGE;
  const tableEndIndex = Math.min(
    tableStartIndex + TABLE_ITEMS_PER_PAGE,
    filteredScheduleRows.length
  );
  const paginatedScheduleRows = filteredScheduleRows.slice(
    tableStartIndex,
    tableStartIndex + TABLE_ITEMS_PER_PAGE
  );

  const tableActiveFilters = useMemo<string[]>(() => {
    const items: string[] = [];
    if (tableGradeFilter) items.push(`Grade ${tableGradeFilter}`);
    if (tableSectionFilter) items.push(`Section ${tableSectionFilter}`);
    if (tableDateFilter) items.push(`Date ${tableDateFilter}`);
    if (normalizedTableSearch) items.push(`Search: ${tableSearch.trim()}`);
    return items;
  }, [tableGradeFilter, tableSectionFilter, tableDateFilter, normalizedTableSearch, tableSearch]);

  const clearStatsFilters = (): void => {
    setDateRange({ start: "", end: "" });
    setStatsGradeFilter("");
  };

  const clearTableFilters = (): void => {
    setTableGradeFilter("");
    setTableSectionFilter("");
    setTableDateFilter("");
    setTableSearch("");
    setTablePage(1);
  };

  const handleScheduleTableExport = (): void => {
    const workbook = XLSX.utils.book_new();

    const scheduleData = filteredScheduleRows.map((row) => ({
      Grade: row.grade,
      Section: row.section,
      Schedule: row.schedule,
      Date: row.date,
      Day: row.day,
    }));
    const scheduleSheet = XLSX.utils.json_to_sheet(scheduleData);
    XLSX.utils.book_append_sheet(workbook, scheduleSheet, "Schedule Report");

    XLSX.writeFile(workbook, `schedule_report_${getLocalDateString(new Date())}.xlsx`);
  };

  const handleExport = (): void => {
    const wb = XLSX.utils.book_new();

    const statsData = [
      { Metric: "Total Sessions", Value: stats.total },
      { Metric: "Present", Value: stats.present },
      { Metric: "Late", Value: stats.late },
      { Metric: "Absent", Value: stats.absent },
      { Metric: "Attendance Rate", Value: `${stats.attendanceRate.toFixed(1)}%` },
    ];
    const wsStats = XLSX.utils.json_to_sheet(statsData);
    XLSX.utils.book_append_sheet(wb, wsStats, "Summary");

    const gradeData = gradeStats.map((g) => ({
      Grade: g.grade,
      "Total Sessions": g.total,
      Present: g.present,
      Late: g.late,
      Absent: g.absent,
      "Attendance Rate": `${g.rate.toFixed(1)}%`,
    }));
    const wsGrades = XLSX.utils.json_to_sheet(gradeData);
    XLSX.utils.book_append_sheet(wb, wsGrades, "By Grade");

    const teacherData = teacherStats.map((t) => ({
      Teacher: t.teacher,
      "Total Sessions": t.total,
      Present: t.present,
      Late: t.late,
      Absent: t.absent,
      "Attendance Rate": `${t.rate.toFixed(1)}%`,
    }));
    const wsTeachers = XLSX.utils.json_to_sheet(teacherData);
    XLSX.utils.book_append_sheet(wb, wsTeachers, "By Teacher");

    const logData = filteredLogs.map((l) => ({
      Date: l.date,
      Grade: l.grade,
      Section: l.section,
      Subject: l.subject,
      Teacher: l.teacher,
      Period: l.period,
      Status: l.status,
    }));
    const wsLogs = XLSX.utils.json_to_sheet(logData);
    XLSX.utils.book_append_sheet(wb, wsLogs, "Detailed Logs");

    const scheduleData = filteredScheduleRows.map((row) => ({
      Grade: row.grade,
      Section: row.section,
      Schedule: row.schedule,
      Date: row.date,
      Day: row.day,
    }));
    const wsSchedule = XLSX.utils.json_to_sheet(scheduleData);
    XLSX.utils.book_append_sheet(wb, wsSchedule, "Schedule Report");

    XLSX.writeFile(wb, `attendance_report_${getLocalDateString(new Date())}.xlsx`);
  };

  if (loading) {
    return <div className="panel p-4">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="panel p-4 md:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="section-title">Reports</h1>
          <p className="muted text-sm">Interactive charts, clean filters, and organized schedule reports.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView("stats")}
            className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 border ${
              view === "stats" ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200"
            }`}
          >
            <FiBarChart2 /> Analytics
          </button>
          <button
            onClick={() => setView("export")}
            className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 border ${
              view === "export" ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200"
            }`}
          >
            <FiDownload /> Export
          </button>
        </div>
      </div>

      <div className="panel p-4 md:p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm font-semibold flex items-center gap-2"><FiFilter /> Report Filters</p>
          <button
            onClick={clearStatsFilters}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center gap-1"
          >
            <FiRefreshCw /> Reset
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(event) =>
                setDateRange((previous) => ({ ...previous, start: event.target.value }))
              }
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(event) =>
                setDateRange((previous) => ({ ...previous, end: event.target.value }))
              }
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Grade</label>
            <select
              value={statsGradeFilter}
              onChange={(event) => setStatsGradeFilter(event.target.value)}
              className="input"
            >
              <option value="">All Grades</option>
              {uniqueGrades.map((grade) => (
                <option key={grade} value={grade}>Grade {grade}</option>
              ))}
            </select>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 flex flex-col justify-center">
            <p className="text-xs text-blue-700">Filtered Sessions</p>
            <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
            <p className="text-xs text-blue-700">Current report scope</p>
          </div>
        </div>
      </div>

      {view === "stats" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="panel p-4">
              <p className="text-sm text-gray-600">Total Sessions</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <div className="panel p-4 bg-emerald-50 border-emerald-100">
              <p className="text-sm text-emerald-700">Present</p>
              <p className="text-3xl font-bold text-emerald-700">{stats.present}</p>
            </div>
            <div className="panel p-4 bg-amber-50 border-amber-100">
              <p className="text-sm text-amber-700">Late</p>
              <p className="text-3xl font-bold text-amber-700">{stats.late}</p>
            </div>
            <div className="panel p-4 bg-rose-50 border-rose-100">
              <p className="text-sm text-rose-700">Absent</p>
              <p className="text-3xl font-bold text-rose-700">{stats.absent}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-3">
            <div className="panel p-4 md:p-5 xl:col-span-2 space-y-4">
              <div>
                <h3 className="text-base font-semibold">Attendance Mix</h3>
                <p className="text-sm text-gray-500">Visual breakdown of present, late, and absent.</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="relative">
                  <div className="h-40 w-40 rounded-full" style={donutStyle} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-24 w-24 rounded-full bg-white border border-gray-100 flex flex-col items-center justify-center">
                      <p className="text-2xl font-bold">{stats.attendanceRate.toFixed(1)}%</p>
                      <p className="text-[11px] text-gray-500">Attendance</p>
                    </div>
                  </div>
                </div>
                <div className="w-full space-y-2">
                  {statusSegments.map((segment) => {
                    const percent = stats.total > 0 ? (segment.value / stats.total) * 100 : 0;
                    return (
                      <div key={segment.label} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <p className="font-medium flex items-center gap-2">
                            <span className={`inline-block h-2.5 w-2.5 rounded-full ${segment.colorClass}`} />
                            {segment.label}
                          </p>
                          <p className="text-gray-600">{segment.value} ({percent.toFixed(1)}%)</p>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${clampPercentage(percent)}%`, backgroundColor: segment.colorHex }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="panel p-4 md:p-5 xl:col-span-3 space-y-3">
              <div>
                <h3 className="text-base font-semibold">Daily Session Trend</h3>
                <p className="text-sm text-gray-500">Attended vs unattended sessions for recent days.</p>
              </div>
              {dailyVolumePoints.length === 0 ? (
                <div className="h-[190px] rounded-xl border border-dashed border-gray-300 grid place-items-center text-sm text-gray-500">
                  No data for selected filters.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto pb-1">
                    <div className="flex min-w-max items-end gap-3 h-[190px] px-1">
                      {dailyVolumePoints.map((point) => {
                        const attendedPercent = clampPercentage((point.attended / maxDailyTotal) * 100);
                        const unattendedPercent = clampPercentage(((point.total - point.attended) / maxDailyTotal) * 100);
                        return (
                          <div key={point.date} className="w-12 flex flex-col items-center gap-2">
                            <div className="h-36 w-10 rounded-md bg-gray-100 border border-gray-200 relative overflow-hidden">
                              <div className="absolute left-0 right-0 bottom-0 bg-emerald-500" style={{ height: `${attendedPercent}%` }} />
                              <div
                                className="absolute left-0 right-0 bg-rose-400"
                                style={{ bottom: `${attendedPercent}%`, height: `${unattendedPercent}%` }}
                              />
                            </div>
                            <p className="text-[11px] text-gray-700 font-medium">{point.shortDate}</p>
                            <p className="text-[11px] text-gray-500">{point.total}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <p className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />Attended</p>
                    <p className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-400" />Unattended</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <div className="panel p-4 md:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Top Grade Attendance</h3>
                <p className="text-xs text-gray-500">Best attendance rate</p>
              </div>
              {gradeChartStats.length === 0 ? (
                <p className="text-sm text-gray-500">No grade data.</p>
              ) : (
                <div className="space-y-3">
                  {gradeChartStats.map((grade) => (
                    <div key={grade.grade} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <p className="font-medium">Grade {grade.grade}</p>
                        <p className="text-gray-500">{grade.total} sessions</p>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${clampPercentage(grade.rate)}%` }} />
                      </div>
                      <p className="text-xs text-gray-500">{grade.rate.toFixed(1)}% attendance ({grade.present + grade.late}/{grade.total})</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="panel p-4 md:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Teacher Session Load</h3>
                <p className="text-xs text-gray-500">Most active teachers</p>
              </div>
              {teacherChartStats.length === 0 ? (
                <p className="text-sm text-gray-500">No teacher data.</p>
              ) : (
                <div className="space-y-3">
                  {teacherChartStats.map((teacher) => {
                    const teacherVolumePercent = stats.total ? (teacher.total / stats.total) * 100 : 0;
                    return (
                      <div key={teacher.teacher} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <p className="font-medium truncate pr-3">{teacher.teacher}</p>
                          <p className="text-gray-500">{teacher.total}</p>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full bg-violet-500" style={{ width: `${clampPercentage(teacherVolumePercent)}%` }} />
                        </div>
                        <p className="text-xs text-gray-500">Attendance {teacher.rate.toFixed(1)}%</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="panel p-4 md:p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">Schedule Report Table</h3>
                <p className="text-sm text-gray-500 mt-1">Organized table with filters, search, export, and pagination.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={clearTableFilters}
                  className="px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm flex items-center gap-2"
                >
                  <FiRefreshCw /> Clear Table Filters
                </button>
                <button
                  onClick={handleScheduleTableExport}
                  disabled={filteredScheduleRows.length === 0}
                  className="btn-primary bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FiDownload /> Export Table
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 md:p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Grade</label>
                  <select
                    value={tableGradeFilter}
                    onChange={(event) => {
                      setTableGradeFilter(event.target.value);
                      setTableSectionFilter("");
                      setTablePage(1);
                    }}
                    className="input"
                  >
                    <option value="">All Grades</option>
                    {scheduleGradeOptions.map((grade) => (
                      <option key={grade} value={grade}>Grade {grade}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Section</label>
                  <select
                    value={tableSectionFilter}
                    onChange={(event) => {
                      setTableSectionFilter(event.target.value);
                      setTablePage(1);
                    }}
                    className="input"
                  >
                    <option value="">All Sections</option>
                    {scheduleSectionOptions.map((section) => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={tableDateFilter}
                    onChange={(event) => {
                      setTableDateFilter(event.target.value);
                      setTablePage(1);
                    }}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Search</label>
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={tableSearch}
                      onChange={(event) => {
                        setTableSearch(event.target.value);
                        setTablePage(1);
                      }}
                      placeholder="Grade, section, date, day..."
                      className="input pl-9"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-gray-600">{filteredScheduleRows.length} matching rows</p>
                <div className="flex flex-wrap gap-1.5">
                  {tableActiveFilters.length === 0 ? (
                    <span className="text-xs text-gray-500">No active table filters</span>
                  ) : (
                    tableActiveFilters.map((activeFilter) => (
                      <span key={activeFilter} className="text-xs px-2 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700">
                        {activeFilter}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[760px] border-collapse">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide">#</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide">Grade</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide">Section</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide">Schedule</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide">Date</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide">Day</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedScheduleRows.map((row, index) => (
                    <tr key={row.id} className={`${index % 2 === 0 ? "bg-white" : "bg-slate-50/60"} hover:bg-blue-50/70`}>
                      <td className="px-3 py-2 text-sm text-gray-500">{tableStartIndex + index + 1}</td>
                      <td className="px-3 py-2 text-sm font-medium">Grade {row.grade}</td>
                      <td className="px-3 py-2 text-sm">{row.section}</td>
                      <td className="px-3 py-2 text-sm font-mono">{row.schedule}</td>
                      <td className="px-3 py-2 text-sm">{row.date}</td>
                      <td className="px-3 py-2 text-sm">
                        <span className="inline-flex rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">{row.day}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredScheduleRows.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                No schedule rows match the selected table filters.
              </div>
            )}

            {filteredScheduleRows.length > 0 && (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-gray-600">Showing {tableStartIndex + 1}-{tableEndIndex} of {filteredScheduleRows.length}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTablePage((previous) => Math.max(1, previous - 1))}
                    disabled={effectiveTablePage === 1}
                    className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="text-sm text-gray-700">Page {effectiveTablePage} / {totalTablePages}</span>
                  <button
                    onClick={() => setTablePage((previous) => Math.min(totalTablePages, previous + 1))}
                    disabled={effectiveTablePage === totalTablePages}
                    className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {view === "export" && (
        <div className="panel p-4 md:p-5 space-y-3">
          <h3 className="text-base font-semibold">Export Full Report</h3>
          <p className="text-sm text-gray-600">
            Download an Excel file with summary, charts data, detailed logs, and schedule table rows.
          </p>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-1 text-sm text-gray-700">
            <p>Total sessions in current analytics filter: {stats.total}</p>
            <p>Date range: {dateRange.start || "Start"} to {dateRange.end || "End"}</p>
            <p>Grade filter: {statsGradeFilter || "All grades"}</p>
            <p>Schedule rows in current table filter: {filteredScheduleRows.length}</p>
          </div>
          <button
            onClick={handleExport}
            className="btn-primary bg-green-600 hover:bg-green-700 flex items-center gap-2"
          >
            <FiDownload /> Download Excel Report
          </button>
        </div>
      )}
    </div>
  );
}
