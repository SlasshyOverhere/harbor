export function CardArtBackdrop({
  logo,
}: {
  logo: string | null | undefined;
  background?: string | null;
}) {
  if (!logo) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${logo})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(24px) saturate(1.4)",
          opacity: 0.16,
        }}
      />
      <div
        className="absolute inset-0 transition-opacity duration-[500ms] ease-out group-hover:opacity-[0.32]"
        style={{
          backgroundImage: `url(${logo})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.04,
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0, 0, 0, 0.36)" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, var(--color-canvas) 0%, var(--color-canvas) 38%, color-mix(in oklch, var(--color-canvas) 72%, transparent) 65%, color-mix(in oklch, var(--color-canvas) 32%, transparent) 100%)",
        }}
      />
    </div>
  );
}
