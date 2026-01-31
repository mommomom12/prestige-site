"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
// NOTE: This file is self-contained for easy publishing.
// No shadcn/ui imports required.

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-2xl border border-neutral-800 bg-neutral-900/80",
        props.className
      )}
    />
  );
}

function CardContent(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("p-6", props.className)} />;
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline";
  size?: "default" | "sm";
};

function Button({ variant = "default", size = "default", className, ...props }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-neutral-400";
  const variants: Record<string, string> = {
    default: "bg-white text-black hover:bg-neutral-200",
    secondary: "bg-neutral-800 text-white hover:bg-neutral-700",
    outline: "border border-neutral-700 bg-transparent text-white hover:bg-neutral-900",
  };
  const sizes: Record<string, string> = {
    default: "h-10 px-4 text-sm",
    sm: "h-9 px-3 text-sm",
  };
  return (
    <button
      {...props}
      className={cn(base, variants[variant], sizes[size], className)}
    />
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-400",
        props.className
      )}
    />
  );
}

function Label(props: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      {...props}
      className={cn("text-sm font-medium text-neutral-200", props.className)}
    />
  );
}

function NativeSelect({
  value,
  onChange,
  children,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "mt-1 h-10 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-neutral-400",
        className
      )}
    >
      {children}
    </select>
  );
}

import { motion } from "framer-motion";
import {
  Phone,
  MessageCircle,
  Car,
  Plane,
  Clock,
  ShieldCheck,
  Star,
  Sparkles,
  ArrowRight,
  BadgeCheck,
  AlertTriangle,
  MapPinned,
  Info,
  RefreshCcw,
} from "lucide-react";

/**
 * Prestige Chauffeur NYC — single-file high converting booking page
 *
 * Requirements:
 * - Route + estimate from pickup/dropoff
 * - "Request Booking" should show success inline (no popup)
 * - You receive an email with all booking info (via EmailJS)
 *
 * Google Maps notes:
 * - We load Google Maps JS only when toggled on
 * - Routing: try Routes API first (modern), then fallback to legacy DirectionsService
 */

// --------------------------
// Business identity
// --------------------------

const COMPANY_NAME = "Prestige Chauffeur NYC";
const BOOKINGS_EMAIL = "moussaadam123123@gmail.com";

// Email sending (no backend server) via EmailJS
const EMAILJS = {
  serviceId: "service_6nkjipk",
  templateId: "template_audzf5p",
  publicKey: "0baxISdNe4l8bmIEo",
};

// Contact
const WHATSAPP_NUMBER = "13477278329"; // country code + number, no '+'
const PHONE_NUMBER = "+13477278329"; // tel: link

// Fallback rates (used when route pricing isn't available)
const BASE_RATES = {
  airport: 180,
  hourly: 120,
  events: 250,
};

// Route-based pricing knobs (tune these for NYC)
const PRICING = {
  airport: { base: 80, perMile: 8.0, perMinute: 1.2, min: 180, bookingFee: 15 },
  events: { base: 90, perMile: 9.0, perMinute: 1.3, min: 250, bookingFee: 20 },
  hourly: { minHours: 2 },
};

// --------------------------
// Pricing helpers (pure)
// --------------------------

export function calcEstimate(service: string, hours: any) {
  if (service === "hourly") {
    const h = Math.max(
      PRICING.hourly.minHours,
      Number(hours || PRICING.hourly.minHours)
    );
    const safeHours = Number.isFinite(h) ? h : PRICING.hourly.minHours;
    return BASE_RATES.hourly * safeHours;
  }
  if (service === "events") return BASE_RATES.events;
  return BASE_RATES.airport;
}

export function calcRouteEstimate(service: string, miles: any, minutes: any) {
  const key = service === "events" ? "events" : "airport";
  const cfg = (PRICING as any)[key];

  const m = Number(miles || 0);
  const min = Number(minutes || 0);

  const safeMiles = Number.isFinite(m) ? m : 0;
  const safeMinutes = Number.isFinite(min) ? min : 0;

  const raw =
    cfg.base +
    cfg.bookingFee +
    safeMiles * cfg.perMile +
    safeMinutes * cfg.perMinute;
  return Math.max(cfg.min, Math.round(raw));
}

// --------------------------
// DEV self-tests (safe)
// --------------------------

(function devSelfTests() {
  const env =
    typeof process !== "undefined" ? (process as any)?.env?.NODE_ENV : "production";
  if (env === "production") return;

  const tests = [
    { name: "airport base", got: calcEstimate("airport", 1), want: 180 },
    { name: "events base", got: calcEstimate("events", 1), want: 250 },
    { name: "hourly min 2", got: calcEstimate("hourly", 1), want: 240 },
    { name: "hourly 3", got: calcEstimate("hourly", 3), want: 360 },
    { name: "hourly string", got: calcEstimate("hourly", "4"), want: 480 },
    { name: "hourly NaN -> min", got: calcEstimate("hourly", "abc"), want: 240 },
    { name: "unknown service fallback", got: calcEstimate("whatever", 10), want: 180 },
    { name: "route airport min", got: calcRouteEstimate("airport", 0.1, 0.1), want: 180 },
    { name: "route events min", got: calcRouteEstimate("events", 0.1, 0.1), want: 250 },
    { name: "route handles NaN", got: calcRouteEstimate("airport", "abc", "def"), want: 180 },
  ];

  const failures = tests.filter((t) => t.got !== t.want);
  if (failures.length) {
    // eslint-disable-next-line no-console
    console.error("Self-tests failed:", failures);
  }
})();

// --------------------------
// Google Maps helpers
// --------------------------

declare global {
  interface Window {
    __gmapsPromise?: Promise<any>;
    __gmapsReject?: (e: any) => void;
    __GOOGLE_MAPS_API_KEY?: string;
    gm_authFailure?: () => void;
    google?: any;
  }
}

