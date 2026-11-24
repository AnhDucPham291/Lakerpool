import { NextResponse } from "next/server";
import { endSession } from "@/lib/auth";

/** Signs this browser out. */
export async function POST(req: Request) {
  return endSession(req, NextResponse.json({ ok: true }));
}
