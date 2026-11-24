"use client";

import { useEffect } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";

export type LatLng = [number, number];

function FitPath({ path }: { path: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (path.length > 1) map.fitBounds(path, { padding: [30, 30] });
  }, [map, path]);
  return null;
}

/** Route line with a pickup (lime) and drop-off (orange) marker. Load it through LazyTripMap. */
export default function TripMap({ path, origin, destination }: { path: LatLng[]; origin: string; destination: string }) {
  const start = path[0];
  const end = path[path.length - 1];
  return <MapContainer className="trip-map-canvas" center={start ?? [42.9634, -85.6681]} zoom={9} scrollWheelZoom={false}>
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
    {path.length > 1 && <>
      <Polyline positions={path} pathOptions={{ color: "#4d7c0f", weight: 5, opacity: 0.9 }} />
      <CircleMarker center={start} radius={8} pathOptions={{ color: "#10151d", weight: 3, fillColor: "#c9f36a", fillOpacity: 1 }}>
        <Tooltip>Pickup: {origin}</Tooltip>
      </CircleMarker>
      <CircleMarker center={end} radius={8} pathOptions={{ color: "#10151d", weight: 3, fillColor: "#ff6848", fillOpacity: 1 }}>
        <Tooltip>Drop-off: {destination}</Tooltip>
      </CircleMarker>
    </>}
    <FitPath path={path} />
  </MapContainer>;
}
