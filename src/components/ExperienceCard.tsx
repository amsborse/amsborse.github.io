import type { ExperienceEntry } from "@/data";
import { ContentInteractiveCard } from "@/components/InteractiveCard";

export function ExperienceCard({ entry, index = 0 }: { entry: ExperienceEntry; index?: number }) {
  return (
    <ContentInteractiveCard
      color="from-indigo-500 to-purple-600"
      index={index}
      className="mb-6 last:mb-0"
    >
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight text-white">
            {entry.title}
          </h3>
          <p className="mt-1 text-sm text-slate-400 font-medium">{entry.company}</p>
        </div>
        <p className="font-mono text-[10px] text-slate-500 sm:shrink-0 sm:text-right">
          {entry.start} — {entry.end}
          <span className="text-slate-600"> · </span>
          {entry.location}
        </p>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-slate-400">{entry.summary}</p>

      <div className="mt-5 border-t border-white/5 pt-4">
        <p className="text-[9px] font-mono uppercase tracking-[0.16em] text-slate-500">Outcomes</p>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-400">
          {entry.achievements.map((achievement) => (
            <li key={achievement} className="flex gap-3">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-indigo-400/60" aria-hidden />
              {achievement}
            </li>
          ))}
        </ul>
      </div>
    </ContentInteractiveCard>
  );
}
