import "server-only";

/**
 * Forward geocoding via geocode.maps.co.
 * Free tier: 1 req/sec, works without auth for low volume, but the
 * GEOCODE_API key unlocks higher throughput.
 */

const GEOCODE_API_KEY = process.env.GEOCODE_API ?? "";
const BASE = "https://geocode.maps.co";

export interface GeocodeResult {
  lat: number;
  lng: number;
  formatted: string;
  country?: string;
  city?: string;
  postcode?: string;
  rawConfidence?: number;
}

interface MapsCoResponse {
  place_id?: number;
  lat?: string;
  lon?: string;
  display_name?: string;
  importance?: number;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    country?: string;
    postcode?: string;
  };
}

export async function geocodeAddress(parts: {
  address?: string | null;
  city?: string | null;
  zip?: string | null;
  country?: string | null;
}): Promise<GeocodeResult | null> {
  const q = [parts.address, parts.zip, parts.city, parts.country ?? "Greece"]
    .filter((p) => p && String(p).trim().length > 0)
    .join(", ");
  if (!q) return null;

  const url = new URL(`${BASE}/search`);
  url.searchParams.set("q", q);
  if (GEOCODE_API_KEY) url.searchParams.set("api_key", GEOCODE_API_KEY);

  console.log(`[geocode] querying: "${q}"`);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    console.warn(`[geocode] ${res.status} for "${q}": ${await res.text().catch(() => "")}`);
    return null;
  }
  const data = (await res.json()) as MapsCoResponse[];
  const hit = data[0];
  if (!hit?.lat || !hit?.lon) {
    console.warn(`[geocode] no hits for "${q}" (response had ${data.length} entries)`);
    return null;
  }
  console.log(`[geocode] got ${hit.lat}, ${hit.lon} for "${q}"`);

  return {
    lat: parseFloat(hit.lat),
    lng: parseFloat(hit.lon),
    formatted: hit.display_name ?? q,
    country: hit.address?.country,
    city: hit.address?.city ?? hit.address?.town ?? hit.address?.village,
    postcode: hit.address?.postcode,
    rawConfidence: hit.importance,
  };
}
