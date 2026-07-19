import { safeFetch } from "./safe-fetch";
import { lruGet, lruSet } from "./cache";

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

const CACHE_MAX = 100;

function mergeItems(current: GuideItem[], incoming: GuideItem[]): GuideItem[] {
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()];
}

function mergeGuides(current: ParentalGuide, incoming: ParentalGuide): ParentalGuide {
  const currentCategories = new Map(current.categories.map((category) => [category.id, category]));
  const categories = incoming.categories.map((category) => {
    const previous = currentCategories.get(category.id);
    return previous ? { ...category, items: mergeItems(previous.items, category.items) } : category;
  });
  for (const category of current.categories) {
    if (!incoming.categories.some((next) => next.id === category.id)) categories.push(category);
  }
  return { ...current, ...incoming, categories };
}

export function createParentalGuideClient(
  fetchImpl: typeof fetch = safeFetch,
  cacheMax = CACHE_MAX,
) {
  const cache = new Map<string, ParentalGuide>();
  const inflight = new Map<string, Promise<ParentalGuide>>();

  async function fetchWithLimit(
    imdbId: string,
    type: "movie" | "tv",
    limit: number,
  ): Promise<ParentalGuide> {
    const res = await fetchImpl(
      `${BASE}/${type}/${imdbId}/parental_guide?items_per_category=${limit}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
      },
    );
    if (!res.ok) throw new Error(`Parental guide request failed: ${res.status}`);
    return (await res.json()) as ParentalGuide;
  }

  async function fetchParentalGuide(
    imdbId: string,
    type: "movie" | "tv",
  ): Promise<ParentalGuide | null> {
    const key = `${type}:${imdbId}`;
    const cached = lruGet(cache, key);
    if (cached) return cached;
    const existing = inflight.get(key);
    if (existing) return existing.catch(() => null);

    const request = fetchWithLimit(imdbId, type, 5)
      .then((guide) => {
        lruSet(cache, key, guide, cacheMax);
        return guide;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, request);
    return request.catch(() => null);
  }

  async function fetchParentalGuideMore(
    imdbId: string,
    type: "movie" | "tv",
    categories: { id: string; total_items: number }[],
  ): Promise<ParentalGuide | null> {
    const key = `${type}:${imdbId}`;
    const cached = lruGet(cache, key);
    if (
      cached &&
      categories.every((requested) => {
        const category = cached.categories.find((item) => item.id === requested.id);
        return category && category.items.length >= requested.total_items;
      })
    ) {
      return cached;
    }

    const maxTotal = Math.max(5, ...categories.map((category) => category.total_items));
    try {
      const fresh = await fetchWithLimit(imdbId, type, maxTotal);
      const guide = cached ? mergeGuides(cached, fresh) : fresh;
      lruSet(cache, key, guide, cacheMax);
      return guide;
    } catch {
      return null;
    }
  }

  return { fetchParentalGuide, fetchParentalGuideMore };
}

const parentalGuideClient = createParentalGuideClient();

export const fetchParentalGuide = parentalGuideClient.fetchParentalGuide;
export const fetchParentalGuideMore = parentalGuideClient.fetchParentalGuideMore;
