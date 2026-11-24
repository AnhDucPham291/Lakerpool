"use client";

import dynamic from "next/dynamic";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, CarFront, Clock3, Mail, MessageCircle, Phone, Route as RouteIcon, Send, ShieldAlert, Users } from "lucide-react";
import type { LatLng } from "./TripMap";
import { apiFetch, errorText, initials, money, usePolling, when, type DriverContact, type Profile, type RiderInfo, type Trip, type TripStatus } from "./shared";

/** Leaflet needs the browser, so the map is never server-rendered. */
export const LazyTripMap = dynamic(() => import("./TripMap"), {
  ssr: false,
  loading: () => <div className="trip-map-empty">Loading map…</div>
});

const statusLabels: Record<TripStatus, string> = {
  OPEN: "Waiting for a driver",
  ACCEPTED: "Driver confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled"
};

export function StatusPill({ status }: { status: TripStatus }) {
  return <span className={`status-pill ${status.toLowerCase()}`}>{statusLabels[status]}</span>;
}

/** Pickup → drop-off, departure time, distance, and group size. */
export function TripSummary({ trip }: { trip: Trip }) {
  return <>
    <div className="trip-route">
      <span className="dot start" aria-hidden="true" /><div><small>PICKUP</small><b>{trip.origin}</b></div>
      <span className="dot end" aria-hidden="true" /><div><small>DROP-OFF</small><b>{trip.destination}</b></div>
    </div>
    <div className="trip-facts">
      <span><Clock3 size={13} aria-hidden="true" />{when(trip.departureAt)}</span>
      <span><RouteIcon size={13} aria-hidden="true" />{trip.distanceMiles} mi · about {trip.durationMinutes} min</span>
      <span><Users size={13} aria-hidden="true" />{trip.riders} {trip.riders === 1 ? "rider" : "riders"}</span>
    </div>
    {trip.notes && <p className="trip-notes">“{trip.notes}”</p>}
  </>;
}

/** The fare: the driver sees the total first, the rider sees their share first. */
export function TripFare({ trip, perspective }: { trip: Trip; perspective: "rider" | "driver" }) {
  if (perspective === "driver") return <div className="trip-fare">
    <b>{money(trip.totalFare)}</b>
    <small>trip fare{trip.riders > 1 ? ` · ${money(trip.farePerRider)} × ${trip.riders} riders` : ""}</small>
  </div>;
  return <div className="trip-fare">
    <b>{money(trip.farePerRider)}</b>
    <small>{trip.riders > 1 ? `per person · ${money(trip.totalFare)} total` : "estimated fare"}</small>
  </div>;
}

/** Student details a driver reviews before accepting; contact details appear once accepted. */
export function RiderCard({ rider }: { rider: RiderInfo }) {
  const completed = rider._count.tripRequests;
  return <div className="person-card">
    <div className="person-avatar" aria-hidden="true">{initials(rider.name)}</div>
    <div>
      <div className="person-label">STUDENT</div>
      <b>{rider.name}</b>
      <div className="person-meta">
        {rider.studentVerified
          ? <span className="verified"><BadgeCheck size={13} aria-hidden="true" />Verified student</span>
          : <span className="unverified"><ShieldAlert size={13} aria-hidden="true" />Student email not verified</span>}
        <span><Mail size={13} aria-hidden="true" /><a href={`mailto:${rider.email}`}>{rider.email}</a></span>
        {rider.phone && <span><Phone size={13} aria-hidden="true" /><a href={`tel:${rider.phone}`}>{rider.phone}</a></span>}
        <span>{completed} completed {completed === 1 ? "trip" : "trips"}</span>
        <span>Member since {new Date(rider.createdAt).toLocaleDateString([], { month: "short", year: "numeric" })}</span>
      </div>
    </div>
  </div>;
}

export function DriverCard({ driver }: { driver: DriverContact }) {
  const vehicle = [driver.vehicleColor, driver.vehicleName].filter(Boolean).join(" ");
  return <div className="person-card">
    <div className="person-avatar" aria-hidden="true">{initials(driver.name)}</div>
    <div>
      <div className="person-label">YOUR DRIVER</div>
      <b>{driver.name}</b>
      <div className="person-meta">
        {vehicle && <span><CarFront size={13} aria-hidden="true" />{vehicle}{driver.licensePlate ? ` · ${driver.licensePlate}` : ""}</span>}
        {driver.phone && <span><Phone size={13} aria-hidden="true" /><a href={`tel:${driver.phone}`}>{driver.phone}</a></span>}
        <span><Mail size={13} aria-hidden="true" /><a href={`mailto:${driver.email}`}>{driver.email}</a></span>
      </div>
    </div>
  </div>;
}

/** Loads a saved trip's route and shows it on the map. */
export function TripRouteMap({ trip }: { trip: Trip }) {
  const [path, setPath] = useState<LatLng[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    apiFetch<{ trip: { routePath: LatLng[] } }>(`/api/trips/${trip.id}`)
      .then((data) => { if (active) setPath(data.trip.routePath); })
      .catch((cause) => { if (active) setError(errorText(cause, "Could not load the route.")); });
    return () => { active = false; };
  }, [trip.id]);
  return <div className="trip-route-map">
    {path ? <LazyTripMap path={path} origin={trip.origin} destination={trip.destination} />
      : <div className="trip-map-empty">{error || "Loading route…"}</div>}
  </div>;
}

type ChatMessage = { id: string; body: string; createdAt: string; sender: { id: string; name: string } };

/** Direct messages between the rider and the accepted driver. Refreshes every few seconds. */
export function TripChat({ tripId, profile, otherName, canSend }: { tripId: string; profile: Profile; otherName: string; canSend: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ messages: ChatMessage[] }>(`/api/trips/${tripId}/messages`);
      setMessages(data.messages);
      setError("");
    } catch (cause) { setError(errorText(cause, "Could not load messages.")); }
  }, [tripId]);
  usePolling(load, 4000);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    try {
      const data = await apiFetch<{ message: ChatMessage }>(`/api/trips/${tripId}/messages`, { body: { body } });
      setMessages((current) => [...current, data.message]);
      setDraft("");
      setError("");
    } catch (cause) { setError(errorText(cause, "Could not send your message.")); }
    finally { setSending(false); }
  }

  return <div className="trip-chat">
    <div className="trip-chat-head"><MessageCircle size={14} aria-hidden="true" />Chat with {otherName}</div>
    <div className="trip-chat-list" ref={listRef} aria-live="polite">
      {messages.length === 0 && <p className="trip-chat-empty">No messages yet. Say hi and confirm the pickup spot.</p>}
      {messages.map((message) => {
        const mine = message.sender.id === profile.id;
        return <div key={message.id} className={`chat-bubble${mine ? " mine" : ""}`}>
          {message.body}
          <small>{mine ? "You" : message.sender.name} · {new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small>
        </div>;
      })}
    </div>
    {canSend && <form className="trip-chat-form" onSubmit={send}>
      <input value={draft} maxLength={1000} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message…" aria-label="Message" />
      <button className="app-button primary" disabled={sending || !draft.trim()} aria-label="Send message"><Send size={14} aria-hidden="true" /></button>
    </form>}
    {error && <p className="app-error" role="alert">{error}</p>}
  </div>;
}
