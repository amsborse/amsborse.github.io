import type { Finding } from "../types.ts";

/**
 * Flake control: re-run only a failing scoped check once, compare evidence,
 * mark inconsistent failures as unstable. Deterministic overlap/clipping/runtime
 * failures do not require repeated AI review.
 */
export async function withFlakeControl<T extends { findings: Finding[] }>(
  run: () => Promise<T>,
  options?: { maxRetries?: number; skipRetryForDeterministic?: boolean }
): Promise<{ result: T; retriesUsed: number; flakyEvidence: string[] }> {
  const maxRetries = options?.maxRetries ?? 1;
  const first = await run();
  const flakyEvidence: string[] = [];
  let retriesUsed = 0;

  const failing = first.findings.filter((f) => f.severity === "high" || f.severity === "critical");
  if (!failing.length) {
    return { result: first, retriesUsed: 0, flakyEvidence };
  }

  const needsRetry = failing.some((f) => {
    if (options?.skipRetryForDeterministic !== false) {
      if (
        f.source === "deterministic" &&
        (f.category === "overlap" ||
          f.category === "clipping" ||
          f.category === "runtime" ||
          f.category === "overflow")
      ) {
        return false;
      }
    }
    return f.source === "ai-critic" || f.category === "animation";
  });

  if (!needsRetry || maxRetries < 1) {
    return { result: first, retriesUsed: 0, flakyEvidence };
  }

  retriesUsed = 1;
  const second = await run();
  const firstIds = new Set(first.findings.map((f) => `${f.category}|${f.explanation}`));
  const secondIds = new Set(second.findings.map((f) => `${f.category}|${f.explanation}`));

  for (const key of firstIds) {
    if (!secondIds.has(key)) {
      flakyEvidence.push(`Unstable finding (present only in first run): ${key}`);
    }
  }
  for (const key of secondIds) {
    if (!firstIds.has(key)) {
      flakyEvidence.push(`Unstable finding (present only in retry): ${key}`);
    }
  }

  // Prefer intersection of high-severity findings
  const stableFindings = second.findings.filter((f) =>
    firstIds.has(`${f.category}|${f.explanation}`)
  );
  const unstableOnly = second.findings.filter(
    (f) => !firstIds.has(`${f.category}|${f.explanation}`)
  );
  for (const f of unstableOnly) {
    f.severity = "low";
    f.explanation = `${f.explanation} (marked unstable after flake retry)`;
  }

  return {
    result: { ...second, findings: [...stableFindings, ...unstableOnly] },
    retriesUsed,
    flakyEvidence,
  };
}
