/** Status naprawy — łatwo rozszerzyć przy integracji z bazą. */
export type RepairStatus =
  | "nowa"
  | "diagnoza"
  | "w naprawie"
  | "gotowa"
  | "wydana";

export type RepairDiagnosticStep = {
  id: string;
  label: string;
  done: boolean;
};

/** Stan dokumentacji — `found` zarezerwowane na przyszłe wyszukiwanie online (bez uploadu). */
export type RepairDocumentationStatus = "missing" | "uploaded" | "found";

export type RepairDocumentation = {
  schematicStatus: RepairDocumentationStatus;
  boardviewStatus: RepairDocumentationStatus;
  schematicFileName?: string;
  boardviewFileName?: string;
  /** Pełna ścieżka wybranego pliku (Tauri); bez kopiowania pliku do aplikacji. */
  schematicPath?: string;
  boardviewPath?: string;
};

export const DEFAULT_REPAIR_DOCUMENTATION: RepairDocumentation = {
  schematicStatus: "missing",
  boardviewStatus: "missing",
};

export type DiagnosticMode =
  | "no_power"
  | "no_display"
  | "restarts"
  | "charging_issue"
  | "other";

export const DIAGNOSTIC_MODE_LABELS: Record<DiagnosticMode, string> = {
  no_power: "Brak reakcji / martwa płyta",
  no_display: "Startuje, brak obrazu",
  restarts: "Restart / wyłączanie",
  charging_issue: "Problem z ładowaniem",
  other: "Inne",
};

/** Etap diagnostyki na workbench (zapis w `diagnostic_stage`). */
export type DiagnosticStage =
  | "start"
  | "no_supply"
  | "standby"
  | "power_sequence"
  | "board_boot"
  | "display"
  | "stage_other";

export const DIAGNOSTIC_STAGE_LABELS: Record<DiagnosticStage, string> = {
  start: "Start",
  no_supply: "Brak zasilania",
  standby: "Standby",
  power_sequence: "Power sequence",
  board_boot: "Start płyty",
  display: "Obraz",
  stage_other: "Inne",
};

/** Kolejność w Select (workbench). */
export const DIAGNOSTIC_STAGE_ORDER: DiagnosticStage[] = [
  "start",
  "no_supply",
  "standby",
  "power_sequence",
  "board_boot",
  "display",
  "stage_other",
];

export const DEFAULT_DIAGNOSTIC_STAGE: DiagnosticStage = "start";

/** Stan płyty w workbench (dziennik serwisowy). */
export type RepairBoardStateId =
  | "dead_no_reaction"
  | "power_response"
  | "boots_no_display"
  | "restarts_shutdown"
  | "charging"
  | "functional_fault"
  | "other";

export const REPAIR_BOARD_STATE_OPTIONS: { value: RepairBoardStateId; label: string }[] = [
  { value: "dead_no_reaction", label: "Martwa / brak reakcji" },
  { value: "power_response", label: "Reaguje na power" },
  { value: "boots_no_display", label: "Startuje, brak obrazu" },
  { value: "restarts_shutdown", label: "Restartuje / wyłącza się" },
  { value: "charging", label: "Problem z ładowaniem" },
  { value: "functional_fault", label: "Działa, ale usterka funkcjonalna" },
  { value: "other", label: "Inne" },
];

const BOARD_STATE_IDS = REPAIR_BOARD_STATE_OPTIONS.map((o) => o.value);

export function isRepairBoardStateId(x: unknown): x is RepairBoardStateId {
  return typeof x === "string" && (BOARD_STATE_IDS as readonly string[]).includes(x);
}

/** Panel roboczy — obserwacje na żywo; `boardState` pusty = nie wybrano. */
export type RepairWorkbench = {
  boardState: RepairBoardStateId | "";
  vinObservation: string;
  currentDraw: string;
  powerReaction: string;
  workingConclusion: string;
  /** Proponowany / zapisany następny krok (także z AI). */
  nextStep: string;
};

export const DEFAULT_REPAIR_WORKBENCH: RepairWorkbench = {
  boardState: "",
  vinObservation: "",
  currentDraw: "",
  powerReaction: "",
  workingConclusion: "",
  nextStep: "",
};

