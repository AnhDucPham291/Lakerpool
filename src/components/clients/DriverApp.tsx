"use client";

import { useCallback, useState } from "react";
import { Check, RefreshCw } from "lucide-react";
import AppHeader from "./AppHeader";
import { AuthForm, VehicleForm } from "./ProfileForms";
import { RiderCard, StatusPill, TripChat, TripFare, TripRouteMap, TripSummary } from "./TripParts";
import { apiFetch, errorText, money, usePolling, useProfile, when, type DriverTrip, type Profile } from "./shared";
import "./clients.css";

export default function DriverApp() {
  const { profile, ready, loadError, setProfile, signOut } = useProfile();
  return <div className="app-shell">
    <AppHeader app="driver" profile={profile} onSignOut={() => void signOut()} />
    <main className="app-main">
      <section className="app-intro">
        <div className="eyebrow dark">DRIVER APP</div>
        <h1 className="app-title">Drive students. <em>Share the cost.</em></h1>
        <p>See ride requests from GVSU students. Each request shows the pickup and drop-off, the fare, and the student’s profile, so you can decide before you accept.</p>
      </section>
      {loadError && <p className="app-error" role="alert">{loadError}</p>}
      {!ready ? <p className="app-loading">Loading…</p>
        : !profile ? <AuthForm variant="driver" onDone={setProfile} />
        : !profile.isDriver ? <VehicleForm profile={profile} onDone={setProfile} />
        : <DriverDashboard profile={profile} />}
    </main>
  </div>;
}

type Action = "accept" | "release" | "complete";

function DriverDashboard({ profile }: { profile: Profile }) {
  const [tab, setTab] = useState<"requests" | "trips">("requests");
  const [openTrips, setOpenTrips] = useState<DriverTrip[]>([]);
  const [myTrips, setMyTrips] = useState<DriverTrip[]>([]);
  const [loaded, setLoaded] = useState({ open: false, mine: false });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadOpen = useCallback(async () => {
    try {
      const data = await apiFetch<{ trips: DriverTrip[] }>("/api/trips?view=open");
      setOpenTrips(data.trips);
    } catch (cause) { setError(errorText(cause, "Could not load ride requests.")); }
    finally { setLoaded((value) => ({ ...value, open: true })); }
  }, [profile.id]);
  const loadMine = useCallback(async () => {
    try {
      const data = await apiFetch<{ trips: DriverTrip[] }>("/api/trips?view=driver");
      setMyTrips(data.trips);
    } catch (cause) { setError(errorText(cause, "Could not load your trips.")); }
    finally { setLoaded((value) => ({ ...value, mine: true })); }
  }, [profile.id]);
  usePolling(loadOpen, 10000);
  usePolling(loadMine, 10000);

  async function act(trip: DriverTrip, action: Action, question: string) {
    if (!window.confirm(question)) return;
    setBusyId(trip.id); setError(""); setNotice("");
    try {
      const data = await apiFetch<{ message: string }>(`/api/trips/${trip.id}`, { method: "PATCH", body: { action } });
      setNotice(data.message);
      if (action === "accept") setTab("trips");
    } catch (cause) { setError(errorText(cause, "Could not update this trip.")); }
    finally {
      setBusyId(null);
      await Promise.all([loadOpen(), loadMine()]);
    }
  }

  const activeCount = myTrips.filter((trip) => trip.status === "ACCEPTED").length;
  const list = tab === "requests" ? openTrips : myTrips;
  const isLoaded = tab === "requests" ? loaded.open : loaded.mine;

  return <section>
    <div className="app-section-head">
      <div className="app-tabs" role="tablist" aria-label="Driver views">
        <button type="button" role="tab" aria-selected={tab === "requests"} className={tab === "requests" ? "active" : ""} onClick={() => setTab("requests")}>
          Ride requests <span className="tab-count">{openTrips.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === "trips"} className={tab === "trips" ? "active" : ""} onClick={() => setTab("trips")}>
          My trips <span className="tab-count">{activeCount}</span>
        </button>
      </div>
      <button type="button" className="app-button" onClick={() => void Promise.all([loadOpen(), loadMine()])}><RefreshCw size={13} aria-hidden="true" />Refresh</button>
    </div>
    {notice && <p className="app-notice" role="status">{notice}</p>}
    {error && <p className="app-error" role="alert">{error}</p>}
    {!isLoaded ? <p className="app-loading">Loading…</p>
      : list.length === 0 ? <p className="app-empty">{tab === "requests" ? "No open ride requests right now. This list updates automatically." : "You have not accepted any trips yet."}</p>
      : <div className="trip-list">{list.map((trip) => tab === "requests"
        ? <RequestCard key={trip.id} trip={trip} profile={profile} busy={busyId === trip.id}
            onAccept={() => void act(trip, "accept", `Accept the trip from ${trip.origin} to ${trip.destination} on ${when(trip.departureAt)} for ${money(trip.totalFare)}?`)} />
        : <MyTripCard key={trip.id} trip={trip} profile={profile} busy={busyId === trip.id}
            onAction={(action, question) => void act(trip, action, question)} />)}</div>}
  </section>;
}

