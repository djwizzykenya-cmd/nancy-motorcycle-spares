"use client";

import { useEffect, useRef, useState } from "react";
import type { LatLngTuple, Map as LeafletMap, Marker, Polyline } from "leaflet";
import "leaflet/dist/leaflet.css";

interface OrderDeliveryMapProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  label: string;
  allowRoutePlanning?: boolean;
}

interface OsrmRouteResponse {
  code?: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: { coordinates: number[][] };
  }>;
}

const isValidCoordinates = (latitude: number | null | undefined, longitude: number | null | undefined) =>
  typeof latitude === "number" &&
  Number.isFinite(latitude) &&
  latitude >= -90 &&
  latitude <= 90 &&
  typeof longitude === "number" &&
  Number.isFinite(longitude) &&
  longitude >= -180 &&
  longitude <= 180;

export default function OrderDeliveryMap({
  latitude,
  longitude,
  label,
  allowRoutePlanning = false
}: OrderDeliveryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const routeRef = useRef<Polyline | null>(null);
  const mountedRef = useRef(true);
  const [mapError, setMapError] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [directionsUrl, setDirectionsUrl] = useState("");
  const [routeSummary, setRouteSummary] = useState("");
  const hasCoordinates = isValidCoordinates(latitude, longitude);

  useEffect(() => {
    if (!hasCoordinates || !mapContainerRef.current || latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
      return;
    }

    let mounted = true;
    mountedRef.current = true;
    const position: LatLngTuple = [latitude, longitude];

    void import("leaflet")
      .then((L) => {
        if (!mounted || !mapContainerRef.current) return;

        mapRef.current = L.map(mapContainerRef.current, {
          scrollWheelZoom: false
        }).setView(position, 15);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapRef.current);

        const destinationIcon = L.icon({
          iconUrl: "/leaflet-marker-icon.png",
          iconRetinaUrl: "/leaflet-marker-icon-2x.png",
          shadowUrl: "/leaflet-marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });
        markerRef.current = L.marker(position, { icon: destinationIcon, title: "Delivery destination" })
          .addTo(mapRef.current)
          .bindPopup(label);
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        console.error("Order delivery map failed to initialize:", error);
        setMapError(true);
      });

    return () => {
      mounted = false;
      mountedRef.current = false;
      markerRef.current = null;
      routeRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [hasCoordinates, latitude, longitude, label]);

  const planRoute = () => {
    if (!navigator.geolocation) {
      setRouteError("This device does not support location access. Open directions in your maps app instead.");
      return;
    }
    if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) return;

    setRouteLoading(true);
    setRouteError("");
    setRouteSummary("");
    setDirectionsUrl("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const origin = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        if (!isValidCoordinates(origin.latitude, origin.longitude)) {
          setRouteLoading(false);
          setRouteError("Your device returned an invalid location. Check your location settings and try again.");
          return;
        }

        const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${latitude},${longitude}&travelmode=driving`;
        setDirectionsUrl(mapsUrl);

        try {
          const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${longitude},${latitude}?overview=full&geometries=geojson`
          );
          if (!response.ok) throw new Error(`Routing service returned ${response.status}`);

          const result = await response.json() as OsrmRouteResponse;
          const route = result.routes?.[0];
          if (result.code !== "Ok" || !route || !Array.isArray(route.geometry?.coordinates) || route.geometry.coordinates.length < 2) {
            throw new Error("No driving route was found for these locations.");
          }

          const leaflet = await import("leaflet");
          if (!mountedRef.current || !mapRef.current) return;

          const points = route.geometry.coordinates.map((coordinate) => {
            const [lng, lat] = coordinate;
            if (!isValidCoordinates(lat, lng)) {
              throw new Error("The routing service returned invalid route coordinates.");
            }
            return [lat, lng] as LatLngTuple;
          });
          routeRef.current?.remove();
          routeRef.current = leaflet.polyline(points, {
            color: "#dc2626",
            weight: 5,
            opacity: 0.85
          }).addTo(mapRef.current);
          mapRef.current.fitBounds(routeRef.current.getBounds(), { padding: [24, 24] });
          setRouteSummary(
            `${(route.distance / 1000).toFixed(1)} km · about ${Math.max(1, Math.round(route.duration / 60))} min by road`
          );
        } catch (error) {
          if (!mountedRef.current) return;
          console.error("Could not calculate delivery driving route:", error);
          setRouteError("The route preview could not load. You can still open turn-by-turn directions in Google Maps.");
        } finally {
          if (mountedRef.current) setRouteLoading(false);
        }
      },
      (error) => {
        if (!mountedRef.current) return;
        setRouteLoading(false);
        setRouteError(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Allow location access to preview the route."
            : "Could not get your current location. Check location settings and try again."
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  if (!hasCoordinates) {
    return (
      <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Map unavailable: this order does not have saved delivery coordinates.
      </p>
    );
  }

  const mapUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
      {allowRoutePlanning && (
        <div className="border-b border-slate-200 bg-white p-3">
          <button
            type="button"
            onClick={planRoute}
            disabled={routeLoading}
            className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
          >
            {routeLoading ? "Finding route…" : routeSummary ? "Refresh route from my location" : "Plan route from my location"}
          </button>
          <p className="mt-2 text-xs text-slate-500">
            Uses this device’s current location. Allow location access when your browser asks.
          </p>
          <p className="text-xs text-slate-500">
            Route preview uses OpenStreetMap routing; turn-by-turn directions open in Google Maps.
          </p>
          {routeSummary && <p className="mt-2 text-sm font-semibold text-slate-800" role="status">{routeSummary}</p>}
          {routeError && <p className="mt-2 text-sm text-amber-800" role="alert">{routeError}</p>}
          {directionsUrl && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex text-sm font-semibold text-red-700 underline underline-offset-2"
            >
              Open turn-by-turn directions in Google Maps
            </a>
          )}
        </div>
      )}
      {mapError ? (
        <div className="bg-slate-50 px-4 py-5 text-sm text-slate-700">
          <p>The delivery map could not load.</p>
          <a href={mapUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex font-semibold text-red-700 underline underline-offset-2">
            Open destination in OpenStreetMap
          </a>
        </div>
      ) : (
        <div
          ref={mapContainerRef}
          role="application"
          aria-label={`Delivery destination map: ${label}`}
          className="h-52 w-full bg-slate-100 sm:h-60"
        />
      )}
      <a
        href={mapUrl}
        target="_blank"
        rel="noreferrer"
        className="block border-t border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-red-700"
      >
        Open destination in OpenStreetMap
      </a>
    </div>
  );
}
