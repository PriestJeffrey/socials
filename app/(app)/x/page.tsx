import { XComposePanel } from "@/components/x/compose-panel";
import { getAdapter } from "@/lib/platforms";

export default function XPage() {
  const x = getAdapter("x");

  return (
    <main data-testid="x-page">
      <h1 className="font-display text-3xl font-semibold text-[var(--pb-ink)]">
        X
      </h1>
      <p
        className="mt-3 max-w-xl rounded-lg border border-[var(--pb-line)] bg-white/70 px-4 py-3 text-sm text-[var(--pb-slate)]"
        data-testid="x-honest-banner"
      >
        <span className="font-semibold text-[var(--pb-ink)]">Not auto-publish.</span>{" "}
        Pulseboard does not connect to the X API. Compose here, copy, and paste
        into X yourself.
        {x?.capabilities.manualCopy
          ? " Capability: manualCopy only."
          : null}
      </p>
      <XComposePanel />
    </main>
  );
}
