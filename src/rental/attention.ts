import type { RentalType } from "@/types";

export interface RentalAttention {
  pickupsToday: number;
  returnsToday: number;
  overdue: number;
  notPickedUp: number;
}

/** Quantos aluguéis pedem atenção do admin hoje (datas "YYYY-MM-DD"). */
export function rentalAttention(rentals: RentalType[], today: string): RentalAttention {
  const result: RentalAttention = { pickupsToday: 0, returnsToday: 0, overdue: 0, notPickedUp: 0 };
  for (const rental of rentals) {
    if (rental.status === "reserved") {
      if (rental.startDate === today) result.pickupsToday++;
      else if (rental.startDate < today) result.notPickedUp++;
    } else if (rental.status === "picked_up") {
      if (rental.dueDate === today) result.returnsToday++;
      else if (rental.dueDate < today) result.overdue++;
    }
  }
  return result;
}
