import type { Repair } from "../types/repair";

/** Tekst kontekstu dla mentora / API (urządzenie, objaw, wykonane kroki, notatki). */
export function buildAiContext(repair: Repair): string {
  const doneLabels = repair.diagnosticSteps.filter((s) => s.done).map((s) => s.label);
  const stepsSection =
    doneLabels.length > 0
      ? ["Wykonane kroki:", ...doneLabels.map((l) => `- ${l}`)].join("\n")
      : "Wykonane kroki: (brak)";

  return [
    `Typ urządzenia: ${repair.device_type}`,
    `Marka: ${repair.brand}`,
    `Model: ${repair.model}`,
    `Płyta główna: ${repair.motherboard}`,
    `Objaw: ${repair.symptom}`,
    "",
    stepsSection,
    "",
    `Notatki:\n${repair.notes.trim() || "(brak)"}`,
  ].join("\n");
}
