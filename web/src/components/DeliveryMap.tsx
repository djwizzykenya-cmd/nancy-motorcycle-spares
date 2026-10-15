"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LatLngTuple, LeafletMouseEvent, Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";

interface Coords {
  lat: number;
  lng: number;
}

interface DeliveryAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  label: string;
}

export interface DeliveryLocation extends Coords {
  address: DeliveryAddress;
}

const isValidCoords = (value: unknown): value is Coords => {
  if (!value || typeof value !== "object") return false;
  const coords = value as Partial<Coords>;
  return (
    typeof coords.lat === "number" &&
    Number.isFinite(coords.lat) &&
    coords.lat >= -90 &&
    coords.lat <= 90 &&
    typeof coords.lng === "number" &&
    Number.isFinite(coords.lng) &&
    coords.lng >= -180 &&
    coords.lng <= 180
  );
};

const getFallbackAddress = (coords: Coords): DeliveryAddress => ({
  street: "Map pin delivery location",
  city: "Pinned location",
  state: "Kenya",
  postalCode: "00000",
  country: "KE",
  label: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
});

const parseDeliveryAddress = (value: unknown): DeliveryAddress | null => {
  if (!value || typeof value !== "object") return null;
  const address = value as Partial<DeliveryAddress>;
  if (
    typeof address.street !== "string" ||
    typeof address.city !== "string" ||
    typeof address.state !== "string" ||
    typeof address.postalCode !== "string" ||
    typeof address.country !== "string" ||
    typeof address.label !== "string"
  ) {
    return null;
  }
  return {
    street: address.street,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
    label: address.label
  };
};

const getAddressParts = (address: Record<string, unknown>, coords: Coords): DeliveryAddress => {
  const street = [address.house_number, address.road].filter((part): part is string => typeof part === "string").join(" ");
  const city = [address.city, address.town, address.village, address.suburb, address.county]
    .find((part): part is string => typeof part === "string" && part.trim().length > 0);
  const state = [address.state, address.county].find(
    (part): part is string => typeof part === "string" && part.trim().length > 0
  );
  const countryCode = address.country_code;

  return {
    street: street || "Map pin delivery location",
    city: city || "Pinned location",
    state: state || "Kenya",
    postalCode: typeof address.postcode === "string" && address.postcode ? address.postcode : "00000",
    country: typeof countryCode === "string" ? countryCode.toUpperCase() : "KE",
    label: [
      street,
      city,
      state && state !== city ? state : undefined,
      typeof address.country === "string" ? address.country : undefined
    ].filter(Boolean).join(", ") || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
  };
};

