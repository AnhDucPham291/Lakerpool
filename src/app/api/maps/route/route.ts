import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  origin: z.string().trim().min(3).max(300),
  destination: z.string().trim().min(3).max(300)
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid starting point and destination." }, { status: 400 });
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) return NextResponse.json({ error: "Google Maps server key is not configured." }, { status: 503 });

  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline"
    },
    body: JSON.stringify({
      origin: { address: parsed.data.origin },
      destination: { address: parsed.data.destination },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      computeAlternativeRoutes: true,
      languageCode: "en-US",
      units: "IMPERIAL"
    }),
    cache: "no-store"
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("Routes API error:", detail);
    return NextResponse.json({ error: "Google Routes could not calculate this trip. Check the addresses and API setup." }, { status: 502 });
  }
  const data = await response.json();
  const routes = (data.routes ?? []).map((r: any, index: number) => ({
    id: index,
    distanceMeters: r.distanceMeters,
    distanceMiles: Number((r.distanceMeters / 1609.344).toFixed(1)),
    duration: r.duration,
    durationMinutes: Math.round(parseInt(r.duration, 10) / 60),
    encodedPolyline: r.polyline?.encodedPolyline ?? ""
  }));
  return NextResponse.json({ routes });
}
