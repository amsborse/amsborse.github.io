/**
 * EDIT HERE: Résumé summary page — skills, achievements, focus areas.
 * Set `downloadUrl` to a PDF path (e.g. `/resume.pdf` in `public/`) or a full URL; leave empty to hide the download button.
 */

export const resume = {
  executiveSummary:
    "Backend Engineer with 6+ years of experience building scalable, cloud-native systems. I’ve led high-impact projects—like an order optimization service that improved customer experience and cut operational costs by 25%. Skilled in microservices, infra-automation, and driving cross-team initiatives. Proactively led on-call reviews, design discussions, and knowledge-sharing sessions to improve system health and team alignment.",

  skills: {
    languages: ["C#", ".NET", "Java", "Python", "TypeScript", "SQL", "HTML/CSS"],
    systems: ["Distributed systems", "REST / gRPC", "Microservices", "Docker", "AWS (ECS, DynamoDB, Lambda, SageMaker, Bedrock)", "Azure (Functions, Cosmos DB, Event Hub)"],
    practices: ["SLOs & incident response", "Logging & metrics optimization", "Prompt Engineering", "Technical writing", "Mentoring"],
  },

  achievements: [
    "Designed a microservice bootstrap library that standardized service creation across Amazon teams—cutting setup time from weeks to hours and saving 40–50 weeks of developer time.",
    "Architected and deployed backend integration infrastructure for Amazon SageMaker quantile regression model, driving statistically significant annualized ~$28MM profit gain.",
    "Developed agentic risk detection and adaptive protection capabilities in Microsoft Purview to identify and flag high-risk agents based on behavioral patterns.",
    "Received Amazon Just Do It Award for developing an Automated Service Creation tool that deploys microservices on AWS within an hour.",
  ],

  focusAreas: [
    "Reliable backends & cloud architecture under real-world load",
    "Agentic risk & AI application integration (RAG, LLMs)",
    "Observability, logging, and infrastructure automation",
  ],

  /** Example: `/resume.pdf` (file in `public/`) or `https://...` */
  downloadUrl: "/resume.pdf",
  downloadLabel: "Download PDF",
};
