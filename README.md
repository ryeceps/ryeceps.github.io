# Ryan Bieber's Personal Website

A responsive, PS1-era portfolio and blog showcasing work in agentic AI, production ML, and decision intelligence.

Live site: [ryeceps.github.io](https://ryeceps.github.io)

## Structure

```text
ryeceps.github.io/
├── index.html
├── resume.html
├── projects.html
├── projects.js
├── blog.html
├── blog/
│   └── prophet-rust-rewrite.html
├── styles.css
├── vendor/
│   └── psone/
├── scripts/
│   ├── test-projects.mjs
│   └── validate-site.mjs
├── package.json
└── README.md
```

The site is static HTML, CSS, and JavaScript. The Projects archive is fully present in `projects.html`; JavaScript only adds search and filtering, so the archive remains readable when scripts are unavailable.

## PSone.css dependency

[PSone.css](https://github.com/micah5/PSone.css) is vendored at commit [`edc8d352`](https://github.com/micah5/PSone.css/commit/edc8d352c539e3df5f831ffce4958c0cfd5fa4ad) under `vendor/psone/`.

- The original stylesheet, required fonts/assets, source commit marker, and MIT license are stored locally.
- Remote font and asset references in the upstream stylesheet are rewritten to local paths.
- Every page loads `vendor/psone/psone.css` before `styles.css`.
- `styles.css` deliberately overrides PSone.css's global body, paragraph, focus, input, radio, and responsive defaults.

PSone.css is copyright its contributors and distributed under the [MIT license](vendor/psone/LICENSE).

## Repository archive rules

The archive is a manual July 2026 snapshot representing 58 repositories:

- 33 public repository cards.
- One anonymous `PRIVATE VAULT // 25 REPOSITORIES` panel representing 25 private repositories.

A public repository qualifies when it is owned by `ryeceps`, non-empty, and not a fork. The profile repository and this website repository are excluded. Public cards are sorted by `pushed_at`, most recent first.

Descriptions follow this order:

1. Use the GitHub repository description when present.
2. Otherwise derive one sentence of at most 160 characters from public README or source material.
3. Use `Public coding experiment` only if the public material does not establish a clear purpose.

Each public card contains only its name, concise description, primary-language label, GitHub link, and an optional project-specific live-site link. Stars, forks, issue counts, and activity statistics are intentionally omitted.

Private repository contents are never inspected. Qualifying private repositories must be owned by `ryeceps`, non-empty, and not externally owned collaborations. The site exposes no private repository names, URLs, languages, dates, or per-category counts. It uses only four broad, metadata-level summaries:

- Applied ML and forecasting.
- Automation and productivity tools.
- Consumer applications.
- Data and deployment infrastructure.

Cigarstradamus is an intentional exception only as an already public-facing featured project name and summary. Its expired live URL and private repository name/URL are not linked or added to the archive.

No GitHub API or token is used at runtime.

## Recent public activity

The homepage includes a static, public-only snapshot of eight recent commits. This shows ongoing work without making visitors' browsers call GitHub or exposing a token.

Activity entries must:

- Come from an owned, public, non-empty, non-fork repository.
- Exclude the profile and website repositories.
- Use commits from the repository's default branch.
- Have GitHub's commit `author.login` set to `ryeceps`.
- Exclude merge commits, bots, deployment triggers, Pages synchronization, and low-signal maintenance.
- Be sorted by committed timestamp descending, with no more than three entries per repository.
- Include the repository, first-line subject, absolute `<time datetime>`, seven-character display SHA, and canonical full-SHA commit URL.

Refresh the snapshot monthly or after a meaningful public release. Update the eight `data-activity-item` entries and the visible snapshot date in `index.html`, then run the full validation suite. Commit messages are untrusted input and must be HTML-escaped before being added.

## Maintaining the archive

1. Collect repository metadata outside the site runtime.
2. Apply the rules above and verify the totals.
3. Sort qualifying public repositories by `pushed_at` descending.
4. Update the static cards in `projects.html`. Keep `data-visibility="public"` and `data-count="1"` on each public entry.
5. Update the private vault's represented total in its title and `data-count` only. Do not add private names or metadata to committed files.
6. Update the archive intro, initial `aria-live` count, footer count, expected names in `scripts/validate-site.mjs`, and archive tests when totals change.
7. Run the complete validation suite.

For the private leakage audit, create a temporary file outside the repository containing one excluded private repository name or URL per line. Then run:

```bash
PRIVATE_REPO_EXCLUSIONS_FILE=/absolute/path/private-repositories.txt \
STRICT_PRIVACY=1 \
npm test
```

The validator scans generated `.html`, `.css`, and `.js` files. Keep the exclusion file private and never commit it. The approved public-facing Cigarstradamus display name is permitted, but its GitHub URL is still rejected.

## Local development and validation

Install the pinned validation-only dependencies:

```bash
npm install
```

Run the HTML, internal link/resource, archive-count, privacy-ready, accessibility-rule, and control tests:

```bash
npm test
```

Check every unique external target when network access is available:

```bash
npm run validate:external
```

Serve the repository root for browser testing:

```bash
python3 -m http.server 8000
```

Then open `http://127.0.0.1:8000/`. Check Portfolio, Resume, Projects, Blog, and the article at desktop and mobile widths, with keyboard navigation, reduced motion, and JavaScript disabled.

While the local server is running, verify every page and referenced stylesheet, script, font, and icon response:

```bash
npm run validate:local -- http://127.0.0.1:8000/
```

## Deployment

This user site deploys through GitHub Pages from the `main` branch and repository root (`/`).

In GitHub, the expected Pages configuration is:

- **Source:** Deploy from a branch.
- **Branch:** `main`.
- **Folder:** `/ (root)`.

A push to `main` starts the Pages build. Monitor the repository's Pages deployment until it succeeds, then smoke-test:

- `/`
- `/resume.html`
- `/projects.html`
- `/blog.html`
- `/blog/prophet-rust-rewrite.html`

## Contact

- [LinkedIn](https://linkedin.com/in/ryan-bieber)
- [GitHub](https://github.com/ryeceps)

Built with passion for AI and data science.
