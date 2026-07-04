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

      <div className="min-h-screen relative overflow-x-hidden pb-32 pt-20 bg-transparent text-[#f1f3f7] font-sans">
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
              className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-500 hover:text-indigo-400 transition-colors mb-10"
            >
              {backLink.label}
            </Link>
          ) : null}

          <header className={`text-center ${headerMb}`}>
            <p className="hub-header-enter text-[0.6875rem] font-mono tracking-[0.25em] uppercase text-[var(--color-gold)] mb-3">
              {eyebrow}
            </p>
            <h1 className="hub-header-enter hub-header-enter--1 text-[2.25rem] sm:text-[3.25rem] font-display font-semibold tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-white via-[#e2e8f0] to-[#94a3b8]">
              {title}
            </h1>
            <p className="hub-header-enter hub-header-enter--2 mt-4 text-sm max-w-xl mx-auto text-slate-400 leading-relaxed">
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
