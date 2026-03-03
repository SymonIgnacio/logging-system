import { type Timestamp } from "firebase/firestore";
import { type CSSProperties } from "react";

export type ReportView = "stats" | "export";
export type LogStatus = "present" | "absent" | "late";

export interface Log {
  id: string;
  teacher: string;
  grade: string;
  section: string;
  subject: string;
  period: string;
  status: LogStatus;
  startTime: Timestamp | null;
  date: string;
}

export interface Period {
  id: string;
  teacher: string;
  grade: string;
  section: string;
  subject: string;
  period: string;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface TableFilters {
  grade: string;
  section: string;
  date: string;
  search: string;
}

export interface ReportStats {
  total: number;
  present: number;
  late: number;
  absent: number;
  attendanceRate: number;
}

export interface GradeStat {
  grade: string;
  total: number;
  present: number;
  late: number;
  absent: number;
  rate: number;
}

export interface TeacherStat {
  teacher: string;
  total: number;
  present: number;
  late: number;
  absent: number;
  rate: number;
}

export interface StatusSegment {
  label: string;
  value: number;
  colorHex: string;
  colorClass: string;
}

export interface DailyVolumePoint {
  date: string;
  shortDate: string;
  total: number;
  attended: number;
}

export interface ScheduleRow {
  id: string;
  grade: string;
  section: string;
  schedule: string;
  date: string;
  day: string;
}

export interface TablePagination {
  effectivePage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  pageRows: ScheduleRow[];
}

export interface ReportAnalyticsResult {
  filteredLogs: Log[];
  uniqueGrades: string[];
  stats: ReportStats;
  gradeStats: GradeStat[];
  teacherStats: TeacherStat[];
  statusSegments: StatusSegment[];
  donutStyle: CSSProperties;
  dailyVolumePoints: DailyVolumePoint[];
  maxDailyTotal: number;
  gradeChartStats: GradeStat[];
  teacherChartStats: TeacherStat[];
  scheduleGradeOptions: string[];
  scheduleSectionOptions: string[];
  filteredScheduleRows: ScheduleRow[];
  tableActiveFilters: string[];
  tablePagination: TablePagination;
}
