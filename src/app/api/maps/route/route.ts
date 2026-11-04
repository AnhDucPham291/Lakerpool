import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  origin: z.string().trim().min(3).max(300),
  destination: z.string().trim().min(3).max(300)
});

type Coordinates = [longitude: number, latitude: number];
type PhotonFeature = {
  geometry?: { coordinates?: Coordinates };
  properties?: { countrycode?: string };
};

async function geocode(address: string): Promise<Coordinates | null> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", address);
  url.searchParams.set("lat", "42.9634");
  url.searchParams.set("lon", "-85.6681");
  url.searchParams.set("limit", "5");
  url.searchParams.set("lang", "en");

  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Photon geocoding returned HTTP ${response.status}`);
  const data = await response.json();
  const features = Array.isArray(data.features) ? data.features as PhotonFeature[] : [];
  const usFeature = features.find((feature) =>
    feature.properties?.countrycode?.toUpperCase() === "US" && feature.geometry?.coordinates?.length === 2
  );
  return usFeature?.geometry?.coordinates ?? null;
}

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
    const [origin, destination] = await Promise.all([
      geocode(parsed.data.origin),
      geocode(parsed.data.destination)
    ]);
    if (!origin || !destination) {
      return NextResponse.json({ error: "Could not find one or both places. Try a more specific US address." }, { status: 404 });
    }

    const coordinatePair = `${origin[0]},${origin[1]};${destination[0]},${destination[1]}`;
    const url = new URL(`https://router.project-osrm.org/route/v1/driving/${coordinatePair}`);
    url.searchParams.set("overview", "full");
    url.searchParams.set("geometries", "geojson");
    url.searchParams.set("alternatives", "true");
    url.searchParams.set("steps", "false");

    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      console.error("OSRM routing returned HTTP", response.status);
      return NextResponse.json({ error: "The public routing service is temporarily unavailable. Please try again shortly." }, { status: 502 });
    }

    const data = await response.json();
    if (data.code !== "Ok" || !Array.isArray(data.routes) || data.routes.length === 0) {
      return NextResponse.json({ error: "No drivable route was found between those places." }, { status: 404 });
    }

    const routes = data.routes.flatMap((route: {
      distance?: number;
      duration?: number;
      geometry?: { coordinates?: Coordinates[] };
    }, index: number) => {
      const coordinates = route.geometry?.coordinates;
      if (typeof route.distance !== "number" || typeof route.duration !== "number" || !Array.isArray(coordinates)) return [];
      return [{
        id: index,
        distanceMiles: Number((route.distance / 1609.344).toFixed(1)),
        durationMinutes: Math.round(route.duration / 60),
        // Leaflet uses [latitude, longitude]; OSRM GeoJSON returns [longitude, latitude].
        coordinates: coordinates.map(([longitude, latitude]) => [latitude, longitude])
      }];
    });

    if (routes.length === 0) {
      return NextResponse.json({ error: "The routing service returned an invalid route." }, { status: 502 });
    }
    return NextResponse.json({ routes });
  } catch (error) {
    console.error("Map route request failed:", error);
    return NextResponse.json({ error: "Could not calculate this route right now. Check your connection and try again." }, { status: 502 });
  }
}
