import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { badRequest } from "@/lib/http";

const schema = z.object({ name: z.string().min(2), email: z.string().email() });
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Please provide a valid name and email.");
  const email = parsed.data.email.toLowerCase();
  if (!email.endsWith("@mail.gvsu.edu") && !email.endsWith("@gvsu.edu"))
    return badRequest("Use a GVSU email address to create a student profile.", 403);
  try {
    const user = await db.user.create({ data: { ...parsed.data, email } });
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, studentVerified: false }, note: "MVP profile created. Connect GVSU email verification before production." }, { status: 201 });
  } catch { return badRequest("An account with this email may already exist.", 409); }
}
