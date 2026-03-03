import { type ReactElement } from "react";
import { FiDownload, FiRefreshCw, FiSearch } from "react-icons/fi";
import { type TableFilters, type TablePagination } from "./types";

interface ScheduleReportTableProps {
  tableFilters: TableFilters;
  scheduleGradeOptions: string[];
  scheduleSectionOptions: string[];
  filteredRowsCount: number;
  tableActiveFilters: string[];
  tablePagination: TablePagination;
  onGradeChange: (value: string) => void;
  onSectionChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onClearFilters: () => void;
  onExport: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export default function ScheduleReportTable({
  tableFilters,
  scheduleGradeOptions,
  scheduleSectionOptions,
  filteredRowsCount,
  tableActiveFilters,
  tablePagination,
  onGradeChange,
  onSectionChange,
  onDateChange,
  onSearchChange,
  onClearFilters,
  onExport,
  onPreviousPage,
  onNextPage,
}: ScheduleReportTableProps): ReactElement {
  return (
    <div className="panel p-4 md:p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Schedule Report Table</h3>
          <p className="text-sm text-gray-500 mt-1">
            Organized table with filters, search, export, and pagination.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onClearFilters}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm flex items-center gap-2"
          >
            <FiRefreshCw /> Clear Table Filters
          </button>
          <button
            onClick={onExport}
            disabled={filteredRowsCount === 0}
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
              value={tableFilters.grade}
              onChange={(event) => onGradeChange(event.target.value)}
              className="input"
            >
              <option value="">All Grades</option>
              {scheduleGradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  Grade {grade}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Section</label>
            <select
              value={tableFilters.section}
              onChange={(event) => onSectionChange(event.target.value)}
              className="input"
            >
              <option value="">All Sections</option>
              {scheduleSectionOptions.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              value={tableFilters.date}
              onChange={(event) => onDateChange(event.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={tableFilters.search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Grade, section, date, day..."
                className="input pl-9"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-gray-600">{filteredRowsCount} matching rows</p>
          <div className="flex flex-wrap gap-1.5">
            {tableActiveFilters.length === 0 ? (
              <span className="text-xs text-gray-500">No active table filters</span>
            ) : (
              tableActiveFilters.map((activeFilter) => (
                <span
                  key={activeFilter}
                  className="text-xs px-2 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700"
                >
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
            {tablePagination.pageRows.map((row, index) => (
              <tr
                key={row.id}
                className={`${index % 2 === 0 ? "bg-white" : "bg-slate-50/60"} hover:bg-blue-50/70`}
              >
                <td className="px-3 py-2 text-sm text-gray-500">{tablePagination.startIndex + index + 1}</td>
                <td className="px-3 py-2 text-sm font-medium">Grade {row.grade}</td>
                <td className="px-3 py-2 text-sm">{row.section}</td>
                <td className="px-3 py-2 text-sm font-mono">{row.schedule}</td>
                <td className="px-3 py-2 text-sm">{row.date}</td>
                <td className="px-3 py-2 text-sm">
                  <span className="inline-flex rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {row.day}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredRowsCount === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          No schedule rows match the selected table filters.
        </div>
      )}

      {filteredRowsCount > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-gray-600">
            Showing {tablePagination.startIndex + 1}-{tablePagination.endIndex} of {filteredRowsCount}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onPreviousPage}
              disabled={tablePagination.effectivePage === 1}
              className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-sm text-gray-700">
              Page {tablePagination.effectivePage} / {tablePagination.totalPages}
            </span>
            <button
              onClick={onNextPage}
              disabled={tablePagination.effectivePage === tablePagination.totalPages}
              className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
