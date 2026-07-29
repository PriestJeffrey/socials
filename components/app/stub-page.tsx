export default function StubPage({ title }: { title: string }) {
  return (
    <main data-testid="stub-page">
      <h1 className="font-display text-3xl font-semibold text-[var(--pb-ink)]">
        {title}
      </h1>
      <p className="mt-4 text-[var(--pb-slate)]">Coming in a later phase.</p>
    </main>
  );
}
