(() => {
    const controls = document.querySelector("[data-archive-controls]");
    const search = document.querySelector("[data-archive-search]");
    const category = document.querySelector("[data-archive-category]");
    const clearButton = document.querySelector("[data-clear]");
    const resultCount = document.querySelector("[data-result-count]");
    const emptyState = document.querySelector("[data-empty-state]");
    const items = Array.from(document.querySelectorAll("[data-archive-item]"));

    if (!controls || !search || !category || !clearButton || !resultCount || !emptyState || items.length === 0) {
        return;
    }

    const normalize = (value) => value.trim().toLocaleLowerCase();

    const updateArchive = () => {
        const query = normalize(search.value);
        const selectedFilter = controls.querySelector('input[name="visibility"]:checked')?.value ?? "all";
        const selectedCategory = category.value;
        let representedCount = 0;
        let visibleEntries = 0;

        items.forEach((item) => {
            const matchesText = query === "" || normalize(item.textContent ?? "").includes(query);
            const matchesVisibility = selectedFilter === "all" || item.dataset.visibility === selectedFilter;
            const matchesCategory = selectedCategory === "all" || item.dataset.category === selectedCategory;
            const isVisible = matchesText && matchesVisibility && matchesCategory;

            item.hidden = !isVisible;

            if (isVisible) {
                visibleEntries += 1;
                representedCount += Number(item.dataset.count ?? 0);
            }
        });

        const noun = representedCount === 1 ? "repository" : "repositories";
        resultCount.textContent = `${representedCount} represented ${noun}`;
        emptyState.hidden = visibleEntries !== 0;
    };

    controls.addEventListener("submit", (event) => {
        event.preventDefault();
        updateArchive();
    });

    search.addEventListener("input", updateArchive);

    controls.addEventListener("change", (event) => {
        if ((event.target instanceof HTMLInputElement && event.target.name === "visibility") || event.target === category) {
            updateArchive();
        }
    });

    clearButton.addEventListener("click", () => {
        controls.reset();
        search.value = "";
        updateArchive();
        search.focus();
    });

    updateArchive();
})();
