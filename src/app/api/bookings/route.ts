import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { badRequest, getDemoUserId } from "@/lib/http";
const schema = z.object({ rideId:z.string(), seats:z.number().int().min(1).max(4).default(1) });
export async function GET(req: Request) {
  const userId = getDemoUserId(req);
  if (!userId) return badRequest("Sign in first.", 401);
  const { searchParams } = new URL(req.url);
  if (searchParams.get("as") !== "driver") return badRequest("Unsupported booking view.");
  const bookings = await db.booking.findMany({
    where: { status: "PENDING", ride: { driverId: userId } },
    include: {
      passenger: { select: { name: true, studentVerified: true } },
      ride: { include: { driver: { select: { id: true, name: true, studentVerified: true } } } }
    },
    orderBy: { createdAt: "asc" }
  });
  return NextResponse.json({ bookings });
}
export async function POST(req: Request) {
  const passengerId = getDemoUserId(req);
  if (!passengerId) return badRequest("Missing x-user-id header. Sign in first.", 401);
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid booking request.");
  const ride = await db.ride.findUnique({ where:{id:parsed.data.rideId} });
  if (!ride) return badRequest("Ride not found.",404);
  if (ride.driverId === passengerId) return badRequest("You cannot book your own ride.");
  if (ride.seatsAvailable < parsed.data.seats) return badRequest("Not enough seats available.");
  const booking = await db.booking.create({ data: { rideId:ride.id, passengerId, seats:parsed.data.seats, pricePerPassenger:Number((ride.estimatedPrice/ride.seatsTotal).toFixed(2)) } });
  return NextResponse.json({ booking, message:"Request sent. The driver must accept it." },{status:201});
}
