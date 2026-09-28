import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

const expectedPublicRepositories = [
    "time-vs-timing",
    "libraryofbabel",
    "strength-coach",
    "registry-platform",
    "traffic-review",
    "just-a-simple-chart-bro",
    "omnissiah",
    "farseer",
    "pokemon_portfoilo",
    "geostradamus",
    "spatial_mapping",
    "smart_shopper",
    "butlerbot",
    "aoc-2024",
    "ai_researcher",
    "what_the_bill",
    "rocket_sim",
    "plex_media_server",
    "home_automation",
    "autobsts",
    "model-deployment-kubernetes",
    "SIR-model",
    "chicago-crime-predicitons",
    "Example-Docker-Repo",
    "Wow-Gold-Token-Machine",
    "Time-Series-Catch-All",
    "Weightlifting",
    "Death-Penalty",
    "BMR",
    "deploying-plumber-ibm-cloud",
    "NLP",
    "FazolisIsGod",
    "Wow-Gold"
];

const excludedPublicRepositories = [
    "headless-codex",
    "prophet",
    "etl_repo",
    "future-kubernetes",
    "Best-README-Template",
    "future-kubernetes-docker",
    "ryanbieber",
    "ryeceps.github.io"
];

const expectedRecentActivity = [
    ["time-vs-timing", "8806622078412c26a810f021e47eaf16759824d1", "2026-07-23T23:14:48Z"],
    ["time-vs-timing", "286455e83e85aa2539e49621cda09d78670978e4", "2026-07-23T20:51:29Z"],
    ["libraryofbabel", "def73c0dc50532ec0a2c26463394f2d3502c823e", "2026-07-18T17:00:20Z"],
    ["libraryofbabel", "5b130aa36f88a17caa67c5de91af04166301fff4", "2026-07-18T03:37:51Z"],
    ["libraryofbabel", "d0acc97e8ab4bec942e9db1ba6557f311b4ceec6", "2026-07-17T19:24:14Z"],
    ["just-a-simple-chart-bro", "3a43a15a9241a9582a437fe3cf72dd4f8fe63fe1", "2026-07-04T00:17:25Z"],
    ["traffic-review", "68a29eec732ea86bf8790f976344ad013755486b", "2026-07-01T02:39:13Z"],
    ["traffic-review", "5d999a36e69f0cd4a54356f032fda78223694fc9", "2026-06-30T14:42:43Z"]
];

const siteExtensions = new Set([".html", ".css", ".js"]);
const ignoredDirectories = new Set([".git", "node_modules", "screenshots"]);

const assert = (condition, message) => {
    if (!condition) {
        errors.push(message);
    }
};

const countMatches = (value, expression) => (value.match(expression) ?? []).length;

const getAttribute = (tag, name) => {
    const match = tag.match(new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)')`, "i"));
    return match?.[1] ?? match?.[2] ?? null;
};

const stripMarkup = (value) => value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const canonicalizePrivateExclusion = (value) => {
    const trimmed = value.trim();
    const githubMatch = trimmed.match(
        /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#]+)\/([^/?#]+)\/?(?:[?#].*)?$/i
    );
    let owner = "ryeceps";
    let name = trimmed;

    if (githubMatch) {
        [, owner, name] = githubMatch;
    } else if (trimmed.includes("/")) {
        const ownerNameMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
        if (!ownerNameMatch) {
            return null;
        }
        [, owner, name] = ownerNameMatch;
    }

    name = name.replace(/\.git$/i, "");

    if (
        owner.toLocaleLowerCase() !== "ryeceps"
        || !/^[A-Za-z0-9._-]+$/.test(name)
    ) {
        return null;
    }

    return {
        key: `ryeceps/${name}`.toLocaleLowerCase(),
        name
    };
};

