import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ input: z.string().trim().min(3).max(200) });

export async function GET(req: Request) {
  const parsed = schema.safeParse({ input: new URL(req.url).searchParams.get("input") ?? "" });
  if (!parsed.success) return NextResponse.json({ suggestions: [] });
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) return NextResponse.json({ error: "Google Maps server key is not configured." }, { status: 503 });

  const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text"
    },
    body: JSON.stringify({
      input: parsed.data.input,
      includedRegionCodes: ["us"],
      locationBias: { circle: { center: { latitude: 42.9634, longitude: -85.6681 }, radius: 50000 } }
    }),
    cache: "no-store"
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("Places Autocomplete error:", detail);
    return NextResponse.json({ error: "Google Places could not complete the location search." }, { status: 502 });
  }
  const data = await response.json();
  const suggestions = (data.suggestions ?? []).flatMap((s: any) => {
    const p = s.placePrediction;
    return p ? [{ placeId: p.placeId, text: p.text?.text ?? "" }] : [];
  });
  return NextResponse.json({ suggestions });
}
