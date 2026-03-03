import { type ReactElement } from "react";
import { FiFilter, FiRefreshCw } from "react-icons/fi";
import { type DateRange } from "./types";

interface ReportFiltersPanelProps {
  dateRange: DateRange;
  statsGradeFilter: string;
  uniqueGrades: string[];
  filteredSessions: number;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onGradeChange: (value: string) => void;
  onReset: () => void;
}

export default function ReportFiltersPanel({
  dateRange,
  statsGradeFilter,
  uniqueGrades,
  filteredSessions,
  onStartDateChange,
  onEndDateChange,
  onGradeChange,
  onReset,
}: ReportFiltersPanelProps): ReactElement {
  return (
    <div className="panel p-4 md:p-5 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-semibold flex items-center gap-2">
          <FiFilter /> Report Filters
        </p>

        <button
          onClick={onReset}
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
            onChange={(event) => onStartDateChange(event.target.value)}
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">End Date</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(event) => onEndDateChange(event.target.value)}
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Grade</label>
          <select
            value={statsGradeFilter}
            onChange={(event) => onGradeChange(event.target.value)}
            className="input"
          >
            <option value="">All Grades</option>
            {uniqueGrades.map((grade) => (
              <option key={grade} value={grade}>
                Grade {grade}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 flex flex-col justify-center">
          <p className="text-xs text-blue-700">Filtered Sessions</p>
          <p className="text-2xl font-bold text-blue-900">{filteredSessions}</p>
          <p className="text-xs text-blue-700">Current report scope</p>
        </div>
      </div>
    </div>
  );
}
