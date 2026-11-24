import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { badRequest } from "@/lib/http";
import { currentUser } from "@/lib/users";

type Params = { params: Promise<{ id: string }> };

/** Only the rider and the accepted driver can use a trip's chat. */
async function participantTrip(req: Request, params: Params["params"]) {
  const user = await currentUser(req);
  if (!user) return { error: badRequest("Sign in first.", 401) };
  const { id } = await params;
  const trip = await db.tripRequest.findUnique({ where: { id }, select: { id: true, riderId: true, driverId: true, status: true } });
  if (!trip || !trip.driverId || (trip.riderId !== user.id && trip.driverId !== user.id))
    return { error: badRequest("Chat is available once a driver accepts the trip.", 404) };
  return { user, trip };
}

export async function GET(req: Request, { params }: Params) {
  const result = await participantTrip(req, params);
  if ("error" in result) return result.error;
  const messages = await db.tripMessage.findMany({
    where: { tripId: result.trip.id },
    select: { id: true, body: true, createdAt: true, sender: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
    take: 200
  });
  return NextResponse.json({ messages });
}

const messageSchema = z.object({ body: z.string().trim().min(1).max(1000) });

export async function POST(req: Request, { params }: Params) {
  const result = await participantTrip(req, params);
  if ("error" in result) return result.error;
  if (result.trip.status !== "ACCEPTED") return badRequest("This trip is closed, so new messages are turned off.", 409);
  const parsed = messageSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Write a message of up to 1000 characters.");
  const message = await db.tripMessage.create({
    data: { tripId: result.trip.id, senderId: result.user.id, body: parsed.data.body },
    select: { id: true, body: true, createdAt: true, sender: { select: { id: true, name: true } } }
  });
  return NextResponse.json({ message }, { status: 201 });
}
