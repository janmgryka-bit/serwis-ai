import type { RepairDiagnosticStep } from "../types/repair";

/** Fragmenty objawu uruchamiające checklistę zasilania / startu. */
const TRIGGERS = ["nie uruchamia się", "brak reakcji"] as const;

export const POWER_DIAGNOSTIC_STEPS = [
  "Sprawdź zasilacz",
  "Sprawdź gniazdo DC",
  "Sprawdź czy jest zwarcie",
  "Sprawdź VIN",
  "Sprawdź napięcia 3V/5V",
] as const;

export function shouldShowPowerDiagnostic(symptom: string): boolean {
  const s = symptom.toLowerCase();
  return TRIGGERS.some((t) => s.includes(t));
}

/** Kroki checklisty zasilania/startu albo pusta tablica. */
export function buildDiagnosticStepsForSymptom(symptom: string): RepairDiagnosticStep[] {
  if (!shouldShowPowerDiagnostic(symptom)) return [];
  return POWER_DIAGNOSTIC_STEPS.map((label, i) => ({
    id: `power:${i}`,
    label,
    done: false,
  }));
}
