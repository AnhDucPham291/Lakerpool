import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { badRequest } from "@/lib/http";
import { currentUser } from "@/lib/users";

type Params = { params: Promise<{ id: string }> };

/** Route details for the map: visible to the rider, the accepted driver, or any driver while the trip is open. */
export async function GET(req: Request, { params }: Params) {
  const user = await currentUser(req);
  if (!user) return badRequest("Sign in first.", 401);
  const { id } = await params;
  const trip = await db.tripRequest.findUnique({
    where: { id },
    select: { id: true, riderId: true, driverId: true, status: true, origin: true, destination: true, routePath: true, distanceMiles: true, durationMinutes: true }
  });
  const allowed = trip && (trip.riderId === user.id || trip.driverId === user.id || (user.isDriver && trip.status === "OPEN"));
  if (!trip || !allowed) return badRequest("Trip not found.", 404);
  const { riderId: _rider, driverId: _driver, ...route } = trip;
  return NextResponse.json({ trip: route });
}

const actionSchema = z.object({ action: z.enum(["accept", "release", "complete", "cancel"]) });

/**
 * accept   – a driver takes an open request
 * release  – the accepted driver gives the trip back to other drivers
 * complete – the accepted driver marks the trip finished
 * cancel   – the rider cancels an open or accepted request
 * Each update is conditional on the current status, so two drivers cannot accept the same trip.
 */
export async function PATCH(req: Request, { params }: Params) {
  const user = await currentUser(req);
  if (!user) return badRequest("Sign in first.", 401);
  const { id } = await params;
  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Unknown trip action.");

  const trip = await db.tripRequest.findUnique({ where: { id }, select: { riderId: true, driverId: true, status: true } });
  if (!trip) return badRequest("Trip not found.", 404);

  switch (parsed.data.action) {
    case "accept": {
      if (!user.isDriver) return badRequest("Add your vehicle details in the driver app first.", 403);
      if (trip.riderId === user.id) return badRequest("You cannot accept your own ride request.");
      const { count } = await db.tripRequest.updateMany({
        where: { id, status: "OPEN", driverId: null },
        data: { status: "ACCEPTED", driverId: user.id, acceptedAt: new Date() }
      });
      if (count === 0) return badRequest("This request is no longer available. Another driver may have accepted it.", 409);
      return NextResponse.json({ status: "ACCEPTED", message: "Trip accepted. You can now message the rider." });
    }
    case "release": {
      if (trip.driverId !== user.id) return badRequest("Only the accepted driver can release this trip.", 403);
      // Clear the old chat so the next driver cannot read it.
      const [{ count }] = await db.$transaction([
        db.tripRequest.updateMany({
          where: { id, status: "ACCEPTED", driverId: user.id },
          data: { status: "OPEN", driverId: null, acceptedAt: null }
        }),
        db.tripMessage.deleteMany({ where: { tripId: id, trip: { status: "OPEN", driverId: null } } })
      ]);
      if (count === 0) return badRequest("This trip can no longer be released.", 409);
      return NextResponse.json({ status: "OPEN", message: "Trip released. Other drivers can accept it now." });
    }
    case "complete": {
      if (trip.driverId !== user.id) return badRequest("Only the accepted driver can complete this trip.", 403);
      const { count } = await db.tripRequest.updateMany({ where: { id, status: "ACCEPTED", driverId: user.id }, data: { status: "COMPLETED" } });
      if (count === 0) return badRequest("Only accepted trips can be completed.", 409);
      return NextResponse.json({ status: "COMPLETED", message: "Trip marked as completed." });
    }
    case "cancel": {
      if (trip.riderId !== user.id) return badRequest("Only the rider can cancel this request.", 403);
      const { count } = await db.tripRequest.updateMany({
        where: { id, riderId: user.id, status: { in: ["OPEN", "ACCEPTED"] } },
        data: { status: "CANCELLED" }
      });
      if (count === 0) return badRequest("This trip can no longer be cancelled.", 409);
      return NextResponse.json({ status: "CANCELLED", message: "Request cancelled." });
    }
  }
}
