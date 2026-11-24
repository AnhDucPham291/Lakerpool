import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { badRequest, databaseError } from "@/lib/http";
import { currentUser, ownProfile } from "@/lib/users";
import { driverFields, phoneField } from "@/lib/profileSchema";

/** The signed-in user's profile, or `{ user: null }` when this browser is not signed in. */
export async function GET(req: Request) {
  try {
    const user = await currentUser(req);
    return NextResponse.json({ user: user ? ownProfile(user) : null });
  } catch (error) {
    return databaseError(error, "Could not load your account.");
  }
}

const updateSchema = z.object({
  phone: phoneField.optional(),
  // Adding vehicle details turns on the driver app for this user.
  driver: driverFields.optional()
});

export async function PATCH(req: Request) {
  const user = await currentUser(req);
  if (!user) return badRequest("Sign in first.", 401);
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Please check your phone number and vehicle details.");
  const { phone, driver } = parsed.data;
  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      ...(phone !== undefined ? { phone: phone || null } : {}),
      ...(driver ? { ...driver, isDriver: true } : {})
    }
  });
  return NextResponse.json({ user: ownProfile(updated) });
}
