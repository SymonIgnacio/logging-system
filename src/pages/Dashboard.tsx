import { useEffect, useState } from "react";
import { getFirestore, collection, onSnapshot, query, where } from "firebase/firestore";
import { FiBookOpen, FiClock, FiAlertCircle } from "react-icons/fi";
import { getLocalDateString } from "../utils/dateTime";

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
  date: string;
}

export default function Dashboard() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [stats, setStats] = useState({ ongoing: 0, waiting: 0, unattended: 0 });
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString());
  const [today, setToday] = useState<string>(getLocalDateString(new Date()));

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString());
      setToday(getLocalDateString(now));
      calculateStats(now, periods, logs);
    }, 1000);
    return () => clearInterval(interval);
  }, [periods, logs]);

  useEffect(() => {
    const unsubscribePeriods = onSnapshot(collection(db, "periods"), (snapshot) => {
      const data: Period[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Period[];
      setPeriods(data);
    });

    const logsQuery = query(collection(db, "logs"), where("date", "==", today));
    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      const data: Log[] = snapshot.docs.map((doc) => ({
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

  const calculateStats = (now: Date, periods: Period[], logs: Log[]) => {
    let ongoing = 0;
    let waiting = 0;
    let unattended = 0;

    const todayLogsByPeriodId = new Map<string, Log>();
    logs.forEach((log) => {
      todayLogsByPeriodId.set(log.periodId, log);
    });

    periods.forEach((period) => {
      const [startStr, endStr] = period.period.split("-");
      if (!startStr || !endStr) return;

      const [startH, startM] = startStr.split(":").map(Number);
      const [endH, endM] = endStr.split(":").map(Number);

      const start = new Date(now);
      start.setHours(startH, startM, 0, 0);

      const end = new Date(now);
      end.setHours(endH, endM, 0, 0);

      const log = todayLogsByPeriodId.get(period.id);

      if (now < start) {
        // Not started yet
      } else if (now >= start && now <= end) {
        // In progress
        if (log && (log.status === "present" || log.status === "late")) {
          ongoing++;
        } else if (log && log.status === "absent") {
          unattended++;
        } else {
          waiting++;
        }
      } else {
        // Ended
        if (log && (log.status === "present" || log.status === "late")) {
          // Completed
        } else {
          unattended++;
        }
      }
    });

    setStats({ ongoing, waiting, unattended });
  };

  useEffect(() => {
    calculateStats(new Date(), periods, logs);
  }, [periods, logs]);

  const todayLogsCount = logs.length;

  const statCards = [
    {
      title: "Ongoing Classes",
      value: stats.ongoing,
      icon: <FiBookOpen size={24} />,
      color: "bg-green-100 text-green-800",
      description: "Classes currently in session with teacher present",
    },
    {
      title: "Waiting",
      value: stats.waiting,
      icon: <FiClock size={24} />,
      color: "bg-yellow-100 text-yellow-800",
      description: "Classes started but not yet logged",
    },
    {
      title: "Unattended",
      value: stats.unattended,
      icon: <FiAlertCircle size={24} />,
      color: "bg-red-100 text-red-800",
      description: "Classes absent or not logged after period ended",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="panel p-4 md:p-5">
        <h1 className="section-title">Admin Dashboard</h1>
        <p className="muted text-sm mt-1">Current Time: <span className="font-mono">{currentTime}</span></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {statCards.map((card, index) => (
          <div key={index} className="panel p-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold">{card.title}</h3>
              <div className={`p-2 rounded-full ${card.color}`}>
                {card.icon}
              </div>
            </div>
            <p className="text-3xl font-bold mb-1">{card.value}</p>
            <p className="text-sm text-gray-500">{card.description}</p>
          </div>
        ))}
      </div>

      <div className="panel p-4 md:p-5">
        <h2 className="text-lg font-semibold mb-3">Today's Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold">{periods.length}</p>
            <p className="text-sm text-gray-600">Total Classes</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold">{new Set(periods.map(p => p.grade)).size}</p>
            <p className="text-sm text-gray-600">Grade Levels</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold">{new Set(periods.map(p => p.teacher)).size}</p>
            <p className="text-sm text-gray-600">Teachers</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold">{todayLogsCount}</p>
            <p className="text-sm text-gray-600">Today's Logged Sessions</p>
          </div>
        </div>
      </div>
    </div>
  );
}
