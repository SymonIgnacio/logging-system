import { useEffect, useState, useCallback } from "react";
import { getFirestore, collection, doc, query, where, onSnapshot, setDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
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

export default function ClassLogger() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString());
  const [periods, setPeriods] = useState<Period[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const updateCurrentPeriod = useCallback((now: Date, periodsData: Period[]) => {
    if (!user) {
      setCurrentPeriod(null);
      return;
    }

    const current = periodsData.find((p) => {
      const [startStr, endStr] = p.period.split("-");
      if (!startStr || !endStr) return false;

      const [startH, startM] = startStr.split(":").map(Number);
      const [endH, endM] = endStr.split(":").map(Number);

      const start = new Date();
      start.setHours(startH, startM, 0, 0);

      const end = new Date();
      end.setHours(endH, endM, 0, 0);

      return now >= start && now <= end;
    });

    setCurrentPeriod(current || null);
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString());
      updateCurrentPeriod(now, periods);
    }, 1000);
    return () => clearInterval(interval);
  }, [periods, updateCurrentPeriod]);

  useEffect(() => {
    if (!user?.grade || !user?.section) return;

    const q = query(
      collection(db, "periods"),
      where("grade", "==", user.grade),
      where("section", "==", user.section)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Period[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Period[];
      setPeriods(data);
      updateCurrentPeriod(new Date(), data);
    });

    return () => unsubscribe();
  }, [user?.grade, user?.section, updateCurrentPeriod]);

  const getMinutesLate = (periodStr: string): number => {
    const periodStart = getPeriodStartTime(periodStr);
    const now = new Date();
    return (now.getTime() - periodStart.getTime()) / (1000 * 60);
  };

  const handleLogAttendance = async (status: "present" | "late" | "absent") => {
    if (!user || !currentPeriod) return;

    setLoading(true);
    setMessage(null);

    try {
      const today = getLocalDateString(new Date());
      const logId = `${currentPeriod.id}_${today}`;
      const logRef = doc(db, "logs", logId);

      const finalStatus = status === "present" && getMinutesLate(currentPeriod.period) >= 11
        ? "late"
        : status;

      await setDoc(logRef, {
        teacher: currentPeriod.teacher,
        grade: currentPeriod.grade,
        section: currentPeriod.section,
        subject: currentPeriod.subject,
        period: currentPeriod.period,
        periodId: currentPeriod.id,
        status: finalStatus,
        startTime: new Date(),
        date: today,
        loggedBy: user.uid,
      });

      if (status === "present" && finalStatus === "late") {
        setMessage({ type: "success", text: "Class logged as late (11+ minutes after period start)." });
      } else {
        setMessage({ type: "success", text: `Class logged as ${finalStatus}!` });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to log attendance";
      if (errorMessage.includes("Missing or insufficient permissions")) {
        setMessage({
          type: "error",
          text: "This period may already be logged, or you don't have permission for this action.",
        });
      } else {
        setMessage({ type: "error", text: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  const getPeriodStartTime = (periodStr: string): Date => {
    const [startStr] = periodStr.split("-");
    const [startH, startM] = startStr.split(":").map(Number);
    const start = new Date();
    start.setHours(startH, startM, 0, 0);
    return start;
  };

  const isLate = (): boolean => {
    if (!currentPeriod) return false;
    const periodStart = getPeriodStartTime(currentPeriod.period);
    const now = new Date();
    const diffMinutes = (now.getTime() - periodStart.getTime()) / (1000 * 60);
    return diffMinutes >= 11;
  };

  if (!user) {
    return <p className="panel p-4">Please log in to view your class schedule.</p>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      <div className="panel p-4">
        <h1 className="section-title">Class Logger</h1>
        <p className="text-sm muted mt-1">Current Time: <span className="font-mono">{currentTime}</span></p>
        <p className="text-sm mt-1">Grade: <span className="font-semibold">{user.grade}</span> | Section: <span className="font-semibold">{user.section}</span></p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm border ${message.type === "success" ? "bg-green-50 text-green-800 border-green-100" : "bg-red-50 text-red-800 border-red-100"}`}>
          {message.text}
        </div>
      )}

      {currentPeriod ? (
        <div className="panel p-4">
          <h2 className="text-lg font-semibold mb-2">Current Period</h2>
          <p><strong>Grade:</strong> {currentPeriod.grade}</p>
          <p><strong>Section:</strong> {currentPeriod.section}</p>
          <p><strong>Subject:</strong> {currentPeriod.subject}</p>
          <p><strong>Teacher:</strong> {currentPeriod.teacher}</p>
          <p><strong>Time:</strong> {currentPeriod.period}</p>
          
          <div className="mt-3 space-y-2">
            <p className="font-semibold">Log Attendance:</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleLogAttendance("present")}
                disabled={loading}
                className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
              >
                Present
              </button>
              <button
                onClick={() => handleLogAttendance("late")}
                disabled={loading}
                className="px-3 py-2 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600 disabled:opacity-50"
              >
                Late
              </button>
              <button
                onClick={() => handleLogAttendance("absent")}
                disabled={loading}
                className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
              >
                Absent
              </button>
            </div>
            {isLate() && (
              <p className="text-sm text-yellow-700">Note: 11+ minutes after start is automatically saved as "Late".</p>
            )}
          </div>
        </div>
      ) : (
        <div className="panel p-4 bg-yellow-50 border-yellow-200">
          <p>No active period at this time for your class.</p>
        </div>
      )}

      <div className="panel p-4">
        <h3 className="text-lg font-semibold mb-2">Today's Schedule</h3>
        <div className="space-y-2">
          {periods
            .sort((a, b) => getPeriodStartMinutes(a.period) - getPeriodStartMinutes(b.period))
            .map((period) => (
              <div key={period.id} className="panel-tight p-2.5">
                <p className="font-medium">{period.period} - {period.subject}</p>
                <p className="text-sm text-gray-600">Teacher: {period.teacher}</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