/** An open request: everything the driver needs to decide, plus the Accept button. */
function RequestCard({ trip, profile, busy, onAccept }: { trip: DriverTrip; profile: Profile; busy: boolean; onAccept: () => void }) {
  const [showRoute, setShowRoute] = useState(false);
  return <article className="trip-card">
    <div className="trip-card-top">
      <div className="trip-card-status"><span className="trip-card-label">RIDE REQUEST</span></div>
      <TripFare trip={trip} perspective="driver" />
    </div>
    <TripSummary trip={trip} />
    <RiderCard rider={trip.rider} />
    {showRoute && <TripRouteMap trip={trip} />}
    <div className="trip-actions">
      <button type="button" className="app-button" onClick={() => setShowRoute((value) => !value)}>{showRoute ? "Hide route" : "Show route on map"}</button>
      <button type="button" className="app-button primary" disabled={busy} onClick={onAccept}><Check size={15} aria-hidden="true" />{busy ? "Accepting…" : `Accept · ${money(trip.totalFare)}`}</button>
    </div>
  </article>;
}

/** A trip this driver accepted: rider contact details, chat, and trip controls. */
function MyTripCard({ trip, profile, busy, onAction }: {
  trip: DriverTrip;
  profile: Profile;
  busy: boolean;
  onAction: (action: Action, question: string) => void;
}) {
  const [showRoute, setShowRoute] = useState(false);
  const active = trip.status === "ACCEPTED";
  return <article className={`trip-card${active ? "" : " muted"}`}>
    <div className="trip-card-top">
      <div className="trip-card-status">
        <StatusPill status={trip.status} />
        {trip.status === "CANCELLED" && <small>The rider cancelled this trip.</small>}
      </div>
      <TripFare trip={trip} perspective="driver" />
    </div>
    <TripSummary trip={trip} />
    <RiderCard rider={trip.rider} />
    {active && <TripChat tripId={trip.id} profile={profile} otherName={trip.rider.name} canSend />}
    {showRoute && <TripRouteMap trip={trip} />}
    <div className="trip-actions">
      <button type="button" className="app-button" onClick={() => setShowRoute((value) => !value)}>{showRoute ? "Hide route" : "Show route on map"}</button>
      {active && <>
        <button type="button" className="app-button danger" disabled={busy}
          onClick={() => onAction("release", "Give this trip back so another driver can accept it? Your chat with the rider will be deleted.")}>Release trip</button>
        <button type="button" className="app-button primary" disabled={busy}
          onClick={() => onAction("complete", "Mark this trip as completed?")}><Check size={15} aria-hidden="true" />Mark completed</button>
      </>}
    </div>
  </article>;
}
