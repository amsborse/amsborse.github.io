# Repository agent memory

Local design-memory for coding agents working in this repo.

## What is stored

- Explicit user corrections and approvals
- Rejected / approved UI patterns
- Component, route, interaction, and animation lessons
- Historical decisions with sources

## What is NOT stored

- Personal emotional interpretations or personality profiles
- Credentials, env vars, or private user data
- Unrelated conversation content

## Layout

| Path                       | Purpose                                        | Git?                |
| -------------------------- | ---------------------------------------------- | ------------------- |
| `preferences.json`         | Evidence-based preferences only                | yes                 |
| `design-principles.md`     | Manual durable principles (highest precedence) | yes                 |
| `anti-patterns.md`         | Rejected patterns                              | yes                 |
| `index.json`               | Retrieval index                                | yes                 |
| `decisions/`               | Accepted/rejected decision records             | yes                 |
| `components/`              | Component + animation rules                    | yes                 |
| `routes/`, `interactions/` | Scoped notes                                   | yes                 |
| `feedback/processed/`      | Structured feedback                            | optional            |
| `feedback/raw/`            | Temporary raw inputs                           | **no** (gitignored) |
| `screenshot-manifests/`    | Screenshot path manifests                      | **no** (gitignored) |

## Commands

```bash
npm run memory:add -- --feedback "..." --component FeatureCard --route /components
npm run memory:list
npm run memory:search -- --component FeatureCard
npm run memory:search -- --tag animation
npm run memory:review
npm run memory:compact
npm run memory:reindex
```

## Manual edit / delete

1. Edit or delete rules in `.agent-memory/components/*.json`
2. Edit `design-principles.md` / `anti-patterns.md`
3. Run `npm run memory:reindex`

Do not train or fine-tune a model from this memory. Agents must retrieve only relevant slices (≤10 rules, ≤5 anti-patterns, ≤3 decisions, ≤4000 tokens).