function humanizeMapsError(message: string, origin: string) {
  const msg = String(message || "");
  const lower = msg.toLowerCase();

  if (
    lower.includes("billingnotenabledmaperror") ||
    (lower.includes("billing") && lower.includes("not enabled"))
  ) {
    return (
      "BillingNotEnabledMapError: Billing is not enabled for this Google Cloud project.\n\n" +
      "Fix: Google Cloud Console → Billing → link a billing account to THIS project (the one that owns your API key)."
    );
  }

  if (
    lower.includes("referernotallowed") ||
    lower.includes("referer not allowed") ||
    lower.includes("apitargetblockedmaperror")
  ) {
    return (
      `RefererNotAllowedMapError: This site (${origin}) is not allowed by your API key restrictions.\n\n` +
      "Fix: Google Cloud Console → APIs & Services → Credentials → your API key → Application restrictions → HTTP referrers → add:\n" +
      `${origin}/*\n\n` +
      "Then save and refresh preview."
    );
  }

  if (lower.includes("invalidkeymaperror") || lower.includes("invalid key")) {
    return (
      "InvalidKeyMapError: Google is rejecting this API key.\n\n" +
      "Fix checklist:\n" +
      "1) Make sure you pasted the correct key.\n" +
      "2) Enable Maps JavaScript API in the SAME project as this key.\n" +
      "3) Billing must be enabled for that project.\n" +
      (origin ? `4) If you restricted referrers, add: ${origin}/*\n` : "") +
      "5) If you restricted APIs, temporarily set API restrictions to 'Don't restrict key' to test."
    );
  }

  if (
    lower.includes("legacyapinotactivated") ||
    (lower.includes("legacy api") && lower.includes("not enabled"))
  ) {
    return (
      "LegacyApiNotActivatedMapError: Google says you are calling a legacy directions endpoint that isn't enabled for your project.\n\n" +
      "Fix options:\n" +
      "• Enable Directions API (legacy) in Google Cloud\n" +
      "• OR enable Routes API (recommended) and use it for routing."
    );
  }

  if (lower.includes("missing") && lower.includes("key")) {
    return "Missing Google Maps API key.";
  }

  if (
    lower.includes("not activated") ||
    (lower.includes("api") && lower.includes("not enabled"))
  ) {
    return "Required Google Maps APIs are not enabled (Maps JavaScript + Places + Routes/Directions).";
  }

  return msg || "Google Maps failed to load.";
}

function isProbablyApiKey(str: string) {
  if (!str || typeof str !== "string") return false;
  const s = str.trim();
  return s.length >= 25;
}

function loadGoogleMapsOnce(apiKey: string, originForErrors: string) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("window is undefined"));
  }
  if (!isProbablyApiKey(apiKey)) {
    return Promise.reject(new Error("Missing/invalid API key format."));
  }

  if (
    window.google?.maps?.places &&
    window.google?.maps?.geometry?.encoding?.decodePath
  ) {
    return Promise.resolve(window.google);
  }

  if (window.__gmapsPromise) return window.__gmapsPromise;

  const existing = document.getElementById("gmaps-js");
  if (existing) {
    window.__gmapsPromise = new Promise((resolve, reject) => {
      const t = setInterval(() => {
        if (
          window.google?.maps?.places &&
          window.google?.maps?.geometry?.encoding?.decodePath
        ) {
          clearInterval(t);
          resolve(window.google);
        }
      }, 50);

      setTimeout(() => {
        clearInterval(t);
        reject(new Error("Google Maps script exists but API did not initialize."));
      }, 12000);
    });

    return window.__gmapsPromise;
  }

  window.gm_authFailure = () => {
    try {
      if (window.__gmapsReject) {
        window.__gmapsReject(
          new Error(
            `Google Maps authentication failed. If you have referrer restrictions, add ${originForErrors}/* to your API key allowed referrers.`
          )
        );
      }
    } catch {
      // ignore
    }
  };

  window.__gmapsPromise = new Promise((resolve, reject) => {
    window.__gmapsReject = reject;

    const script = document.createElement("script");
    script.id = "gmaps-js";
    script.async = true;
    script.defer = true;

    const params = new URLSearchParams({
      key: apiKey.trim(),
      libraries: "places,geometry",
    });

    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;

    script.onload = () => {
      try {
        if (
          window.google?.maps?.places &&
          window.google?.maps?.geometry?.encoding?.decodePath
        ) {
          resolve(window.google);
        } else {
          reject(
            new Error(
              "Google Maps loaded, but required libraries are unavailable (places/geometry)."
            )
          );
        }
      } catch (e) {
        reject(e);
      }
    };

    script.onerror = () => reject(new Error("Failed to load Google Maps script."));
    document.head.appendChild(script);

    setTimeout(() => {
      if (
        window.google?.maps?.places &&
        window.google?.maps?.geometry?.encoding?.decodePath
      ) {
        return;
      }
      reject(new Error("Google Maps timed out initializing."));
    }, 15000);
  });

  return window.__gmapsPromise;
}

function useSuppressGoogleMapsConsoleErrors(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (typeof window === "undefined") return;

    const originalError = console.error;
    const originalWarn = console.warn;

    const shouldSuppress = (args: any[]) => {
      const text = args
        .map((a) => {
          try {
            return typeof a === "string" ? a : JSON.stringify(a);
          } catch {
            return String(a);
          }
        })
        .join(" ");

      return (
        text.includes("Google Maps JavaScript API error") ||
        text.includes("InvalidKeyMapError") ||
        text.includes("ApiTargetBlockedMapError") ||
        text.includes("RefererNotAllowedMapError") ||
        text.includes("BillingNotEnabledMapError") ||
        text.includes("LegacyApiNotActivatedMapError") ||
        text.includes("MapsRequestError") ||
        text.includes("DIRECTIONS_ROUTE") ||
        text.includes("REQUEST_DENIED")
      );
    };

    console.error = (...args: any[]) => {
      if (shouldSuppress(args)) return;
      originalError(...args);
    };

    console.warn = (...args: any[]) => {
      if (shouldSuppress(args)) return;
      originalWarn(...args);
    };

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, [active]);
}

function KeyHelp({ message }: { message: string }) {
  return (
    <div className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle className="h-4 w-4" /> Google Maps not available
      </div>
      <div className="mt-1 text-red-200/90 break-words whitespace-pre-wrap">{message}</div>
    </div>
  );
}

