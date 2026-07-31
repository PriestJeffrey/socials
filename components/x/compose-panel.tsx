"use client";

import { useState } from "react";

const LIMIT = 280;

export function XComposePanel({ initialText = "" }: { initialText?: string }) {
  const [text, setText] = useState(initialText.slice(0, LIMIT));
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remaining = LIMIT - text.length;

  async function copyToClipboard() {
    setError(null);
    setCopied(false);
    if (!text.trim()) {
      setError("Write something before copying.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setError("Clipboard blocked - select the text and copy manually.");
    }
  }

  return (
    <div className="pb-panel pb-panel-3d mt-6 max-w-xl rounded-2xl p-6" data-testid="x-compose">
      <label htmlFor="x-draft" className="text-sm font-medium text-[var(--pb-ink)]">
        Draft for X
      </label>
      <textarea
        id="x-draft"
        data-testid="x-draft"
        value={text}
        onChange={(e) => {
          setText(e.target.value.slice(0, LIMIT));
          setCopied(false);
        }}
        rows={6}
        className="pb-input resize-y"
        placeholder="Write the post you’ll paste into X…"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p
          className="text-xs text-[var(--pb-slate)]"
          data-testid="x-char-count"
        >
          {remaining} left
        </p>
        <button
          type="button"
          data-testid="x-copy"
          onClick={copyToClipboard}
          className="pb-btn pb-btn-primary"
        >
          Copy to clipboard
        </button>
      </div>
      {copied ? (
        <p className="mt-3 text-sm text-[var(--pb-ok)]" data-testid="x-copied">
          Copied - paste into X. Pulseboard does not auto-publish.
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-[var(--pb-warn)]" data-testid="x-copy-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
