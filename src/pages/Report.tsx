import { useState, type ReactElement } from "react";
import AnalyticsView from "./report/AnalyticsView";
import ExportPanel from "./report/ExportPanel";
import ReportFiltersPanel from "./report/ReportFiltersPanel";
import ReportHeader from "./report/ReportHeader";
import ScheduleReportTable from "./report/ScheduleReportTable";
import { exportFullReport, exportScheduleReport } from "./report/reportExport";
import { useReportAnalytics } from "./report/useReportAnalytics";
import { useReportData } from "./report/useReportData";
import { type DateRange, type ReportView, type TableFilters } from "./report/types";

export default function Report(): ReactElement {
  const [view, setView] = useState<ReportView>("stats");
  const [dateRange, setDateRange] = useState<DateRange>({ start: "", end: "" });
  const [statsGradeFilter, setStatsGradeFilter] = useState<string>("");
  const [tableFilters, setTableFilters] = useState<TableFilters>({
    grade: "",
    section: "",
    date: "",
    search: "",
  });
  const [tablePage, setTablePage] = useState<number>(1);

  const { logs, periods, loading } = useReportData();
  const analytics = useReportAnalytics({
    logs,
    periods,
    dateRange,
    statsGradeFilter,
    tableFilters,
    tablePage,
  });

  const handleViewChange = (nextView: ReportView): void => {
    setView(nextView);
  };

  const handleStartDateChange = (value: string): void => {
    setDateRange((previous) => ({ ...previous, start: value }));
  };

  const handleEndDateChange = (value: string): void => {
    setDateRange((previous) => ({ ...previous, end: value }));
  };

  const handleStatsGradeChange = (value: string): void => {
    setStatsGradeFilter(value);
  };

  const handleResetStatsFilters = (): void => {
    setDateRange({ start: "", end: "" });
    setStatsGradeFilter("");
  };

  const handleTableGradeChange = (value: string): void => {
    setTableFilters((previous) => ({ ...previous, grade: value, section: "" }));
    setTablePage(1);
  };

  const handleTableSectionChange = (value: string): void => {
    setTableFilters((previous) => ({ ...previous, section: value }));
    setTablePage(1);
  };

  const handleTableDateChange = (value: string): void => {
    setTableFilters((previous) => ({ ...previous, date: value }));
    setTablePage(1);
  };

  const handleTableSearchChange = (value: string): void => {
    setTableFilters((previous) => ({ ...previous, search: value }));
    setTablePage(1);
  };

  const handleClearTableFilters = (): void => {
    setTableFilters({ grade: "", section: "", date: "", search: "" });
    setTablePage(1);
  };

  const handleScheduleTableExport = (): void => {
    void exportScheduleReport(analytics.filteredScheduleRows).catch((error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : "Unknown export error";
      console.error("Failed to export schedule report:", errorMessage);
    });
  };

  const handleFullExport = (): void => {
    void exportFullReport({
      stats: analytics.stats,
      gradeStats: analytics.gradeStats,
      teacherStats: analytics.teacherStats,
      filteredLogs: analytics.filteredLogs,
      filteredScheduleRows: analytics.filteredScheduleRows,
    }).catch((error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : "Unknown export error";
      console.error("Failed to export full report:", errorMessage);
    });
  };

  const handlePreviousPage = (): void => {
    setTablePage((previous) => Math.max(1, previous - 1));
  };

  const handleNextPage = (): void => {
    setTablePage((previous) => Math.min(analytics.tablePagination.totalPages, previous + 1));
  };

  if (loading) {
    return <div className="panel p-4">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <ReportHeader view={view} onViewChange={handleViewChange} />

      <ReportFiltersPanel
        dateRange={dateRange}
        statsGradeFilter={statsGradeFilter}
        uniqueGrades={analytics.uniqueGrades}
        filteredSessions={analytics.stats.total}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        onGradeChange={handleStatsGradeChange}
        onReset={handleResetStatsFilters}
      />

      {view === "stats" && (
        <>
          <AnalyticsView
            stats={analytics.stats}
            statusSegments={analytics.statusSegments}
            donutStyle={analytics.donutStyle}
            dailyVolumePoints={analytics.dailyVolumePoints}
            maxDailyTotal={analytics.maxDailyTotal}
            gradeChartStats={analytics.gradeChartStats}
            teacherChartStats={analytics.teacherChartStats}
          />

          <ScheduleReportTable
            tableFilters={tableFilters}
            scheduleGradeOptions={analytics.scheduleGradeOptions}
            scheduleSectionOptions={analytics.scheduleSectionOptions}
            filteredRowsCount={analytics.filteredScheduleRows.length}
            tableActiveFilters={analytics.tableActiveFilters}
            tablePagination={analytics.tablePagination}
            onGradeChange={handleTableGradeChange}
            onSectionChange={handleTableSectionChange}
            onDateChange={handleTableDateChange}
            onSearchChange={handleTableSearchChange}
            onClearFilters={handleClearTableFilters}
            onExport={handleScheduleTableExport}
            onPreviousPage={handlePreviousPage}
            onNextPage={handleNextPage}
          />
        </>
      )}

      {view === "export" && (
        <ExportPanel
          dateRange={dateRange}
          statsGradeFilter={statsGradeFilter}
          totalSessions={analytics.stats.total}
          scheduleRowsCount={analytics.filteredScheduleRows.length}
          onExport={handleFullExport}
        />
      )}
    </div>
  );
}
