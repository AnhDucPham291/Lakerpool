import { z } from "zod";

export const passwordField = z.string().min(8).max(128);

export const phoneField = z.string().trim().regex(/^[0-9+().\-\s]{7,20}$/, "Enter a valid phone number.").or(z.literal(""));

export const driverFields = z.object({
  vehicleName: z.string().trim().min(2).max(60),
  vehicleColor: z.string().trim().min(2).max(30),
  licensePlate: z.string().trim().min(2).max(12)
});
