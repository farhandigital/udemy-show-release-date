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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DomItem {
    element: HTMLElement;
    title: string;
}

export interface MatchedItem {
    element: HTMLElement;
    apiItem: CurriculumItem;
}

// ---------------------------------------------------------------------------
// Data preparation
// ---------------------------------------------------------------------------

/** Strip chapters — they don't appear as injectable DOM rows */
function getContentItems(items: CurriculumItem[]): CurriculumItem[] {
    return items.filter(item => item._class !== 'chapter');
}

// ---------------------------------------------------------------------------
// DOM querying
// ---------------------------------------------------------------------------

/** Collect all visible curriculum-item rows from the current DOM snapshot */
function getDomItems(): DomItem[] {
    // CSS-module class names contain "__course-lecture-title" as the BEM element suffix
    const titleElements = document.querySelectorAll('[class*="__course-lecture-title"]');
    return Array.from(titleElements)
        .map(titleEl => ({
            element: titleEl.closest('.ud-block-list-item') as HTMLElement,
            title: titleEl.textContent?.trim() ?? '',
        }))
        .filter(item => item.element !== null);
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

/**
 * Pairs every DOM row with its corresponding API item using a forward-sync
 * algorithm with lookahead.  DOM items that don't map to any API item are
 * silently skipped, and vice-versa.
 *
 * Exported so callers can reuse the matching result for other injection types.
 */
export function matchDomToApi(domItems: DomItem[], apiItems: CurriculumItem[]): MatchedItem[] {
    const matched: MatchedItem[] = [];
    let apiIndex = 0;

    for (const domItem of domItems) {
        if (apiIndex >= apiItems.length) break;

        if (normalizeTitle(domItem.title) === normalizeTitle(apiItems[apiIndex].title)) {
            matched.push({ element: domItem.element, apiItem: apiItems[apiIndex] });
            apiIndex++;
        } else {
            // Lookahead: maybe the API has items that are hidden in this DOM snapshot
            let foundIndex = -1;
            for (let offset = 1; offset <= 10; offset++) {
                if (apiIndex + offset < apiItems.length &&
                    normalizeTitle(domItem.title) === normalizeTitle(apiItems[apiIndex + offset].title)) {
                    foundIndex = apiIndex + offset;
                    break;
                }
            }

            if (foundIndex !== -1) {
                apiIndex = foundIndex;
                matched.push({ element: domItem.element, apiItem: apiItems[apiIndex] });
                apiIndex++;
            }
            // else: DOM item has no API counterpart — skip it
        }
    }

    return matched;
}

export function normalizeTitle(t: string): string {
    return t.toLowerCase().replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Injection
// ---------------------------------------------------------------------------

/** Inject the creation date into a single curriculum-item row */
function injectDateIntoElement(element: HTMLElement, apiItem: CurriculumItem): void {
    if (element.dataset.wxtDateInjected === 'true' || !apiItem.created) return;

    const dateEl = createLectureDateElement(formatDateString(apiItem.created));
    const row = element
        .querySelector('.ud-block-list-item-content')
        ?.querySelector('div[class*="__row"]');

    if (!row) return;

    row.appendChild(dateEl);
    element.dataset.wxtDateInjected = 'true';
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

function injectDates(allCurriculumItems: CurriculumItem[]): void {
    const apiItems = getContentItems(allCurriculumItems);
    const domItems = getDomItems();
    const matched = matchDomToApi(domItems, apiItems);

    for (const { element, apiItem } of matched) {
        injectDateIntoElement(element, apiItem);
    }
}
