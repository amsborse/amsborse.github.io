import type { FeedbackClassification, FeedbackExtraction } from "./types.ts";

const APPROVAL_SIGNALS =
  /\b(looks good|this is better|keep this|perfect|use this style|this is what i wanted|approved|ship it|lgtm|yes keep|nice work)\b/i;

const REJECTION_SIGNALS =
  /\b(does not look good|doesn't look good|not even close|too pale|too crowded|still overlapping|not smooth|feels generic|looks generic|do not do this|don't do this|reject|revert|worse|too much information|dead[- ]looking|overlaps?\b|clipping|delay.*(too long|long)|animation is not)\b/i;

const CONSTRAINT_SIGNALS =
  /\b(do not change|don't change|keep the layout|must not|never|always|leave .+ alone|preserve)\b/i;

const MOBILE_VIEW = /\b(mobile|narrow|small screen|phone|390)\b/i;
const DESKTOP_VIEW = /\b(desktop|wide|large screen|1440)\b/i;

const OVERLAP = /\b(overlap|covers?|over the|on top of|hiding)\b/i;
const ANIMATION = /\b(animation|motion|smooth|delay|transition|framer|alive|dead)\b/i;
const GENERIC = /\b(generic|template|ai[- ]looking|unfinished)\b/i;
const CALM = /\b(calm|clean|spacious|minimal|premium|hierarchy)\b/i;
const CROWDED = /\b(crowded|too much (text|information|info)|clutter|busy)\b/i;
const EVERYWHERE =
  /\b(everywhere|across the (site|app|repo)|globally|for all components|repository[- ]wide)\b/i;

/**
 * Classify user feedback by meaning + surrounding task context.
 * Deterministic heuristic extractor (no model required).
 */
export function extractFeedback(input: {
  feedback: string;
  task?: string;
  component?: string;
  route?: string;
  files?: string[];
  beforeScreenshotDesc?: string;
  afterScreenshotDesc?: string;
  verificationPassed?: boolean;
  fixApplied?: string;
}): FeedbackExtraction {
  const text = input.feedback.trim();
  const lower = text.toLowerCase();

  let classification: FeedbackClassification = "neutral";
  const approved = APPROVAL_SIGNALS.test(text);
  const rejected = REJECTION_SIGNALS.test(text);
  const constraint = CONSTRAINT_SIGNALS.test(text);

  if (approved && rejected) classification = "mixed";
  else if (approved) classification = "approved";
  else if (
    rejected ||
    OVERLAP.test(text) ||
    (ANIMATION.test(text) && /not|too|still/.test(lower))
  ) {
    classification = rejected ? "rejected" : "correction";
  } else if (constraint) classification = "correction";
  else if (/move|place|put|reduce|increase|change|fix/i.test(text)) {
    classification = "correction";
  }

  const objectiveIssues: string[] = [];
  const subjectivePreferences: string[] = [];
  const explicitConstraints: string[] = [];
  const rejectedPatterns: string[] = [];
  const acceptedPatterns: string[] = [];
  const componentRules: string[] = [];
  const repositoryRules: string[] = [];
  const temporaryRules: string[] = [];

  if (OVERLAP.test(text)) {
    objectiveIssues.push(text);
  }
  if (/clip|overflow|broken|error|fail/i.test(text)) {
    objectiveIssues.push(text);
  }
  if (GENERIC.test(text) || CROWDED.test(text) || /pale|alive|premium/i.test(text)) {
    subjectivePreferences.push(text);
  }
  if (ANIMATION.test(text)) {
    if (/not smooth|delay|jump|dead/i.test(text)) {
      subjectivePreferences.push(text);
      rejectedPatterns.push(summarizeAvoid(text));
    } else if (approved) {
      acceptedPatterns.push(text);
    }
  }
  if (CALM.test(text)) {
    subjectivePreferences.push(text);
  }
  if (constraint) {
    explicitConstraints.push(text);
  }

  const components = input.component ? [input.component] : detectComponents(text);
  const viewports: string[] = [];
  if (MOBILE_VIEW.test(text)) viewports.push("mobile");
  if (DESKTOP_VIEW.test(text)) viewports.push("desktop");

  const globalize = EVERYWHERE.test(text);
  if (globalize && (subjectivePreferences.length || explicitConstraints.length)) {
    repositoryRules.push(...subjectivePreferences, ...explicitConstraints);
  } else if (components.length) {
    componentRules.push(
      ...objectiveIssues.map((o) => o),
      ...subjectivePreferences,
      ...explicitConstraints
    );
  } else {
    temporaryRules.push(text);
  }

  if (classification === "approved" && input.fixApplied) {
    acceptedPatterns.push(input.fixApplied);
  }
  if (classification === "rejected") {
    rejectedPatterns.push(summarizeAvoid(text));
  }

  // Objective defects can auto-accept verified resolutions without user fluff approval
  let needsUserConfirmation = true;
  if (
    objectiveIssues.length > 0 &&
    input.verificationPassed &&
    input.fixApplied &&
    (classification === "correction" || classification === "rejected")
  ) {
    needsUserConfirmation = false;
  }
  if (classification === "approved") needsUserConfirmation = false;
  if (subjectivePreferences.length && classification !== "approved") {
    needsUserConfirmation = true;
  }

  // Avoid elevating a single comment to global without evidence
  if (!globalize) {
    repositoryRules.length = 0;
  }

  const confidence = Math.min(
    0.98,
    0.55 +
      (objectiveIssues.length ? 0.2 : 0) +
      (components.length ? 0.1 : 0) +
      (viewports.length ? 0.05 : 0) +
      (classification !== "neutral" ? 0.1 : 0)
  );

  return {
    classification,
    objectiveIssues: unique(objectiveIssues),
    subjectivePreferences: unique(subjectivePreferences),
    explicitConstraints: unique(explicitConstraints),
    rejectedPatterns: unique(rejectedPatterns),
    acceptedPatterns: unique(acceptedPatterns),
    componentRules: unique(componentRules),
    repositoryRules: unique(repositoryRules),
    temporaryRules: unique(temporaryRules),
    confidence,
    needsUserConfirmation,
    detectedViewports: viewports,
    detectedComponents: components,
  };
}

function detectComponents(text: string): string[] {
  const matches = text.match(
    /\b([A-Z][A-Za-z0-9]+(?:Card|Button|Panel|Modal|Nav|Layout|Hero|Badge)?)\b/g
  );
  return unique((matches || []).filter((m) => m.length > 2 && m !== "The"));
}

function summarizeAvoid(text: string): string {
  if (OVERLAP.test(text))
    return "Overlaying badges or chrome on variable-length titles / dense content";
  if (/pale/i.test(text)) return "Washed-out / too-pale surfaces that reduce hierarchy";
  if (/generic/i.test(text)) return "Generic template-looking UI treatments";
  if (/crowded|too much/i.test(text)) return "Crowded layouts with excessive descriptive text";
  if (/smooth|delay|animation/i.test(text)) return "Delayed, abrupt, or discontinuous animation";
  return text.slice(0, 160);
}

function unique(items: string[]): string[] {
  return [...new Set(items.map((s) => s.trim()).filter(Boolean))];
}

export function classifyApprovalSignal(text: string): FeedbackClassification {
  return extractFeedback({ feedback: text }).classification;
}
