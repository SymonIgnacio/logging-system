import { type CSSProperties, type ReactElement } from "react";
import {
  type DailyVolumePoint,
  type GradeStat,
  type ReportStats,
  type StatusSegment,
  type TeacherStat,
} from "./types";
import { clampPercentage } from "./utils";

interface AnalyticsViewProps {
  stats: ReportStats;
  statusSegments: StatusSegment[];
  donutStyle: CSSProperties;
  dailyVolumePoints: DailyVolumePoint[];
  maxDailyTotal: number;
  gradeChartStats: GradeStat[];
  teacherChartStats: TeacherStat[];
}

export default function AnalyticsView({
  stats,
  statusSegments,
  donutStyle,
  dailyVolumePoints,
  maxDailyTotal,
  gradeChartStats,
  teacherChartStats,
}: AnalyticsViewProps): ReactElement {
  return (
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
                      <p className="text-gray-600">
                        {segment.value} ({percent.toFixed(1)}%)
                      </p>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${clampPercentage(percent)}%`,
                          backgroundColor: segment.colorHex,
                        }}
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
                    const unattendedPercent = clampPercentage(
                      ((point.total - point.attended) / maxDailyTotal) * 100
                    );

                    return (
                      <div key={point.date} className="w-12 flex flex-col items-center gap-2">
                        <div className="h-36 w-10 rounded-md bg-gray-100 border border-gray-200 relative overflow-hidden">
                          <div
                            className="absolute left-0 right-0 bottom-0 bg-emerald-500"
                            style={{ height: `${attendedPercent}%` }}
                          />
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
                <p className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Attended
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-400" />
                  Unattended
                </p>
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
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${clampPercentage(grade.rate)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {grade.rate.toFixed(1)}% attendance ({grade.present + grade.late}/{grade.total})
                  </p>
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
                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{ width: `${clampPercentage(teacherVolumePercent)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">Attendance {teacher.rate.toFixed(1)}%</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
