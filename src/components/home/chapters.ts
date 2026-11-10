/**
 * The home page reads as six chapters. The rail, the section ids and the tests
 * all come from this one list, so the order cannot drift between them.
 */
export type HomeChapter = { id: string; label: string };

export const homeChapters: readonly HomeChapter[] = [
  { id: "introduction", label: "Introduction" },
  { id: "experience", label: "Experience" },
  { id: "work", label: "Projects" },
  { id: "depth", label: "Engineering depth" },
  { id: "writing", label: "Writing" },
  { id: "contact", label: "Contact" },
];
