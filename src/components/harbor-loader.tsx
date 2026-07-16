import { useEffect, useState } from "react";
import {
  prefetchTopAddonLogos,
  prefetchedTopAddonLogos,
} from "@/lib/providers/addon-logo-prefetch";

type Size = "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<Size, string> = {
  sm: "h-20 w-20",
  md: "h-32 w-32",
  lg: "h-44 w-44",
  xl: "h-60 w-60",
};

const NO_LOGOS: string[] = [];

function useTopAddonLogos(enabled: boolean): string[] {
  const [logos, setLogos] = useState<string[]>(() => (enabled ? prefetchedTopAddonLogos() : []));
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    prefetchTopAddonLogos().then((urls) => {
      if (!cancelled) setLogos(urls);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return logos;
}

export function HarborBoatMotion({ logos = NO_LOGOS }: { logos?: string[] }) {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full overflow-visible" aria-hidden>
      <g className="harbor-loader-boat">
        <path d="M29 67h62l-8 17H39z" fill="currentColor" opacity="0.92" />
        <path
          d="M59 31v36M62 35c15 5 23 15 25 27H62zM55 40c-10 7-16 14-19 22h19z"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        {logos.slice(0, 3).map((logo, index) => (
          <image
            key={logo}
            href={logo}
            x={43 + index * 13}
            y={70}
            width="11"
            height="11"
            preserveAspectRatio="xMidYMid meet"
            className="harbor-loader-cargo"
            style={{ animationDelay: `${index * 140}ms` }}
          />
        ))}
      </g>
      <path
        d="M20 91c12-5 22 5 34 0s22 5 34 0 18 2 22 0"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="3"
        strokeLinecap="round"
        className="harbor-loader-wave"
      />
    </svg>
  );
}

export function HarborLoader({
  size = "md",
  caption,
  className = "",
  keyed = false,
  logos,
}: {
  size?: Size;
  caption?: string;
  className?: string;
  keyed?: boolean;
  logos?: string[];
}) {
  const fetched = useTopAddonLogos(keyed && logos === undefined);
  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <div className={SIZE_CLASS[size]}>
        <HarborBoatMotion logos={logos ?? fetched} />
      </div>
      {caption && (
        <p className="mt-1 text-[12.5px] font-medium uppercase tracking-[0.18em] text-white/70">
          {caption}
        </p>
      )}
    </div>
  );
}
