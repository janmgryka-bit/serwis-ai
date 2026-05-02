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

export type Repair = {
  id: string;
  device_type: string;
  brand: string;
  model: string;
  motherboard: string;
  symptom: string;
  status: RepairStatus;
  notes: string;
  diagnosticSteps: RepairDiagnosticStep[];
  documentation: RepairDocumentation;
};

/** Szkic z formularza „nowa naprawa” — bez pól uzupełnianych przy zapisie w `App`. */
export type RepairDraft = Omit<Repair, "id" | "status" | "notes" | "diagnosticSteps">;

export const REPAIR_STATUS_LABELS: Record<RepairStatus, string> = {
  nowa: "Nowa",
  diagnoza: "Diagnoza",
  "w naprawie": "W naprawie",
  gotowa: "Gotowa",
  wydana: "Wydana",
};
