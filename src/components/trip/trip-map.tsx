"use client";

import {
  divIcon,
  latLngBounds,
} from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { useEffect } from "react";

import type { TripMapStop } from "./trip-map-model";

export function TripMap({ stops }: { stops: TripMapStop[] }) {
  if (stops.length === 0) {
    return null;
  }

  const center = [stops[0].lat, stops[0].lng] as [number, number];
  const path = stops.map((stop) => [stop.lat, stop.lng] as [number, number]);

  return (
    <div className="mt-5 overflow-hidden rounded-md border border-stone-300">
      <MapContainer
        center={center}
        zoom={stops.length === 1 ? 13 : 10}
        scrollWheelZoom={false}
        className="h-72 w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {stops.length > 1 ? <Polyline positions={path} pathOptions={{ color: "#166534", weight: 4 }} /> : null}
        {stops.map((stop, index) => (
          <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={numberedIcon(index + 1)}>
            <Popup>
              <strong>{stop.name}</strong>
              <br />
              Day {stop.dayNumber} / {stop.type}
            </Popup>
          </Marker>
        ))}
        <FitMapToStops stops={stops} />
      </MapContainer>
    </div>
  );
}

function FitMapToStops({ stops }: { stops: TripMapStop[] }) {
  const map = useMap();

  useEffect(() => {
    if (stops.length < 2) {
      return;
    }
    const bounds = latLngBounds(stops.map((stop) => [stop.lat, stop.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, stops]);

  return null;
}

function numberedIcon(number: number) {
  return divIcon({
    className: "trip-map-marker",
    html: `<span>${number}</span>`,
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}
