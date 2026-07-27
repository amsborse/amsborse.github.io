# Visual baselines

Approved component screenshots for scoped regression comparison.

Baselines are created **only** when a human/agent runs:

```bash
npm run review:baseline:approve -- --screenshot .autoreview/screenshots/….png --component FeatureCard --route /components --state default --viewport desktop
```

Do not auto-approve the latest capture.
