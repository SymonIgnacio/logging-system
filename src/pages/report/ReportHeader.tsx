import { type ReactElement } from "react";
import { FiBarChart2, FiDownload } from "react-icons/fi";
import { type ReportView } from "./types";

interface ReportHeaderProps {
  view: ReportView;
  onViewChange: (view: ReportView) => void;
}

export default function ReportHeader({ view, onViewChange }: ReportHeaderProps): ReactElement {
  return (
    <div className="panel p-4 md:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
      <div>
        <h1 className="section-title">Reports</h1>
        <p className="muted text-sm">Interactive charts, clean filters, and organized schedule reports.</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onViewChange("stats")}
          className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 border ${
            view === "stats" ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200"
          }`}
        >
          <FiBarChart2 /> Analytics
        </button>

        <button
          onClick={() => onViewChange("export")}
          className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 border ${
            view === "export"
              ? "bg-blue-600 border-blue-600 text-white"
              : "bg-white border-gray-200"
          }`}
        >
          <FiDownload /> Export
        </button>
      </div>
    </div>
  );
}
