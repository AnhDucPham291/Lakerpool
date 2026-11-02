 "use client";

import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { ArrowUpRight, MapPin, Navigation, Clock3, Route as RouteIcon } from "lucide-react";

type Suggestion = { placeId: string; text: string };
type RouteOption = { id: number; distanceMiles: number; durationMinutes: number; encodedPolyline: string };

export default function TripPlanner() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [originSuggestions, setOriginSuggestions] = useState<Suggestion[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<Suggestion[]>([]);
  const [activeField, setActiveField] = useState<"origin" | "destination" | null>(null);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const routeLine = useRef<google.maps.Polyline | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);

  async function getSuggestions(value: string, field: "origin" | "destination") {
    if (value.trim().length < 3) {
      field === "origin" ? setOriginSuggestions([]) : setDestinationSuggestions([]);
      return;
    }
    try {
      const response = await fetch(`/api/maps/autocomplete?input=${encodeURIComponent(value)}`);
      const data = await response.json();
      const list = data.suggestions ?? [];
      field === "origin" ? setOriginSuggestions(list) : setDestinationSuggestions(list);
    } catch {
      // Autocomplete is optional; users can still type a complete address.
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeField === "origin") void getSuggestions(origin, "origin");
      if (activeField === "destination") void getSuggestions(destination, "destination");
    }, 300);
    return () => clearTimeout(timer);
  }, [origin, destination, activeField]);

  useEffect(() => {
    let cancelled = false;
    async function initMap() {
      const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!key || !mapRef.current) return;
      try {
        const loader = new Loader({ apiKey: key, version: "weekly" });
        const { Map } = await loader.importLibrary("maps") as google.maps.MapsLibrary;
        if (cancelled || !mapRef.current) return;
        mapInstance.current = new Map(mapRef.current, {
          center: { lat: 42.9634, lng: -85.6681 },
          zoom: 9,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
          styles: [
            { elementType: "geometry", stylers: [{ color: "#17212c" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#aeb9c7" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#17212c" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#344354" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c131c" }] },
            { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#8fa46a" }] }
          ]
        });
      } catch {
        setError("The Google map could not load. Check your browser API key and Maps JavaScript API activation.");
      }
    }
    void initMap();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    async function draw() {
      if (!mapInstance.current || !routes[selectedRoute]?.encodedPolyline) return;
      const { encoding } = await google.maps.importLibrary("geometry") as google.maps.GeometryLibrary;
      const path = encoding.decodePath(routes[selectedRoute].encodedPolyline);
      routeLine.current?.setMap(null);
      markers.current.forEach(m => m.setMap(null));
      routeLine.current = new google.maps.Polyline({
        path, map: mapInstance.current, geodesic: true,
        strokeColor: "#c9f36a", strokeOpacity: 0.95, strokeWeight: 5
      });
      const bounds = new google.maps.LatLngBounds();
      path.forEach(point => bounds.extend(point));
      mapInstance.current.fitBounds(bounds, 55);
    }
    void draw().catch(() => setError("The route was calculated, but its map line could not be displayed."));
  }, [routes, selectedRoute]);

  async function calculateRoute(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setRoutes([]);
    if (!origin.trim() || !destination.trim()) {
      setError("Please enter both a starting point and a destination.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/maps/route", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, destination })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to calculate route.");
      if (!data.routes?.length) throw new Error("No driving route was found for those locations.");
      setRoutes(data.routes);
      setSelectedRoute(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function choose(field: "origin" | "destination", item: Suggestion) {
    field === "origin" ? setOrigin(item.text) : setDestination(item.text);
    field === "origin" ? setOriginSuggestions([]) : setDestinationSuggestions([]);
    setActiveField(null);
  }

  const suggestions = activeField === "origin" ? originSuggestions : destinationSuggestions;
  return <div className="planner-wrap">
    <form className="planner-form" onSubmit={calculateRoute}>
      <label className="planner-field"><span><MapPin size={15}/> STARTING POINT</span>
        <input value={origin} onFocus={() => setActiveField("origin")} onChange={e => setOrigin(e.target.value)} placeholder="e.g. GVSU, Allendale" autoComplete="off"/>
      </label>
      <div className="planner-divider"></div>
      <label className="planner-field"><span><Navigation size={15}/> DESTINATION</span>
        <input value={destination} onFocus={() => setActiveField("destination")} onChange={e => setDestination(e.target.value)} placeholder="Where are you going?" autoComplete="off"/>
      </label>
      {activeField && suggestions.length > 0 && <div className="suggestions">{suggestions.map(s => <button type="button" key={s.placeId} onMouseDown={e => e.preventDefault()} onClick={() => choose(activeField, s)}><MapPin size={14}/>{s.text}</button>)}</div>}
      <button className="button button-primary planner-submit" disabled={loading}>{loading ? "Finding route..." : "Calculate route"} <ArrowUpRight size={17}/></button>
    </form>
    {error && <p className="planner-error">{error}</p>}
    <div className="map-panel">
      <div ref={mapRef} className="google-map"></div>
      {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && <div className="map-placeholder"><MapPin size={28}/><b>Google Maps setup required</b><span>Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local</span></div>}
      {routes.length > 0 && <div className="route-results">
        <div className="route-result-heading"><RouteIcon size={15}/> ROUTE OPTIONS ({routes.length})</div>
        {routes.map((r, i) => <button type="button" className={`route-option ${selectedRoute === i ? "active" : ""}`} key={r.id} onClick={() => setSelectedRoute(i)}>
          <span><b>{r.distanceMiles} mi</b><small><Clock3 size={12}/> {r.durationMinutes} min approx.</small></span><span>{selectedRoute === i ? "SELECTED" : "VIEW ROUTE"}</span>
        </button>)}
        <small className="map-attribution">Map and route data © Google</small>
      </div>}
    </div>
  </div>;
}
