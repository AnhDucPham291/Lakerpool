"use client";

import { useEffect } from "react";
import { divIcon } from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { DriverCandidate, RouteOption } from "./TripPlanner";

const driverIcon = divIcon({
  className: "driver-marker-icon",
  html: "<span aria-hidden=\"true\">🚗</span>",
  iconSize: [34, 34],
  iconAnchor: [17, 17]
});

function FitRoute({ route, drivers }: { route?: RouteOption; drivers: DriverCandidate[] }) {
  const map = useMap();
  useEffect(() => {
    if (!route?.coordinates.length) return;
    const bounds = [...route.coordinates, ...drivers.map((driver) => driver.coordinates)];
    map.fitBounds(bounds, { padding: [36, 36] });
  }, [map, route, drivers]);
  return null;
}

export default function RouteMap({ routes, selectedRoute, drivers, shareRide, riderCount }: {
  routes: RouteOption[];
  selectedRoute: number;
  drivers: DriverCandidate[];
  shareRide: boolean;
  riderCount: number;
}) {
  const route = routes[selectedRoute];
  return <MapContainer className="map-canvas" center={[42.9634, -85.6681]} zoom={9} scrollWheelZoom>
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
    {route && <Polyline positions={route.coordinates} pathOptions={{ color: "#c9f36a", opacity: 0.95, weight: 5 }}/>}
    {drivers.map((driver) => <Marker
      key={driver.name}
      position={driver.coordinates}
      icon={driverIcon}
    >
      <Tooltip direction="top" offset={[0, -7]} opacity={1}>
        <strong>{driver.name}</strong><br/>{driver.color} {driver.vehicle}<br/>★ {driver.rating.toFixed(1)} · ${((driver.baseFare + driver.ratePerMile * (route?.distanceMiles ?? 0)) / (shareRide ? riderCount : 1)).toFixed(2)} {shareRide ? "per person" : "solo"}
      </Tooltip>
    </Marker>)}
    <FitRoute route={route} drivers={drivers}/>
  </MapContainer>;
}
