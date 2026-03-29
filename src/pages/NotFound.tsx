import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";

export default function NotFoundPage() {
  return (
    <>
      <Seo title="Page not found" description="The page you requested does not exist." noIndex />

      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
        <p className="font-display text-6xl font-medium text-[var(--color-ink)]">404</p>
        <h1 className="mt-4 font-display text-2xl text-[var(--color-ink)]">This page doesn’t exist</h1>
        <p className="mt-3 text-[var(--color-ink-muted)]">
          The URL may be wrong, or the content moved. Try the home page or writing archive.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            to="/"
            className="rounded-md border border-[var(--color-border)] bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-[var(--color-ink)] hover:border-white/15"
          >
            Home
          </Link>
          <Link to="/writing" className="rounded-md px-5 py-2.5 text-sm text-[var(--color-accent)] hover:underline">
            Writing
          </Link>
        </div>
      </div>
    </>
  );
}
