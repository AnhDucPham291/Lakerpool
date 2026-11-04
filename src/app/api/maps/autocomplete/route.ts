import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ input: z.string().trim().min(3).max(200) });

type PhotonFeature = {
  properties?: {
    osm_id?: string | number;
    name?: string;
    housenumber?: string;
    street?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    countrycode?: string;
  };
};

function formatPlace(properties: NonNullable<PhotonFeature["properties"]>) {
  const locality = properties.city || properties.district || properties.county;
  const street = [properties.housenumber, properties.street].filter(Boolean).join(" ");
  return [properties.name, street, locality, properties.state, properties.postcode, properties.country]
    .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index)
    .join(", ");
}

export async function GET(req: Request) {
  const parsed = schema.safeParse({ input: new URL(req.url).searchParams.get("input") ?? "" });
  if (!parsed.success) return NextResponse.json({ suggestions: [] });

  try {
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", parsed.data.input);
    url.searchParams.set("lat", "42.9634");
    url.searchParams.set("lon", "-85.6681");
    url.searchParams.set("limit", "6");
    url.searchParams.set("lang", "en");

    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      console.error("Photon autocomplete returned HTTP", response.status);
      return NextResponse.json({ suggestions: [], error: "Place search is temporarily unavailable." }, { status: 502 });
    }

    const data = await response.json();
    const features = Array.isArray(data.features) ? data.features as PhotonFeature[] : [];
    const suggestions = features.flatMap((feature) => {
      const properties = feature.properties;
      if (properties?.countrycode && properties.countrycode.toUpperCase() !== "US") return [];
      const text = properties ? formatPlace(properties) : "";
      const placeId = properties?.osm_id;
      return text && placeId ? [{ placeId: String(placeId), text }] : [];
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Photon autocomplete request failed:", error);
    return NextResponse.json({ suggestions: [], error: "Place search is temporarily unavailable." }, { status: 502 });
  }
}
