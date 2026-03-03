import { type ReactElement } from "react";
import { FiDownload } from "react-icons/fi";
import { type DateRange } from "./types";

interface ExportPanelProps {
  dateRange: DateRange;
  statsGradeFilter: string;
  totalSessions: number;
  scheduleRowsCount: number;
  onExport: () => void;
}

export default function ExportPanel({
  dateRange,
  statsGradeFilter,
  totalSessions,
  scheduleRowsCount,
  onExport,
}: ExportPanelProps): ReactElement {
  return (
    <div className="panel p-4 md:p-5 space-y-3">
      <h3 className="text-base font-semibold">Export Full Report</h3>
      <p className="text-sm text-gray-600">
        Download an Excel file with summary, charts data, detailed logs, and schedule table rows.
      </p>

      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-1 text-sm text-gray-700">
        <p>Total sessions in current analytics filter: {totalSessions}</p>
        <p>Date range: {dateRange.start || "Start"} to {dateRange.end || "End"}</p>
        <p>Grade filter: {statsGradeFilter || "All grades"}</p>
        <p>Schedule rows in current table filter: {scheduleRowsCount}</p>
      </div>

      <button
        onClick={onExport}
        className="btn-primary bg-green-600 hover:bg-green-700 flex items-center gap-2"
      >
        <FiDownload /> Download Excel Report
      </button>
    </div>
  );
}
