import { Link } from "react-router-dom";
import { CSSProperties, memo, MouseEvent, ReactNode, useMemo, useRef } from "react";

export type InteractiveCardDensity = "default" | "quad";

export const HUB_PAGE_CONTAINER = "max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10";
export const HUB_CARD_GRID =
  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 xl:gap-6 items-stretch";

export type InteractiveCardStatus = "active" | "coming-soon" | "sandbox" | "default";

const STATUS_LABELS: Record<InteractiveCardStatus, string> = {
  active: "Active Sandbox",
  "coming-soon": "Coming Soon",
  sandbox: "Sandbox",
  default: "Explore",
};

type ShellProps = {
  color: string;
  index?: number;
  href?: string;
  disabled?: boolean;
  className?: string;
  height?: "fixed" | "auto";
  density?: "default" | "quad";
  viewStyle?: "glass" | "nodes" | "weave";
  children: ReactNode;
};

const SHELL_DENSITY: Record<
  "default" | "quad",
  { height: string; radius: string; shadow: string; hoverShadow: string; border: string }
> = {
  default: {
    height: "h-[240px]",
    radius: "rounded-[22px]",
    shadow: "shadow-xl",
    hoverShadow: "hover:shadow-[0_12px_40px_rgba(0,0,0,0.18)]",
    border: "border-[var(--hub-card-border)] hover:border-[var(--hub-card-border-hover)]",
  },
  quad: {
    height: "h-[320px]",
    radius: "rounded-[20px]",
    shadow: "shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
    hoverShadow: "hover:shadow-[0_24px_64px_rgba(0,0,0,0.16),0_0_0_1px_rgba(2,132,199,0.14)]",
    border: "border-[var(--hub-card-border)] hover:border-[var(--hub-card-border-hover)]",
  },
};

export function InteractiveCardShell({
  color,
  index = 0,
  href,
  disabled = false,
  className = "",
  height = "fixed",
  density = "quad",
  viewStyle = "nodes",
  children,
}: ShellProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const densityStyles = SHELL_DENSITY[density];

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  }

  const heightClass =
    height === "fixed"
      ? densityStyles.height
      : density === "quad"
        ? "min-h-[320px]"
        : "min-h-[240px]";

  const variantClass =
    viewStyle === "nodes"
      ? "backdrop-blur-xl bg-[var(--color-chrome-bg)] border border-[var(--color-border)] rounded-2xl p-2 shadow-sm hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-surface)] transition-all duration-300"
      : viewStyle === "weave"
        ? "bg-[var(--color-surface)]/25 backdrop-blur-md border border-dashed border-[var(--color-border-strong)] rounded-2xl hover:border-[var(--color-accent)] hover:bg-[var(--color-surface)]/60 shadow-lg"
        : `backdrop-blur-xl bg-white/[0.03] dark:bg-black/30 border border-white/10 ${densityStyles.radius} ${densityStyles.shadow} ${densityStyles.hoverShadow}`;

  const card = (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={`hub-card-enter group relative flex flex-col overflow-hidden transition-all duration-300 ${variantClass} ${heightClass} ${disabled ? "cursor-not-allowed" : ""} ${className}`}
      style={
        {
          ["--card-index"]: index,
          background:
            viewStyle === "nodes"
              ? "transparent"
              : viewStyle === "weave"
                ? "var(--color-surface-mid)"
                : density === "quad"
                  ? "var(--hub-card-bg-gradient)"
                  : "var(--hub-card-bg)",
          ["--mouse-x"]: "50%",
          ["--mouse-y"]: "50%",
        } as CSSProperties
      }
    >
      {viewStyle === "nodes" ? (
        <div className="absolute top-3 left-4 h-[2px] w-8 group-hover:w-16 bg-[var(--color-accent)] transition-all duration-500 ease-out" />
      ) : null}
      {density === "quad" && viewStyle === "glass" ? (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(99,102,241,0.09),transparent_55%),radial-gradient(ellipse_at_80%_100%,rgba(34,211,238,0.06),transparent_50%)]" />
      ) : null}
      <div
        className={`absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/[0.01] to-white/[0.04] ${densityStyles.radius}`}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: density === "quad" ? "16px 16px" : "20px 20px",
          maskImage:
            "radial-gradient(circle 100px at var(--mouse-x) var(--mouse-y), black 18%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(circle 100px at var(--mouse-x) var(--mouse-y), black 18%, transparent 100%)",
        }}
      />
      <div
        className={`absolute top-0 inset-x-0 bg-gradient-to-r ${color} opacity-80 group-hover:opacity-100 transition-opacity duration-300 ${density === "quad" ? "h-[3px]" : "h-[2.5px]"}`}
      />
      {children}
    </div>
  );

  if (href && !disabled) {
    const isExternal =
      href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:");
    if (isExternal) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="h-full block">
          {card}
        </a>
      );
    }
    return (
      <Link to={href} className="h-full block">
        {card}
      </Link>
    );
  }

  return card;
}

