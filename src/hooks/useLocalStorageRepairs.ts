import { useEffect, useState } from "react";
import {
  DEFAULT_REPAIR_DOCUMENTATION,
  type Repair,
  type DiagnosticMode,
  type RepairDiagnosticStep,
  type RepairDocumentation,
  type RepairDocumentationStatus,
  type RepairStatus,
} from "../types/repair";

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

const DIAGNOSTIC_MODES: DiagnosticMode[] = [
  "no_power",
  "no_display",
  "restarts",
  "charging_issue",
  "other",
];

function isDiagnosticModeValue(x: unknown): x is DiagnosticMode {
  return typeof x === "string" && (DIAGNOSTIC_MODES as readonly string[]).includes(x);
}

const DOC_STATUSES: RepairDocumentationStatus[] = ["missing", "uploaded", "found"];

function isDocumentationStatus(x: unknown): x is RepairDocumentationStatus {
  return typeof x === "string" && (DOC_STATUSES as readonly string[]).includes(x);
}

function parseDocumentation(raw: unknown): RepairDocumentation {
  if (typeof raw !== "object" || raw === null) {
    return { ...DEFAULT_REPAIR_DOCUMENTATION };
  }
  const d = raw as Record<string, unknown>;
  const schematicStatus = isDocumentationStatus(d.schematicStatus)
    ? d.schematicStatus
    : DEFAULT_REPAIR_DOCUMENTATION.schematicStatus;
  const boardviewStatus = isDocumentationStatus(d.boardviewStatus)
    ? d.boardviewStatus
    : DEFAULT_REPAIR_DOCUMENTATION.boardviewStatus;
  const schematicFileName =
    typeof d.schematicFileName === "string" && d.schematicFileName.trim() !== ""
      ? d.schematicFileName.trim()
      : undefined;
  const boardviewFileName =
    typeof d.boardviewFileName === "string" && d.boardviewFileName.trim() !== ""
      ? d.boardviewFileName.trim()
      : undefined;
  return {
    schematicStatus,
    boardviewStatus,
    ...(schematicFileName !== undefined ? { schematicFileName } : {}),
    ...(boardviewFileName !== undefined ? { boardviewFileName } : {}),
  };
}

function parseDiagnosticSteps(raw: unknown): RepairDiagnosticStep[] {
  if (!Array.isArray(raw)) return [];
  const out: RepairDiagnosticStep[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const s = item as Record<string, unknown>;
    if (
      typeof s.id !== "string" ||
      typeof s.label !== "string" ||
      typeof s.done !== "boolean"
    ) {
      continue;
    }
    out.push({ id: s.id, label: s.label, done: s.done });
  }
  return out;
}

function parseRepair(x: unknown): Repair | null {
  if (typeof x !== "object" || x === null) return null;
  const o = x as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.device_type !== "string" ||
    typeof o.brand !== "string" ||
    typeof o.model !== "string" ||
    typeof o.motherboard !== "string" ||
    typeof o.symptom !== "string" ||
    !isRepairStatus(o.status)
  ) {
    return null;
  }
  const notes = typeof o.notes === "string" ? o.notes : "";
  const diagnosticSteps =
    "diagnosticSteps" in o ? parseDiagnosticSteps(o.diagnosticSteps) : [];
  const documentation =
    "documentation" in o ? parseDocumentation(o.documentation) : { ...DEFAULT_REPAIR_DOCUMENTATION };
  const diagnosticMode: DiagnosticMode = isDiagnosticModeValue(o.diagnosticMode)
    ? o.diagnosticMode
    : "other";
  return {
    id: o.id,
    device_type: o.device_type,
    brand: o.brand,
    model: o.model,
    motherboard: o.motherboard,
    symptom: o.symptom,
    status: o.status,
    notes,
    diagnosticSteps,
    documentation,
    diagnosticMode,
  };
}

/** Odczyt z localStorage: brak klucza / pusty string → fallback; `[]` → pusta lista. */
export function readRepairsFromStorage(fallback: Repair[]): Repair[] {
  if (typeof localStorage === "undefined") return fallback;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null || raw === "") return fallback;

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;

    const repairs = parsed.map(parseRepair).filter((r): r is Repair => r !== null);
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
