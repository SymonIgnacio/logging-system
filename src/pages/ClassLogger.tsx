import React, { useEffect, useState } from "react";
import { getFirestore, collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

const db = getFirestore();

interface Period {
  teacher: string;
  grade: string;
  section: string;
  subject: string;
  period: string; // e.g., "8:00-9:00"
}

export default function ClassLogger() {
  const { user } = useAuth(); // get user.grade and user.section
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString());
  const [periods, setPeriods] = useState<Period[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString());
      updateCurrentPeriod(now, periods);
    }, 1000);
    return () => clearInterval(interval);
  }, [periods]);

  // Fetch periods collection in realtime
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "periods"), (snapshot) => {
      const data: Period[] = snapshot.docs.map((doc) => doc.data() as Period);
      setPeriods(data);
      updateCurrentPeriod(new Date(), data);
    });
    return () => unsubscribe();
  }, []);

  // Determine current period for the logged-in user's grade/section
  function updateCurrentPeriod(now: Date, periods: Period[]) {
    if (!user) {
      setCurrentPeriod(null);
      return;
    }

    const current = periods.find((p) => {
      if (p.grade !== user.grade || p.section !== user.section) return false;

      const [startStr, endStr] = p.period.split("-"); // e.g., "8:00-9:00"
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
  }

  if (!user) {
    return <p className="p-4">Please log in to view your class schedule.</p>;
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Class Logger</h1>
      <p className="mb-4">Current Time: <span className="font-mono">{currentTime}</span></p>

      {currentPeriod ? (
        <div className="bg-green-100 p-4 rounded border border-green-300">
          <h2 className="text-xl font-semibold">Current Period</h2>
          <p><strong>Grade:</strong> {currentPeriod.grade}</p>
          <p><strong>Section:</strong> {currentPeriod.section}</p>
          <p><strong>Subject:</strong> {currentPeriod.subject}</p>
          <p><strong>Teacher:</strong> {currentPeriod.teacher}</p>
          <p><strong>Time:</strong> {currentPeriod.period}</p>
        </div>
      ) : (
        <div className="bg-yellow-100 p-4 rounded border border-yellow-300">
          <p>No active period at this time for your class.</p>
        </div>
      )}
    </div>
  );
}