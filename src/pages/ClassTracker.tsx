import { useEffect, useState } from "react";
import { getFirestore, collection, query, onSnapshot, Timestamp, where } from "firebase/firestore";
import { getLocalDateString, getPeriodStartMinutes } from "../utils/dateTime";

const db = getFirestore();

interface Period {
  id: string;
  teacher: string;
  grade: string;
  section: string;
  subject: string;
  period: string;
}

interface Log {
  id: string;
  periodId: string;
  status: "present" | "absent" | "late";
  startTime: Timestamp | null;
}

export default function ClassTracker() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [gradeFilter, setGradeFilter] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString());
  const [today, setToday] = useState<string>(getLocalDateString(new Date()));
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 25;

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString());
      setToday(getLocalDateString(now));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribePeriods = onSnapshot(collection(db, "periods"), (snapshot) => {
      const data: Period[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Period[];
      setPeriods(data);
    });

    const q = query(collection(db, "logs"), where("date", "==", today));
    const unsubscribeLogs = onSnapshot(q, (snapshot) => {
      const data: Log[] = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Log[];
      setLogs(data);
    });

    return () => {
      unsubscribePeriods();
      unsubscribeLogs();
    };
  }, [today]);

  const getUniqueGrades = () => {
    const grades = new Set(periods.map((p) => p.grade));
    return Array.from(grades).sort((a, b) => Number(a) - Number(b));
  };

  const filteredPeriods = gradeFilter
    ? periods.filter((p) => p.grade === gradeFilter)
    : periods;

  const logsByPeriodId: Record<string, Log> = logs.reduce((acc: Record<string, Log>, log) => {
    acc[log.periodId] = log;
    return acc;
  }, {});

  const sortedPeriods = [...filteredPeriods].sort(
    (a, b) => getPeriodStartMinutes(a.period) - getPeriodStartMinutes(b.period)
  );
  const totalPages = Math.max(1, Math.ceil(sortedPeriods.length / ITEMS_PER_PAGE));
  const effectivePage = Math.min(currentPage, totalPages);
  const startIndex = (effectivePage - 1) * ITEMS_PER_PAGE;
  const paginatedPeriods = sortedPeriods.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const getStatusForPeriod = (period: Period): { status: string; color: string } => {
    const [startStr, endStr] = period.period.split("-");
    if (!startStr || !endStr) return { status: "Unknown", color: "gray" };

    const [startH, startM] = startStr.split(":").map(Number);
    const [endH, endM] = endStr.split(":").map(Number);

    const start = new Date();
    start.setHours(startH, startM, 0, 0);

    const end = new Date();
    end.setHours(endH, endM, 0, 0);

    const now = new Date();
    const log = logsByPeriodId[period.id];

    if (now < start) {
      return { status: "Waiting", color: "yellow" };
    } else if (now >= start && now <= end) {
      if (log) {
        return { status: log.status.charAt(0).toUpperCase() + log.status.slice(1), color: log.status === "present" ? "green" : log.status === "late" ? "yellow" : "red" };
      }
      return { status: "Waiting", color: "yellow" };
    } else {
      if (log) {
        return { status: log.status.charAt(0).toUpperCase() + log.status.slice(1), color: log.status === "present" ? "green" : log.status === "late" ? "yellow" : "red" };
      }
      return { status: "Unattended", color: "red" };
    }
  };

  const formatTime = (timestamp: Timestamp | null | undefined): string => {
    if (!timestamp) return "-";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-3">
      <div className="panel p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <h1 className="section-title">Class Tracker</h1>
        <p className="text-sm muted">Current Time: <span className="font-mono">{currentTime}</span></p>
      </div>

      <div className="panel p-3">
        <label className="mr-2 text-sm font-semibold">Filter by Grade:</label>
        <select
          value={gradeFilter}
          onChange={(e) => {
            setGradeFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="input max-w-xs"
        >
          <option value="">All Grades</option>
          {getUniqueGrades().map((grade) => (
            <option key={grade} value={grade}>
              Grade {grade}
            </option>
          ))}
        </select>
      </div>

      <div className="panel p-0 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left border-b text-sm">Grade</th>
              <th className="px-3 py-2 text-left border-b text-sm">Section</th>
              <th className="px-3 py-2 text-left border-b text-sm">Subject</th>
              <th className="px-3 py-2 text-left border-b text-sm">Teacher</th>
              <th className="px-3 py-2 text-left border-b text-sm">Period</th>
              <th className="px-3 py-2 text-left border-b text-sm">Status</th>
              <th className="px-3 py-2 text-left border-b text-sm">Start Time</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPeriods.map((period) => {
                const { status, color } = getStatusForPeriod(period);
                const log = logsByPeriodId[period.id];
                return (
                  <tr key={period.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 border-b text-sm">{period.grade}</td>
                    <td className="px-3 py-2 border-b text-sm">{period.section}</td>
                    <td className="px-3 py-2 border-b text-sm">{period.subject}</td>
                    <td className="px-3 py-2 border-b text-sm">{period.teacher}</td>
                    <td className="px-3 py-2 border-b text-sm">{period.period}</td>
                    <td className="px-3 py-2 border-b text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          color === "green"
                            ? "bg-green-100 text-green-800"
                            : color === "yellow"
                            ? "bg-yellow-100 text-yellow-800"
                            : color === "red"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-3 py-2 border-b text-sm">{formatTime(log?.startTime)}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        </div>
      </div>

      {sortedPeriods.length > ITEMS_PER_PAGE && (
        <div className="panel p-3 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, sortedPeriods.length)} of {sortedPeriods.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={effectivePage === 1}
              className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-sm">
              Page {effectivePage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, Math.min(prev, totalPages) + 1))}
              disabled={effectivePage === totalPages}
              className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {filteredPeriods.length === 0 && (
        <p className="text-center text-gray-500 mt-4">No classes found.</p>
      )}
    </div>
  );
}
