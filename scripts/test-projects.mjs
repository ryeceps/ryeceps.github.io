import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = await readFile(path.join(root, "projects.html"), "utf8");
const script = await readFile(path.join(root, "projects.js"), "utf8");
const snapshot = JSON.parse(await readFile(path.join(root, "data/public-repositories.json"), "utf8"));
const total = snapshot.repositories.length + 25;
const dom = new JSDOM(html, {
    runScripts: "outside-only",
    url: "https://example.test/projects.html"
});

dom.window.eval(script);

const document = dom.window.document;
const search = document.querySelector("[data-archive-search]");
const category = document.querySelector("[data-archive-category]");
const clear = document.querySelector("[data-clear]");
const resultCount = document.querySelector("[data-result-count]");
const emptyState = document.querySelector("[data-empty-state]");
const items = [...document.querySelectorAll("[data-archive-item]")];

const visibleItems = () => items.filter((item) => !item.hidden);
const representedCount = () => visibleItems().reduce(
    (total, item) => total + Number(item.dataset.count ?? 0),
    0
);

assert.equal(items.length, snapshot.repositories.length + 1, "The archive should have every public card and one private vault card.");
assert.equal(visibleItems().length, items.length, "Every card should be visible initially.");
assert.equal(representedCount(), total);
assert.equal(resultCount.textContent, `${total} represented repositories`);
assert.equal(emptyState.hidden, true);

search.value = "typescript";
search.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
assert.equal(visibleItems().length, snapshot.repositories.filter((repo) => repo.language.toLowerCase().includes("typescript") || repo.description.toLowerCase().includes("typescript") || repo.name.toLowerCase().includes("typescript")).length);

clear.click();
assert.equal(visibleItems().length, items.length, "Clear should restore the complete archive.");
assert.equal(representedCount(), total);
assert.equal(document.activeElement, search, "Clear should return keyboard focus to search.");
assert.equal(document.querySelector('input[name="visibility"][value="all"]').checked, true);

const privateFilter = document.querySelector('input[name="visibility"][value="private"]');
privateFilter.checked = true;
privateFilter.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
assert.equal(visibleItems().length, 1, "Private filter should show only the vault panel.");
assert.equal(representedCount(), 25, "Private vault represents 25 repositories.");
assert.equal(resultCount.textContent, "25 represented repositories");

search.value = "forecasting";
search.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
assert.equal(visibleItems().length, 1, "Private broad-summary search should retain the vault.");
assert.equal(representedCount(), 25);

search.value = "definitely-no-match";
search.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
assert.equal(visibleItems().length, 0);
assert.equal(representedCount(), 0);
assert.equal(resultCount.textContent, "0 represented repositories");
assert.equal(emptyState.hidden, false, "Empty state should be shown when nothing matches.");

clear.click();
assert.equal(visibleItems().length, items.length);
assert.equal(emptyState.hidden, true);

category.value = "games";
category.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
assert.equal(visibleItems().length, snapshot.repositories.filter((repo) => repo.category === "games").length, "Category filter should show only matching public repositories.");
clear.click();
assert.equal(visibleItems().length, items.length);

console.log("Archive control tests passed.");
