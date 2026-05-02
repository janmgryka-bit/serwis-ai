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

/** Jeden krok mentora: `question` = treść od użytkownika, `answer` = odpowiedź AI. */
export type RepairDiagnosisStepEntry = {
  step: number;
  question: string;
  answer: string;
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
  /** Historia mentora: pary (pytanie/wynik użytkownika → odpowiedź AI). */
  diagnosisSteps: RepairDiagnosisStepEntry[];
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
