import { safeFetch } from "./safe-fetch";

const BASE = "https://api.balloonerismm.workers.dev";

export type SeverityVote = {
  id: string;
  text: string;
  vote_type: string;
  votes: number;
};

export type GuideItem = {
  id: string;
  is_spoiler: boolean;
  text: string;
  html: string;
};

export type GuideCategory = {
  id: string;
  title: string;
  severity: SeverityVote | null;
  severity_breakdown: SeverityVote[];
  total_severity_votes: number;
  total_items: number;
  items: GuideItem[];
};

export type ParentalGuide = {
  id: string;
  mpa_rating: string | null;
  mpa_rating_reason: string | null;
  categories: GuideCategory[];
};

export type Certificate = {
  id: string;
  rating: string;
  country: string;
  country_name: string;
};

const CACHE_MAX = 500;
const cache = new Map<string, ParentalGuide | null>();
const inflight = new Map<string, Promise<ParentalGuide | null>>();

function lruSet(key: string, val: ParentalGuide | null) {
  if (cache.size >= CACHE_MAX) {
    const first = cache.keys().next().value;
    if (first !== undefined) cache.delete(first);
  }
  cache.set(key, val);
}

async function fetchWithLimit(
  imdbId: string,
  type: "movie" | "tv",
  limit: number,
): Promise<ParentalGuide | null> {
  const res = await safeFetch(
    `${BASE}/${type}/${imdbId}/parental_guide?items_per_category=${limit}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    },
  );
  if (!res.ok) return null;
  return (await res.json()) as ParentalGuide;
}

export async function fetchParentalGuide(
  imdbId: string,
  type: "movie" | "tv",
): Promise<ParentalGuide | null> {
  const key = `${type}:${imdbId}`;
  if (cache.has(key)) return cache.get(key)!;
  if (inflight.has(key)) return inflight.get(key)!;

  const p = fetchWithLimit(imdbId, type, 5)
    .then((v) => {
      lruSet(key, v);
      return v;
    })
    .catch(() => null)
    .finally(() => inflight.delete(key));

  inflight.set(key, p);
  return p;
}

export async function fetchParentalGuideMore(
  imdbId: string,
  type: "movie" | "tv",
  categories: { id: string; total_items: number }[],
): Promise<ParentalGuide | null> {
  const maxTotal = Math.max(5, ...categories.map((c) => c.total_items));
  return fetchWithLimit(imdbId, type, maxTotal);
}
