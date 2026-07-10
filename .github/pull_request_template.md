## Summary

<!-- What changed and why? Keep agent/AI PRs small and focused. -->

## Test plan

- [ ] `npm run validate` passes locally
- [ ] `npm run test:e2e` passes (required for pages, routing, layout, resume)
- [ ] Previewed in browser if UI changed

## Agent checklist

- [ ] Did not weaken coverage thresholds or skip hooks without reason
- [ ] Did not commit `dist/`, `coverage/`, or `test-results/`
- [ ] Matched existing code style and patterns
- [ ] Updated `.cursor/knowledge-graph/graph.json` if routes/pages/components changed (`npm run verify:kg`)
- [ ] Ran `npm run context:refresh` if architecture changed significantly (`.arsenal/` summaries/graph)
