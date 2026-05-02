import type { RepairStatus } from "../types/repair";

/** Kolor `Badge` Mantine dla statusu naprawy (lista + szczegóły). */
export function repairStatusBadgeColor(status: RepairStatus) {
  switch (status) {
    case "nowa":
      return "gray";
    case "diagnoza":
      return "yellow";
    case "w naprawie":
      return "teal";
    case "gotowa":
      return "green";
    case "wydana":
      return "dark";
    default:
      return "gray";
  }
}
