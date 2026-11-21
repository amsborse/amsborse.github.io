import type { MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GalaxyScene,
  ImmersiveBackground,
  InfinityMark,
  InfinityScene,
  SpotlightCard,
} from "@amsborse/arsenal-fx";
import { MagneticLink } from "@amsborse/arsenal-motion";
import { Seo } from "@/components/Seo";
import { useTheme } from "@/theme/ThemeProvider";

/** The site's own amber and a violet partner, tuned per theme so both stay legible on paper. */
const PALETTE = {
  dark: { amber: "#f2a93b", violet: "#8b5cf6", background: "#07080d" },
  light: { amber: "#b45309", violet: "#6d28d9", background: "#f5f0e6" },
} as const;

const CARDS = [
  {
    title: "Spotlight",
    body: "A pool of light sits under the pointer and travels with it across the surface.",
  },
  {
    title: "Rim light",
    body: "The border brightens on the side nearest the pointer and swings round as it moves.",
  },
  {
    title: "Tilt",
    body: "The card leans a few degrees toward the pointer, then settles when it leaves.",
  },
] as const;

const linkClass =
  "inline-flex min-h-11 items-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-alt)] px-6 text-sm font-medium text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent-line)]";
const eyebrowClass =
  "block font-mono text-[0.6875rem] uppercase tracking-[0.25em] text-[var(--color-accent)]";

export default function InfinityLab() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const colors = PALETTE[theme];

  // MagneticLink renders a real anchor; keep plain clicks inside the router.
  const go = (to: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    navigate(to);
  };

  return (
    <>
      <Seo
        title="Infinity — Arsenal"
        description="The infinity symbol as a living particle scene, with pointer-aware cards, magnetic links and a spiral galaxy."
        path="/arsenal/infinity"
      />
      <div className="hub-page overflow-hidden pb-24 pt-24">
        <ImmersiveBackground palette={theme} fixed={false} zIndex={0} />

        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
          <Link
            to="/arsenal"
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-accent)]"
          >
            ← Arsenal
          </Link>

          <header className="text-center">
            <InfinityScene
              palette={theme}
              leftColor={colors.amber}
              rightColor={colors.violet}
              background={colors.background}
              className="mx-auto max-w-5xl"
            />
            <span className={`${eyebrowClass} -mt-6 sm:-mt-10`}>Arsenal // Infinity</span>
            <h1 className="hub-title mt-3 text-4xl sm:text-6xl">Infinity</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[var(--color-body)] sm:text-base">
              A particle symbol that parts around the pointer and drifts as the page scrolls. Move
              through the loop.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <MagneticLink href="/projects" onClick={go("/projects")} className={linkClass}>
                See the projects
              </MagneticLink>
              <MagneticLink
                href="/arsenal/writing"
                onClick={go("/arsenal/writing")}
                className={linkClass}
              >
                Read the writing
              </MagneticLink>
            </div>
          </header>

          <section aria-labelledby="infinity-cards" className="mt-28">
            <span className={eyebrowClass}>Pointer-aware cards</span>
            <h2
              id="infinity-cards"
              className="mt-3 font-display text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl"
            >
              Surfaces that answer the pointer
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {CARDS.map((card) => (
                <SpotlightCard
                  key={card.title}
                  palette={theme}
                  accent={colors.amber}
                  secondary={colors.violet}
                >
                  <h3 className="font-display text-lg font-semibold text-[var(--color-ink)]">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-body)]">
                    {card.body}
                  </p>
                </SpotlightCard>
              ))}
            </div>
          </section>

          <section
            aria-labelledby="infinity-mark"
            className="mt-28 grid items-center gap-10 md:grid-cols-2"
          >
            <div>
              <span className={eyebrowClass}>The mark</span>
              <h2
                id="infinity-mark"
                className="mt-3 font-display text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl"
              >
                The same symbol at logo size
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--color-body)] sm:text-base">
                A crisp two-colour stroke with a slow pulse where the loops cross, for headers,
                loaders and cards.
              </p>
            </div>
            <div className="flex items-center justify-center gap-10">
              <InfinityMark
                title="Infinity"
                palette={theme}
                leftColor={colors.amber}
                rightColor={colors.violet}
                style={{ width: 240 }}
              />
              <InfinityMark
                palette={theme}
                leftColor={colors.amber}
                rightColor={colors.violet}
                halo={false}
                style={{ width: 72 }}
              />
            </div>
          </section>
        </div>

        <section aria-labelledby="infinity-galaxy" className="relative z-10 mt-28">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
            <span className={eyebrowClass}>Spiral galaxy</span>
            <h2
              id="infinity-galaxy"
              className="mt-3 font-display text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl"
            >
              A second scene from the same kit
            </h2>
          </div>
          <GalaxyScene
            palette={theme}
            accent={colors.violet}
            background={colors.background}
            backdrop={false}
            style={{ minHeight: "clamp(420px, 70vh, 760px)" }}
          />
        </section>
      </div>
    </>
  );
}
