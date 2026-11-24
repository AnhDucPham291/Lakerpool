"use client";

import { FormEvent, useState } from "react";
import { ArrowUpRight, CarFront, Eye, EyeOff, LogIn, UserRound } from "lucide-react";
import { ApiError, apiFetch, errorText, type Profile } from "./shared";

type Vehicle = { vehicleName: string; vehicleColor: string; licensePlate: string };
const emptyVehicle: Vehicle = { vehicleName: "", vehicleColor: "", licensePlate: "" };

function VehicleFields({ value, onChange }: { value: Vehicle; onChange: (next: Vehicle) => void }) {
  return <>
    <label className="app-field">Vehicle make and model<input required minLength={2} maxLength={60} value={value.vehicleName} onChange={(e) => onChange({ ...value, vehicleName: e.target.value })} placeholder="Toyota Prius" /></label>
    <label className="app-field">Vehicle color<input required minLength={2} maxLength={30} value={value.vehicleColor} onChange={(e) => onChange({ ...value, vehicleColor: e.target.value })} placeholder="Blue" /></label>
    <label className="app-field">License plate<input required minLength={2} maxLength={12} value={value.licensePlate} onChange={(e) => onChange({ ...value, licensePlate: e.target.value })} placeholder="ABC 1234" /></label>
  </>;
}

const signupTitles = { rider: "Create your rider account", driver: "Create your driver account", account: "Create your LakerPool account" };

/**
 * Create an account or sign in. One account works in the rider app, the driver app, and on the home page.
 * If the email is already registered, the form switches to sign-in and keeps what was typed.
 */
export function AuthForm({ variant, onDone }: { variant: "rider" | "driver" | "account"; onDone: (profile: Profile) => void }) {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState(emptyVehicle);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const signup = mode === "signup";
  const withVehicle = signup && variant === "driver";

  function switchMode(next: "signup" | "signin", message = "") {
    setMode(next); setError(""); setNotice(message);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const { user } = signup
        ? await apiFetch<{ user: Profile }>("/api/users", { body: { name, email, password, phone, ...(withVehicle ? { driver: vehicle } : {}) } })
        : await apiFetch<{ user: Profile }>("/api/auth/login", { body: { email, password } });
      onDone(user);
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "EMAIL_TAKEN") switchMode("signin", "This email already has an account. Enter your password to sign in.");
      else if (cause instanceof ApiError && cause.code === "SET_PASSWORD") switchMode("signup", "Create your account again with this email to set a password.");
      else setError(errorText(cause, signup ? "Could not create your account." : "Could not sign you in."));
    } finally { setBusy(false); }
  }

  return <form className="app-card app-form" onSubmit={submit}>
    <div className="app-form-title">{signup ? (variant === "driver" ? <CarFront size={18} aria-hidden="true" /> : <UserRound size={18} aria-hidden="true" />) : <LogIn size={18} aria-hidden="true" />}<div>
      <b>{signup ? signupTitles[variant] : "Sign in to LakerPool"}</b>
      <small>{signup ? "Use your GVSU email. One account works in the rider app, the driver app, and on the home page." : "Use the GVSU email and password you signed up with."}</small>
    </div></div>
    {notice && <p className="app-notice" role="status">{notice}</p>}
    <div className="app-form-grid">
      {signup && <label className="app-field">Full name<input required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Student" /></label>}
      <label className="app-field">GVSU email<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@mail.gvsu.edu" /></label>
      <label className="app-field">Password{signup && <span className="app-hint">(at least 8 characters)</span>}
        <span className="password-input">
          <input required type={showPassword ? "text" : "password"} minLength={signup ? 8 : 1} maxLength={128}
            autoComplete={signup ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
          </button>
        </span>
      </label>
      {signup && <label className="app-field">Phone number <span className="app-hint">(optional, shared only after a trip is accepted)</span><input type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(616) 555-0123" /></label>}
      {withVehicle && <VehicleFields value={vehicle} onChange={setVehicle} />}
    </div>
    <button className="app-button primary" disabled={busy}>
      {busy ? (signup ? "Creating account…" : "Signing in…") : signup ? "Create account" : "Sign in"}<ArrowUpRight size={16} aria-hidden="true" />
    </button>
    {error && <p className="app-error" role="alert">{error}</p>}
    <p className="auth-switch">
      {signup ? "Already have an account?" : "New to LakerPool?"}{" "}
      <button type="button" onClick={() => switchMode(signup ? "signin" : "signup")}>{signup ? "Sign in" : "Create an account"}</button>
    </p>
  </form>;
}

/** For a signed-in user who does not drive yet. */
export function VehicleForm({ profile, onDone }: { profile: Profile; onDone: (profile: Profile) => void }) {
  const [vehicle, setVehicle] = useState(emptyVehicle);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const { user } = await apiFetch<{ user: Profile }>("/api/users/me", { method: "PATCH", body: { phone, driver: vehicle } });
      onDone(user);
    } catch (cause) { setError(errorText(cause, "Could not save your vehicle.")); }
    finally { setBusy(false); }
  }

  return <form className="app-card app-form" onSubmit={submit}>
    <div className="app-form-title"><CarFront size={18} aria-hidden="true" /><div>
      <b>Add your vehicle to start driving</b>
      <small>Signed in as {profile.name} ({profile.email}).</small>
    </div></div>
    <div className="app-form-grid">
      <VehicleFields value={vehicle} onChange={setVehicle} />
      <label className="app-field">Phone number <span className="app-hint">(optional, shared only after you accept a trip)</span><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(616) 555-0123" /></label>
    </div>
    <button className="app-button primary" disabled={busy}>{busy ? "Saving…" : "Start driving"}<ArrowUpRight size={16} aria-hidden="true" /></button>
    {error && <p className="app-error" role="alert">{error}</p>}
  </form>;
}
