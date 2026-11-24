// Server-side geocoding (Photon) and driving routes (OSRM public demo server).

/** [latitude, longitude], the order Leaflet expects. */
export type LatLng = [number, number];
export type DrivingRoute = {
  id: number;
  distanceMiles: number;
  durationMinutes: number;
  coordinates: LatLng[];
};

type LonLat = [longitude: number, latitude: number];
type PhotonFeature = {
  geometry?: { coordinates?: LonLat };
  properties?: { countrycode?: string };
};

/** An error whose message is safe to show to users, with the HTTP status to return. */
export class RoutingError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function geocode(address: string): Promise<LonLat | null> {
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

/** Driving routes between two US places, best route first. Throws RoutingError. */
export async function planRoutes(originText: string, destinationText: string): Promise<DrivingRoute[]> {
  try {
    const [origin, destination] = await Promise.all([geocode(originText), geocode(destinationText)]);
    if (!origin || !destination) {
      throw new RoutingError("Could not find one or both places. Try a more specific US address.", 404);
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
      throw new RoutingError("The public routing service is temporarily unavailable. Please try again shortly.", 502);
    }

    const data = await response.json();
    if (data.code !== "Ok" || !Array.isArray(data.routes) || data.routes.length === 0) {
      throw new RoutingError("No drivable route was found between those places.", 404);
    }

    const routes = (data.routes as {
      distance?: number;
      duration?: number;
      geometry?: { coordinates?: LonLat[] };
    }[]).flatMap((route, index) => {
      const coordinates = route.geometry?.coordinates;
      if (typeof route.distance !== "number" || typeof route.duration !== "number" || !Array.isArray(coordinates)) return [];
      return [{
        id: index,
        distanceMiles: Number((route.distance / 1609.344).toFixed(1)),
        durationMinutes: Math.round(route.duration / 60),
        // OSRM GeoJSON returns [longitude, latitude].
        coordinates: coordinates.map(([longitude, latitude]): LatLng => [latitude, longitude])
      }];
    });

    if (routes.length === 0) throw new RoutingError("The routing service returned an invalid route.", 502);
    return routes;
  } catch (error) {
    if (error instanceof RoutingError) throw error;
    console.error("Map route request failed:", error);
    throw new RoutingError("Could not calculate this route right now. Check your connection and try again.", 502);
  }
}

/** Keeps at most `maxPoints` evenly spaced points (always including both ends) for storage. */
export function simplifyPath(path: LatLng[], maxPoints = 150): LatLng[] {
  if (path.length <= maxPoints) return path;
  const step = (path.length - 1) / (maxPoints - 1);
  return Array.from({ length: maxPoints }, (_, i) => path[Math.round(i * step)]);
}
