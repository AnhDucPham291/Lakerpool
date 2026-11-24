import type { User } from "@prisma/client";
import { sessionUser } from "@/lib/auth";

/** The signed-in user (from the session cookie), or null. */
export async function currentUser(req: Request) {
  return sessionUser(req);
}

/** The profile fields a user may see about themselves. Never includes the password hash. */
export function ownProfile(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    studentVerified: user.studentVerified,
    phone: user.phone,
    isDriver: user.isDriver,
    vehicleName: user.vehicleName,
    vehicleColor: user.vehicleColor,
    licensePlate: user.licensePlate
  };
}

/** Rider details a driver sees before accepting: no phone number. */
export const riderPreviewSelect = {
  id: true,
  name: true,
  email: true,
  studentVerified: true,
  createdAt: true,
  _count: { select: { tripRequests: { where: { status: "COMPLETED" as const } } } }
};

/** Rider details shared with the driver after they accept. */
export const riderContactSelect = { ...riderPreviewSelect, phone: true };

/** Driver details shared with the rider after the driver accepts. */
export const driverContactSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  studentVerified: true,
  vehicleName: true,
  vehicleColor: true,
  licensePlate: true
};
