import type { LalamoveCityInfo } from "./types";
import type { LalamoveTransport } from "./transport";

interface CachedCityInfo {
  city: LalamoveCityInfo;
  cachedAt: number;
}

let cache: CachedCityInfo | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function fetchCityInfo(
  transport: LalamoveTransport,
  cityName: string,
): Promise<LalamoveCityInfo> {
  const cities = await transport.get<LalamoveCityInfo[]>(
    "/v3/cities?countryIso2=MY",
  );

  const match = cities.find(
    (c) => c.name.toLowerCase() === cityName.toLowerCase(),
  );

  if (!match) {
    const available = cities.map((c) => c.name).join(", ");
    throw new Error(
      `City "${cityName}" not found in Lalamove MY cities. Available: ${available}`,
    );
  }

  return match;
}

export async function getCityInfo(
  transport: LalamoveTransport,
  cityName: string,
): Promise<LalamoveCityInfo> {
  const now = Date.now();

  if (cache && now - cache.cachedAt < CACHE_TTL_MS) {
    return cache.city;
  }

  const city = await fetchCityInfo(transport, cityName);
  cache = { city, cachedAt: now };
  return city;
}

export function isServiceAvailable(
  city: LalamoveCityInfo,
  serviceType: string,
): boolean {
  return city.services.some((s) => s.serviceType === serviceType);
}

export function clearCityInfoCache(): void {
  cache = null;
}
