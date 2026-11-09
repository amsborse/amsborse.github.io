export function splitExperienceSummary(summary: string) {
  const separator = " — ";
  const index = summary.indexOf(separator);
  if (index < 0) return { description: summary, technologies: [] as string[] };

  const technologyText = summary.slice(index + separator.length);
  if (!technologyText.includes("·")) {
    return { description: summary, technologies: [] as string[] };
  }

  const description = summary.slice(0, index).trim();
  const technologies = technologyText
    .split("·")
    .map((technology) => technology.trim().replace(/\.$/, ""))
    .filter(Boolean);
  return { description: description || summary, technologies };
}
