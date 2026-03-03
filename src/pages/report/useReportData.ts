import { useEffect, useState } from "react";
import { collection, getFirestore, onSnapshot } from "firebase/firestore";
import { type Log, type Period } from "./types";

const db = getFirestore();

interface UseReportDataResult {
  logs: Log[];
  periods: Period[];
  loading: boolean;
}

export function useReportData(): UseReportDataResult {
  const [logs, setLogs] = useState<Log[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let initialLogsLoaded = false;

    const unsubscribeLogs = onSnapshot(collection(db, "logs"), (snapshot) => {
      const logsData: Log[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Log[];

      setLogs(logsData);

      if (!initialLogsLoaded) {
        initialLogsLoaded = true;
        setLoading(false);
      }
    });

    const unsubscribePeriods = onSnapshot(collection(db, "periods"), (snapshot) => {
      const periodsData: Period[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Period[];

      setPeriods(periodsData);
    });

    return () => {
      unsubscribeLogs();
      unsubscribePeriods();
    };
  }, []);

  return { logs, periods, loading };
}
