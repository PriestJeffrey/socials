export function HeroSignalStack() {
  const cards = [
    { title: "Broken", tone: "var(--pb-warn)", body: "Reach decay on Reels", z: 70, x: -10, y: -22 },
    { title: "Working", tone: "var(--pb-ok)", body: "Carousels save rate up", z: 36, x: 0, y: -4 },
    { title: "Next post", tone: "var(--pb-pulse)", body: "Hook + CTA draft ready", z: 8, x: 10, y: 14 },
  ];

  return (
    <div
      data-testid="landing-hero"
      className="relative mx-auto h-[260px] w-full max-w-md sm:h-[340px] lg:h-[400px]"
      style={{ perspective: "1400px" }}
    >
      {/* Quiet stage plane — atmosphere only */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[18%_6%_28%_16%] rounded-3xl border border-[var(--pb-line)]/50 opacity-40 lg:opacity-55"
        style={{
          background:
            "linear-gradient(145deg, rgba(255,255,255,0.28), rgba(228,235,231,0.08))",
          transform: "rotateX(58deg) rotateZ(-8deg)",
          boxShadow: "0 40px 80px rgba(11,31,42,0.08)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-4 left-[18%] right-[18%] h-7 opacity-70 lg:opacity-100"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(11,31,42,0.2), transparent 70%)",
          filter: "blur(8px)",
        }}
      />

      <div className="pb-hero-stack relative h-full w-full">
        {cards.map((card, i) => (
          <div
            key={card.title}
            className="pb-hero-card absolute left-1/2 top-1/2 w-[78%] rounded-2xl bg-[var(--pb-card)] p-5"
            style={{
              transform: `translate(-50%, -50%) translateX(${card.x}px) translateY(${card.y}px) translateZ(${card.z}px) rotateX(22deg) rotateY(${-24 + i * 6}deg)`,
              boxShadow:
                "0 30px 55px rgba(11,31,42,0.2), 0 1px 0 rgba(255,255,255,0.9) inset",
              opacity: 1 - i * 0.06,
            }}
          >
            <div
              className="mb-2 text-xs font-semibold uppercase tracking-wide"
              style={{ color: card.tone }}
            >
              {card.title}
            </div>
            <p className="text-sm text-[var(--pb-slate)]">{card.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
