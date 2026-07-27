import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { CosmicBackground } from "@/components/CosmicBackground";
import { PageHeader } from "@/components/PageHeader";

type ArsenalLabShellProps = {
  seo: { title: string; description: string; path: string };
  backLink: { to: string; label: string };
  eyebrow: string;
  title: string;
  subtitle: string;
  maxWidth?: string;
  children: ReactNode;
};

export function ArsenalLabShell({
  seo,
  backLink,
  eyebrow,
  title,
  subtitle,
  maxWidth = "max-w-5xl",
  children,
}: ArsenalLabShellProps) {
  return (
    <>
      <Seo title={seo.title} description={seo.description} path={seo.path} />
      <div className="relative min-h-screen overflow-hidden pb-32 pt-20 text-[#f1f3f7]">
        <CosmicBackground />
        <div className={`relative z-10 mx-auto px-4 sm:px-6 ${maxWidth}`}>
          <Link
            to={backLink.to}
            className="mb-10 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-slate-500 transition-colors hover:text-indigo-400"
          >
            {backLink.label}
          </Link>
          <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} className="mb-12" />
          {children}
        </div>
      </div>
    </>
  );
}
