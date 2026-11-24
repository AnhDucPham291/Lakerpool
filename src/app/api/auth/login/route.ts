import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { badRequest, databaseError } from "@/lib/http";
import { startSession, verifyPassword } from "@/lib/auth";
import { ownProfile } from "@/lib/users";

const schema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(128) });

/** Signs this browser in with email and password. */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Enter your GVSU email and password.");
  try {
    const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (user && !user.passwordHash)
      return NextResponse.json({ error: "This account was made before passwords were added. Choose “Create account” with the same email to set a password.", code: "SET_PASSWORD" }, { status: 409 });
    if (!user?.passwordHash || !(await verifyPassword(parsed.data.password, user.passwordHash)))
      return badRequest("Email or password is incorrect.", 401);
    return await startSession(NextResponse.json({ user: ownProfile(user) }), user.id);
  } catch (error) {
    return databaseError(error, "Could not sign you in.");
  }
}
