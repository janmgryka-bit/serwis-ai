import type { Repair, RepairDocumentation } from "../types/repair";

const DEVICE_TYPE_WARNING =
  "UWAGA: Odpowiadaj tylko dla tego typu urządzenia. Nie zakładaj PC ani ATX.";

function documentationLineSchematic(d: RepairDocumentation): string {
  if (d.schematicStatus === "missing") return "Schemat: brak";
  const name = d.schematicFileName?.trim();
  return name ? `Schemat: dodany (nazwa pliku: ${name})` : "Schemat: dodany";
}

function documentationLineBoardview(d: RepairDocumentation): string {
  if (d.boardviewStatus === "missing") return "Boardview: brak";
  const name = d.boardviewFileName?.trim();
  return name ? `Boardview: dodany (nazwa pliku: ${name})` : "Boardview: dodany";
}

/** Tekst kontekstu dla mentora / API (urządzenie, objaw, wykonane kroki, notatki). */
export function buildAiContext(repair: Repair): string {
  const deviceType = repair.device_type.trim() || "nie podano";
  const doc = repair.documentation;

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
    documentationLineSchematic(doc),
    documentationLineBoardview(doc),
    "",
    stepsSection,
    "",
    `Notatki:\n${repair.notes.trim() || "(brak)"}`,
  ].join("\n");
}
