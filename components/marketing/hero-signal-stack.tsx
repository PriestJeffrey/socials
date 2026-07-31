export function HeroSignalStack() {
  const cards = [
    {
      title: "Broken",
      tone: "var(--pb-warn)",
      body: "Reach decay on Reels",
      z: 80,
      x: -22,
      y: -36,
      ry: -28,
    },
    {
      title: "Working",
      tone: "var(--pb-ok)",
      body: "Carousels save rate up",
      z: 40,
      x: 2,
      y: -4,
      ry: -18,
    },
    {
      title: "Next post",
      tone: "var(--pb-pulse)",
      body: "Hook + CTA draft ready",
      z: 4,
      x: 20,
      y: 24,
      ry: -8,
    },
  ];

  return (
    <div
      data-testid="landing-hero"
      className="pb-hero-stage relative mx-auto h-[300px] w-full max-w-lg sm:h-[380px] lg:h-[460px]"
    >
      <div className="pb-hero-floor" aria-hidden />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-[12%] right-[12%] h-14"
        style={{
          background:
            "radial-gradient(ellipse at center, color-mix(in srgb, var(--pb-pulse) 35%, transparent), transparent 70%)",
          filter: "blur(12px)",
        }}
      />

      <div className="pb-hero-stack relative h-full w-full">
        {cards.map((card) => (
          <div
            key={card.title}
            className="pb-hero-card absolute left-1/2 top-[46%] w-[84%] rounded-2xl border border-[var(--pb-line-strong)] bg-[var(--pb-card)] p-5 sm:p-6"
            style={{
              transform: `translate(-50%, -50%) translateX(${card.x}px) translateY(${card.y}px) translateZ(${card.z}px) rotateX(24deg) rotateY(${card.ry}deg)`,
              boxShadow:
                "0 36px 64px var(--pb-shadow), 0 1px 0 var(--pb-inset) inset",
            }}
          >
            <div
              className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em]"
              style={{ color: card.tone }}
            >
              {card.title}
            </div>
            <p className="text-sm font-medium leading-snug text-[var(--pb-ink-soft)] sm:text-base">
              {card.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
