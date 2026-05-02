import type { Repair } from "../types/repair";

const DEVICE_TYPE_WARNING =
  "UWAGA: Odpowiadaj tylko dla tego typu urządzenia. Nie zakładaj PC ani ATX.";

/** Tekst kontekstu dla mentora / API (urządzenie, objaw, wykonane kroki, notatki). */
export function buildAiContext(repair: Repair): string {
  const deviceType = repair.device_type.trim() || "nie podano";

  const doneLabels = repair.diagnosticSteps.filter((s) => s.done).map((s) => s.label);
  const stepsSection =
    doneLabels.length > 0
      ? ["Wykonane kroki:", ...doneLabels.map((l) => `- ${l}`)].join("\n")
      : "Wykonane kroki: (brak)";

  return [
    `Typ urządzenia: ${deviceType}`,
    DEVICE_TYPE_WARNING,
    "",
    `Marka: ${repair.brand}`,
    `Model: ${repair.model}`,
    `Płyta: ${repair.motherboard}`,
    `Objaw: ${repair.symptom}`,
    "",
    stepsSection,
    "",
    `Notatki:\n${repair.notes.trim() || "(brak)"}`,
  ].join("\n");
}
