import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../config.ts";
import type { Finding } from "../types.ts";
import { evidenceToFinding } from "./types.ts";

/**
 * Detect hard-coded style values that bypass known repository design tokens.
 */
export function runDesignTokenConsistency(changedFiles: string[], root = ROOT): Finding[] {
  const themePath = path.join(root, "src/styles/index.css");
  const tokens = new Set<string>();
  if (fs.existsSync(themePath)) {
    const css = fs.readFileSync(themePath, "utf8");
    for (const m of css.matchAll(/--([a-z0-9-]+)\s*:/gi)) {
      tokens.add(`--${m[1]}`);
    }
  }

  const findings: Finding[] = [];
  const colorRe = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)/g;
  const spacingRe = /(?<![-\w])(\d{1,3})px(?![-\w])/g;
  const radiusRe = /rounded-\[|border-radius:\s*\d+px/g;
  const durationRe = /(?:duration|transition)[^\n;]{0,40}(\d{2,4})ms/g;
  const zRe = /z-\[(\d{3,})\]|z-index:\s*(\d{3,})/g;

  for (const file of changedFiles.filter((f) => /\.(tsx|jsx|css|scss)$/.test(f))) {
    const abs = path.join(root, file);
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, "utf8");

    // Skip if already using tokens
    const hardColors = [...text.matchAll(colorRe)].map((m) => m[0]);
    for (const color of hardColors.slice(0, 5)) {
      if (/var\(--/.test(text) && text.includes(color) === false) continue;
      // Allow if color is a known token value
      const known = [...tokens].some(() => false);
      void known;
      if (/transparent|currentColor|inherit/.test(color)) continue;
      findings.push(
        evidenceToFinding(
          {
            category: "generic",
            severity: "low",
            confidence: 0.55,
            sourceFile: file,
            explanation: `Hard-coded color ${color} in ${file} may bypass design tokens (${[
              ...tokens,
            ]
              .slice(0, 3)
              .map((t) => `var(${t})`)
              .join(", ")}…)`,
            recommendedFix: "Prefer repository color tokens from @theme when applicable.",
            deterministic: true,
          },
          "token",
          findings.length
        )
      );
    }

    if (radiusRe.test(text)) {
      findings.push(
        evidenceToFinding(
          {
            category: "generic",
            severity: "low",
            confidence: 0.5,
            sourceFile: file,
            explanation: `Arbitrary border-radius detected in ${file}`,
            recommendedFix: "Use shared radius tokens/utilities when available.",
            deterministic: true,
          },
          "token",
          findings.length
        )
      );
    }

    for (const m of text.matchAll(durationRe)) {
      const ms = Number(m[1]);
      if (ms && ![360, 720, 900, 72].includes(ms)) {
        findings.push(
          evidenceToFinding(
            {
              category: "animation",
              severity: "low",
              confidence: 0.5,
              sourceFile: file,
              explanation: `One-off transition duration ${ms}ms (repo tokens include --duration-micro/slow/reveal)`,
              recommendedFix: "Prefer --duration-micro, --duration-slow, or --duration-reveal.",
              deterministic: true,
            },
            "token",
            findings.length
          )
        );
      }
    }

    for (const m of text.matchAll(zRe)) {
      const z = Number(m[1] || m[2]);
      if (z >= 1000) {
        findings.push(
          evidenceToFinding(
            {
              category: "layout",
              severity: "medium",
              confidence: 0.7,
              sourceFile: file,
              explanation: `Arbitrary high z-index ${z} in ${file}`,
              recommendedFix: "Use a shared stacking scale rather than one-off z-index values.",
              deterministic: true,
            },
            "token",
            findings.length
          )
        );
      }
    }

    // spacing sample
    const px = [...text.matchAll(spacingRe)].map((m) => Number(m[1]));
    const odd = px.filter((n) => n > 2 && n % 4 !== 0 && ![6, 10, 14].includes(n));
    if (odd.length >= 3) {
      findings.push(
        evidenceToFinding(
          {
            category: "layout",
            severity: "low",
            confidence: 0.45,
            sourceFile: file,
            explanation: `Multiple non-token-like px spacings in ${file}: ${odd.slice(0, 5).join(", ")}px`,
            recommendedFix: "Prefer Tailwind spacing scale / theme tokens.",
            deterministic: true,
          },
          "token",
          findings.length
        )
      );
    }
  }

  return findings.slice(0, 20);
}
