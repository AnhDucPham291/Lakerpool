"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Profile = {
  id: string;
  name: string;
  email: string;
  studentVerified: boolean;
  phone: string | null;
  isDriver: boolean;
  vehicleName: string | null;
  vehicleColor: string | null;
  licensePlate: string | null;
};

export type TripStatus = "OPEN" | "ACCEPTED" | "COMPLETED" | "CANCELLED";

export type Trip = {
  id: string;
  origin: string;
  destination: string;
  distanceMiles: number;
  durationMinutes: number;
  departureAt: string;
  riders: number;
  totalFare: number;
  farePerRider: number;
  notes: string | null;
  status: TripStatus;
  acceptedAt: string | null;
  createdAt: string;
};

export type DriverContact = {
  id: string; name: string; email: string; phone: string | null; studentVerified: boolean;
  vehicleName: string | null; vehicleColor: string | null; licensePlate: string | null;
};

/** What a driver sees about a student; `phone` is only present after the driver accepts. */
export type RiderInfo = {
  id: string; name: string; email: string; studentVerified: boolean; createdAt: string;
  phone?: string | null;
  _count: { tripRequests: number };
};

export type RiderTrip = Trip & { driver: DriverContact | null };
export type DriverTrip = Trip & { rider: RiderInfo };

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
  }
}

/** JSON fetch (the session cookie is sent automatically); throws ApiError with the server's message. */
export async function apiFetch<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const hasBody = options.body !== undefined;
  const response = await fetch(path, {
    method: options.method ?? (hasBody ? "POST" : "GET"),
    headers: hasBody ? { "Content-Type": "application/json" } : {},
    body: hasBody ? JSON.stringify(options.body) : undefined,
    cache: "no-store"
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error ?? "Something went wrong. Please try again.", response.status, data.code);
  return data as T;
}

export const errorText = (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback;

/** The signed-in account for this browser (from the session cookie). */
export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    // Profiles used to be kept in localStorage; the session cookie replaces that.
    try { localStorage.removeItem("lakerpool-profile"); } catch { /* storage unavailable */ }
    apiFetch<{ user: Profile | null }>("/api/users/me")
      .then(({ user }) => setProfile(user))
      .catch((cause) => setLoadError(errorText(cause, "Could not load your account.")))
      .finally(() => setReady(true));
  }, []);

  const signOut = useCallback(async () => {
    try { await apiFetch("/api/auth/logout", { method: "POST" }); } catch { /* signed out locally either way */ }
    setProfile(null);
  }, []);

  return { profile, ready, loadError, setProfile, signOut };
}

/** Runs `callback` now and then every `intervalMs` while the tab is visible. */
export function usePolling(callback: () => unknown, intervalMs: number, enabled = true) {
  const latest = useRef(callback);
  useEffect(() => { latest.current = callback; });
  useEffect(() => {
    if (!enabled) return;
    void latest.current();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void latest.current();
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, enabled]);
}

export const money = (value: number) => `$${value.toFixed(2)}`;

export const when = (iso: string) => new Date(iso).toLocaleString([], {
  weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
});

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");

/** A Date as the value a datetime-local input expects, in the browser's time zone. */
export function localInputValue(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
