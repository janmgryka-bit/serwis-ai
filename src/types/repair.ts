/** Status naprawy — łatwo rozszerzyć przy integracji z bazą. */
export type RepairStatus =
  | "nowa"
  | "diagnoza"
  | "w naprawie"
  | "gotowa"
  | "wydana";

export type Repair = {
  id: string;
  device_type: string;
  brand: string;
  model: string;
  motherboard: string;
  symptom: string;
  status: RepairStatus;
  notes: string;
};

/** Szkic z formularza „nowa naprawa” — bez `notes` (domyślnie pusty string przy zapisie). */
export type RepairDraft = Omit<Repair, "id" | "status" | "notes">;

export const REPAIR_STATUS_LABELS: Record<RepairStatus, string> = {
  nowa: "Nowa",
  diagnoza: "Diagnoza",
  "w naprawie": "W naprawie",
  gotowa: "Gotowa",
  wydana: "Wydana",
};
