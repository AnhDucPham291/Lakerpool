"use client";

import { FormEvent, useCallback, useState } from "react";
import { ArrowUpRight, MapPin, Navigation, RefreshCw } from "lucide-react";
import { MAX_RIDERS, tripFare } from "@/lib/fare";
import AppHeader from "./AppHeader";
import PlaceInput from "./PlaceInput";
import { AuthForm } from "./ProfileForms";
import type { LatLng } from "./TripMap";
import { DriverCard, LazyTripMap, StatusPill, TripChat, TripFare, TripRouteMap, TripSummary } from "./TripParts";
import { apiFetch, errorText, localInputValue, money, usePolling, useProfile, type Profile, type RiderTrip } from "./shared";
import "./clients.css";

export default function RiderApp() {
  const { profile, ready, loadError, setProfile, signOut } = useProfile();
  return <div className="app-shell">
    <AppHeader app="rider" profile={profile} onSignOut={() => void signOut()} />
    <main className="app-main">
      <section className="app-intro">
        <div className="eyebrow dark">RIDER APP</div>
        <h1 className="app-title">Need a ride? <em>Ask a driver.</em></h1>
        <p>Enter where you are and where you are going. Drivers see your route, the price, and your student profile before they accept. Once a driver accepts, you can message each other directly.</p>
      </section>
      {loadError && <p className="app-error" role="alert">{loadError}</p>}
      {!ready ? <p className="app-loading">Loading…</p>
        : !profile ? <AuthForm variant="rider" onDone={setProfile} />
        : <RiderDashboard profile={profile} />}
    </main>
  </div>;
}

function RiderDashboard({ profile }: { profile: Profile }) {
  const [trips, setTrips] = useState<RiderTrip[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadTrips = useCallback(async () => {
    try {
      const data = await apiFetch<{ trips: RiderTrip[] }>("/api/trips?view=rider");
      setTrips(data.trips);
    } catch (cause) { setError(errorText(cause, "Could not load your requests.")); }
    finally { setLoaded(true); }
  }, [profile.id]);
  usePolling(loadTrips, 8000);

  const changed = (message: string) => { setNotice(message); setError(""); void loadTrips(); };

  return <>
    <RequestForm onCreated={changed} />
    {notice && <p className="app-notice" role="status">{notice}</p>}
    {error && <p className="app-error" role="alert">{error}</p>}
    <section className="app-section">
      <div className="app-section-head">
        <h2>My ride requests</h2>
        <button type="button" className="app-button" onClick={() => void loadTrips()}><RefreshCw size={13} aria-hidden="true" />Refresh</button>
      </div>
      {!loaded ? <p className="app-loading">Loading your requests…</p>
        : trips.length === 0 ? <p className="app-empty">You have not requested a ride yet.</p>
        : <div className="trip-list">{trips.map((trip) => <RiderTripCard key={trip.id} trip={trip} profile={profile} onChanged={changed} onError={setError} />)}</div>}
    </section>
  </>;
}

type Quote = { origin: string; destination: string; distanceMiles: number; durationMinutes: number; path: LatLng[] };

function RequestForm({ onCreated }: { onCreated: (message: string) => void }) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departure, setDeparture] = useState(() => localInputValue(new Date(Date.now() + 60 * 60000)));
  const [riders, setRiders] = useState(1);
  const [notes, setNotes] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // The price shown must match the addresses currently typed in.
  const current = quote && quote.origin === origin.trim() && quote.destination === destination.trim() ? quote : null;
  const fare = current ? tripFare(current.distanceMiles, riders) : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      if (!current) {
        // Step 1: show the route and price before anything is sent to drivers.
        const data = await apiFetch<{ routes: { distanceMiles: number; durationMinutes: number; coordinates: LatLng[] }[] }>("/api/maps/route", {
          body: { origin: origin.trim(), destination: destination.trim() }
        });
        const [route] = data.routes;
        setQuote({ origin: origin.trim(), destination: destination.trim(), distanceMiles: route.distanceMiles, durationMinutes: route.durationMinutes, path: route.coordinates });
        return;
      }
      // Step 2: send the request. The server recalculates the price itself.
      const data = await apiFetch<{ message: string }>("/api/trips", {
        body: { origin: current.origin, destination: current.destination, departureAt: new Date(departure).toISOString(), riders, notes: notes.trim() || undefined }
      });
      setOrigin(""); setDestination(""); setNotes(""); setQuote(null);
      onCreated(data.message);
    } catch (cause) { setError(errorText(cause, "Something went wrong. Please try again.")); }
    finally { setBusy(false); }
  }

  return <div className="request-layout">
    <form className="app-card app-form" onSubmit={submit}>
      <div className="app-form-title"><Navigation size={18} aria-hidden="true" /><div><b>Request a ride</b><small>Check the route and price, then send it to drivers.</small></div></div>
      <PlaceInput label="Pickup" icon={<MapPin size={13} aria-hidden="true" />} value={origin} onChange={setOrigin} placeholder="e.g. Kirkhof Center, Allendale" />
      <PlaceInput label="Drop-off" icon={<Navigation size={13} aria-hidden="true" />} value={destination} onChange={setDestination} placeholder="Where are you going?" />
      <div className="app-form-grid">
        <label className="app-field">Departure time<input required type="datetime-local" min={localInputValue(new Date())} value={departure} onChange={(e) => setDeparture(e.target.value)} /></label>
        <label className="app-field">People riding (split the fare)
          <select value={riders} onChange={(e) => setRiders(Number(e.target.value))}>
            {Array.from({ length: MAX_RIDERS }, (_, i) => i + 1).map((count) => <option key={count} value={count}>{count} {count === 1 ? "person (just me)" : "people"}</option>)}
          </select>
        </label>
      </div>
      <label className="app-field">Note for the driver <span className="app-hint">(optional)</span><textarea rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Luggage, exact pickup spot, accessibility needs…" /></label>
      {current && fare && <div className="quote" aria-live="polite">
        <div><small>DISTANCE</small><b>{current.distanceMiles} mi</b><span>about {current.durationMinutes} min</span></div>
        <div><small>{riders > 1 ? "YOUR SHARE" : "ESTIMATED FARE"}</small><b>{money(fare.perRider)}</b><span>{riders > 1 ? `${money(fare.total)} total ÷ ${riders} people` : "paid to the driver"}</span></div>
      </div>}
      <button className="app-button primary" disabled={busy}>
        {busy ? (current ? "Sending…" : "Checking route…") : current ? "Send request to drivers" : "See route & price"}<ArrowUpRight size={16} aria-hidden="true" />
      </button>
      {error && <p className="app-error" role="alert">{error}</p>}
      <small className="app-hint">Fare estimate: $4.50 base + $1.45 per mile. No payment is collected in this demo.</small>
    </form>
    <div className="trip-map">
      {current ? <LazyTripMap path={current.path} origin={current.origin} destination={current.destination} />
        : <div className="trip-map-empty"><MapPin size={22} aria-hidden="true" /><b>Your route appears here</b><span>Enter a pickup and drop-off, then choose “See route &amp; price”.</span></div>}
    </div>
  </div>;
}