const stripDataUrlPayloads = (value) => value
    .replace(/url\(\s*(["']?)data:[^)]*\1\s*\)/gi, " ")
    .replace(/\b(?:href|src)=(["'])data:[\s\S]*?\1/gi, " ");

const walk = async (directory) => {
    const files = [];
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
        if (ignoredDirectories.has(entry.name)) {
            continue;
        }

        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...await walk(absolute));
        } else {
            files.push(absolute);
        }
    }

    return files;
};

const allFiles = await walk(root);
const htmlFiles = allFiles.filter((file) => path.extname(file) === ".html");
const siteFiles = allFiles.filter((file) => siteExtensions.has(path.extname(file)));
const htmlByPath = new Map();

assert(htmlFiles.length === 5, `Expected 5 HTML files, found ${htmlFiles.length}.`);

for (const file of htmlFiles) {
    const relative = path.relative(root, file);
    const html = await readFile(file, "utf8");
    htmlByPath.set(relative, html);

    assert(/^<!doctype html>/i.test(html), `${relative}: missing HTML doctype.`);
    assert(/<html\b[^>]*\blang="en"/i.test(html), `${relative}: missing English language declaration.`);
    assert(countMatches(html, /<main\b/gi) === 1, `${relative}: expected exactly one main landmark.`);
    assert(countMatches(html, /<nav\b/gi) === 1, `${relative}: expected exactly one navigation landmark.`);
    assert(countMatches(html, /<footer\b/gi) === 1, `${relative}: expected exactly one footer landmark.`);
    assert(/<nav\b[^>]*\baria-label="Primary"/i.test(html), `${relative}: primary navigation needs an accessible name.`);
    assert(countMatches(html, /\baria-current="page"/gi) === 1, `${relative}: expected one aria-current page link.`);
    assert(/\bclass="[^"]*\bsite-shell\b/i.test(html), `${relative}: missing the site-shell wrapper.`);
    assert(!/\bclass="[^"]*\bicon\s+psone\b/i.test(html), `${relative}: must not display the PSone logo icon.`);
    assert(!/<img\b[^>]*\bpsone\.svg/i.test(html), `${relative}: must not display the PSone logo asset.`);

    const stylesheetTags = html.match(/<link\b[^>]*\brel="stylesheet"[^>]*>/gi) ?? [];
    const stylesheetPaths = stylesheetTags.map((tag) => getAttribute(tag, "href"));
    const vendorIndex = stylesheetPaths.findIndex((href) => href?.endsWith("vendor/psone/psone.css"));
    const siteIndex = stylesheetPaths.findIndex((href) => href?.endsWith("styles.css"));
    assert(vendorIndex >= 0, `${relative}: missing vendored PSone.css.`);
    assert(siteIndex > vendorIndex, `${relative}: site stylesheet must load after PSone.css.`);

    const resourceTags = html.match(/<(?:link|script|img)\b[^>]*>/gi) ?? [];
    for (const tag of resourceTags) {
        const reference = getAttribute(tag, tag.startsWith("<link") ? "href" : "src");
        if (!reference || /^(?:https?:|data:|#)/i.test(reference)) {
            continue;
        }

        const resourcePath = path.resolve(path.dirname(file), reference.split(/[?#]/, 1)[0]);
        try {
            await access(resourcePath);
        } catch {
            errors.push(`${relative}: missing local resource ${reference}.`);
        }
    }

    const anchorTags = html.match(/<a\b[^>]*>/gi) ?? [];
    for (const tag of anchorTags) {
        const href = getAttribute(tag, "href");
        if (!href) {
            errors.push(`${relative}: anchor without href.`);
            continue;
        }

        if (/^https:\/\//i.test(href)) {
            const target = getAttribute(tag, "target");
            const rel = (getAttribute(tag, "rel") ?? "").toLowerCase().split(/\s+/);
            assert(target === "_blank", `${relative}: external link should open in a new tab: ${href}`);
            assert(rel.includes("noopener") && rel.includes("noreferrer"), `${relative}: external link lacks noopener noreferrer: ${href}`);
            continue;
        }

        if (/^(?:#|mailto:|tel:)/i.test(href)) {
            continue;
        }

        assert(!/^http:\/\//i.test(href), `${relative}: insecure external link: ${href}`);
        const localReference = href.split(/[?#]/, 1)[0];
        if (localReference === "") {
            continue;
        }

        const targetPath = path.resolve(path.dirname(file), localReference);
        try {
            await access(targetPath);
        } catch {
            errors.push(`${relative}: broken internal link ${href}.`);
        }
    }
}

const indexHtml = htmlByPath.get("index.html") ?? "";
const activityItems = [...indexHtml.matchAll(
    /<li\b([^>]*\bdata-activity-item\b[^>]*)>([\s\S]*?)<\/li>/gi
)].map((match) => ({
    attributes: match[1],
    body: match[2]
}));
const actualRecentActivity = activityItems.map(({ attributes, body }) => {
    const tag = `<li ${attributes}>`;
    const timeTag = body.match(/<time\b[^>]*>/i)?.[0] ?? "";

    return [
        getAttribute(tag, "data-repository"),
        getAttribute(tag, "data-commit"),
        getAttribute(timeTag, "datetime")
    ];
});

assert(activityItems.length === 8, `Expected 8 recent public commits, found ${activityItems.length}.`);
assert(
    JSON.stringify(actualRecentActivity) === JSON.stringify(expectedRecentActivity),
    "Recent public commits or their chronological order do not match the July 26, 2026 snapshot."
);
assert(
    new Set(actualRecentActivity.map(([, commit]) => commit)).size === activityItems.length,
    "Recent public commits must be unique."
);
assert(
    /Updated July 26, 2026\./.test(indexHtml),
    "Recent public activity snapshot date is missing or incorrect."
);

for (const { attributes, body } of activityItems) {
    const tag = `<li ${attributes}>`;
    const repository = getAttribute(tag, "data-repository") ?? "";
    const commit = getAttribute(tag, "data-commit") ?? "";
    const expectedCommitUrl = `https://github.com/ryeceps/${repository}/commit/${commit}`;
    const shortSha = commit.slice(0, 7);

    assert(expectedPublicRepositories.includes(repository), "Recent activity references a repository outside the public archive.");
    assert(
        body.includes(`href="${expectedCommitUrl}"`),
        `Recent activity entry is missing its canonical commit URL.`
    );
    assert(
        new RegExp(`<code\\b[^>]*>${shortSha}<\\/code>`, "i").test(body),
        `Recent activity entry is missing its seven-character SHA.`
    );
    assert(!/\b(?:merge|bot|deploy|pages sync)\b/i.test(stripMarkup(body)), "Recent activity contains excluded low-signal commit text.");
}

const projectsHtml = htmlByPath.get("projects.html") ?? "";
const publicCards = [...projectsHtml.matchAll(
    /<li\b[^>]*data-archive-item[^>]*data-visibility="public"[^>]*>[\s\S]*?<h3>([^<]+)<\/h3>[\s\S]*?<\/article>\s*<\/li>/gi
)];
const publicNames = publicCards.map((match) => stripMarkup(match[1]));

assert(publicNames.length === 33, `Expected 33 public archive cards, found ${publicNames.length}.`);
assert(
    JSON.stringify(publicNames) === JSON.stringify(expectedPublicRepositories),
    "Public archive repository names or sort order do not match the July 2026 snapshot."
);

for (const excluded of excludedPublicRepositories) {
    assert(!publicNames.includes(excluded), `Excluded public repository appears in archive: ${excluded}.`);
}

for (const match of publicCards) {
    const card = match[0];
    const name = stripMarkup(match[1]);
    assert(countMatches(card, /\bclass="language-label"/gi) === 1, `${name}: expected one primary-language label.`);
    assert(new RegExp(`href="https://github\\.com/ryeceps/${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "i").test(card), `${name}: missing GitHub link.`);

    const descriptionMatch = card.match(/<p class="project-description">([\s\S]*?)<\/p>/i);
    const description = stripMarkup(descriptionMatch?.[1] ?? "");
    assert(description.length > 0, `${name}: missing description.`);
    assert(description.length <= 160, `${name}: description exceeds 160 characters.`);
    assert(!/\b(?:stars?|fork counts?|watchers?|open issues?)\b/i.test(card), `${name}: activity statistics are not allowed.`);
}

const vaultMatch = projectsHtml.match(
    /<li\b[^>]*class="[^"]*\bvault-card\b[^"]*"[^>]*data-visibility="private"[^>]*data-count="25"[^>]*>[\s\S]*?<\/article>\s*<\/li>/i
);
assert(Boolean(vaultMatch), "Missing the private vault panel with data-count 25.");

if (vaultMatch) {
    const vault = vaultMatch[0];
    assert(/Private Vault\s*\/\/\s*25 Repositories/i.test(vault), "Private vault title is incorrect.");
    assert(countMatches(vault, /<li>/gi) === 4, "Private vault must contain exactly four broad summaries.");
    assert(countMatches(vault, /<a\b/gi) === 0, "Private vault must not contain links.");
    assert(countMatches(vault, /\bclass="language-label"/gi) === 0, "Private vault must not contain language labels.");
    assert(!/\b\d{4}-\d{2}-\d{2}\b/.test(vault), "Private vault must not contain dates.");
}

const projectsScript = await readFile(path.join(root, "projects.js"), "utf8");
assert(!/\bfetch\s*\(/.test(projectsScript), "projects.js must not make runtime network requests.");
assert(!/api\.github\.com|github[_-]?token|ghp_/i.test(projectsScript), "projects.js must not contain GitHub API or token material.");

const siteStylesheet = await readFile(path.join(root, "styles.css"), "utf8");
assert(/:focus-visible\b/.test(siteStylesheet), "Site styles must provide a visible keyboard-focus treatment.");
assert(
    /:focus\s*\{[^}]*outline\s*:\s*2px/si.test(siteStylesheet),
    "Site styles must retain a keyboard-focus fallback."
);
assert(
    !/\*:focus\s*\{[^}]*outline\s*:\s*0/si.test(siteStylesheet),
    "Site styles must not erase the fallback focus outline."
);
assert(
    /input\[type="radio"\]:focus-visible\s*\+\s*\.option/.test(siteStylesheet),
    "Site styles must expose keyboard focus on themed radio controls."
);
assert(
    /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i.test(siteStylesheet),
    "Site styles must include reduced-motion overrides."
);
assert(
    /@media\s*\(\s*max-width\s*:\s*720px\s*\)/i.test(siteStylesheet),
    "Site styles must include the primary mobile breakpoint."
);
assert(
    /\ba\s*\{[^}]*text-decoration-line\s*:\s*underline/si.test(siteStylesheet),
    "Site styles must restore a non-color indicator for inline links."
);

const vendorStylesheet = path.join(root, "vendor", "psone", "psone.css");
try {
    const vendorCss = await readFile(vendorStylesheet, "utf8");
    assert(!/url\(\s*["']?https?:\/\//i.test(vendorCss), "Vendored PSone.css still contains remote asset URLs.");
} catch {
    errors.push("Missing vendor/psone/psone.css.");
}

for (const cssFile of allFiles.filter((file) => path.extname(file) === ".css")) {
    const relative = path.relative(root, cssFile);
    const css = await readFile(cssFile, "utf8");
    const urls = [...css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)].map((match) => match[2]);

    for (const url of urls) {
        if (/^(?:data:|https?:|#)/i.test(url)) {
            continue;
        }

        const assetPath = path.resolve(path.dirname(cssFile), url.split(/[?#]/, 1)[0]);
        try {
            await access(assetPath);
        } catch {
            errors.push(`${relative}: missing CSS asset ${url}.`);
        }
    }
}

const exclusionsPath = process.env.PRIVATE_REPO_EXCLUSIONS_FILE;
if (exclusionsPath) {
    const exclusionLines = (await readFile(path.resolve(exclusionsPath), "utf8"))
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line !== "" && !line.startsWith("#"));
    const canonicalExclusions = exclusionLines.map((line, index) => ({
        exclusion: canonicalizePrivateExclusion(line),
        index
    }));
    const validExclusions = canonicalExclusions.filter(({ exclusion }) => exclusion !== null);
    const uniqueExclusions = new Map();
    const siteText = (await Promise.all(siteFiles.map((file) => readFile(file, "utf8")))).join("\n");
    const nameScanText = stripDataUrlPayloads(siteText);
    const githubRepositoryReferences = new Set(
        [...siteText.matchAll(
            /(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)/gi
        )].map((match) => (
            `${match[1]}/${match[2].replace(/\.git$/i, "")}`.toLocaleLowerCase()
        ))
    );
    const approvedPublicFacingNames = new Set(["cigarstradamus"]);

    assert(
        exclusionLines.length === 25,
        `Expected exactly 25 private repository exclusions, found ${exclusionLines.length}.`
    );

    for (const { exclusion, index } of canonicalExclusions) {
        assert(
            exclusion !== null,
            `Private repository exclusion entry ${index + 1} is not a valid ryeceps repository name or GitHub URL.`
        );
    }

    for (const entry of validExclusions) {
        if (!uniqueExclusions.has(entry.exclusion.key)) {
            uniqueExclusions.set(entry.exclusion.key, entry);
        }
    }

    assert(
        uniqueExclusions.size === 25,
        `Expected 25 unique canonical private repository exclusions, found ${uniqueExclusions.size}.`
    );

    for (const { exclusion, index } of uniqueExclusions.values()) {
        const normalizedName = exclusion.name.toLocaleLowerCase();
        const namePattern = new RegExp(
            `(?:^|[^A-Za-z0-9._-])${escapeRegExp(exclusion.name)}(?=$|[^A-Za-z0-9._-])`,
            "i"
        );

        assert(
            !githubRepositoryReferences.has(exclusion.key),
            `Private repository URL leaked into site files for exclusion entry ${index + 1}.`
        );

        if (!approvedPublicFacingNames.has(normalizedName)) {
            assert(
                !namePattern.test(nameScanText),
                `Private repository name leaked into site files for exclusion entry ${index + 1}.`
            );
        }
    }

    console.log(`Privacy scan: checked ${uniqueExclusions.size} unique private repositories.`);
} else if (process.env.STRICT_PRIVACY === "1") {
    errors.push("STRICT_PRIVACY=1 requires PRIVATE_REPO_EXCLUSIONS_FILE.");
} else {
    console.log("Privacy scan: skipped (set PRIVATE_REPO_EXCLUSIONS_FILE for the private metadata audit).");
}

if (errors.length > 0) {
    console.error(`Site validation failed with ${errors.length} error(s):`);
    for (const error of errors) {
        console.error(`- ${error}`);
    }
    process.exitCode = 1;
} else {
    console.log(`Site validation passed for ${htmlFiles.length} HTML files and ${siteFiles.length} generated site files.`);
}
