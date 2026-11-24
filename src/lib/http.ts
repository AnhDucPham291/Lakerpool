import { NextResponse } from "next/server";
export function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
/** Logs a database failure and returns a message that says what actually went wrong. */
export function databaseError(error: unknown, action: string) {
  console.error(action, error);
  const configured = /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? "");
  const message = configured
    ? `${action} The database did not respond. Please try again in a moment.`
    : `${action} The database is not set up: DATABASE_URL must be a Postgres connection string (see README, "Run locally").`;
  return NextResponse.json({ error: message }, { status: 503 });
}
