import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { badRequest, databaseError } from "@/lib/http";
import { hashPassword, startSession } from "@/lib/auth";
import { ownProfile } from "@/lib/users";
import { driverFields, passwordField, phoneField } from "@/lib/profileSchema";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: passwordField,
  phone: phoneField.optional(),
  // Present when signing up from the driver app.
  driver: driverFields.optional()
});

/** Creates an account and signs this browser in. */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.path[0] === "password") return badRequest("Choose a password with at least 8 characters.");
    return badRequest("Please provide a valid name, email, phone number, and vehicle details.");
  }
  const email = parsed.data.email.toLowerCase();
  if (!email.endsWith("@mail.gvsu.edu") && !email.endsWith("@gvsu.edu"))
    return badRequest("Use a GVSU email address to create a student profile.", 403);
  const { name, password, phone, driver } = parsed.data;

  try {
    const passwordHash = await hashPassword(password);
    const fields = { name, phone: phone || null, passwordHash, ...(driver ? { ...driver, isDriver: true } : {}) };
    const existing = await db.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
    if (existing?.passwordHash)
      return NextResponse.json({ error: "This GVSU email already has an account. Sign in with your password.", code: "EMAIL_TAKEN" }, { status: 409 });

    // A profile made before passwords existed is completed here instead of failing as a duplicate.
    const user = existing
      ? await db.user.update({ where: { id: existing.id }, data: fields })
      : await db.user.create({ data: { email, ...fields } });
    return await startSession(NextResponse.json({ user: ownProfile(user) }, { status: existing ? 200 : 201 }), user.id);
  } catch (error) {
    // Two sign-ups with the same email at the same moment: the second one loses.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return NextResponse.json({ error: "This GVSU email already has an account. Sign in with your password.", code: "EMAIL_TAKEN" }, { status: 409 });
    return databaseError(error, "Could not create your account.");
  }
}
