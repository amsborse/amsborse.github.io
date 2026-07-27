/**
 * EDIT HERE: Work history — each entry is a role with bullets (achievements).
 */

import type { ExperienceEntry } from "./types";

export const experience: ExperienceEntry[] = [
  {
    id: "microsoft",
    company: "Microsoft",
    title: "Senior Software Engineer",
    location: "Redmond, WA",
    start: "Sep 2025",
    end: "Present",
    summary:
      "Enterprise AI platforms, AI governance, and sovereign cloud — C# · .NET · Azure · Cosmos DB · Event Hub · Microsoft Purview · Kusto · Bicep.",
    achievements: [
      "Built tenant-configurable detection and risk evaluation for agentic and non-agentic AI in Microsoft Purview Insider Risk Management, covering 237K+ agents across 13K organizations.",
      "Reconstructed 90 days of audit history across 40+ global forests, allowing immediate risk evaluation for newly onboarded AI agents.",
      "Led architecture and global rollout of Risk Detection, Adaptive Protection, and AI governance infrastructure across Commercial, GCC, GCCH, and DoD sovereign cloud.",
      "Engineered a regionally isolated event-driven AI-agent ingestion pipeline spanning 28 Azure regions, processing 135K+ security signals daily.",
      "Integrated Microsoft Graph, Entra, Defender, Sentinel, and Purview signals into a cross-domain correlation system for policy enforcement across enterprise environments.",
    ],
  },
  {
    id: "amazon",
    company: "Amazon",
    title: "Software Engineer 2",
    location: "Seattle, WA",
    start: "Aug 2019",
    end: "Aug 2025",
    summary:
      "Platform engineering, distributed systems, and AI infrastructure — Java · Python · AWS · Docker · ECS · Lambda · DynamoDB · Step Functions · SageMaker · Bedrock · RAG.",
    achievements: [
      "Created a typed DSL and one-click provisioning pipeline adopted by 3 teams and 40 engineers to bootstrap 50+ AWS services, saving an estimated 40–50 engineering weeks.",
      "Consolidated nine ingestion pipelines, five dependency routers, and three routing services into reusable multi-service pipelines with weighted routing and idempotent queue handling.",
      "Built a stateful AWS Step Functions service that replayed 200K+ order events daily across three regions, increasing restocked-item sales by 13%.",
      "Led development of a real-time XGBoost delivery-risk system on SageMaker, contributing to a 7% increase in global sales.",
      "Launched an LLM-assisted localization system using Amazon Bedrock, RAG, and a DynamoDB catalog across 37 templates and 28 locales.",
      "Owned SageMaker infrastructure for quantile-regression delivery-date models with rule-based fallbacks, contributing an estimated $28M in annualized impact via A/B testing.",
      "Built a dual-protocol orchestrator hosting REST and gRPC servers coordinating 16 AWS microservices at 100K+ TPS during a large-scale monolith migration.",
      "Cut CloudWatch costs by $250K+ per month through logging standards and a shared library for retention, sampling, and aggregation.",
      "Coordinated Prime Day and Black Friday readiness for 60+ services; the fleet recorded zero major event-related incidents.",
      "Reduced Sev2 incidents by 40% over two months through post-on-call reviews, alert tuning, and runbooks across 40+ services.",
    ],
  },
  {
    id: "liquiron",
    company: "Liquiron",
    title: "Software Engineering Intern",
    location: "San Jose, CA",
    start: "Dec 2018",
    end: "Jan 2019",
    summary:
      "Backend and full-stack — Node.js · Vue.js · Firebase · OAuth 2.0 · Passport.js · REST APIs.",
    achievements: [
      "Re-architected authentication using OAuth 2.0 and Passport.js, improving security, modularity, and maintainability.",
      "Migrated backend services to Firebase serverless infrastructure and developed REST APIs supporting SPA workflows, reducing server load by 36%.",
    ],
  },
  {
    id: "persistent",
    company: "Persistent Systems",
    title: "Software Engineer",
    location: "Pune, India",
    start: "Sep 2016",
    end: "Jul 2017",
    summary:
      "Machine learning and web modernization — Python · JavaScript · Node.js · CNN · AWS EC2.",
    achievements: [
      "Developed a real-time CNN-based sentiment classification system achieving 87% accuracy across seven sentiment categories.",
      "Modernized legacy web applications into a single-page architecture, improving response time by 25% and offline performance by 9%.",
    ],
  },
];
