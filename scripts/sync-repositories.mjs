import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const owner = "ryeceps";
const args = new Set(process.argv.slice(2));
const check = args.has("--check");
const curation = JSON.parse(await readFile(path.join(root, "data/repository-curation.json"), "utf8"));
const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const trimDescription = (value) => {
    const text = String(value || "Public coding experiment.").replace(/\s+/g, " ").trim();
    return text.length <= 160 ? text : `${text.slice(0, 157).trimEnd()}...`;
};
const categoryFor = (repo) => {
    const curated = curation.repositories[repo.name]?.category;
    if (curated && curation.categories[curated]) return curated;
    const words = `${repo.name} ${repo.description || ""} ${(repo.topics || []).join(" ")}`.toLowerCase();
    if (/agent|\bai\b|llm|machine.learning|neural|chatbot/.test(words)) return "ai";
    if (/data|forecast|predict|model|chart|analysis|analytics|spatial/.test(words)) return "data";
    if (/game|warcraft|pokemon|ocarina|wow|story|creative/.test(words)) return "games";
    if (/deploy|docker|kubernetes|infra|server|cloud/.test(words)) return "infrastructure";
    if (/research|experiment|advent.of.code/.test(words)) return "research";
    return "apps";
};
const headers = { Accept: "application/vnd.github+json", "User-Agent": "ryeceps-portfolio-sync" };
if (process.env.GH_TOKEN) headers.Authorization = `Bearer ${process.env.GH_TOKEN}`;
const raw = [];
for (let page = 1; ; page += 1) {
    const response = await fetch(`https://api.github.com/users/${owner}/repos?per_page=100&page=${page}&sort=pushed`, { headers });
    if (!response.ok) throw new Error(`GitHub API failed: ${response.status} ${response.statusText}`);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error("Unexpected GitHub API response");
    raw.push(...batch);
    if (batch.length < 100) break;
}
const repositories = raw.filter((repo) => repo.owner?.login?.toLowerCase() === owner && !repo.private && !repo.fork && repo.size > 0 && ![owner, `${owner}.github.io`].includes(repo.name.toLowerCase())).map((repo) => {
    if (!/^[\w.-]+$/.test(repo.name)) throw new Error(`Unsafe repository name: ${repo.name}`);
    const curated = curation.repositories[repo.name] || {};
    return {
        name: repo.name,
        description: trimDescription(curated.description || repo.description),
        language: repo.language || "Unspecified",
        category: categoryFor(repo),
        pushedAt: repo.pushed_at,
        liveUrl: curated.liveUrl || null
    };
}).sort((a, b) => b.pushedAt.localeCompare(a.pushedAt) || a.name.localeCompare(b.name));
const snapshot = `${JSON.stringify({ owner, repositories }, null, 2)}\n`;
const dates = (iso) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(iso));
const publicCards = repositories.map((repo) => `                    <li class="archive-item" data-archive-item data-visibility="public" data-category="${repo.category}" data-count="1">
                        <article class="memory-card">
                            <div class="repo-head"><span class="language-label">${escape(repo.language)}</span><h3>${escape(repo.name)}</h3></div>
                            <p class="repo-category">${escape(curation.categories[repo.category])}</p>
                            <p class="project-description">${escape(repo.description)}</p>
                            <div class="repo-actions">
                                <a href="https://github.com/${owner}/${repo.name}" target="_blank" rel="noopener noreferrer">GitHub →</a>${repo.liveUrl ? `
                                <a href="${escape(repo.liveUrl)}" target="_blank" rel="noopener noreferrer">Live site →</a>` : ""}
                            </div>
                        </article>
                    </li>`).join("\n");
const recent = repositories.slice(0, 4).map((repo) => `                    <li class="activity-entry" data-recent-repository="${repo.name}">
                        <article>
                            <div class="activity-head"><a class="activity-repo" href="https://github.com/${owner}/${repo.name}" target="_blank" rel="noopener noreferrer">${escape(repo.name)}</a><time datetime="${escape(repo.pushedAt)}">${dates(repo.pushedAt)}</time></div>
                            <h3>${escape(curation.categories[repo.category])}</h3>
                            <p>${escape(repo.description)}</p>
                        </article>
                    </li>`).join("\n");
const generatedArchive = `<!-- PUBLIC_REPOSITORIES_START -->\n${publicCards}\n                    <!-- PUBLIC_REPOSITORIES_END -->`;
const generatedRecent = `<section class="container dialog-panel" id="recent-activity" aria-labelledby="activity-title">
                <h2 class="title" id="activity-title">Recently Updated Public Repositories</h2>
                <p class="section-intro">The latest public repositories by GitHub push date. Updated automatically from public metadata.</p>
                <ol class="activity-list">
                    <!-- RECENT_REPOSITORIES_START -->
${recent}
                    <!-- RECENT_REPOSITORIES_END -->
                </ol>
            </section>`;
const replaceOnce = (input, expression, replacement, label) => {
    const matches = input.match(expression);
    if (!matches || matches.length !== 1) throw new Error(`Cannot find unique ${label} region`);
    return input.replace(expression, replacement);
};
let projects = await readFile(path.join(root, "projects.html"), "utf8");
if (projects.includes("<!-- PUBLIC_REPOSITORIES_START -->")) {
    projects = replaceOnce(projects, /<!-- PUBLIC_REPOSITORIES_START -->[\s\S]*?<!-- PUBLIC_REPOSITORIES_END -->/g, generatedArchive, "public archive");
} else {
    projects = replaceOnce(projects, /(?<=<ul class="archive-list" data-archive-list>\r?\n)[\s\S]*?(?=\s*<li class="archive-item vault-card")/g, `${generatedArchive}\n`, "original public archive");
}
projects = projects.replace(/A (?:July 2026 snapshot of 33 owned public repositories, followed by one privacy-preserving panel representing\s*25 qualifying private repositories|current public snapshot of \d+ owned repositories, followed by one privacy-preserving panel representing\s*25 private repositories from the July 2026 audit)\. Public entries are sorted by most recently pushed\./, `A current public snapshot of ${repositories.length} owned repositories, followed by one privacy-preserving panel representing\n                    25 private repositories from the July 2026 audit. Public entries are sorted by most recently pushed.`);
projects = projects.replace(/\d+ represented repositories/g, `${repositories.length + 25} represented repositories`).replace(/Archive status \/\/ \d+ represented/g, `Archive status // ${repositories.length + 25} represented`);
let index = await readFile(path.join(root, "index.html"), "utf8");
index = replaceOnce(index, /<section class="container dialog-panel" id="recent-activity"[\s\S]*?<\/section>/g, generatedRecent, "recent repositories");
index = index.replace(/\d+ owned repositories/g, `${repositories.length} owned repositories`).replace(/(?:Recent public commits through July 23, 2026|Latest public repository push: [^.]+)\./g, `Latest public repository push: ${dates(repositories[0].pushedAt)}.`).replace(/Explore \d+ Represented Repositories/g, `Explore ${repositories.length + 25} Represented Repositories`);
const files = [["data/public-repositories.json", snapshot], ["projects.html", projects], ["index.html", index]];
let changed = 0;
for (const [relative, content] of files) {
    const destination = path.join(root, relative);
    let original = "";
    try { original = await readFile(destination, "utf8"); } catch { /* New snapshot. */ }
    if (original !== content) {
        changed += 1;
        if (!check) await writeFile(destination, content);
    }
}
console.log(`${repositories.length} public repositories; ${changed} generated file(s) ${check ? "out of date" : "updated"}.`);
if (check && changed) process.exitCode = 1;
