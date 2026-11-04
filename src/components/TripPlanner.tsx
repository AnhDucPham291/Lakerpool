"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ArrowUpRight, MapPin, Navigation, Clock3, Route as RouteIcon, Sparkles, CarFront, Star, Users } from "lucide-react";

type Suggestion = { placeId: string; text: string };
export type RouteOption = {
  id: number;
  distanceMiles: number;
  durationMinutes: number;
  coordinates: [number, number][];
};
export type DriverCandidate = {
  name: string;
  vehicle: string;
  color: string;
  coordinates: [number, number];
  rating: number;
  ratingCount: number;
  baseFare: number;
  ratePerMile: number;
  pickupDistanceMiles: number;
  etaMinutes: number;
  simulated: true;
};

const RouteMap = dynamic(() => import("./RouteMap"), { ssr: false });

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
  const [driverMatches, setDriverMatches] = useState<DriverCandidate[]>([]);
  const [matchingDriver, setMatchingDriver] = useState(false);
  const [driverSearchError, setDriverSearchError] = useState("");
  const [shareRide, setShareRide] = useState(true);
  const [riderCount, setRiderCount] = useState(2);

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
      // Suggestions are optional; users can still enter a complete address.
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeField === "origin") void getSuggestions(origin, "origin");
      if (activeField === "destination") void getSuggestions(destination, "destination");
    }, 350);
    return () => clearTimeout(timer);
  }, [origin, destination, activeField]);

  async function calculateRoute(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setRoutes([]);
    setDriverMatches([]);
    setDriverSearchError("");
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
      setMatchingDriver(true);
      try {
        const matchResponse = await fetch("/api/drivers/dispatch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pickup: data.routes[0].coordinates[0] })
        });
        const matchData = await matchResponse.json();
        if (!matchResponse.ok) throw new Error(matchData.error ?? "Driver suggestions are unavailable.");
        setDriverMatches(Array.isArray(matchData.drivers) ? matchData.drivers : []);
      } catch {
        setDriverSearchError("Nearby driver suggestions could not be loaded.");
      } finally {
        setMatchingDriver(false);
      }
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
  const soloFare = (driver: DriverCandidate) => driver.baseFare + driver.ratePerMile * (routes[selectedRoute]?.distanceMiles ?? 0);
  const estimateFare = (driver: DriverCandidate) => (shareRide ? soloFare(driver) / riderCount : soloFare(driver)).toFixed(2);
  const savingsPercent = Math.round((1 - 1 / riderCount) * 100);
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
      {routes[selectedRoute] && <div className="route-distance-summary" aria-live="polite">
        <span><RouteIcon size={16}/> ROUTE DISTANCE</span>
        <strong>{routes[selectedRoute].distanceMiles} miles</strong>
        <small>About {routes[selectedRoute].durationMinutes} minutes by car</small>
      </div>}
      {routes[selectedRoute] && <section className="ride-share-controls" aria-label="Ride pricing options">
        <div className="ride-share-heading"><span>CHOOSE HOW TO RIDE</span><small>Shared rides cost less per person</small></div>
        <div className="ride-mode-options">
          <button type="button" className={shareRide ? "active" : ""} aria-pressed={shareRide} onClick={() => setShareRide(true)}>
            <Users size={16}/><span><b>Share ride</b><small>Split the trip price</small></span>
          </button>
          <button type="button" className={!shareRide ? "active" : ""} aria-pressed={!shareRide} onClick={() => setShareRide(false)}>
            <CarFront size={16}/><span><b>Ride solo</b><small>One rider pays full fare</small></span>
          </button>
        </div>
        {shareRide && <label className="rider-count-control">People sharing, including you
          <select value={riderCount} onChange={(event) => setRiderCount(Number(event.target.value))}>
            {[2, 3, 4].map((count) => <option key={count} value={count}>{count} people</option>)}
          </select>
        </label>}
      </section>}
      {matchingDriver && <div className="driver-match-card" aria-live="polite"><Sparkles size={17}/><span><b>Finding nearby demo drivers…</b><small>Ranking sample profiles by pickup distance</small></span></div>}
      {driverSearchError && <p className="planner-error">{driverSearchError}</p>}
      {driverMatches.length > 0 && <section className="driver-list" aria-live="polite" aria-label="Nearby demo drivers">
        <div className="driver-list-heading"><Sparkles size={15}/><span>NEARBY DRIVER SUGGESTIONS</span><small>DEMO</small></div>
        {driverMatches.map((driver) => <article className="driver-card" key={driver.name}>
          <div className="driver-avatar" aria-hidden="true">{driver.name.split(" ").map((part) => part[0]).join("")}</div>
          <div className="driver-card-main">
            <div className="driver-card-title"><strong>{driver.name}</strong><b>${estimateFare(driver)}{shareRide && <small> / person</small>}</b></div>
            <small className="fare-label">{shareRide ? "estimated shared price per person" : "estimated solo trip price"}</small>
            {shareRide && <small className="fare-savings">Solo ${soloFare(driver).toFixed(2)} · save {savingsPercent}% per person</small>}
            <span><CarFront size={13}/> {driver.color} {driver.vehicle}</span>
            <span className="driver-rating"><Star size={13} fill="currentColor"/> {driver.rating.toFixed(1)} <small>({driver.ratingCount} sample ratings)</small></span>
            <small>{driver.pickupDistanceMiles} mi from pickup · approx. {driver.etaMinutes} min away</small>
          </div>
        </article>)}
        <p className="driver-demo-note">Estimated solo fare = $4.50 base + driver’s per-mile rate × {routes[selectedRoute]?.distanceMiles ?? 0} mi. Shared price divides that fare among {riderCount} riders. Demo estimate only: other real riders are not matched yet, and no ride is booked.</p>
      </section>}
    </form>
    {error && <p className="planner-error">{error}</p>}
    <div className="map-panel">
      <RouteMap routes={routes} selectedRoute={selectedRoute} drivers={driverMatches} shareRide={shareRide} riderCount={riderCount}/>
      {routes.length > 0 && <div className="route-results">
        <div className="route-result-heading"><RouteIcon size={15}/> ROUTE OPTIONS ({routes.length})</div>
        {routes.map((r, i) => <button type="button" className={`route-option ${selectedRoute === i ? "active" : ""}`} key={r.id} onClick={() => setSelectedRoute(i)}>
          <span><b>{r.distanceMiles} mi</b><small><Clock3 size={12}/> {r.durationMinutes} min approx.</small></span><span>{selectedRoute === i ? "SELECTED" : "VIEW ROUTE"}</span>
        </button>)}
        <small className="map-attribution">Routes © openrouteservice · Map © OpenStreetMap</small>
      </div>}
    </div>
  </div>;
}
