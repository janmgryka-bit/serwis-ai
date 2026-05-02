import { useEffect, useState } from "react";
import type { Repair, RepairStatus } from "../types/repair";

const STORAGE_KEY = "serwis-ai:repairs";

const STATUSES: RepairStatus[] = [
  "nowa",
  "diagnoza",
  "w naprawie",
  "gotowa",
  "wydana",
];

function isRepairStatus(x: unknown): x is RepairStatus {
  return typeof x === "string" && (STATUSES as readonly string[]).includes(x);
}

function isRepair(x: unknown): x is Repair {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.device_type === "string" &&
    typeof o.brand === "string" &&
    typeof o.model === "string" &&
    typeof o.motherboard === "string" &&
    typeof o.symptom === "string" &&
    isRepairStatus(o.status)
  );
}

/** Odczyt z localStorage: brak klucza / pusty string → fallback; `[]` → pusta lista. */
export function readRepairsFromStorage(fallback: Repair[]): Repair[] {
  if (typeof localStorage === "undefined") return fallback;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null || raw === "") return fallback;

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;

    const repairs = parsed.filter(isRepair);
    return repairs;
  } catch {
    return fallback;
  }
}

export function writeRepairsToStorage(repairs: Repair[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(repairs));
  } catch {
    // quota, private mode — ignoruj
  }
}

export function useLocalStorageRepairs(fallback: Repair[]) {
  const [repairs, setRepairs] = useState<Repair[]>(() => readRepairsFromStorage(fallback));

  useEffect(() => {
    writeRepairsToStorage(repairs);
  }, [repairs]);

  return [repairs, setRepairs] as const;
}
