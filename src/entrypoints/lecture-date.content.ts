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
    // Filter out chapters from API list to get only "content items" (lectures, quizzes, practice, etc.)
    // We keep the order (which is sorted by sort_order DESC -> Visual Order)
    // We are currently ignoring 'chapter' for DATE injection.
    const apiItems = allCurriculumItems.filter(item => item._class !== 'chapter');

    // Find all DOM elements that represent a curriculum item content.
    // The common factor for all content items is they are children of .ud-unstyled-list inside a panel.
    // They usually have a title element with [data-testid="course-lecture-title"].
    const domTitleElements = document.querySelectorAll('[data-testid="course-lecture-title"]');

    // Map DOM title elements to their parent container
    const domItems = Array.from(domTitleElements).map(titleEl => {
        return {
            element: titleEl.closest('.ud-block-list-item') as HTMLElement,
            title: titleEl.textContent?.trim() || ''
        };
    }).filter(item => item.element !== null);

    let apiIndex = 0;

    for (let domIndex = 0; domIndex < domItems.length; domIndex++) {
        const domItem = domItems[domIndex];

        // Safety check for API bounds
        if (apiIndex >= apiItems.length) break;

        let apiItem = apiItems[apiIndex];

        // Verification: Title match
        const isMatch = normalizeTitle(domItem.title) === normalizeTitle(apiItem.title);

        if (isMatch) {
            // Match found!
            const isDateInjected = domItem.element.dataset.wxtDateInjected === 'true';
            // Supported types: lecture, quiz, practice, asset.
            if (!isDateInjected && apiItem.created) {
                const dateString = formatDateString(apiItem.created);
                const dateEl = createLectureDateElement(dateString);

                // Find insertion point
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
            // Mismatch handling (Lookahead)
            let foundIndex = -1;
            // Look ahead up to 10 items (increased from 5 for robustness)
            for (let offset = 1; offset <= 10; offset++) {
                if (apiIndex + offset < apiItems.length) {
                    const nextApiItem = apiItems[apiIndex + offset];
                    if (normalizeTitle(domItem.title) === normalizeTitle(nextApiItem.title)) {
                        foundIndex = apiIndex + offset;
                        break;
                    }
                }
            }

            if (foundIndex !== -1) {
                // Recovered sync
                apiIndex = foundIndex;
                apiItem = apiItems[apiIndex];

                if (!domItem.element.dataset.wxtDateInjected && apiItem.created) {
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
                // Failed to match. Skip this DOM item.
            }
        }
    }
}

function normalizeTitle(t: string): string {
    return t.toLowerCase().replace(/\s+/g, ' ').trim();
}
