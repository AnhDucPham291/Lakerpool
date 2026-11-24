"use client";

import { ReactNode, useEffect, useState } from "react";
import { MapPin } from "lucide-react";

type Suggestion = { placeId: string; text: string };

/** Text input with place suggestions from /api/maps/autocomplete. */
export default function PlaceInput({ label, icon, value, onChange, placeholder }: {
  label: string;
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused || value.trim().length < 3) { setSuggestions([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/maps/autocomplete?input=${encodeURIComponent(value)}`, { signal: controller.signal });
        const data = await response.json();
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      } catch { /* Suggestions are optional; a typed address still works. */ }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [value, focused]);

  return <div className="place-field">
    <label className="app-field"><span>{icon}{label}</span>
      <input required minLength={3} maxLength={300} value={value} placeholder={placeholder} autoComplete="off"
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        onChange={(e) => { onChange(e.target.value); setFocused(true); }} />
    </label>
    {focused && suggestions.length > 0 && <div className="place-suggestions" role="listbox" aria-label={`${label} suggestions`}>
      {suggestions.map((item) => <button type="button" role="option" aria-selected="false" key={item.placeId}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => { onChange(item.text); setSuggestions([]); setFocused(false); }}>
        <MapPin size={13} aria-hidden="true" />{item.text}
      </button>)}
    </div>}
  </div>;
}
