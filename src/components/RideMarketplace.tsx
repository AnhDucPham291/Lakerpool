"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowUpRight, CarFront, Clock3, MapPin, Users, Check, X, UserRound, RefreshCw } from "lucide-react";

type Profile = { id: string; name: string; email: string; studentVerified: boolean };
type Ride = {
  id: string; origin: string; destination: string; departureAt: string;
  pickupDetails: string; dropoffDetails: string; vehicleType: string;
  vehicleName?: string | null; vehicleColor?: string | null; seatsTotal: number;
  seatsAvailable: number; estimatedPrice: number; notes?: string | null;
  driver: { id: string; name: string; studentVerified: boolean };
};
type Booking = { id: string; rideId: string; seats: number; status: string; passenger: { name: string; studentVerified: boolean }; ride: Ride };

const emptyRide = { origin: "", destination: "", departureAt: "", pickupDetails: "", dropoffDetails: "", vehicleType: "Car", vehicleName: "", vehicleColor: "", seatsTotal: "3", estimatedPrice: "30", notes: "" };

export default function RideMarketplace() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tab, setTab] = useState<"find" | "post" | "manage">("find");
  const [rideForm, setRideForm] = useState(emptyRide);
  const [rides, setRides] = useState<Ride[]>([]);
  const [requests, setRequests] = useState<Booking[]>([]);
  const [filterOrigin, setFilterOrigin] = useState("");
  const [filterDestination, setFilterDestination] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("lakerpool-profile");
      if (stored) setProfile(JSON.parse(stored) as Profile);
    } catch { localStorage.removeItem("lakerpool-profile"); }
    void loadRides();
  }, []);

  function headers(json = false): HeadersInit {
    return { ...(json ? { "Content-Type": "application/json" } : {}), ...(profile ? { "x-user-id": profile.id } : {}) };
  }

  async function loadRides(origin = filterOrigin, destination = filterDestination) {
    setError("");
    try {
      const query = new URLSearchParams();
      if (origin.trim()) query.set("origin", origin.trim());
      if (destination.trim()) query.set("destination", destination.trim());
      const response = await fetch(`/api/rides?${query.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load rides.");
      setRides(data.rides ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load rides."); }
  }

  async function loadRequests() {
    if (!profile) return;
    const response = await fetch("/api/bookings?as=driver", { headers: headers() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Could not load booking requests.");
    setRequests(data.bookings ?? []);
  }

  async function createProfile(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not create profile.");
      const nextProfile = data.user as Profile;
      localStorage.setItem("lakerpool-profile", JSON.stringify(nextProfile)); setProfile(nextProfile);
      setNotice(`Welcome, ${nextProfile.name}. Your profile is ready for this browser.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create profile."); }
    finally { setBusy(false); }
  }

  async function postRide(event: FormEvent) {
    event.preventDefault(); if (!profile) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/rides", { method: "POST", headers: headers(true), body: JSON.stringify({
        ...rideForm, departureAt: new Date(rideForm.departureAt).toISOString(), seatsTotal: Number(rideForm.seatsTotal), estimatedPrice: Number(rideForm.estimatedPrice), stops: 0
      }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not publish this ride.");
      setNotice("Ride published. It is now visible in Find a ride."); setRideForm(emptyRide); await loadRides();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not publish this ride."); }
    finally { setBusy(false); }
  }

  async function requestSeat(ride: Ride) {
    if (!profile) { setError("Create your profile first to request a seat."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/bookings", { method: "POST", headers: headers(true), body: JSON.stringify({ rideId: ride.id, seats: 1 }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not request a seat.");
      setNotice("Seat request sent. The driver must accept it before your seat is confirmed.");
      await loadRides();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not request a seat."); }
    finally { setBusy(false); }
  }

  async function decide(booking: Booking, accept: boolean) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/bookings/${booking.id}/decision`, { method: "PATCH", headers: headers(true), body: JSON.stringify({ accept }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not update this request.");
      setNotice(accept ? "Request accepted; available seats have been updated." : "Request declined.");
      await loadRequests(); await loadRides();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update this request."); }
    finally { setBusy(false); }
  }

  async function changeTab(next: "find" | "post" | "manage") {
    setTab(next); setNotice(""); setError("");
    if (next === "manage" && profile) {
      try { await loadRequests(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load requests."); }
    }
  }

  return <section className="market-section" id="community-rides">
    <div className="market-heading"><div><div className="eyebrow dark">REAL RIDES · DATABASE POSTED</div><h2>Drive together.<br/><em>Get there for less.</em></h2></div><p>Drivers can publish a trip, and riders can request an open seat. Drivers confirm requests before a seat is reserved.</p></div>
    {!profile ? <form className="profile-form" onSubmit={createProfile}>
      <div className="market-form-title"><UserRound size={18}/><div><b>Create your rider/driver profile</b><small>Use a GVSU email to continue.</small></div></div>
      <label>Your name<input required minLength={2} value={name} onChange={e => setName(e.target.value)} placeholder="Full name" /></label>
      <label>GVSU email<input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@mail.gvsu.edu" /></label>
      <button className="button button-primary" disabled={busy}>{busy ? "Creating…" : "Create profile"}<ArrowUpRight size={16}/></button>
      <small className="market-disclaimer">MVP only: this profile form does not verify email ownership or provide secure sign-in.</small>
    </form> : <>
      <div className="market-user"><span><UserRound size={15}/>{profile.name} · {profile.email}</span><button type="button" onClick={() => { localStorage.removeItem("lakerpool-profile"); setProfile(null); setRequests([]); }}>Sign out</button></div>
      <div className="market-tabs" role="tablist" aria-label="Ride actions">
        <button type="button" className={tab === "find" ? "active" : ""} onClick={() => void changeTab("find")}>Find a ride</button>
        <button type="button" className={tab === "post" ? "active" : ""} onClick={() => void changeTab("post")}>Post a ride</button>
        <button type="button" className={tab === "manage" ? "active" : ""} onClick={() => void changeTab("manage")}>Driver requests</button>
      </div>
      {tab === "find" && <div className="market-content">
        <form className="ride-search" onSubmit={e => { e.preventDefault(); void loadRides(filterOrigin, filterDestination); }}>
          <label><MapPin size={14}/>From<input value={filterOrigin} onChange={e => setFilterOrigin(e.target.value)} placeholder="Allendale" /></label>
          <label><MapPin size={14}/>To<input value={filterDestination} onChange={e => setFilterDestination(e.target.value)} placeholder="Grand Rapids" /></label>
          <button className="button button-primary" type="submit"><RefreshCw size={14}/>Search</button>
        </form>
        <RideCards rides={rides} busy={busy} onRequest={requestSeat} currentUserId={profile.id}/>
      </div>}
      {tab === "post" && <form className="ride-post-form" onSubmit={postRide}>
        <div className="market-form-title"><CarFront size={18}/><div><b>Publish a driver trip</b><small>Price is the total trip fare, split across the listed seats.</small></div></div>
        <div className="market-fields">
          <label>Starting city<input required minLength={2} value={rideForm.origin} onChange={e => setRideForm({...rideForm, origin:e.target.value})} placeholder="Allendale, MI"/></label>
          <label>Destination<input required minLength={2} value={rideForm.destination} onChange={e => setRideForm({...rideForm, destination:e.target.value})} placeholder="Grand Rapids, MI"/></label>
          <label>Departure date and time<input required type="datetime-local" min={new Date(Date.now()+60000).toISOString().slice(0,16)} value={rideForm.departureAt} onChange={e => setRideForm({...rideForm, departureAt:e.target.value})}/></label>
          <label>Pickup details<input required minLength={2} value={rideForm.pickupDetails} onChange={e => setRideForm({...rideForm, pickupDetails:e.target.value})} placeholder="Main entrance / landmark"/></label>
          <label>Drop-off details<input required minLength={2} value={rideForm.dropoffDetails} onChange={e => setRideForm({...rideForm, dropoffDetails:e.target.value})} placeholder="Main entrance / landmark"/></label>
          <label>Vehicle type<select value={rideForm.vehicleType} onChange={e => setRideForm({...rideForm, vehicleType:e.target.value})}><option>Car</option><option>SUV</option><option>Van</option><option>Truck</option></select></label>
          <label>Vehicle make/model<input value={rideForm.vehicleName} onChange={e => setRideForm({...rideForm, vehicleName:e.target.value})} placeholder="Toyota Prius"/></label>
          <label>Vehicle color<input value={rideForm.vehicleColor} onChange={e => setRideForm({...rideForm, vehicleColor:e.target.value})} placeholder="Blue"/></label>
          <label>Open seats<input required type="number" min="1" max="8" value={rideForm.seatsTotal} onChange={e => setRideForm({...rideForm, seatsTotal:e.target.value})}/></label>
          <label>Total trip fare ($)<input required type="number" min="1" step="0.01" value={rideForm.estimatedPrice} onChange={e => setRideForm({...rideForm, estimatedPrice:e.target.value})}/></label>
        </div>
        <label className="market-wide">Trip notes (optional)<textarea rows={3} value={rideForm.notes} onChange={e => setRideForm({...rideForm, notes:e.target.value})} placeholder="Luggage, stops, accessibility notes…"/></label>
        <p className="fare-preview">Estimated split: ${(Number(rideForm.estimatedPrice || 0) / Math.max(1, Number(rideForm.seatsTotal || 1))).toFixed(2)} per seat, if all seats are filled.</p>
        <button className="button button-primary" disabled={busy}>{busy ? "Publishing…" : "Publish ride"}<ArrowUpRight size={16}/></button>
      </form>}
      {tab === "manage" && <div className="market-content"><h3>Pending seat requests for your trips</h3>{requests.length === 0 ? <p className="market-empty">No pending requests. Publish a trip to start receiving requests.</p> : requests.map(request => <article className="request-card" key={request.id}><div><b>{request.passenger.name}</b><small>{request.passenger.studentVerified ? "Verified student" : "Student profile · not verified"} · {request.seats} seat · {request.ride.origin} → {request.ride.destination}</small><small>{new Date(request.ride.departureAt).toLocaleString()} · ${request.ride.estimatedPrice.toFixed(2)} / seat</small></div><span className="request-actions"><button type="button" disabled={busy} onClick={() => void decide(request, true)} aria-label="Accept request"><Check size={16}/>Accept</button><button type="button" disabled={busy} onClick={() => void decide(request, false)} aria-label="Decline request"><X size={16}/>Decline</button></span></article>)}</div>}
    </>}
    {notice && <p className="market-notice" role="status">{notice}</p>}{error && <p className="market-error" role="alert">{error}</p>}
  </section>;
}

function RideCards({ rides, busy, onRequest, currentUserId }: { rides: Ride[]; busy: boolean; onRequest: (ride: Ride) => void; currentUserId: string }) {
  if (!rides.length) return <p className="market-empty">No rides found yet. Be the first driver to post one.</p>;
  return <div className="ride-card-list">{rides.map(ride => <article className="posted-ride-card" key={ride.id}>
    <div className="posted-ride-route"><span><MapPin size={14}/>{ride.origin}</span><span className="posted-route-line"/><span><MapPin size={14}/>{ride.destination}</span></div>
    <div className="posted-ride-info"><span><UserRound size={14}/>{ride.driver.name}{ride.driver.studentVerified ? " · Verified" : ""}</span><span><Clock3 size={14}/>{new Date(ride.departureAt).toLocaleString()}</span><span><CarFront size={14}/>{[ride.vehicleColor, ride.vehicleName || ride.vehicleType].filter(Boolean).join(" ")}</span><span><Users size={14}/>{ride.seatsAvailable} seats available</span></div>
    {ride.notes && <p>{ride.notes}</p>}
    <div className="posted-ride-bottom"><strong>${(ride.estimatedPrice / Math.max(1, ride.seatsTotal)).toFixed(2)} <small>/ person</small></strong>{currentUserId === ride.driver.id ? <span className="own-ride">Your ride</span> : <button className="button button-primary" type="button" disabled={busy || ride.seatsAvailable < 1} onClick={() => onRequest(ride)}>Request a seat<ArrowUpRight size={15}/></button>}</div>
  </article>)}</div>;
}
