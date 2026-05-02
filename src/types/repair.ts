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
};

export type RepairDraft = Omit<Repair, "id" | "status">;