export default function DeliveryMap({
  initial,
  onLocationChange,
  onLocationLookupChange
}: {
  initial?: Coords | null;
  onLocationChange?: (location: DeliveryLocation) => void;
  onLocationLookupChange?: (loading: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const coordsRef = useRef<Coords | null>(initial ?? null);
  const addressRef = useRef<DeliveryAddress | null>(null);
  const lookupControllerRef = useRef<AbortController | null>(null);
  const [coords, setCoords] = useState<Coords | null>(() => {
    try {
      const savedLocation = localStorage.getItem("deliveryLocation");
      if (savedLocation) {
        const parsed: unknown = JSON.parse(savedLocation);
        if (parsed && typeof parsed === "object") {
          const saved = parsed as Partial<DeliveryLocation>;
          const savedAddress = parseDeliveryAddress(saved.address);
          if (isValidCoords(saved) && savedAddress) {
            const savedCoords = { lat: saved.lat, lng: saved.lng };
            addressRef.current = savedAddress;
            coordsRef.current = savedCoords;
            return savedCoords;
          }
        }
      }

      const raw = localStorage.getItem("deliveryCoords");
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isValidCoords(parsed)) {
          coordsRef.current = parsed;
          return parsed;
        }
      }
    } catch {
      // ignore invalid saved coords
    }
    return initial || null;
  });
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [lookingUpAddress, setLookingUpAddress] = useState(false);
  const [mapError, setMapError] = useState("");

  const saveCoords = useCallback(async (next: Coords) => {
    setCoords(next);
    coordsRef.current = next;
    setLocationError("");
    setLookingUpAddress(true);
    onLocationLookupChange?.(true);
    const fallbackAddress = getFallbackAddress(next);
    addressRef.current = fallbackAddress;
    setLocationLabel(fallbackAddress.label);
    onLocationChange?.({ ...next, address: fallbackAddress });
    lookupControllerRef.current?.abort();
    const controller = new AbortController();
    lookupControllerRef.current = controller;

    try {
      localStorage.setItem("deliveryCoords", JSON.stringify(next));
      localStorage.setItem("deliveryLocation", JSON.stringify({ ...next, address: fallbackAddress }));
    } catch (error) {
      console.warn("Unable to save delivery location in this browser", error);
    }

    try {
      const query = new URLSearchParams({
        format: "jsonv2",
        lat: String(next.lat),
        lon: String(next.lng),
        zoom: "18",
        addressdetails: "1"
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query}`, {
        signal: controller.signal,
        headers: { "Accept-Language": "en" }
      });
      if (!response.ok) throw new Error(`Address lookup failed with status ${response.status}`);

      const result: unknown = await response.json();
      if (!result || typeof result !== "object") throw new Error("Address lookup returned an invalid response");
      const data = result as { address?: Record<string, unknown> };
      if (!data.address) throw new Error("Address lookup returned no address details");

      const address = getAddressParts(data.address, next);
      addressRef.current = address;
      setLocationLabel(address.label);
      onLocationChange?.({ ...next, address });
      try {
        localStorage.setItem("deliveryLocation", JSON.stringify({ ...next, address }));
      } catch (error) {
        console.warn("Unable to save delivery address in this browser", error);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      console.warn("Unable to reverse-geocode selected delivery coordinates", error);
      setLocationError("Nearby address details are unavailable; the selected map pin will be used for delivery.");
    } finally {
      if (lookupControllerRef.current === controller) {
        lookupControllerRef.current = null;
        setLookingUpAddress(false);
        onLocationLookupChange?.(false);
      }
    }
  }, [onLocationChange, onLocationLookupChange]);

  useEffect(() => {
    let mounted = true;

    void import("leaflet")
      .then((L) => {
        if (!mounted || !containerRef.current) return;

        const defaultCoords: Coords = coordsRef.current ?? { lat: -1.286389, lng: 36.817223 };
        mapRef.current = L.map(containerRef.current).setView([defaultCoords.lat, defaultCoords.lng] as LatLngTuple, 13);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapRef.current);

        const deliveryMarkerIcon = L.icon({
          iconUrl: "/leaflet-marker-icon.png",
          iconRetinaUrl: "/leaflet-marker-icon-2x.png",
          shadowUrl: "/leaflet-marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });
        markerRef.current = L.marker([defaultCoords.lat, defaultCoords.lng] as LatLngTuple, {
          draggable: true,
          icon: deliveryMarkerIcon
        }).addTo(mapRef.current);

        if (coordsRef.current) {
          const savedAddress = addressRef.current;
          if (savedAddress) {
            setLocationLabel(savedAddress.label);
            onLocationChange?.({ ...coordsRef.current, address: savedAddress });
          } else {
            void saveCoords(coordsRef.current);
          }
        }

        markerRef.current.on("dragend", () => {
          const point = markerRef.current?.getLatLng();
          if (!point) return;
          void saveCoords({ lat: point.lat, lng: point.lng });
        });

        mapRef.current.on("click", (event: LeafletMouseEvent) => {
          markerRef.current?.setLatLng(event.latlng);
          void saveCoords({ lat: event.latlng.lat, lng: event.latlng.lng });
        });
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        console.error("Leaflet map failed to initialize:", error);
        setMapError("The delivery map could not load. Refresh the page and try again.");
      });

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      lookupControllerRef.current?.abort();
    };
  }, [saveCoords, onLocationChange]);

  useEffect(() => {
    if (coords && mapRef.current) {
      try {
        mapRef.current.setView([coords.lat, coords.lng] as LatLngTuple, 13);
        markerRef.current?.setLatLng([coords.lat, coords.lng] as LatLngTuple);
      } catch {
        // ignore leaflet issues while rendering
      }
    }
  }, [coords]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Location access is not supported by this browser. You can still choose a point on the map.");
      return;
    }
    setLoading(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        void saveCoords(next);
        if (mapRef.current) {
          mapRef.current.setView([next.lat, next.lng] as LatLngTuple, 13);
          markerRef.current?.setLatLng([next.lat, next.lng] as LatLngTuple);
        }
        setLoading(false);
      }, (error) => {
        setLoading(false);
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Choose a point on the map instead."
            : "Unable to get your location. Choose a point on the map instead."
        );
      }
    );
  };

  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Choose delivery location</h3>
          <p className="mt-1 text-sm text-slate-600">Tap the map or drag the pin to choose your drop-off point.</p>
        </div>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={loading}
          className="shrink-0 rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
        >
          {loading ? "Locating…" : "Use my location"}
        </button>
      </div>

      <div
        className="h-56 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:h-64"
        ref={containerRef}
        role="application"
        aria-label="Delivery location map"
      />
      {mapError && <p role="alert" className="mt-3 text-sm text-red-700">{mapError}</p>}

      <div className="mt-3 text-sm" aria-live="polite">
        {locationError ? (
          <p className="text-amber-800" role="status">{locationError}</p>
        ) : coords ? (
          <p className="text-slate-600">
            <span className="font-medium text-emerald-700">
              {lookingUpAddress ? "Finding nearby address…" : "Delivery location selected."}
            </span>
            {locationLabel && <span className="block pt-1">{locationLabel}</span>}
            <span className="block pt-1 text-xs text-slate-500">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </span>
          </p>
        ) : (
          <p className="text-slate-600">Select a point on the map to set your delivery location.</p>
        )}
      </div>
    </div>
  );
}
