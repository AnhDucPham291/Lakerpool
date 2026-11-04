import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  // Map coordinates arrive as [latitude, longitude].
  pickup: z.tuple([
    z.number().min(-90).max(90),
    z.number().min(-180).max(180)
  ])
});

// Sample profiles/rating counts are intentionally marked as demo data in the UI.
const demoDrivers = [
  { name: "Jordan Lee", vehicle: "Honda Civic", color: "Silver", rating: 4.9, ratingCount: 28, baseFare: 4.5, ratePerMile: 1.35 },
  { name: "Taylor Morgan", vehicle: "Toyota Prius", color: "Blue", rating: 4.8, ratingCount: 19, baseFare: 4.5, ratePerMile: 1.5 },
  { name: "Alex Rivera", vehicle: "Subaru Crosstrek", color: "Gray", rating: 4.7, ratingCount: 14, baseFare: 4.5, ratePerMile: 1.65 },
  { name: "Casey Brooks", vehicle: "Hyundai Elantra", color: "White", rating: 4.9, ratingCount: 32, baseFare: 4.5, ratePerMile: 1.45 }
];

function distanceMiles(a: [number, number], b: [number, number]) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const [lat1, lon1] = a.map(radians);
  const [lat2, lon2] = b.map(radians);
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "A valid pickup location is required." }, { status: 400 });

  const [lat, lon] = parsed.data.pickup;
  // Deterministic nearby demo locations make the matching UI explorable without GPS data.
  const drivers = demoDrivers.map((driver) => {
    const angle = Math.random() * Math.PI * 2;
    const radiusMiles = 0.15 + Math.random() * 1.35;
    const latOffset = Math.cos(angle) * radiusMiles / 69;
    const lonOffset = Math.sin(angle) * radiusMiles / (69 * Math.max(0.15, Math.cos(lat * Math.PI / 180)));
    const coordinates: [number, number] = [lat + latOffset, lon + lonOffset];
    const pickupDistanceMiles = Number(distanceMiles(parsed.data.pickup, coordinates).toFixed(1));
    return {
      ...driver,
      coordinates,
      pickupDistanceMiles,
      etaMinutes: Math.max(2, Math.round(pickupDistanceMiles * 3 + 2)),
      simulated: true as const
    };
  }).sort((a, b) => a.pickupDistanceMiles - b.pickupDistanceMiles);

  return NextResponse.json({
    drivers,
    notice: "Demo profiles and ratings only; these are not real drivers and no ride is booked."
  });
}