export function InteractiveCardSplit({
  left,
  portal,
  density = "quad",
}: {
  left: ReactNode;
  portal?: ReactNode;
  density?: "default" | "quad";
}) {
  const pad = density === "quad" ? "p-4 pr-2.5" : "p-5 pr-3";
  const leftHover = density === "quad" ? "group-hover:w-[58%]" : "group-hover:w-[60%]";
  const portalHover = density === "quad" ? "group-hover:w-[42%]" : "group-hover:w-[40%]";

  return (
    <div className="h-full flex relative z-10 select-none items-stretch overflow-hidden">
      <div
        className={`w-full shrink-0 ${leftHover} transition-all duration-500 ease-out flex flex-col justify-between h-full ${pad}`}
      >
        {left}
      </div>
      {portal ? (
        <div
          className={`w-0 ${portalHover} opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out h-full relative border-l border-[var(--color-border)] flex items-center justify-center bg-[var(--color-surface-wash)] overflow-hidden shrink-0`}
        >
          <div className="w-full h-full transform scale-90 group-hover:scale-100 transition-transform duration-500 ease-out flex items-center justify-center">
            {portal}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function InteractiveCardHeader({
  icon,
  status = "default",
  statusLabel,
  badge,
  density = "quad",
}: {
  icon?: ReactNode;
  status?: InteractiveCardStatus;
  statusLabel?: string;
  badge?: ReactNode;
  density?: "default" | "quad";
}) {
  const label = statusLabel ?? STATUS_LABELS[status];
  const statusClass =
    status === "active" || status === "sandbox"
      ? "bg-indigo-500/12 border-indigo-400/35 text-indigo-300"
      : status === "coming-soon"
        ? "bg-slate-500/10 border-slate-500/25 text-slate-500"
        : "bg-white/5 border-white/10 text-slate-400";

  return (
    <div
      className={`flex justify-between items-start gap-2 ${density === "quad" ? "mb-2.5" : "mb-3"}`}
    >
      {icon ? (
        <div
          className={`filter drop-shadow-[0_0_10px_rgba(255,255,255,0.12)] ${density === "quad" ? "text-xl" : "text-2xl"}`}
        >
          {icon}
        </div>
      ) : (
        <span />
      )}
      {badge ?? (
        <span
          className={`uppercase font-mono tracking-wider rounded border shrink-0 ${statusClass} ${
            density === "quad" ? "text-[7px] px-1.5 py-0.5 leading-tight" : "text-[8px] px-2 py-0.5"
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
}

export function InteractiveCardBody({
  title,
  description,
  clamp = 3,
  density = "quad",
}: {
  title: string;
  description: string;
  clamp?: number;
  density?: "default" | "quad";
}) {
  const clampClass =
    clamp === 2
      ? "line-clamp-2"
      : clamp === 4
        ? "line-clamp-4"
        : clamp === 5
          ? "line-clamp-5"
          : "line-clamp-3";

  return (
    <>
      <h3
        className={`font-bold text-[var(--color-ink)] group-hover:text-[var(--color-accent)] transition-colors duration-300 ${
          density === "quad" ? "text-[13px] leading-snug mb-1" : "text-base mb-1.5"
        }`}
      >
        {title}
      </h3>
      <p
        className={`text-[var(--color-body)] leading-snug ${clampClass} ${
          density === "quad" ? "text-[10px] mb-2" : "text-[11px] leading-normal mb-3"
        }`}
      >
        {description}
      </p>
    </>
  );
}

export function InteractiveCardTags({
  tags,
  density = "quad",
}: {
  tags: string[];
  density?: "default" | "quad";
}) {
  if (tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap ${density === "quad" ? "gap-1 mb-2" : "gap-1.5 mb-3"}`}>
      {tags.map((tag) => (
        <span
          key={tag}
          className={`font-mono text-slate-500 bg-white/[0.04] border border-white/[0.06] rounded ${
            density === "quad" ? "text-[7px] px-1 py-px" : "text-[8px] px-1.5 py-0.5"
          }`}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

export function InteractiveCardFooter({
  href,
  status = "default",
  ctaLabel = "Launch Sandbox",
  footer,
  density = "quad",
}: {
  href?: string;
  status?: InteractiveCardStatus;
  ctaLabel?: string;
  footer?: ReactNode;
  density?: "default" | "quad";
}) {
  if (footer) return <div>{footer}</div>;

  if (href && (status === "active" || status === "sandbox")) {
    return (
      <div
        className={`flex items-center gap-1 font-mono uppercase tracking-wider text-indigo-300 group-hover:translate-x-1 transition-transform duration-300 ${
          density === "quad" ? "text-[9px]" : "text-[10px]"
        }`}
      >
        {ctaLabel} <span className="text-xs">➔</span>
      </div>
    );
  }

  if (status === "coming-soon") {
    return (
      <div
        className={`font-mono uppercase tracking-wider text-slate-600 ${
          density === "quad" ? "text-[9px]" : "text-[10px]"
        }`}
      >
        Research Phase
      </div>
    );
  }

  return null;
}

export type HubCardProps = {
  id: string;
  title: string;
  description: string;
  icon?: string;
  path?: string;
  href?: string;
  status?: InteractiveCardStatus;
  statusLabel?: string;
  tags: string[];
  color: string;
  renderPortalVisual?: () => ReactNode;
  footer?: ReactNode;
  index?: number;
  height?: "fixed" | "auto";
  clamp?: number;
  ctaLabel?: string;
  density?: "default" | "quad";
  viewStyle?: "glass" | "nodes" | "weave";
};

export function ContentInteractiveCard({
  color = "from-indigo-500 to-purple-600",
  index = 0,
  className = "",
  density = "quad",
  viewStyle = "nodes",
  children,
}: {
  color?: string;
  index?: number;
  className?: string;
  density?: InteractiveCardDensity;
  viewStyle?: "glass" | "nodes" | "weave";
  children: ReactNode;
}) {
  return (
    <InteractiveCardShell
      color={color}
      index={index}
      height="auto"
      density={density}
      viewStyle={viewStyle}
      className={className}
    >
      <div className="relative z-10 p-5 text-slate-300">{children}</div>
    </InteractiveCardShell>
  );
}

export const HubInteractiveCard = memo(function HubInteractiveCard({
  title,
  description,
  icon,
  path,
  href,
  status = "default",
  statusLabel,
  tags,
  color,
  renderPortalVisual,
  footer,
  index = 0,
  height = "fixed",
  clamp = 3,
  ctaLabel,
  density = "quad",
  viewStyle = "nodes",
}: HubCardProps) {
  const link = path ?? href;
  const disabled = status === "coming-soon" || !link;
  const bodyClamp = density === "quad" ? Math.max(clamp, 4) : clamp;
  const portal = useMemo(() => renderPortalVisual?.(), [renderPortalVisual]);

  return (
    <InteractiveCardShell
      color={color}
      index={index}
      href={link}
      disabled={disabled}
      height={height}
      density={density}
      viewStyle={viewStyle}
    >
      <InteractiveCardSplit
        density={density}
        left={
          <>
            <div>
              <InteractiveCardHeader
                icon={icon ? <span>{icon}</span> : undefined}
                status={status}
                statusLabel={statusLabel}
                density={density}
              />
              <InteractiveCardBody
                title={title}
                description={description}
                clamp={bodyClamp}
                density={density}
              />
            </div>
            <div>
              <InteractiveCardTags tags={tags} density={density} />
              <InteractiveCardFooter
                href={link}
                status={status}
                footer={footer}
                ctaLabel={ctaLabel}
                density={density}
              />
            </div>
          </>
        }
        portal={portal}
      />
    </InteractiveCardShell>
  );
});
