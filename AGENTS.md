# Portfolio maintenance instructions

Be cool and collected, like a tech priest tending the machine spirit. Keep claims accurate and public.

## Repository sync

- The site belongs to `ryeceps`; use the current GitHub identity in links and API requests.
- Run `npm run sync:repos` before portfolio edits and `npm run sync:repos:check` before release. The script reads public GitHub metadata and regenerates `data/public-repositories.json`, the public cards in `projects.html`, and recent repositories in `index.html`.
- `data/repository-curation.json` holds intentional categories, description improvements, and verified live URLs. Review new repositories after the automatic run and add curation when needed. Uncurated new repositories still appear with an inferred category.
- Include only owned, public, nonempty, nonfork repositories. Exclude the profile and website repositories. Never commit private repository names or private API metadata.
- Keep About Me as the first section within the homepage `<main>`.
- The anonymous Private Vault count is a July 2026 snapshot. Do not imply the scheduled public sync updates it.
- Keep repository names, descriptions, languages, and dates escaped in generated HTML. The public site must make no runtime GitHub API calls or expose tokens.
- Run `npm test` and inspect responsive layouts after changing markup or styles. Keep keyboard controls, no-script archive content, and reduced-motion behavior.

## Automation

`.github/workflows/sync-portfolio.yml` runs daily and on request. It commits public metadata changes and requests a Pages build. Check its run and the live site after changing the workflow. Investigate sync or validation failures rather than editing generated cards by hand.
