import {
  DIAGNOSTIC_MODE_LABELS,
  type Repair,
  type RepairDocumentation,
  type RepairFile,
} from "../types/repair";
import { fileNameFromPath } from "./filePathUtils";

const DEVICE_TYPE_WARNING =
  "UWAGA: Odpowiadaj tylko dla tego typu urządzenia. Nie zakładaj PC ani ATX.";

function documentationDisplayName(
  fileName: string | undefined,
  filePath: string | undefined,
): string {
  const n = fileName?.trim();
  if (n) return n;
  return fileNameFromPath(filePath ?? "");
}

function documentationLineSchematic(d: RepairDocumentation): string {
  if (d.schematicStatus === "missing") return "Schemat: brak";
  if (d.schematicStatus === "found") {
    const name = documentationDisplayName(d.schematicFileName, d.schematicPath);
    return name ? `Schemat: znaleziony (${name})` : "Schemat: znaleziony";
  }
  const name = documentationDisplayName(d.schematicFileName, d.schematicPath);
  return name ? `Schemat: dostępny (${name})` : "Schemat: dostępny";
}

function documentationLineBoardview(d: RepairDocumentation): string {
  if (d.boardviewStatus === "missing") return "Boardview: brak";
  if (d.boardviewStatus === "found") {
    const name = documentationDisplayName(d.boardviewFileName, d.boardviewPath);
    return name ? `Boardview: znaleziony (${name})` : "Boardview: znaleziony";
  }
  const name = documentationDisplayName(d.boardviewFileName, d.boardviewPath);
  return name ? `Boardview: dostępny (${name})` : "Boardview: dostępny";
}

function attachedFilesContextLines(files: RepairFile[]): string[] {
  const list = files ?? [];
  const n = list.length;
  const schematicFiles = list.filter((f) => f.fileRole === "schematic");
  const boardviewFiles = list.filter((f) => f.fileRole === "boardview");
  const hasSchematic = schematicFiles.length > 0;
  const hasBoardview = boardviewFiles.length > 0;
  const schNames = schematicFiles.map((f) => f.fileName).join(", ") || "(brak)";
  const bvNames = boardviewFiles.map((f) => f.fileName).join(", ") || "(brak)";
  return [
    `Załączniki plików: ${n}`,
    `W załącznikach jest schemat: ${hasSchematic ? "tak" : "nie"}`,
    `W załącznikach jest boardview: ${hasBoardview ? "tak" : "nie"}`,
    hasSchematic ? `Nazwy plików schematów (załączniki): ${schNames}` : "",
    hasBoardview ? `Nazwy plików boardview (załączniki): ${bvNames}` : "",
  ].filter((line) => line !== "");
}

/** Tekst kontekstu dla mentora / API (urządzenie, objaw, wykonane kroki, notatki). */
export function buildAiContext(repair: Repair): string {
  const deviceType = repair.device_type.trim() || "nie podano";
  const doc = repair.documentation;
  const fileLines = attachedFilesContextLines(repair.attachedFiles ?? []);

  const doneLabels = repair.diagnosticSteps.filter((s) => s.done).map((s) => s.label);
  const stepsSection =
    doneLabels.length > 0
      ? ["Wykonane kroki:", ...doneLabels.map((l) => `- ${l}`)].join("\n")
      : "Wykonane kroki: (brak)";

  const modeLabel = DIAGNOSTIC_MODE_LABELS[repair.diagnosticMode];

  return [
    `TRYB DIAGNOSTYKI: ${modeLabel}`,
    "",
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
    ...(fileLines.length > 0 ? [...fileLines, ""] : []),
    stepsSection,
    "",
    `Notatki:\n${repair.notes.trim() || "(brak)"}`,
  ].join("\n");
}
