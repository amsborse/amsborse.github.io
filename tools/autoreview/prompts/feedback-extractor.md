# Feedback extractor

Convert repository-local user feedback into structured lessons.

## Inputs

- User feedback (verbatim meaning)
- Task description
- Before / after screenshot descriptions
- Changed files
- Component
- Route
- Verification findings
- Fix applied

## Output (JSON only)

```json
{
  "classification": "approved | rejected | mixed | correction | neutral",
  "objectiveIssues": [],
  "subjectivePreferences": [],
  "explicitConstraints": [],
  "rejectedPatterns": [],
  "acceptedPatterns": [],
  "componentRules": [],
  "repositoryRules": [],
  "temporaryRules": [],
  "confidence": 0,
  "needsUserConfirmation": false
}
```

## Rules

- Preserve the meaning of user feedback; do not paraphrase into a different intent.
- Do not exaggerate one comment into a global preference.
- Do not convert task-specific feedback into a repository-wide rule without explicit “everywhere” evidence or repeated cross-component confirmation.
- Separate objective defects (overlap, clipping, broken interaction) from subjective preferences (pale, generic, calm).
- Detect viewport-limited and component-limited scope.
- Avoid duplicating existing rules; link to previous decisions.
- Mark contradictions for review instead of silent overwrite.
- Never store emotional interpretations, personality traits, credentials, or private user data.
- A proposed fix is not an accepted preference until the user approves it or an objective defect is verified fixed.
