import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { badRequest } from "@/lib/http";
import { currentUser, driverContactSelect, riderContactSelect, riderPreviewSelect } from "@/lib/users";
import { MAX_RIDERS, tripFare } from "@/lib/fare";
import { planRoutes, RoutingError, simplifyPath, type DrivingRoute } from "@/lib/routing";

// Fields returned in trip lists. The route path is loaded on demand from GET /api/trips/:id.
const tripListFields = {
  id: true, origin: true, destination: true, distanceMiles: true, durationMinutes: true,
  departureAt: true, riders: true, totalFare: true, farePerRider: true, notes: true,
  status: true, acceptedAt: true, createdAt: true
} as const;

const MAX_OPEN_REQUESTS = 3;

export async function GET(req: Request) {
  const user = await currentUser(req);
  if (!user) return badRequest("Sign in first.", 401);
  const view = new URL(req.url).searchParams.get("view");

  if (view === "rider") {
    const trips = await db.tripRequest.findMany({
      where: { riderId: user.id },
      select: { ...tripListFields, driver: { select: driverContactSelect } },
      orderBy: { createdAt: "desc" },
      take: 20
    });
    return NextResponse.json({ trips });
  }

  if (!user.isDriver) return badRequest("Add your vehicle details in the driver app first.", 403);

  if (view === "open") {
    const trips = await db.tripRequest.findMany({
      where: { status: "OPEN", riderId: { not: user.id }, departureAt: { gte: new Date(Date.now() - 30 * 60000) } },
      select: { ...tripListFields, rider: { select: riderPreviewSelect } },
      orderBy: { departureAt: "asc" },
      take: 50
    });
    return NextResponse.json({ trips });
  }

  if (view === "driver") {
    const trips = await db.tripRequest.findMany({
      // CANCELLED is included so the driver sees when a rider cancels an accepted trip.
      where: { driverId: user.id, status: { in: ["ACCEPTED", "COMPLETED", "CANCELLED"] } },
      select: { ...tripListFields, rider: { select: riderContactSelect } },
      orderBy: [{ status: "asc" }, { departureAt: "asc" }],
      take: 50
    });
    return NextResponse.json({ trips });
  }

  return badRequest("Unknown trip view.");
}

const createSchema = z.object({
  origin: z.string().trim().min(3).max(300),
  destination: z.string().trim().min(3).max(300),
  departureAt: z.string().datetime(),
  riders: z.number().int().min(1).max(MAX_RIDERS),
  notes: z.string().trim().max(500).optional()
});

export async function POST(req: Request) {
  const user = await currentUser(req);
  if (!user) return badRequest("Sign in first.", 401);
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Trip details are incomplete or invalid.");
  const { origin, destination, riders, notes } = parsed.data;

  const departureAt = new Date(parsed.data.departureAt);
  const now = Date.now();
  if (departureAt.getTime() < now - 5 * 60000 || departureAt.getTime() > now + 60 * 86400000)
    return badRequest("Choose a departure time between now and 60 days from now.");

  const openCount = await db.tripRequest.count({ where: { riderId: user.id, status: "OPEN" } });
  if (openCount >= MAX_OPEN_REQUESTS)
    return badRequest(`You already have ${MAX_OPEN_REQUESTS} open requests. Cancel one before requesting another.`, 429);

  // The server computes the route and price itself rather than trusting the browser.
  let route: DrivingRoute;
  try {
    [route] = await planRoutes(origin, destination);
  } catch (error) {
    if (error instanceof RoutingError) return badRequest(error.message, error.status);
    throw error;
  }
  const fare = tripFare(route.distanceMiles, riders);

  const trip = await db.tripRequest.create({
    data: {
      riderId: user.id, origin, destination, departureAt, riders, notes: notes || null,
      routePath: simplifyPath(route.coordinates),
      distanceMiles: route.distanceMiles,
      durationMinutes: route.durationMinutes,
      totalFare: fare.total,
      farePerRider: fare.perRider
    },
    select: tripListFields
  });
  return NextResponse.json({ trip, message: "Request sent. Nearby drivers can now see it." }, { status: 201 });
}
