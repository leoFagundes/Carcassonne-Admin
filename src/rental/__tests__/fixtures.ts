import type { RentalBooking, RentalUnit } from "@/types";

export function unit(id: string, status: RentalUnit["status"] = "active"): RentalUnit {
  return { id, label: id, status };
}

export function bk(
  unitId: string,
  startDate: string,
  dueDate: string,
  status: RentalBooking["status"],
  rentalId = "r"
): RentalBooking {
  return { rentalId, unitId, startDate, dueDate, status };
}
