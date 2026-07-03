# Enable branch protection (one-time, GitHub UI)

`gh` CLI is not authenticated in this environment, so enable protection manually:

1. Open **https://github.com/amsborse/amsborse.github.io/settings/branches**
2. **Add branch protection rule** for `master`
3. Enable:
   - **Require a pull request before merging** (recommended; optional for solo work)
   - **Require status checks to pass before merging**
   - **Require branches to be up to date before merging**
4. Search and select these checks (exact names from CI workflow):
   - `Quality gate`
   - `Playwright e2e`
5. Enable **Do not allow bypassing the above settings** (if available)
6. Save

After the first CI run on `master`, checks appear in the picker. If missing, push once and re-open settings.

Optional: enable **Dependabot security updates** under Settings → Code security.
