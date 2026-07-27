# Repair planner

Produce the smallest repair plan that addresses high-severity, high-confidence findings.

Rules:

- Prefer local CSS / layout fixes before restructuring
- Do not change routing architecture unless required
- Preserve GitHub Pages base path behavior
- After each repair, list which evidence is stale (screenshots, interactions, tests)
- Stop when quality gates pass or the iteration budget is exhausted
