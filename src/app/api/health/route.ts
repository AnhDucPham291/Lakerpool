import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

/** Reports whether the API can reach the database. Open /api/health to check a deployment. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, service: "LakerPool API", database: "connected" });
  } catch (error) {
    console.error("Health check: database unreachable", error);
    return NextResponse.json({ ok: false, service: "LakerPool API", database: "unreachable" }, { status: 503 });
  }
}
