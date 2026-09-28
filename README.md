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
├── data/
│   ├── public-repositories.json
│   └── repository-curation.json
├── blog.html
├── blog/
│   └── prophet-rust-rewrite.html
├── styles.css
├── vendor/
│   └── psone/
├── scripts/
│   ├── sync-repositories.mjs
│   ├── test-projects.mjs
│   └── validate-site.mjs
├── .github/workflows/sync-portfolio.yml
├── AGENTS.md
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

## Repository archive and sync

The public archive is generated from the GitHub API. It includes owned, public, non-empty, non-fork repositories except the profile and website repositories. `data/public-repositories.json` is the committed public snapshot; `data/repository-curation.json` keeps reviewed categories, descriptions, and live-site URLs. New repositories appear automatically with an inferred category until reviewed.

Run `npm run sync:repos` to refresh the static archive and the homepage's four recently pushed public repositories. Run `npm run sync:repos:check` to detect drift. The site makes no runtime GitHub API calls. Descriptions and other API text are escaped before insertion into HTML.

The anonymous Private Vault panel represents 25 private repositories from the July 2026 audit. The public sync does not access private repository metadata or update that historical count. Never commit private repository names, URLs, languages, or dates. Cigarstradamus remains an intentional public-facing featured project with no private repository link.

`.github/workflows/sync-portfolio.yml` runs daily and through `workflow_dispatch`. When public metadata changes, it runs validation, commits the generated files, and requests a Pages build. Review new descriptions and categories in the curation file when practical.

## Private leakage audit

For the private leakage audit, create a temporary file outside the repository containing one excluded private repository name or URL per line. Then run:

```bash
PRIVATE_REPO_EXCLUSIONS_FILE=/absolute/path/private-repositories.txt STRICT_PRIVACY=1 npm test
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

A normal push to `main` starts the Pages build. The scheduled workflow explicitly requests a Pages build after its automated commit. Monitor the Pages deployment until it succeeds, then smoke-test:

- `/`
- `/resume.html`
- `/projects.html`
- `/blog.html`
- `/blog/prophet-rust-rewrite.html`

## Contact

- [LinkedIn](https://linkedin.com/in/ryan-bieber)
- [GitHub](https://github.com/ryeceps)

Built with passion for AI and data science.
