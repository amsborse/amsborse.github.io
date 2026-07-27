export default {
  baseBranch: "master",

  app: {
    devCommand: "npm run dev",
    buildCommand: "npm run build",
    previewCommand: "npm run preview",
    url: "http://localhost:1111",
    basePath: "/",
    port: 1111,
  },

  scope: {
    dependencyDepth: 2,
    reverseDependencyDepth: 1,
    maxFiles: 20,
    maxRoutes: 2,
  },

  browser: {
    maxScreenshots: 6,
    maxInteractions: 5,
    fastProjects: ["chromium-desktop", "chromium-mobile"],
    thoroughProjects: [
      "chromium-desktop",
      "chromium-mobile",
      "firefox-desktop",
      "webkit-desktop",
      "reduced-motion",
    ],
    viewports: [
      { name: "mobile", width: 390, height: 844 },
      { name: "desktop", width: 1440, height: 900 },
    ],
  },

  review: {
    mode: "fast",
    defaultMode: "fast",
    allowAutomaticThoroughMode: false,
    allowAutomaticCrossBrowser: false,
    maxCriticCalls: 1,
    maxRepairIterations: 2,
    maxTestExecutionMs: 120_000,
    deterministicOnly: false,
  },

  memory: {
    maxRules: 10,
    maxRejectedPatterns: 5,
    maxHistoricalDecisions: 3,
    maxContextTokens: 4000,
  },

  visual: {
    projects: {
      fast: ["chromium-desktop", "chromium-mobile"],
      thorough: [
        "chromium-desktop",
        "chromium-mobile",
        "webkit-desktop",
        "firefox-desktop",
        "reduced-motion",
      ],
    },
    thresholds: {
      textToEdgePx: 8,
      interactiveToEdgePx: 6,
      cardContentToBorderPx: 8,
      primaryFeedbackMs: 100,
      animationStartMs: 150,
      microInteractionMs: 350,
      componentTransitionMs: 600,
      hardFeedbackMs: 250,
      layoutShiftBudget: 0.1,
      minFontPx: 12,
    },
  },

  githubPages: {
    enabled: true,
    validateBasePath: true,
    validateStaticAssets: true,
    usesHashRouter: false,
  },

  ai: {
    enabled: false,
  },
};