function InlineInfo({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3 text-xs text-neutral-300">
      <div className="flex items-center gap-2 font-medium text-neutral-200">
        <Info className="h-4 w-4" /> {title}
      </div>
      <div className="mt-1 text-neutral-400 whitespace-pre-wrap">{body}</div>
    </div>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    // eslint-disable-next-line no-console
    console.error("App crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
          <div className="max-w-xl w-full rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
            <div className="text-lg font-semibold">Something crashed (but we caught it).</div>
            <div className="mt-2 text-sm text-red-200/90 break-words whitespace-pre-wrap">
              {String(this.state.error?.message || this.state.error || "Unknown error")}
            </div>
            <div className="mt-4 text-xs text-neutral-300">
              Tip: If this happened after enabling Google Maps, it’s almost always a key restriction, wrong project,
              or billing.
            </div>
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}

function interpretDirectionsStatus(status: string, origin: string) {
  const s = String(status || "").toUpperCase();
  if (s === "OK") return { ok: true, message: "" };

  if (s === "LEGACY_NOT_ENABLED") {
    return {
      ok: false,
      message:
        "Directions Service error: Google says you're calling a legacy Directions endpoint that isn't enabled for your project.\n\n" +
        "Fix: In Google Cloud, enable ONE of these (same project as your API key):\n" +
        "• Routes API (recommended)\n" +
        "• Directions API (legacy)\n\n" +
        "This site will try Routes API first. If Routes API isn't enabled, enable it and retry.",
    };
  }

  if (s === "REQUEST_DENIED") {
    return {
      ok: false,
      message:
        "Directions request was denied by Google (REQUEST_DENIED).\n\n" +
        "This is NOT a website bug — it means your key/project is not allowed to call routing right now.\n\n" +
        "Fix checklist (Google Cloud):\n" +
        "1) APIs & Services → Library: enable Routes API (recommended) or Directions API (legacy)\n" +
        "2) APIs & Services → Credentials → your API key:\n" +
        "   - If API restrictions are ON: allow Routes API (and Maps JavaScript + Places).\n" +
        "   - If HTTP referrers are ON: add this referrer:\n" +
        `     ${origin}/*\n` +
        "3) Billing must be enabled for the SAME project as this key\n\n" +
        "After changing settings: refresh preview or toggle Enable map off/on.",
    };
  }

  if (s === "ZERO_RESULTS") {
    return {
      ok: false,
      message:
        "No driving route found (ZERO_RESULTS). Try selecting the exact address from autocomplete suggestions.",
    };
  }

  if (s === "NOT_FOUND") {
    return {
      ok: false,
      message:
        "A location could not be found (NOT_FOUND). Please pick a place from the suggestions.",
    };
  }

  if (s === "OVER_QUERY_LIMIT") {
    return {
      ok: false,
      message:
        "Google rate-limited this key (OVER_QUERY_LIMIT). Wait a bit or increase quota/billing.",
    };
  }

  if (s === "INVALID_REQUEST") {
    return {
      ok: false,
      message:
        "Invalid route request. Make sure pickup & dropoff are selected from suggestions.",
    };
  }

  return {
    ok: false,
    message: `Could not calculate route (${s}). Try selecting an address from suggestions.`,
  };
}

function latLngFromPlace(place: any): { lat: number; lng: number } | null {
  try {
    const loc = place?.geometry?.location;
    if (!loc) return null;
    const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
    const lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

function parseDurationSeconds(duration: any): number | null {
  if (typeof duration === "string") {
    const m = duration.match(/^(\d+)s$/);
    if (m) return Number(m[1]);
  }
  if (typeof duration === "object" && duration && Number.isFinite(duration.value)) {
    return Number(duration.value);
  }
  return null;
}

async function computeRouteViaRoutesAPI(args: {
  apiKey: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}) {
  const endpoint = "https://routes.googleapis.com/directions/v2:computeRoutes";
  const body = {
    origin: {
      location: {
        latLng: { latitude: args.origin.lat, longitude: args.origin.lng },
      },
    },
    destination: {
      location: {
        latLng: { latitude: args.destination.lat, longitude: args.destination.lng },
      },
    },
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    computeAlternativeRoutes: false,
    units: "IMPERIAL",
    languageCode: "en-US",
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": args.apiKey,
      "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }

  if (!res.ok) {
    const message = json?.error?.message || text || `HTTP ${res.status}`;
    const status = json?.error?.status || "ERROR";
    const combined = `${status}: ${message}`;

    if (String(status).toUpperCase().includes("PERMISSION_DENIED")) {
      return { ok: false, status: "REQUEST_DENIED", message: combined };
    }
    return { ok: false, status: "ERROR", message: combined };
  }

  const route = json?.routes?.[0];
  if (!route) return { ok: false, status: "ERROR", message: "No routes returned." };

  const meters = route.distanceMeters;
  const durS = parseDurationSeconds(route.duration);
  const encoded = route?.polyline?.encodedPolyline;

  if (!Number.isFinite(meters) || !Number.isFinite(durS) || !encoded) {
    return {
      ok: false,
      status: "ERROR",
      message: "Routes API returned an incomplete route (missing distance/duration/polyline).",
    };
  }

  return {
    ok: true,
    meters: Number(meters),
    seconds: Number(durS),
    encodedPolyline: String(encoded),
  };
}

async function routeWithDirectionsService(ds: any, request: any) {
  try {
    const callbackPromise = new Promise<{ result: any; status: string }>((resolve) => {
      ds.route(request, (result: any, status: string) => resolve({ result, status }));
    });

    const maybePromise = ds.route(request);
    if (maybePromise && typeof maybePromise.then === "function") {
      const promiseStyle = maybePromise.then((result: any) => ({ result, status: "OK" }));
      return await Promise.race([callbackPromise, promiseStyle]);
    }

    return await callbackPromise;
  } catch (e: any) {
    const message = String(e?.message || e || "");

    if (message.toUpperCase().includes("LEGACY") && message.toUpperCase().includes("NOT ENABLED")) {
      return { result: null, status: "LEGACY_NOT_ENABLED" };
    }
    if (message.toUpperCase().includes("REQUEST_DENIED")) {
      return { result: null, status: "REQUEST_DENIED" };
    }
    return { result: null, status: "ERROR" };
  }
}

// --------------------------
// Main component
// --------------------------

export default function ChauffeurBookingSite() {
  const bookingRef = useRef<HTMLDivElement | null>(null);

  const [origin, setOrigin] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const isSandbox = useMemo(() => origin.includes("web-sandbox.oaiusercontent.com"), [origin]);

  // API key resolution
  const [manualKey, setManualKey] = useState("");
  const [manualKeySaved, setManualKeySaved] = useState(false);
  const [enableMaps, setEnableMaps] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("google_maps_api_key") || "";
    if (saved) setManualKey(saved);
    const savedEnable = window.localStorage.getItem("enable_maps") === "1";
    setEnableMaps(savedEnable);
  }, []);

  const envKey =
    (typeof process !== "undefined" && (process as any)?.env?.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) ||
    (typeof process !== "undefined" && (process as any)?.env?.REACT_APP_GOOGLE_MAPS_API_KEY) ||
    (typeof import.meta !== "undefined" && (import.meta as any)?.env?.VITE_GOOGLE_MAPS_API_KEY) ||
    (typeof window !== "undefined" && window.__GOOGLE_MAPS_API_KEY);

  const apiKey = (envKey as string) || manualKey || "";
  const keyMissing = !apiKey;

  useSuppressGoogleMapsConsoleErrors(isSandbox && enableMaps);

  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState("");

  // Form state
  const [service, setService] = useState<"airport" | "hourly" | "events">("airport");
  const [pickup, setPickup] = useState("");
  const [pickupPlace, setPickupPlace] = useState<any>(null);
  const [dropoff, setDropoff] = useState("");
  const [dropoffPlace, setDropoffPlace] = useState<any>(null);
  const [date, setDate] = useState("");
  const [hours, setHours] = useState<any>(2);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  // Submission UX (no popup)
  const [submitting, setSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "sent" | "error">("idle");
  const [submitError, setSubmitError] = useState("");

  // Refs for Autocomplete
  const pickupInputRef = useRef<HTMLInputElement | null>(null);
  const dropoffInputRef = useRef<HTMLInputElement | null>(null);
  const pickupAutocompleteRef = useRef<any>(null);
  const dropoffAutocompleteRef = useRef<any>(null);
  const pickupListenerRef = useRef<any>(null);
  const dropoffListenerRef = useRef<any>(null);

  // Map + rendering
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const directionsServiceRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const routesPolylineRef = useRef<any>(null);

  const [routeMiles, setRouteMiles] = useState<number | null>(null);
  const [routeMinutes, setRouteMinutes] = useState<number | null>(null);
  const [routeDistanceText, setRouteDistanceText] = useState("");
  const [routeDurationText, setRouteDurationText] = useState("");
  const [routeStatus, setRouteStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [routeError, setRouteError] = useState("");
  const [routingDisabled, setRoutingDisabled] = useState(false);

  const routeBasedEligible = service !== "hourly";

  const selectService = (next: "airport" | "hourly" | "events") => {
    setService(next);

    // Clear submit state when user changes service
    setSubmitState("idle");
    setSubmitError("");

    // Clear route so it recalculates cleanly
    setRouteMiles(null);
    setRouteMinutes(null);
    setRouteDistanceText("");
    setRouteDurationText("");
    setRouteError("");
    setRouteStatus("idle");
    setRoutingDisabled(false);

    // Clear drawings
    try {
      directionsRendererRef.current?.set("directions", null);
    } catch {
      // ignore
    }
    try {
      routesPolylineRef.current?.setMap(null);
      routesPolylineRef.current = null;
    } catch {
      // ignore
    }

    // UX: jump to booking + focus pickup
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      try {
        bookingRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      } catch {
        // ignore
      }
      setTimeout(() => {
        try {
          pickupInputRef.current?.focus?.();
        } catch {
          // ignore
        }
      }, 300);
    });
  };

  // Load maps (gated)
  useEffect(() => {
    let cancelled = false;

    if (!enableMaps) {
      setMapsReady(false);
      setMapsError("");
      setRoutingDisabled(false);
      return () => {
        cancelled = true;
      };
    }

    if (!apiKey) {
      setMapsReady(false);
      setMapsError(humanizeMapsError("Missing Google Maps API key", origin));
      return () => {
        cancelled = true;
      };
    }

    setMapsError("");

    loadGoogleMapsOnce(apiKey, origin)
      .then(() => {
        if (cancelled) return;
        setMapsReady(true);
        setMapsError("");
        setRoutingDisabled(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setMapsReady(false);
        setMapsError(humanizeMapsError(err?.message || String(err), origin));
      });

    return () => {
      cancelled = true;
    };
  }, [enableMaps, apiKey, origin]);

  // Autocomplete setup
  useEffect(() => {
    if (!mapsReady) return;
    if (!pickupInputRef.current || !dropoffInputRef.current) return;
    if (!window.google?.maps?.places?.Autocomplete) return;

    const options = {
      fields: ["formatted_address", "place_id", "geometry", "name"],
      componentRestrictions: { country: ["us"] },
    };

    try {
      pickupListenerRef.current?.remove?.();
      dropoffListenerRef.current?.remove?.();
    } catch {
      // ignore
    }

    pickupAutocompleteRef.current = new window.google.maps.places.Autocomplete(
      pickupInputRef.current,
      options
    );
    dropoffAutocompleteRef.current = new window.google.maps.places.Autocomplete(
      dropoffInputRef.current,
      options
    );

    pickupListenerRef.current = pickupAutocompleteRef.current.addListener("place_changed", () => {
      const place = pickupAutocompleteRef.current?.getPlace?.();
      setPickup(place?.formatted_address || pickupInputRef.current?.value || "");
      setPickupPlace(place || null);
      setSubmitState("idle");
    });

    dropoffListenerRef.current = dropoffAutocompleteRef.current.addListener("place_changed", () => {
      const place = dropoffAutocompleteRef.current?.getPlace?.();
      setDropoff(place?.formatted_address || dropoffInputRef.current?.value || "");
      setDropoffPlace(place || null);
      setSubmitState("idle");
    });

    return () => {
      try {
        pickupListenerRef.current?.remove?.();
        dropoffListenerRef.current?.remove?.();
      } catch {
        // ignore
      }
    };
  }, [mapsReady]);

  // Map init
  useEffect(() => {
    if (!mapsReady) return;
    if (!mapDivRef.current) return;
    if (!window.google?.maps) return;

    if (!mapRef.current) {
      mapRef.current = new window.google.maps.Map(mapDivRef.current, {
        center: { lat: 40.758, lng: -73.9855 },
        zoom: 11,
        disableDefaultUI: true,
        zoomControl: true,
      });
    }

    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        suppressMarkers: false,
        preserveViewport: false,
      });
      directionsRendererRef.current.setMap(mapRef.current);
    }
  }, [mapsReady]);

  // Route calculation (debounced)
  useEffect(() => {
    if (!mapsReady) return;

    if (routingDisabled) {
      setRouteStatus("error");
      try {
        directionsRendererRef.current?.set("directions", null);
      } catch {
        // ignore
      }
      try {
        routesPolylineRef.current?.setMap(null);
        routesPolylineRef.current = null;
      } catch {
        // ignore
      }
      return;
    }

    if (!routeBasedEligible) {
      setRouteStatus("idle");
      setRouteError("");
      setRouteMiles(null);
      setRouteMinutes(null);
      setRouteDistanceText("");
      setRouteDurationText("");
      try {
        directionsRendererRef.current?.set("directions", null);
      } catch {
        // ignore
      }
      try {
        routesPolylineRef.current?.setMap(null);
        routesPolylineRef.current = null;
      } catch {
        // ignore
      }
      return;
    }

    const dr = directionsRendererRef.current;
    if (!dr) return;

    const oLL = latLngFromPlace(pickupPlace);
    const dLL = latLngFromPlace(dropoffPlace);

    const hasTextButNoPlace = (pickup && !oLL) || (dropoff && !dLL);

    if (!pickup || !dropoff) {
      setRouteStatus("idle");
      setRouteError("");
      setRouteMiles(null);
      setRouteMinutes(null);
      setRouteDistanceText("");
      setRouteDurationText("");
      try {
        dr.set("directions", null);
      } catch {
        // ignore
      }
      try {
        routesPolylineRef.current?.setMap(null);
        routesPolylineRef.current = null;
      } catch {
        // ignore
      }
      return;
    }

    if (hasTextButNoPlace) {
      setRouteStatus("error");
      setRouteError(
        "Please choose pickup and dropoff from the autocomplete suggestions (click a suggestion). This allows routing to use exact coordinates."
      );
      return;
    }

    if (!oLL || !dLL) return;

    setRouteStatus("loading");
    setRouteError("");

    const timer = window.setTimeout(async () => {
      // 1) Try modern Routes API first
      try {
        const routesRes = await computeRouteViaRoutesAPI({ apiKey, origin: oLL, destination: dLL });

        if (routesRes.ok) {
          const miles = routesRes.meters / 1609.344;
          const minutes = routesRes.seconds / 60;

          setRouteMiles(miles);
          setRouteMinutes(minutes);
          setRouteDistanceText(`${miles.toFixed(1)} mi`);
          setRouteDurationText(`${Math.round(minutes)} min`);
          setRouteStatus("ready");

          try {
            dr.set("directions", null);
          } catch {
            // ignore
          }

          try {
            const path = window.google.maps.geometry.encoding.decodePath(routesRes.encodedPolyline);

            routesPolylineRef.current?.setMap(null);
            routesPolylineRef.current = new window.google.maps.Polyline({
              path,
              strokeOpacity: 0.9,
              strokeWeight: 5,
            });
            routesPolylineRef.current.setMap(mapRef.current);

            const bounds = new window.google.maps.LatLngBounds();
            path.forEach((p: any) => bounds.extend(p));
            mapRef.current.fitBounds(bounds, 60);
          } catch {
            // ignore
          }

          return;
        }
      } catch {
        // ignore and fallback
      }

      // 2) Fallback to legacy DirectionsService
      try {
        if (!directionsServiceRef.current) {
          directionsServiceRef.current = new window.google.maps.DirectionsService();
        }

        const ds = directionsServiceRef.current;

        const originReq = pickupPlace?.place_id ? { placeId: pickupPlace.place_id } : pickup;
        const destReq = dropoffPlace?.place_id ? { placeId: dropoffPlace.place_id } : dropoff;

        const request = {
          origin: originReq,
          destination: destReq,
          travelMode: window.google.maps.TravelMode.DRIVING,
        };

        const { result, status } = await routeWithDirectionsService(ds, request);
        const interpreted = interpretDirectionsStatus(status, origin);

        if (!interpreted.ok || !result?.routes?.[0]?.legs?.[0]) {
          setRouteStatus("error");
          setRouteError(interpreted.message);
          setRouteMiles(null);
          setRouteMinutes(null);
          setRouteDistanceText("");
          setRouteDurationText("");
          setRoutingDisabled(true);

          try {
            dr.set("directions", null);
          } catch {
            // ignore
          }
          try {
            routesPolylineRef.current?.setMap(null);
            routesPolylineRef.current = null;
          } catch {
            // ignore
          }
          return;
        }

        const leg = result.routes[0].legs[0];
        const meters = leg.distance?.value ?? null;
        const seconds = parseDurationSeconds(leg.duration);

        const miles = meters != null ? meters / 1609.344 : null;
        const minutes = seconds != null ? seconds / 60 : null;

        setRouteMiles(miles);
        setRouteMinutes(minutes);
        setRouteDistanceText(leg.distance?.text || "");
        setRouteDurationText(leg.duration?.text || "");
        setRouteStatus("ready");

        try {
          routesPolylineRef.current?.setMap(null);
          routesPolylineRef.current = null;
        } catch {
          // ignore
        }

        try {
          dr.setDirections(result);
        } catch {
          // ignore
        }
      } catch (e: any) {
        setRouteStatus("error");
        setRouteError(humanizeMapsError(e?.message || String(e), origin) || "Routing failed.");
        setRoutingDisabled(true);
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    mapsReady,
    routeBasedEligible,
    pickup,
    dropoff,
    pickupPlace,
    dropoffPlace,
    origin,
    routingDisabled,
    apiKey,
  ]);

  const displayedPrice = useMemo(() => {
    if (service === "hourly") return calcEstimate(service, hours);
    if (routeMiles != null && routeMinutes != null) return calcRouteEstimate(service, routeMiles, routeMinutes);
    return calcEstimate(service, hours);
  }, [service, hours, routeMiles, routeMinutes]);

  const validation = useMemo(() => {
    const errors: string[] = [];
    if (!date) errors.push("Pick a date & time.");
    if (!pickup) errors.push("Add a pickup location.");
    if (!dropoff) errors.push("Add a dropoff location.");
    if (!name) errors.push("Add your name.");
    if (!phone) errors.push("Add a phone number.");
    if (!email) errors.push("Add an email.");
    if (service === "hourly" && Number(hours || 0) < PRICING.hourly.minHours) {
      errors.push("Hourly service requires 2+ hours.");
    }
    return { ok: errors.length === 0, errors };
  }, [date, pickup, dropoff, name, phone, email, service, hours]);

  const buildLeadMessage = () => {
    const lines = [
      `New booking request — ${COMPANY_NAME}`,
      "",
      `Service: ${
        service === "airport"
          ? "Airport Transfer"
          : service === "hourly"
          ? "Hourly Chauffeur"
          : "Events / Night Out"
      }`,
      `Date/Time: ${date || "(not set)"}`,
      `Pickup: ${pickup || "(not set)"}`,
      `Dropoff: ${dropoff || "(not set)"}`,
      service === "hourly"
        ? `Hours: ${Math.max(PRICING.hourly.minHours, Number(hours || PRICING.hourly.minHours))}`
        : null,
      routeDistanceText ? `Route: ${routeDistanceText} (~${routeDurationText})` : null,
      "",
      `Name: ${name || "(not set)"}`,
      `Phone: ${phone || "(not set)"}`,
      `Email: ${email || "(not set)"}`,
      notes ? `Notes: ${notes}` : null,
      "",
      `Estimated: $${displayedPrice}`,
      origin ? `Site: ${origin}` : null,
    ].filter(Boolean);

    return (lines as string[]).join("\n");
  };

  // EmailJS backend send (no popup)
  const sendBookingEmail = async (message: string) => {
    const { serviceId, templateId, publicKey } = EMAILJS;

    if (!serviceId || !templateId || !publicKey) {
      throw new Error(
        "Email sending is not configured. Replace EMAILJS.serviceId/templateId/publicKey at the top of the file."
      );
    }

    const payload = {
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: {
        to_email: BOOKINGS_EMAIL,
        subject: `Booking request — ${COMPANY_NAME}`,
        message,
        service,
        date,
        pickup,
        dropoff,
        hours: service === "hourly" ? String(hours) : "",
        route: routeDistanceText ? `${routeDistanceText} (~${routeDurationText})` : "",
        estimate: String(displayedPrice),
        name,
        phone,
        email,
        notes,
        origin_domain: origin,
      },
    };

    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`EmailJS failed (${res.status}). ${text || ""}`.trim());
    }
  };

  const submitBooking = async () => {
    // ✅ Always show feedback if click works
    setSubmitState("idle");
    setSubmitError("");

    // eslint-disable-next-line no-console
    console.log("Request Booking clicked", {
      service,
      date,
      pickup,
      dropoff,
      name,
      phone,
      email,
      notes,
    });

    if (!validation.ok) {
      // ✅ NO multi-line strings — use \n escapes to avoid SyntaxError
      setSubmitState("error");
      setSubmitError("Please fix:\n\n• " + validation.errors.join("\n• "));
      return;
    }

    setSubmitting(true);
    try {
      const message = buildLeadMessage();
      await sendBookingEmail(message);

      setSubmitState("sent");

      // Clear trip details (keep contact info to reduce friction)
      setPickup("");
      setDropoff("");
      setPickupPlace(null);
      setDropoffPlace(null);
      setNotes("");

      try {
        bookingRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      } catch {
        // ignore
      }
    } catch (e: any) {
      setSubmitState("error");
      setSubmitError(String(e?.message || e || "Failed to send."));
    } finally {
      setSubmitting(false);
    }
  };

  const mapsToggleLabel = useMemo(() => (enableMaps ? "Disable map" : "Enable map"), [enableMaps]);

  const sandboxNote = useMemo(() => {
    if (!isSandbox) return "";
    return (
      "You are previewing on the ChatGPT sandbox domain. If your API key uses HTTP referrer restrictions, " +
      `you MUST add this referrer:\n${origin}/*\n\n` +
      "Then refresh preview (or toggle Enable map off/on)."
    );
  }, [isSandbox, origin]);

  const requiredApisNote = useMemo(() => {
    return (
      "For full features, your key's project must have these enabled:\n" +
      "• Maps JavaScript API (site map)\n" +
      "• Places API (autocomplete)\n" +
      "• Routes API (recommended for routing + distance + duration)\n" +
      "  (Fallback: Directions API legacy)\n\n" +
      "If routing shows REQUEST_DENIED or legacy-not-enabled, enable Routes API in the same project as your key and ensure referrers allow this domain."
    );
  }, []);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-neutral-950 text-neutral-100">
        {/* Top bar */}
        <div className="border-b border-neutral-800/60 bg-neutral-950/60 backdrop-blur">
          <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-neutral-300">
              <Sparkles className="h-4 w-4" />
              <span className="font-medium text-neutral-200">{COMPANY_NAME}</span>
              <span className="hidden sm:inline text-neutral-500">•</span>
              <span className="hidden sm:inline">On-time • Discreet • Licensed & Insured</span>
            </div>
            <div className="flex items-center gap-2">
              <a href={`tel:${PHONE_NUMBER}`} className="hidden sm:block" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" className="rounded-2xl" type="button" onClick={() => (window.location.href = `tel:${PHONE_NUMBER}`)}>
                  <Phone className="mr-2 h-4 w-4" /> Call
                </Button>
              </a>
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">
                <Button size="sm" variant="secondary" className="rounded-2xl">
                  <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-40 -left-20 h-[520px] w-[520px] rounded-full bg-white/5 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_55%)]" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-6xl px-6 py-16 grid md:grid-cols-2 gap-10 items-center"
          >
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1 text-xs text-neutral-200">
                <BadgeCheck className="h-4 w-4" />
                <span>Licensed & Insured</span>
                <span className="text-neutral-500">•</span>
                <span className="text-neutral-400">NYC Based</span>
              </div>

              <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight">Luxury Chauffeur Service in NYC</h1>
              <p className="mt-4 text-neutral-300 text-lg">
                See your route + get an instant estimate from pickup to dropoff.
                <span className="text-neutral-400"> Fast confirmation and premium experience every time.</span>
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-200">
                  <ShieldCheck className="h-4 w-4" /> Background-checked drivers
                </div>
                <div className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-200">
                  <Clock className="h-4 w-4" /> Always on time
                </div>
                <div className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-200">
                  <Star className="h-4 w-4" /> 5-star service
                </div>
              </div>

              <div className="mt-8 flex gap-3 flex-wrap">
                <a href={`tel:${PHONE_NUMBER}`} onClick={(e) => e.stopPropagation()}>
                  <Button className="rounded-2xl px-6" type="button" onClick={() => (window.location.href = `tel:${PHONE_NUMBER}`)}>
                    <Phone className="mr-2 h-4 w-4" /> Call for Fast Booking
                  </Button>
                </a>
                <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">
                  <Button variant="secondary" className="rounded-2xl px-6">
                    <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp Quote
                  </Button>
                </a>
                <a href="#booking">
                  <Button variant="outline" className="rounded-2xl px-6">
                    Get Instant Estimate <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              </div>

              {/* Google Maps setup */}
              <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MapPinned className="h-4 w-4" /> Route map + route pricing
                  </div>
                  <div className="text-xs text-neutral-400">{mapsReady ? "Ready" : enableMaps ? "Loading" : "Off"}</div>
                </div>

                <div className="mt-3 grid gap-2">
                  <Input
                    value={manualKey}
                    onChange={(e) => {
                      setManualKey(e.target.value);
                      setManualKeySaved(false);
                    }}
                    placeholder="Paste Google Maps API key"
                  />

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      type="button"
                      className="rounded-2xl"
                      onClick={() => {
                        if (typeof window === "undefined") return;
                        if (!manualKey) return alert("Paste your API key first.");
                        window.localStorage.setItem("google_maps_api_key", manualKey);
                        setManualKeySaved(true);
                      }}
                    >
                      Save key
                    </Button>

                    <Button
                      type="button"
                      variant={enableMaps ? "secondary" : "outline"}
                      className="rounded-2xl"
                      onClick={() => {
                        if (typeof window === "undefined") return;
                        if (!apiKey) return alert("Paste and save your API key first.");
                        const next = !enableMaps;
                        setEnableMaps(next);
                        window.localStorage.setItem("enable_maps", next ? "1" : "0");
                        if (!next) {
                          setRoutingDisabled(false);
                          setRouteError("");
                          setRouteStatus("idle");
                        }
                      }}
                      disabled={!apiKey}
                    >
                      {mapsToggleLabel}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => {
                        if (typeof window === "undefined") return;
                        window.localStorage.removeItem("google_maps_api_key");
                        window.localStorage.removeItem("enable_maps");
                        setManualKey("");
                        setEnableMaps(false);
                        setManualKeySaved(false);
                        setMapsReady(false);
                        setMapsError("");
                        setRouteError("");
                        setRouteStatus("idle");
                        setRoutingDisabled(false);
                      }}
                    >
                      Clear
                    </Button>
                  </div>

                  {manualKeySaved && <div className="text-xs text-neutral-400">Saved.</div>}

                  <InlineInfo title="Required Google APIs" body={requiredApisNote} />

                  {isSandbox && (
                    <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-200 whitespace-pre-wrap">
                      {sandboxNote}
                    </div>
                  )}

                  {keyMissing && <div className="text-xs text-yellow-200/80">No key detected (map will stay off).</div>}
                  {mapsError && <KeyHelp message={mapsError} />}
                </div>
              </div>
            </div>

            {/* Booking Card */}
            <Card id="booking" className="rounded-2xl shadow-2xl bg-neutral-900/80 border-neutral-800 backdrop-blur">
              <CardContent className="p-6">
                <div ref={bookingRef} className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Request a Chauffeur</h2>
                    <p className="mt-1 text-sm text-neutral-400">Enter pickup + dropoff to see the route and estimate.</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-xs text-neutral-300">
                    <ShieldCheck className="h-4 w-4" /> Licensed • Insured
                  </div>
                </div>

                {/* Submission status (NO POPUP) */}
                <div className="mt-4 grid gap-2">
                  {submitState === "sent" && (
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                      ✅ Booking complete — submission sent. We’ll confirm shortly.
                    </div>
                  )}
                  {submitState === "error" && (
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 whitespace-pre-wrap">
                      ❌ Couldn’t send your request automatically.\n\n{submitError || "Unknown error"}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label>Service</Label>
                    <Label>Service</Label>
                    <NativeSelect value={service} onChange={(v) => selectService(v as any)}>
                      <option value="airport">Airport Transfer</option>
                      <option value="hourly">Hourly Chauffeur</option>
                      <option value="events">Events / Night Out</option>
                    </NativeSelect>
                  </div>

                  <div>
                    <Label>Date & Time</Label>
                    <Input className="mt-1" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>

                  <div>
                    <Label>Pickup</Label>
                    <Input
                      ref={pickupInputRef}
                      className="mt-1"
                      placeholder={mapsReady ? "Start typing an address" : "Type your pickup address"}
                      value={pickup}
                      onChange={(e) => {
                        setPickup(e.target.value);
                        setPickupPlace(null);
                        setSubmitState("idle");
                      }}
                    />
                    <div className="mt-1 text-xs text-neutral-500">{mapsReady ? "Autocomplete enabled" : "Autocomplete off (enable map + valid key)"}</div>
                  </div>

                  <div>
                    <Label>Dropoff</Label>
                    <Input
                      ref={dropoffInputRef}
                      className="mt-1"
                      placeholder={mapsReady ? "Start typing an address" : "Type your dropoff address"}
                      value={dropoff}
                      onChange={(e) => {
                        setDropoff(e.target.value);
                        setDropoffPlace(null);
                        setSubmitState("idle");
                      }}
                    />
                  </div>

                  {service === "hourly" && (
                    <div>
                      <Label>Hours (min {PRICING.hourly.minHours})</Label>
                      <Input
                        className="mt-1"
                        type="number"
                        min={PRICING.hourly.minHours}
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                      />
                    </div>
                  )}

                  <div>
                    <Label>Name</Label>
                    <Input className="mt-1" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>

                  <div>
                    <Label>Phone</Label>
                    <Input className="mt-1" placeholder="Your phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>

                  <div>
                    <Label>Email</Label>
                    <Input className="mt-1" type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Notes (optional)</Label>
                    <Input
                      className="mt-1"
                      placeholder="Flight number, luggage, child seat, multiple stops…"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  <div className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/40 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-neutral-400">Estimated price</div>
                        <div className="mt-1 text-2xl font-semibold tracking-tight">${displayedPrice}</div>
                        {service !== "hourly" && (
                          <div className="mt-1 text-xs text-neutral-500">
                            {routeStatus === "loading"
                              ? "Calculating route…"
                              : routeDistanceText
                              ? `${routeDistanceText} • ~${routeDurationText}`
                              : routingDisabled
                              ? "Route pricing disabled (routing denied). Fix Google settings then Retry."
                              : "Enter pickup & dropoff to calculate route"}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-neutral-400">Includes</div>
                        <div className="mt-1 text-xs text-neutral-300">Clean vehicle • Pro driver • Door-to-door</div>
                      </div>
                    </div>

                    {service !== "hourly" && mapsReady && (
                      <div className="overflow-hidden rounded-2xl border border-neutral-800">
                        <div ref={mapDivRef} className="h-56 w-full bg-neutral-900" />
                      </div>
                    )}

                    {routingDisabled && (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() => {
                          setRoutingDisabled(false);
                          setRouteError("");
                          setRouteStatus("idle");
                        }}
                      >
                        <RefreshCcw className="mr-2 h-4 w-4" /> Retry route
                      </Button>
                    )}

                    {routeError && (
                      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200 whitespace-pre-wrap">
                        {routeError}
                      </div>
                    )}

                    {!enableMaps && service !== "hourly" && (
                      <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-3 text-xs text-neutral-300">
                        Turn on <span className="text-neutral-100">Enable map</span> above to show the route map + route pricing.
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={() => {
                      submitBooking();
                    }}
                    disabled={submitting}
                    className="w-full rounded-2xl py-6 text-base"
                  >
                    {submitting ? "Sending…" : "Request Booking"} <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <a href={`tel:${PHONE_NUMBER}`} onClick={(e) => e.stopPropagation()}>
                      <Button type="button" variant="secondary" className="w-full rounded-2xl" onClick={() => (window.location.href = `tel:${PHONE_NUMBER}`)}>
                        <Phone className="mr-2 h-4 w-4" /> Call
                      </Button>
                    </a>
                    <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">
                      <Button type="button" variant="secondary" className="w-full rounded-2xl">
                        <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                      </Button>
                    </a>
                  </div>

                  {/* EmailJS config warning */}
                  {(!EMAILJS.serviceId || !EMAILJS.templateId || !EMAILJS.publicKey) && (
                    <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-200 whitespace-pre-wrap">
                      {"Email sending is not configured yet.\n\nPaste your EmailJS Service ID, Template ID, and Public Key at the top of this file."}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </section>

        {/* Services */}
        <section className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Popular Services</h2>
              <p className="mt-1 text-neutral-400">Most-booked options for NYC clients.</p>
            </div>
            <a href="#booking" className="hidden sm:block">
              <Button variant="outline" className="rounded-2xl">Get a Quote</Button>
            </a>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <Card className="rounded-2xl bg-neutral-900 border-neutral-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <Plane className="h-6 w-6" />
                  <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950/40 px-3 py-1 text-xs text-neutral-300">
                    <BadgeCheck className="h-4 w-4" /> Most booked
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-semibold">Airport Transfers</h3>
                <p className="text-neutral-400 mt-2">JFK, LGA, EWR — meet & greet, luggage assist.</p>
                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <div className="text-xs text-neutral-500">From</div>
                    <div className="text-2xl font-semibold">${BASE_RATES.airport}+</div>
                  </div>
                  <Button variant="secondary" className="rounded-2xl" onClick={() => selectService("airport")}>Select</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl bg-neutral-900 border-neutral-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <Clock className="h-6 w-6" />
                  <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950/40 px-3 py-1 text-xs text-neutral-300">
                    <ShieldCheck className="h-4 w-4" /> Executive
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-semibold">Hourly Chauffeur</h3>
                <p className="text-neutral-400 mt-2">2-hour minimum. Great for meetings & multi-stops.</p>
                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <div className="text-xs text-neutral-500">From</div>
                    <div className="text-2xl font-semibold">${BASE_RATES.hourly}/hr</div>
                  </div>
                  <Button variant="secondary" className="rounded-2xl" onClick={() => selectService("hourly")}>Select</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl bg-neutral-900 border-neutral-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <Car className="h-6 w-6" />
                  <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950/40 px-3 py-1 text-xs text-neutral-300">
                    <Star className="h-4 w-4" /> VIP
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-semibold">Events & Nightlife</h3>
                <p className="text-neutral-400 mt-2">Weddings, parties, VIP nights — arrive in style.</p>
                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <div className="text-xs text-neutral-500">From</div>
                    <div className="text-2xl font-semibold">${BASE_RATES.events}+</div>
                  </div>
                  <Button variant="secondary" className="rounded-2xl" onClick={() => selectService("events")}>Select</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-neutral-800">
          <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-neutral-200 font-semibold">{COMPANY_NAME}</div>
              <div className="mt-1 text-sm text-neutral-500">Premium chauffeur service • NYC</div>
            </div>

            <div className="flex gap-2">
              <a href={`tel:${PHONE_NUMBER}`} onClick={(e) => e.stopPropagation()}>
                <Button size="sm" className="rounded-2xl" type="button" onClick={() => (window.location.href = `tel:${PHONE_NUMBER}`)}>
                  <Phone className="mr-2 h-4 w-4" /> Call
                </Button>
              </a>
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">
                <Button size="sm" variant="secondary" className="rounded-2xl">
                  <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                </Button>
              </a>
            </div>
          </div>
          <div className="mx-auto max-w-6xl px-6 pb-10 text-xs text-neutral-600">
            © {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.
            <span className="ml-2">Email: {BOOKINGS_EMAIL}</span>
          </div>
        </footer>

        {/* Mobile sticky CTA */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-800 bg-neutral-950/85 backdrop-blur md:hidden">
          <div className="mx-auto max-w-6xl px-4 py-3 flex gap-2">
            <a className="flex-1" href={`tel:${PHONE_NUMBER}`} onClick={(e) => e.stopPropagation()}>
              <Button className="w-full rounded-2xl" type="button" onClick={() => (window.location.href = `tel:${PHONE_NUMBER}`)}>
                <Phone className="mr-2 h-4 w-4" /> Call
              </Button>
            </a>
            <a className="flex-1" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">
              <Button variant="secondary" className="w-full rounded-2xl">
                <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
              </Button>
            </a>
          </div>
        </div>

        <div className="h-16 md:hidden" />
      </div>
    </ErrorBoundary>
  );
}

