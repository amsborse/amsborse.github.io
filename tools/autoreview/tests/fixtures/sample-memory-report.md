# Sample memory-aware review report

> Verification completed for the current task scope.

**Task:** Improve component showcase cards  
**Mode:** fast  
**Gates passed:** yes

## Routes reviewed

- `/components`

## Routes not opened

- `/unrelated`

## Repository memory

- Memory tokens used: 173
- Rules loaded:
  - `featurecard-…`: The action badge overlaps the title on mobile. Move it below the title.
- Historical decisions applied:
  - `decision-…`: badge flow layout accepted after deterministic verification
- New feedback captured: feedback-…
- Rules created: featurecard-…
- Rejected patterns added: anti-overlap-featurecard
- Conflicts detected: (none)
- Rules requiring confirmation: (none for verified objective overlap; pale/generic remains observation until user approves)
- Applicable rules by component:
  - **FeatureCard**:
    - Do not overlay badges on variable-length titles
    - Keep interactive previews visually dominant (once approved)

This report does **not** claim the entire application has been verified.
