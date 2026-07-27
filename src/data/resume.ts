/**
 * EDIT HERE: Résumé summary page — skills, achievements, focus areas.
 * Set `downloadUrl` to a PDF path (e.g. `/resume.pdf` in `public/`) or a full URL; leave empty to hide the download button.
 */

export const resume = {
  executiveSummary:
    "Senior Software Engineer with 8+ years building distributed systems, security services, and production ML systems at Microsoft and Amazon. Experience spans 237K+ AI agents, 100K+ TPS, and commercial and US government cloud deployments.",

  skills: {
    languages: ["C", "C++", "C#", ".NET", "Java", "Python", "TypeScript", "JavaScript", "SQL"],
    systems: [
      "Distributed systems & microservices",
      "REST / gRPC",
      "AWS (ECS, Lambda, DynamoDB, Step Functions, SageMaker, Bedrock, Kinesis)",
      "Azure (Cosmos DB, Event Hub, Functions, Bicep)",
      "Kafka · Redis · Neo4j · Docker · Kubernetes",
    ],
    practices: [
      "AI governance & agentic risk",
      "RAG & LLM integration",
      "Observability & cost optimization",
      "SLOs & incident response",
      "Technical writing & mentoring",
    ],
  },

  achievements: [
    "Built tenant-configurable AI risk evaluation covering 237K+ agents across 13K organizations at Microsoft.",
    "Delivered quantile-regression delivery models with an estimated $28M annualized impact at Amazon.",
    "Created a typed DSL and provisioning pipeline saving 40–50 engineering weeks across Amazon teams.",
    "Cut CloudWatch costs by $250K+ per month through logging standards and shared libraries.",
    "Received Amazon Just Do It Award for Automated Service Creation tooling.",
  ],

  focusAreas: [
    "Enterprise AI governance & sovereign cloud deployments",
    "High-scale distributed systems and platform engineering",
    "Production ML, RAG pipelines, and developer productivity tooling",
  ],

  education: [
    {
      school: "Santa Clara University, Santa Clara, CA",
      degree: "Master's in Computer Science and Engineering",
      period: "Sep 2017 – Jun 2019",
      gpa: "3.77",
    },
    {
      school: "Pune Institute of Computer Technology (PICT), India",
      degree: "Bachelor's in Computer Science and Engineering",
      period: "Jun 2012 – Jun 2016",
      gpa: "3.34",
    },
  ],

  downloadUrl: "/resume.pdf",
  downloadLabel: "Download PDF",
};
