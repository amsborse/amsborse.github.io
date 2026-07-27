import { Link } from "react-router-dom";
import { ReactNode } from "react";
import { Seo } from "@/components/Seo";
import { HUB_PAGE_CONTAINER } from "@/components/InteractiveCard";

type BlobVariant = "indigo" | "blue" | "purple";

const BLOB_CLASSES: Record<BlobVariant, { top: string; bottom: string }> = {
  indigo: {
    top: "from-indigo-500/10",
    bottom: "from-purple-500/10",
  },
  blue: {
    top: "from-blue-500/10",
    bottom: "from-teal-500/10",
  },
  purple: {
    top: "from-purple-500/10",
    bottom: "from-indigo-500/10",
  },
};

type LearningHubLayoutProps = {
  seo: { title: string; description: string; path: string };
  eyebrow: string;
  title: string;
  description: string;
  backLink?: { to: string; label: string };
  blobVariant?: BlobVariant;
  toolbar?: ReactNode;
  headerMb?: string;
  children: ReactNode;
};

export function LearningHubLayout({
  seo,
  eyebrow,
  title,
  description,
  backLink,
  blobVariant = "indigo",
  toolbar,
  headerMb = "mb-12",
  children,
}: LearningHubLayoutProps) {
  const blobs = BLOB_CLASSES[blobVariant];

  return (
    <>
      <Seo title={seo.title} description={seo.description} path={seo.path} />

      <div className="hub-page">
        <div
          className={`absolute top-[-10%] left-[-15%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr ${blobs.top} to-transparent blur-[120px] pointer-events-none`}
        />
        <div
          className={`absolute bottom-[-10%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-bl ${blobs.bottom} to-transparent blur-[100px] pointer-events-none`}
        />

        <div className={HUB_PAGE_CONTAINER}>
          {backLink ? (
            <Link
              to={backLink.to}
              className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] transition-colors mb-10"
            >
              {backLink.label}
            </Link>
          ) : null}

          <header className={`text-center ${headerMb}`}>
            <p className="hub-header-enter text-[0.6875rem] font-mono tracking-[0.25em] uppercase text-[var(--color-gold)] mb-3">
              {eyebrow}
            </p>
            <h1 className="hub-header-enter hub-header-enter--1 hub-title text-[2.25rem] sm:text-[3.25rem]">
              {title}
            </h1>
            <p className="hub-header-enter hub-header-enter--2 mt-4 text-sm max-w-xl mx-auto text-[var(--color-body)] leading-relaxed">
              {description}
            </p>
          </header>

          {toolbar}

          {children}
        </div>
      </div>
    </>
  );
}
