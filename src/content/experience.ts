import type { ExperienceEntry } from "./types";

/** Work history — shown on Experience and referenced from Résumé. */
export const experience: ExperienceEntry[] = [
  {
    id: "acme-platform",
    company: "Acme Platform (placeholder)",
    role: "Senior Software Engineer",
    location: "Remote",
    start: "2022",
    end: "Present",
    summary:
      "Lead backend initiatives for a high-traffic platform. Partner with product on reliability, cost, and developer velocity.",
    achievements: [
      "Reduced p99 API latency by 40% through query optimization and caching strategy.",
      "Introduced structured observability (tracing + SLOs) adopted across three teams.",
      "Mentored engineers on system design and incident response.",
    ],
  },
  {
    id: "northwind-labs",
    company: "Northwind Labs (placeholder)",
    role: "Software Engineer → Senior Software Engineer",
    location: "San Francisco, CA",
    start: "2018",
    end: "2022",
    summary:
      "Owned services for billing and usage metering. Shipped features used by enterprise customers under strict compliance constraints.",
    achievements: [
      "Designed idempotent event ingestion handling 50M+ events/day.",
      "Built internal tooling that cut deployment time for data jobs by half.",
      "Drove postmortems and reliability reviews for critical payment paths.",
    ],
  },
  {
    id: "starter-co",
    company: "Starter Co (placeholder)",
    role: "Software Engineer",
    location: "Austin, TX",
    start: "2015",
    end: "2018",
    summary:
      "Full-stack development with emphasis on APIs and PostgreSQL. Early employee; wore many hats with a focus on shipping sustainably.",
    achievements: [
      "Implemented core REST APIs and authentication for the first paid tier.",
      "Collaborated on schema design and migration strategy for major product pivot.",
    ],
  },
];
