import { getCourseId, fetchCurriculumItems, formatDateString, CurriculumItem } from '../utils/udemy-api';
import { createLectureDateElement } from '../utils/dom';

export default defineContentScript({
    matches: ['*://www.udemy.com/course/*'],
    async main() {
        const courseId = getCourseId();
        if (!courseId) return;

        let lectures: CurriculumItem[] = [];
        try {
            lectures = await fetchCurriculumItems(courseId);
        } catch (e) {
            console.error('Failed to fetch curriculum', e);
            return;
        }

        if (!lectures || lectures.length === 0) return;

        // Debounce function for the observer
        let timeout: ReturnType<typeof setTimeout>;
        const runInjection = () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => injectDates(lectures), 100);
        };

        const observer = new MutationObserver(runInjection);
        observer.observe(document.body, { childList: true, subtree: true });

        // Initial run
        runInjection();
    },
});

function injectDates(allCurriculumItems: CurriculumItem[]) {
    // Filter out chapters from API list to get only "content items" (lectures, quizzes, etc.)
    // We keep the order (which is sorted by sort_order DESC -> Visual Order)
    const apiItems = allCurriculumItems.filter(item => item._class !== 'chapter');

    // Find all DOM elements that represent a curriculum item (lecture or quiz)
    // Quizzes and Lectures both have [data-testid="course-lecture-title"]
    const domTitleElements = document.querySelectorAll('[data-testid="course-lecture-title"]');

    // Map DOM title elements to their parent container (.ud-block-list-item)
    const domItems = Array.from(domTitleElements).map(titleEl => {
        return {
            element: titleEl.closest('.ud-block-list-item') as HTMLElement,
            title: titleEl.textContent?.trim() || ''
        };
    }).filter(item => item.element !== null);

    // Iterate in parallel
    // API list and DOM list should match 1-to-1 in length and order (ignoring hidden/unrendered items if any?)
    // The user says: "content of the DOM is still entirely the same" (even if collapsed).
    // So we expect strict alignment.

    // Note: There might be edge cases where API returns more items (hidden/draft?) or DOM has fewer.
    // We will use a flexible pointer index for API.

    let apiIndex = 0;

    for (let domIndex = 0; domIndex < domItems.length; domIndex++) {
        const domItem = domItems[domIndex];
        if (domItem.element.dataset.wxtDateInjected) {
            // If already injected, we still need to advance our API pointer to keep sync!
            // But multiple runs might be confusing if we blindly advance.
            // Ideally we re-calculate or just check if the current apiIndex matches.

            // If we are mostly injecting once or handling updates:
            // We should verify if the current domItem matches the current apiItem.
        }

        // Try to match with current API item
        if (apiIndex >= apiItems.length) break;

        let apiItem = apiItems[apiIndex];

        // Verification: Title match
        // We normalize simple things like case or whitespace just in case.
        // DOM uses "Introduction", API uses "Introduction". 
        // They should match exactly or closely.
        const isMatch = normalizeTitle(domItem.title) === normalizeTitle(apiItem.title);

        if (isMatch) {
            // Match found!
            if (!domItem.element.dataset.wxtDateInjected && apiItem._class === 'lecture' && apiItem.created) {
                const dateString = formatDateString(apiItem.created);
                const dateEl = createLectureDateElement(dateString);

                // Find insertion point: inside .ud-block-list-item-content, append to title row or meta row?
                // User's previous code appended to `section--row--...`
                const contentContainer = domItem.element.querySelector('.ud-block-list-item-content');
                if (contentContainer) {
                    const row = contentContainer.querySelector('div[class*="section--row"]');
                    if (row) {
                        row.appendChild(dateEl);
                        domItem.element.dataset.wxtDateInjected = 'true';
                    }
                }
            }
            // Advance API pointer
            apiIndex++;
        } else {
            // Mismatch!
            // It's possible DOM is missing an item (unsupported type?) or API has extra.
            // Or maybe just a slightly different title.
            // Strategy: Look ahead in API list to find this DOM item?
            // Or just skip this DOM item and hope next one matches?

            // Let's look ahead up to 5 items in API list
            let foundIndex = -1;
            for (let offset = 1; offset <= 5; offset++) {
                if (apiIndex + offset < apiItems.length) {
                    const nextApiItem = apiItems[apiIndex + offset];
                    if (normalizeTitle(domItem.title) === normalizeTitle(nextApiItem.title)) {
                        foundIndex = apiIndex + offset;
                        break;
                    }
                }
            }

            if (foundIndex !== -1) {
                // We found the DOM item further down in API list.
                // This means API had some items that are NOT in DOM (e.g. unpublished lectures?).
                // Skip API items up to foundIndex.
                apiIndex = foundIndex;
                // Now process the match (same logic as above)
                apiItem = apiItems[apiIndex];
                if (!domItem.element.dataset.wxtDateInjected && apiItem._class === 'lecture' && apiItem.created) {
                    const dateString = formatDateString(apiItem.created);
                    const dateEl = createLectureDateElement(dateString);
                    const contentContainer = domItem.element.querySelector('.ud-block-list-item-content');
                    if (contentContainer) {
                        const row = contentContainer.querySelector('div[class*="section--row"]');
                        if (row) {
                            row.appendChild(dateEl);
                            domItem.element.dataset.wxtDateInjected = 'true';
                        }
                    }
                }
                apiIndex++;
            } else {
                // Could not find this DOM item in near future of API list.
                // Maybe the DOM item is not in API? (Unlikely)
                // OR the title is just very different?
                // We just skip this DOM item and keep API index same (try to match next DOM item with current API item).
                // console.warn(`Could not match DOM item "${domItem.title}" to API sequence.`);
            }
        }
    }
}

function normalizeTitle(t: string): string {
    return t.toLowerCase().replace(/\s+/g, ' ').trim();
}
