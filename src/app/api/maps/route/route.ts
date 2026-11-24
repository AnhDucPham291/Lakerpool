import { NextResponse } from "next/server";
import { z } from "zod";
import { planRoutes, RoutingError } from "@/lib/routing";

const schema = z.object({
  origin: z.string().trim().min(3).max(300),
  destination: z.string().trim().min(3).max(300)
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid starting point and destination." }, { status: 400 });
  }

  try {
    const routes = await planRoutes(parsed.data.origin, parsed.data.destination);
    return NextResponse.json({ routes });
  } catch (error) {
    const status = error instanceof RoutingError ? error.status : 502;
    const message = error instanceof RoutingError ? error.message : "Could not calculate this route right now.";
    return NextResponse.json({ error: message }, { status });
  }
}
