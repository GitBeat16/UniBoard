/**
 * Food near campus, from OpenStreetMap via the Overpass API. No key, no
 * billing, no tracking — the only location sent is the campus pin the student
 * set themselves, rounded to ~100 m.
 *
 * Honest limits, surfaced in the UI rather than papered over:
 *  - OSM rarely has prices or ratings for Indian cafés, so we do not invent a
 *    price band. We show what the map knows: kind, cuisine, veg, hours.
 *  - Walking time is straight-line distance × 1.3 (a typical city detour
 *    factor) at 80 m/min. Good for ranking, not for a sat-nav.
 */

export type PlaceKind = "cafe" | "restaurant" | "fast_food" | "food_court" | "ice_cream" | "bakery";

export type Place = {
  /** "node/123" — OSM's own id, stable across fetches. */
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: PlaceKind;
  cuisine: string | null;
  /** From diet:vegetarian. "only" is a pure-veg place. */
  veg: "only" | "yes" | null;
  hours: string | null;
  distanceM: number;
  walkMin: number;
};

export type LatLng = { lat: number; lng: number };

export const KIND_LABEL: Record<PlaceKind, string> = {
  cafe: "Café",
  restaurant: "Restaurant",
  fast_food: "Quick bite",
  food_court: "Food court",
  ice_cream: "Ice cream",
  bakery: "Bakery",
};

const WALK_M_PER_MIN = 80;
const DETOUR = 1.3;
export const SEARCH_RADIUS_M = 1200;
const MAX_RESULTS = 40;

export function haversineM(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function walkMinutes(meters: number): number {
  return Math.max(1, Math.round((meters * DETOUR) / WALK_M_PER_MIN));
}

/** ~110 m cells, so nearby pins share one cached query. */
export function roundOrigin(o: LatLng): LatLng {
  return { lat: Math.round(o.lat * 1000) / 1000, lng: Math.round(o.lng * 1000) / 1000 };
}

export function overpassQuery(o: LatLng, radius = SEARCH_RADIUS_M): string {
  const around = `around:${radius},${o.lat},${o.lng}`;
  return (
    `[out:json][timeout:15];(` +
    `nwr["amenity"~"^(cafe|restaurant|fast_food|food_court|ice_cream)$"]["name"](${around});` +
    `nwr["shop"="bakery"]["name"](${around});` +
    `);out center tags 250;`
  );
}

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function kindOf(tags: Record<string, string>): PlaceKind | null {
  if (tags.shop === "bakery") return "bakery";
  switch (tags.amenity) {
    case "cafe":
    case "restaurant":
    case "fast_food":
    case "food_court":
    case "ice_cream":
      return tags.amenity;
    default:
      return null;
  }
}

function tidyCuisine(raw: string | undefined): string | null {
  if (!raw) return null;
  const parts = raw
    .split(";")
    .map((p) => p.trim().replace(/_/g, " "))
    .filter(Boolean)
    .slice(0, 2);
  return parts.length ? parts.map((p) => p[0].toUpperCase() + p.slice(1)).join(", ") : null;
}

/**
 * Overpass JSON → ranked places. `origin` is the student's exact pin; the
 * query may have used a rounded one, so distances are recomputed here.
 */
export function parsePlaces(json: unknown, origin: LatLng): Place[] {
  const elements = (json as { elements?: OverpassElement[] })?.elements;
  if (!Array.isArray(elements)) return [];

  const seen = new Set<string>();
  const places: Place[] = [];

  for (const el of elements) {
    const tags = el.tags ?? {};
    const name = tags.name?.trim();
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    const kind = kindOf(tags);
    if (!name || lat === undefined || lng === undefined || !kind) continue;

    // The same café is often mapped as both a node and a building outline.
    const dedupeKey = `${name.toLowerCase()}@${lat.toFixed(3)},${lng.toFixed(3)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const distanceM = Math.round(haversineM(origin, { lat, lng }));
    const vegTag = tags["diet:vegetarian"];

    places.push({
      id: `${el.type}/${el.id}`,
      name,
      lat,
      lng,
      kind,
      cuisine: tidyCuisine(tags.cuisine),
      veg: vegTag === "only" ? "only" : vegTag === "yes" ? "yes" : null,
      hours: tags.opening_hours?.trim() || null,
      distanceM,
      walkMin: walkMinutes(distanceM),
    });
  }

  return places
    .sort((a, b) => a.distanceM - b.distanceM || a.name.localeCompare(b.name))
    .slice(0, MAX_RESULTS);
}

export class PlacesError extends Error {}

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

/**
 * Fetches and caches for a day per ~110 m cell (Next's data cache keys on the
 * URL). Tries a mirror if the main instance is busy — it often is.
 */
export async function fetchPlaces(origin: LatLng): Promise<Place[]> {
  const q = overpassQuery(roundOrigin(origin), SEARCH_RADIUS_M + 150);
  let lastStatus = 0;

  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(`${endpoint}?data=${encodeURIComponent(q)}`, {
        headers: {
          Accept: "application/json",
          // Overpass asks clients to identify themselves.
          "User-Agent": "UniBoard/0.3 (+https://github.com/GitBeat16/UniBoard)",
        },
        signal: AbortSignal.timeout(12_000),
        next: { revalidate: 86_400 },
      });
      if (!res.ok) {
        lastStatus = res.status;
        continue;
      }
      return parsePlaces(await res.json(), origin);
    } catch {
      // Timeout or network: try the next mirror.
    }
  }

  throw new PlacesError(
    lastStatus === 429 || lastStatus === 504
      ? "The map service is busy right now. Try again in a minute."
      : "Could not reach the map service just now.",
  );
}
