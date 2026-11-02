import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { badRequest, getDemoUserId } from "@/lib/http";

const createRide = z.object({
  origin: z.string().min(2), destination: z.string().min(2),
  departureAt: z.string().datetime(), pickupDetails: z.string().min(2),
  dropoffDetails: z.string().min(2), vehicleType: z.string().min(2),
  vehicleName: z.string().optional(), vehicleColor: z.string().optional(),
  seatsTotal: z.number().int().min(1).max(8), estimatedPrice: z.number().positive(),
  stops: z.number().int().min(0).default(0), notes: z.string().optional()
});
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const origin = searchParams.get("origin"), destination = searchParams.get("destination");
  const date = searchParams.get("date");
  const rides = await db.ride.findMany({
    where: { seatsAvailable: { gt: 0 },
      ...(origin ? { origin: { contains: origin } } : {}),
      ...(destination ? { destination: { contains: destination } } : {}),
      ...(date ? { departureAt: { gte: new Date(date), lt: new Date(new Date(date).getTime()+86400000) } } : {})
    },
    include: { driver: { select: { id:true, name:true, studentVerified:true } }, _count: { select: { bookings:true } } },
    orderBy: { departureAt: "asc" }, take: 50
  });
  return NextResponse.json({ rides: rides.map(r => ({ ...r, estimatedPricePerPassenger: Number((r.estimatedPrice / Math.max(1, r.seatsTotal)).toFixed(2)) })) });
}
export async function POST(req: Request) {
  const driverId = getDemoUserId(req);
  if (!driverId) return badRequest("Missing x-user-id header. Add secure authentication before production.", 401);
  const parsed = createRide.safeParse(await req.json());
  if (!parsed.success) return badRequest("Ride details are incomplete or invalid.");
  const ride = await db.ride.create({ data: { ...parsed.data, departureAt: new Date(parsed.data.departureAt), driverId, seatsAvailable: parsed.data.seatsTotal } });
  return NextResponse.json({ ride }, { status: 201 });
}