/** Parsuje JSON workbench; uzupełnia z pól legacy (VIN/pobór/reakcja/wniosek). */
export function parseRepairWorkbench(
  raw: unknown,
  legacy: {
    vin: string;
    draw: string;
    reaction: string;
    conclusion: string;
  },
): RepairWorkbench {
  const out: RepairWorkbench = { ...DEFAULT_REPAIR_WORKBENCH };
  if (typeof raw === "object" && raw !== null) {
    const w = raw as Record<string, unknown>;
    if (w.boardState === "" || isRepairBoardStateId(w.boardState)) {
      out.boardState = w.boardState === "" ? "" : w.boardState;
    }
    if (typeof w.vinObservation === "string") out.vinObservation = w.vinObservation;
    if (typeof w.currentDraw === "string") out.currentDraw = w.currentDraw;
    if (typeof w.powerReaction === "string") out.powerReaction = w.powerReaction;
    if (typeof w.workingConclusion === "string") out.workingConclusion = w.workingConclusion;
    if (typeof w.nextStep === "string") out.nextStep = w.nextStep;
  }
  if (!out.vinObservation.trim() && legacy.vin.trim()) out.vinObservation = legacy.vin;
  if (!out.currentDraw.trim() && legacy.draw.trim()) out.currentDraw = legacy.draw;
  if (!out.powerReaction.trim() && legacy.reaction.trim()) out.powerReaction = legacy.reaction;
  if (!out.workingConclusion.trim() && legacy.conclusion.trim()) out.workingConclusion = legacy.conclusion;
  return out;
}

/** Jeden krok mentora: `question` = treść od użytkownika, `answer` = odpowiedź AI. */
export type RepairDiagnosisStepEntry = {
  step: number;
  question: string;
  answer: string;
  /** ISO 8601 — tylko dla nowych wpisów. */
  recordedAt?: string;
};

/** Rola załącznika w tabeli `repair_files`. */
export type RepairFileRole = "schematic" | "boardview" | "photo" | "bios" | "other";

export const REPAIR_FILE_ROLE_LABELS: Record<RepairFileRole, string> = {
  schematic: "Schemat",
  boardview: "Boardview",
  photo: "Zdjęcie",
  bios: "BIOS",
  other: "Inne",
};

export type RepairFile = {
  id: string;
  repairId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileRole: RepairFileRole;
  createdAt: string;
};

export type Repair = {
  id: string;
  customerName: string;
  customerPhone: string;
  orderNumber: string;
  device_type: string;
  brand: string;
  model: string;
  motherboard: string;
  symptom: string;
  status: RepairStatus;
  notes: string;
  /** Końcowa diagnoza (wypełniane w szczegółach naprawy). */
  finalDiagnosis: string;
  /** Opis rozwiązania / naprawy (wypełniane w szczegółach naprawy). */
  solution: string;
  diagnosticSteps: RepairDiagnosticStep[];
  documentation: RepairDocumentation;
  diagnosticMode: DiagnosticMode;
  /** Etap diagnostyki (workbench). */
  diagnosticStage: DiagnosticStage;
  /** Panel roboczy: stan płyty, VIN, pobór, reakcja, wniosek. */
  workbench: RepairWorkbench;
  /** Historia mentora: pary (pytanie/wynik użytkownika → odpowiedź AI). */
  diagnosisSteps: RepairDiagnosisStepEntry[];
  /** Załączniki z SQLite (łączone przy odczycie naprawy). */
  attachedFiles: RepairFile[];
};

/** Szkic z formularza „nowa naprawa” — bez pól uzupełnianych przy zapisie w `App`. Zawiera m.in. `diagnosticMode`, `diagnosisSteps`. */
export type RepairDraft = Omit<Repair, "id" | "status" | "notes" | "diagnosticSteps">;

export const REPAIR_STATUS_LABELS: Record<RepairStatus, string> = {
  nowa: "Nowa",
  diagnoza: "Diagnoza",
  "w naprawie": "W naprawie",
  gotowa: "Gotowa",
  wydana: "Wydana",
};
