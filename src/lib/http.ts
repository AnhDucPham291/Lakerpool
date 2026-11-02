import { NextResponse } from "next/server";
export function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
export function getDemoUserId(req: Request) {
  // MVP only: replace this header-based identity with secure session authentication.
  return req.headers.get("x-user-id");
}
