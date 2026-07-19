import { ChevronDown, ChevronUp, Eye, EyeOff, Info, Loader2 } from "lucide-react";
import { useState } from "react";
import type { GuideCategory, ParentalGuide } from "@/lib/parental-guide";
import { fetchParentalGuideMore } from "@/lib/parental-guide";
import { useT } from "@/lib/i18n";

type SeverityLevel = "NONE" | "MILD" | "MODERATE" | "SEVERE";

const SEVERITY: Record<SeverityLevel, { label: string; color: string; dot: string }> = {
  NONE: { label: "None", color: "text-zinc-400", dot: "bg-zinc-400" },
  MILD: { label: "Mild", color: "text-emerald-400", dot: "bg-emerald-400" },
  MODERATE: { label: "Moderate", color: "text-amber-400", dot: "bg-amber-400" },
  SEVERE: { label: "Severe", color: "text-red-400", dot: "bg-red-400" },
};

function resolveSeverity(type?: string): SeverityLevel {
  return (type as SeverityLevel) in SEVERITY ? (type as SeverityLevel) : "NONE";
}

function worstSeverity(cats: GuideCategory[]): SeverityLevel {
  return resolveSeverity(
    cats.reduce<{ type: string; votes: number }>(
      (best, c) => {
        const v = c.severity?.votes ?? 0;
        if (v > best.votes) return { type: c.severity?.vote_type ?? "NONE", votes: v };
        return best;
      },
      { type: "NONE", votes: 0 },
    ).type,
  );
}

