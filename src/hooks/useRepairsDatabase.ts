import { useCallback, useEffect, useState } from "react";
import type { Repair } from "../types/repair";
import {
  createRepair as dbCreateRepair,
  deleteRepair as dbDeleteRepair,
  getRepairs as dbGetRepairs,
  initDatabase,
  updateRepair as dbUpdateRepair,
} from "../lib/database";

export function useRepairsDatabase() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshRepairs = useCallback(async () => {
    const list = await dbGetRepairs();
    setRepairs(list);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initDatabase();
        const list = await dbGetRepairs();
        if (!cancelled) {
          setRepairs(list);
          setLoadError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setRepairs([]);
          setLoadError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addRepair = useCallback(
    async (repair: Repair) => {
      await dbCreateRepair(repair);
      await refreshRepairs();
    },
    [refreshRepairs],
  );

  const updateRepairDb = useCallback(
    async (repair: Repair) => {
      await dbUpdateRepair(repair);
      await refreshRepairs();
    },
    [refreshRepairs],
  );

  const removeRepair = useCallback(
    async (id: string) => {
      await dbDeleteRepair(id);
      await refreshRepairs();
    },
    [refreshRepairs],
  );

  return {
    repairs,
    ready,
    loadError,
    refreshRepairs,
    addRepair,
    updateRepairDb,
    removeRepair,
  };
}