function RiderTripCard({ trip, profile, onChanged, onError }: {
  trip: RiderTrip;
  profile: Profile;
  onChanged: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [showRoute, setShowRoute] = useState(false);
  const [busy, setBusy] = useState(false);
  const active = trip.status === "OPEN" || trip.status === "ACCEPTED";

  async function cancel() {
    if (!window.confirm(trip.status === "ACCEPTED" ? "A driver already accepted this trip. Cancel it anyway?" : "Cancel this ride request?")) return;
    setBusy(true);
    try {
      const data = await apiFetch<{ message: string }>(`/api/trips/${trip.id}`, { method: "PATCH", body: { action: "cancel" } });
      onChanged(data.message);
    } catch (cause) { onError(errorText(cause, "Could not cancel this request.")); }
    finally { setBusy(false); }
  }

  return <article className={`trip-card${active ? "" : " muted"}`}>
    <div className="trip-card-top">
      <div className="trip-card-status">
        <StatusPill status={trip.status} />
        {trip.status === "OPEN" && <small>Drivers can see this request. This page updates automatically.</small>}
      </div>
      <TripFare trip={trip} perspective="rider" />
    </div>
    <TripSummary trip={trip} />
    {trip.driver && (trip.status === "ACCEPTED" || trip.status === "COMPLETED") && <DriverCard driver={trip.driver} />}
    {trip.driver && trip.status === "ACCEPTED" && <TripChat tripId={trip.id} profile={profile} otherName={trip.driver.name} canSend />}
    {showRoute && <TripRouteMap trip={trip} />}
    <div className="trip-actions">
      <button type="button" className="app-button" onClick={() => setShowRoute((value) => !value)}>{showRoute ? "Hide route" : "Show route"}</button>
      {active && <button type="button" className="app-button danger" disabled={busy} onClick={() => void cancel()}>Cancel request</button>}
    </div>
  </article>;
}
