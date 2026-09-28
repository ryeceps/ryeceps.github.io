import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

const snapshot = JSON.parse(await readFile(path.join(root, "data/public-repositories.json"), "utf8"));
const expectedPublicRepositories = snapshot.repositories.map((repo) => repo.name);

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
const recentNames = [...indexHtml.matchAll(/data-recent-repository="([^"]+)"/g)].map((match) => match[1]);
assert(JSON.stringify(recentNames) === JSON.stringify(expectedPublicRepositories.slice(0, 4)), "Recent repositories should match the four newest public pushes.");
assert(indexHtml.indexOf('id="about"') > indexHtml.indexOf('<main id="main-content"') && indexHtml.indexOf('id="about"') < indexHtml.indexOf('class="container dialog-panel hero-panel"'), "About Me must be the first homepage section.");
assert(indexHtml.includes(`${snapshot.repositories.length} owned repositories`), "Homepage public repository count is stale.");

const projectsHtml = htmlByPath.get("projects.html") ?? "";
const publicCards = [...projectsHtml.matchAll(
    /<li\b[^>]*data-archive-item[^>]*data-visibility="public"[^>]*>[\s\S]*?<h3>([^<]+)<\/h3>[\s\S]*?<\/article>\s*<\/li>/gi
)];
const publicNames = publicCards.map((match) => stripMarkup(match[1]));

assert(publicNames.length === snapshot.repositories.length, `Expected ${snapshot.repositories.length} public archive cards, found ${publicNames.length}.`);
assert(
    JSON.stringify(publicNames) === JSON.stringify(expectedPublicRepositories),
    "Public archive repository names or sort order do not match the generated snapshot."
);

for (const excluded of excludedPublicRepositories) {
    assert(!publicNames.includes(excluded), `Excluded public repository appears in archive: ${excluded}.`);
}

for (const match of publicCards) {
    const card = match[0];
    const name = stripMarkup(match[1]);
    const expected = snapshot.repositories.find((repo) => repo.name === name);
    assert(countMatches(card, /\bclass="language-label"/gi) === 1, `${name}: expected one primary-language label.`);
    assert(card.includes(`data-category="${expected?.category}"`), `${name}: category does not match snapshot.`);
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
