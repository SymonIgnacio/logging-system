import { getLocalDateString } from "../../utils/dateTime";
import { type GradeStat, type Log, type ReportStats, type ScheduleRow, type TeacherStat } from "./types";

let xlsxModulePromise: Promise<typeof import("xlsx")> | null = null;

async function loadXlsx(): Promise<typeof import("xlsx")> {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import("xlsx");
  }
  return xlsxModulePromise;
}

interface ExportFullReportInput {
  stats: ReportStats;
  gradeStats: GradeStat[];
  teacherStats: TeacherStat[];
  filteredLogs: Log[];
  filteredScheduleRows: ScheduleRow[];
}

export async function exportScheduleReport(rows: ScheduleRow[]): Promise<void> {
  const xlsx = await loadXlsx();
  const workbook = xlsx.utils.book_new();

  const scheduleData = rows.map((row) => ({
    Grade: row.grade,
    Section: row.section,
    Schedule: row.schedule,
    Date: row.date,
    Day: row.day,
  }));

  const scheduleSheet = xlsx.utils.json_to_sheet(scheduleData);
  xlsx.utils.book_append_sheet(workbook, scheduleSheet, "Schedule Report");

  xlsx.writeFile(workbook, `schedule_report_${getLocalDateString(new Date())}.xlsx`);
}

export async function exportFullReport({
  stats,
  gradeStats,
  teacherStats,
  filteredLogs,
  filteredScheduleRows,
}: ExportFullReportInput): Promise<void> {
  const xlsx = await loadXlsx();
  const workbook = xlsx.utils.book_new();

  const statsData = [
    { Metric: "Total Sessions", Value: stats.total },
    { Metric: "Present", Value: stats.present },
    { Metric: "Late", Value: stats.late },
    { Metric: "Absent", Value: stats.absent },
    { Metric: "Attendance Rate", Value: `${stats.attendanceRate.toFixed(1)}%` },
  ];
  const statsSheet = xlsx.utils.json_to_sheet(statsData);
  xlsx.utils.book_append_sheet(workbook, statsSheet, "Summary");

  const gradeData = gradeStats.map((grade) => ({
    Grade: grade.grade,
    "Total Sessions": grade.total,
    Present: grade.present,
    Late: grade.late,
    Absent: grade.absent,
    "Attendance Rate": `${grade.rate.toFixed(1)}%`,
  }));
  const gradeSheet = xlsx.utils.json_to_sheet(gradeData);
  xlsx.utils.book_append_sheet(workbook, gradeSheet, "By Grade");

  const teacherData = teacherStats.map((teacher) => ({
    Teacher: teacher.teacher,
    "Total Sessions": teacher.total,
    Present: teacher.present,
    Late: teacher.late,
    Absent: teacher.absent,
    "Attendance Rate": `${teacher.rate.toFixed(1)}%`,
  }));
  const teacherSheet = xlsx.utils.json_to_sheet(teacherData);
  xlsx.utils.book_append_sheet(workbook, teacherSheet, "By Teacher");

  const logData = filteredLogs.map((log) => ({
    Date: log.date,
    Grade: log.grade,
    Section: log.section,
    Subject: log.subject,
    Teacher: log.teacher,
    Period: log.period,
    Status: log.status,
  }));
  const logsSheet = xlsx.utils.json_to_sheet(logData);
  xlsx.utils.book_append_sheet(workbook, logsSheet, "Detailed Logs");

  const scheduleData = filteredScheduleRows.map((row) => ({
    Grade: row.grade,
    Section: row.section,
    Schedule: row.schedule,
    Date: row.date,
    Day: row.day,
  }));
  const scheduleSheet = xlsx.utils.json_to_sheet(scheduleData);
  xlsx.utils.book_append_sheet(workbook, scheduleSheet, "Schedule Report");

  xlsx.writeFile(workbook, `attendance_report_${getLocalDateString(new Date())}.xlsx`);
}