function RatingBadge({ rating, color }: { rating: string; color: string }) {
  return (
    <span
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-1.5 text-[11px] font-extrabold tracking-wide ${color} bg-white/[0.06]`}
    >
      {rating}
    </span>
  );
}

function CategoryRow({
  category,
  showSpoilers,
  imdbId,
  mediaType,
  onMoreLoaded,
}: {
  category: GuideCategory;
  showSpoilers: boolean;
  imdbId: string;
  mediaType: "movie" | "tv";
  onMoreLoaded: (id: string, items: GuideCategory["items"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const t = useT();
  const lv = resolveSeverity(category.severity?.vote_type);
  const s = SEVERITY[lv];
  const totalItems = category.items.length;
  const totalAvailable = category.total_items;
  const hasMore = totalItems < totalAvailable;
  const remaining = totalAvailable - totalItems;
  const visibleItems = showSpoilers ? category.items : category.items.filter((i) => !i.is_spoiler);
  const hiddenSpoilers = totalItems - visibleItems.length;
  const hasItems = totalItems > 0;

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const fetchType = mediaType === "movie" ? ("movie" as const) : ("tv" as const);
      const guides = await Promise.all([
        fetchParentalGuideMore(imdbId, fetchType, [
          { id: category.id, total_items: totalAvailable },
        ]),
      ]);
      const full = guides[0];
      const fresh = full?.categories.find((c) => c.id === category.id);
      if (fresh && fresh.items.length > totalItems) {
        onMoreLoaded(category.id, fresh.items);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => hasItems && setOpen((v) => !v)}
        className={`flex items-center gap-3 py-2.5 text-left ${hasItems ? "cursor-pointer hover:bg-white/[0.03]" : "cursor-default"} rounded-lg transition-colors`}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
        <span className="min-w-0 flex-1 text-[13.5px] font-medium text-ink">{category.title}</span>
        <span className={`shrink-0 text-[11px] font-bold uppercase tracking-wider ${s.color}`}>
          {s.label}
        </span>
        {hasItems && (
          <span className="shrink-0 text-ink-muted">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        )}
      </button>

      {open && (
        <div className="mb-2 ml-5 flex flex-col gap-2 border-l border-white/[0.06] pl-4">
          {visibleItems.length > 0 ? (
            <>
              {visibleItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-2.5 text-[12.5px] leading-relaxed text-ink"
                >
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink-subtle/70" />
                  <span className="flex-1">{item.text}</span>
                </div>
              ))}
              {hiddenSpoilers > 0 && (
                <p className="mt-1 px-1 text-[11px] italic text-ink-muted/60">
                  {t("{n} spoiler hidden", { n: hiddenSpoilers })}
                </p>
              )}
              {hasMore && (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] py-2 text-[11.5px] font-medium text-ink-muted transition-colors hover:bg-white/[0.06] hover:text-ink disabled:cursor-wait disabled:opacity-60"
                >
                  {loadingMore ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <ChevronDown size={11} strokeWidth={2.2} />
                  )}
                  {loadingMore ? t("Loading…") : t("Show more ({n})", { n: remaining })}
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2.5 text-[12px] text-amber-300">
              <EyeOff size={13} strokeWidth={2.2} />
              <span>
                {hiddenSpoilers === 1
                  ? t("1 note is a spoiler. Turn on spoilers to view.")
                  : t("{n} notes are spoilers. Turn on spoilers to view.", { n: hiddenSpoilers })}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ParentalGuideHeroCard({
  guide,
  imdbId,
  mediaType,
}: {
  guide: ParentalGuide;
  imdbId: string;
  mediaType: "movie" | "tv";
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [showSpoilers, setShowSpoilers] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | "ALL">("ALL");
  const [extraItems, setExtraItems] = useState<Record<string, GuideCategory["items"]>>({});

  const merged = {
    ...guide,
    categories: guide.categories.map((c) => ({
      ...c,
      items: c.items.concat(extraItems[c.id] ?? []),
    })),
  };

  const level = worstSeverity(merged.categories);

  const sorted = [...merged.categories].sort((a, b) => {
    const order: Record<string, number> = { SEVERE: 0, MODERATE: 1, MILD: 2, NONE: 3 };
    return (
      (order[a.severity?.vote_type ?? "NONE"] ?? 3) - (order[b.severity?.vote_type ?? "NONE"] ?? 3)
    );
  });

  const filtered =
    severityFilter === "ALL"
      ? sorted
      : sorted.filter((c) => resolveSeverity(c.severity?.vote_type) === severityFilter);

  const totalItems = merged.categories.reduce((n, c) => n + c.items.length, 0);
  const totalSpoilers = merged.categories.reduce(
    (n, c) => n + c.items.filter((i) => i.is_spoiler).length,
    0,
  );

  const counts = {
    SEVERE: sorted.filter((c) => c.severity?.vote_type === "SEVERE").length,
    MODERATE: sorted.filter((c) => c.severity?.vote_type === "MODERATE").length,
    MILD: sorted.filter((c) => c.severity?.vote_type === "MILD").length,
    NONE: sorted.filter((c) => !c.severity || c.severity.vote_type === "NONE").length,
  };

  const handleMoreLoaded = (id: string, items: GuideCategory["items"]) => {
    setExtraItems((prev) => ({ ...prev, [id]: items }));
  };

  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.06] bg-black/55 backdrop-blur-xl">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.03]"
      >
        <RatingBadge rating={guide.mpa_rating ?? level} color={SEVERITY[level].color} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-ink">{t("Parental Guide")}</span>
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${SEVERITY[level].color}`}
            >
              {SEVERITY[level].label}
            </span>
          </div>
          {guide.mpa_rating_reason && (
            <p className="mt-1 line-clamp-1 text-[12.5px] text-ink-muted">
              {guide.mpa_rating_reason}
            </p>
          )}
        </div>
        <span className="shrink-0 text-ink-muted">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-white/[0.06] px-5 pb-5 pt-4">
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <FilterChip active={severityFilter === "ALL"} onClick={() => setSeverityFilter("ALL")}>
              All {guide.categories.length}
            </FilterChip>
            <FilterChip
              active={severityFilter === "SEVERE"}
              onClick={() => setSeverityFilter("SEVERE")}
              accent="red"
              count={counts.SEVERE}
            >
              Severe
            </FilterChip>
            <FilterChip
              active={severityFilter === "MODERATE"}
              onClick={() => setSeverityFilter("MODERATE")}
              accent="amber"
              count={counts.MODERATE}
            >
              Moderate
            </FilterChip>
            <FilterChip
              active={severityFilter === "MILD"}
              onClick={() => setSeverityFilter("MILD")}
              accent="emerald"
              count={counts.MILD}
            >
              Mild
            </FilterChip>
          </div>

          <div className="flex flex-col divide-y divide-white/[0.04]">
            {filtered.map((cat) => (
              <CategoryRow
                key={cat.id}
                category={cat}
                showSpoilers={showSpoilers}
                imdbId={imdbId}
                mediaType={mediaType}
                onMoreLoaded={handleMoreLoaded}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            {totalSpoilers > 0 ? (
              <button
                type="button"
                onClick={() => setShowSpoilers((v) => !v)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-medium transition-colors ${
                  showSpoilers
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    : "border-white/[0.06] bg-white/[0.03] text-ink-muted hover:bg-white/[0.06] hover:text-ink"
                }`}
              >
                {showSpoilers ? (
                  <Eye size={12} strokeWidth={2.2} />
                ) : (
                  <EyeOff size={12} strokeWidth={2.2} />
                )}
                {showSpoilers
                  ? t("Spoilers on ({n})", { n: totalSpoilers })
                  : t("Show spoilers ({n})", { n: totalSpoilers })}
              </button>
            ) : (
              <span className="text-[11px] tabular-nums text-ink-muted/60">
                {totalItems} {t("notes")}
              </span>
            )}
            <button
              type="button"
              onClick={() => window.open("https://www.imdb.com/parentsguide", "_blank")}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-ink-muted transition-colors hover:text-ink"
            >
              <Info size={12} />
              {t("View on IMDb")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  accent,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  accent?: "red" | "amber" | "emerald";
  count?: number;
}) {
  const accentColors = {
    red: "border-red-500/30 bg-red-500/10 text-red-400",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  };
  const idle =
    "border-white/[0.06] bg-white/[0.03] text-ink-muted hover:bg-white/[0.06] hover:text-ink";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11.5px] font-medium transition-colors ${
        active ? (accent ? accentColors[accent] : "border-white/20 bg-white/10 text-ink") : idle
      }`}
    >
      {children}
      {count !== undefined && count > 0 && <span className="tabular-nums opacity-70">{count}</span>}
    </button>
  );
}
