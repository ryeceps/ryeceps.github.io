import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlFiles = [
    ...await readdir(root, { withFileTypes: true })
        .then((entries) => entries
            .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
            .map((entry) => path.join(root, entry.name))),
    ...await readdir(path.join(root, "blog"), { withFileTypes: true })
        .then((entries) => entries
            .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
            .map((entry) => path.join(root, "blog", entry.name)))
];

const links = new Set();
for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    for (const match of html.matchAll(/<a\b[^>]*\bhref="(https:\/\/[^"]+)"/gi)) {
        links.add(match[1].replace(/&amp;/g, "&"));
    }
}

const checkLink = async (url) => {
    const request = async (method) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20_000);

        try {
            const response = await fetch(url, {
                method,
                redirect: "follow",
                signal: controller.signal,
                headers: {
                    "user-agent": "ryeceps-portfolio-link-check/1.0"
                }
            });

            if (response.body) {
                await response.body.cancel();
            }

            return response.status;
        } finally {
            clearTimeout(timeout);
        }
    };

    try {
        let status = await request("HEAD");
        if (status === 403 || status === 405 || status === 501) {
            status = await request("GET");
        }
        return { url, status, ok: status >= 200 && status < 400 };
    } catch (error) {
        return { url, status: null, ok: false, error: error.message };
    }
};

const pending = [...links];
const results = [];
const worker = async () => {
    while (pending.length > 0) {
        const url = pending.shift();
        results.push(await checkLink(url));
    }
};

await Promise.all(Array.from({ length: Math.min(6, pending.length) }, () => worker()));

const failures = results.filter((result) => !result.ok);
for (const result of results.sort((a, b) => a.url.localeCompare(b.url))) {
    console.log(`${result.ok ? "OK" : "FAIL"} ${result.status ?? "ERR"} ${result.url}${result.error ? ` (${result.error})` : ""}`);
}

if (failures.length > 0) {
    console.error(`External link validation failed for ${failures.length} of ${results.length} targets.`);
    process.exitCode = 1;
} else {
    console.log(`External link validation passed for ${results.length} unique targets.`);
}
