/**
 * EDIT HERE: older public repositories, listed (not archived) on the Projects page.
 * Notes come only from each repository's README; leave `note` empty when there is none.
 */
export type EarlierWork = {
  repo: string;
  title: string;
  year: number;
  /** GitHub primary language; omit when GitHub reports none. */
  language?: string;
  note?: string;
};

export const earlierWork: readonly EarlierWork[] = [
  {
    repo: "Face-Recognition",
    title: "Visual Recognition System",
    year: 2019,
    language: "Jupyter",
    note: "COEN 266 Artificial Intelligence final project.",
  },
  {
    repo: "Action-Recognition",
    title: "Action Recognition",
    year: 2019,
    language: "Jupyter",
    note: "COEN 266 Artificial Intelligence final project.",
  },
  {
    repo: "CryptArithmetic-Problem",
    title: "Cryptarithmetic Solver",
    year: 2019,
    language: "Jupyter",
  },
  {
    repo: "Principal-Component-Analysis",
    title: "Principal Component Analysis",
    year: 2019,
    language: "Jupyter",
  },
  {
    repo: "mcqjavascript",
    title: "Multiple Choice Quiz",
    year: 2019,
    language: "JavaScript",
    note: "A dynamic quiz whose questions and answers load from JSON.",
  },
  {
    repo: "Automatic-SQL-Generator",
    title: "Automatic SQL Generator",
    year: 2018,
    language: "Python",
    note: "Turns a plain English sentence into a MySQL query with a tokenizer, NER tagger and parser.",
  },
  {
    repo: "Hero-Recommendation-System-for-Dota-2",
    title: "Dota 2 Draft Intelligence",
    year: 2018,
    language: "Jupyter",
    note: "Naive Bayes draft assistant trained on 50,000 professional matches.",
  },
  { repo: "Yelp-Searching", title: "Yelp Searching", year: 2018, language: "Java" },
  { repo: "SimpleCFGParser", title: "Simple CFG Parser", year: 2018, language: "Python" },
  { repo: "ChatBot", title: "ChatBot", year: 2018, language: "Python" },
  {
    repo: "Mood-O-Meter",
    title: "Mood-O-Meter",
    year: 2017,
    language: "Java",
    note: "A follow-up to FeedMach, built after the Persistent Technothon.",
  },
  {
    repo: "FeedMach",
    title: "FeedMach",
    year: 2017,
    language: "Java",
    note: "Team project for the Persistent Technothon 2016.",
  },
  { repo: "Bear-and-Steady-Gene", title: "Bear and Steady Gene", year: 2017 },
];
