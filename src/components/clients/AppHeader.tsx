"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import type { Profile } from "./shared";

export default function AppHeader({ app, profile, onSignOut }: {
  app: "rider" | "driver";
  profile: Profile | null;
  onSignOut: () => void;
}) {
  return <header className="app-header">
    <Link className="brand" href="/"><span className="brand-mark">LP</span><span>LAKER<span className="brand-light">POOL</span></span></Link>
    <span className="app-badge">{app === "rider" ? "RIDER" : "DRIVER"}</span>
    <nav className="app-switch" aria-label="Switch app">
      <Link href="/rider" className={app === "rider" ? "active" : ""} aria-current={app === "rider" ? "page" : undefined}>Rider app</Link>
      <Link href="/driver" className={app === "driver" ? "active" : ""} aria-current={app === "driver" ? "page" : undefined}>Driver app</Link>
    </nav>
    {profile && <div className="app-user">
      <UserRound size={14} aria-hidden="true" /><span>{profile.name}</span>
      <button type="button" onClick={onSignOut}>Sign out</button>
    </div>}
  </header>;
}
