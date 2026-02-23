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
            timeout = setTimeout(() => {
                injectDates(lectures);
                injectItemCountPerYear(lectures);
            }, 100);
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
// Helpers
// ---------------------------------------------------------------------------

/** Counts how many curriculum items were created in every year */
function countItemsByYear(items: CurriculumItem[]): Map<number, number> {
    const counts = new Map<number, number>();
    for (const item of items) {
        if (!item.created) continue;
        const itemYear = new Date(item.created).getFullYear();
        counts.set(itemYear, (counts.get(itemYear) || 0) + 1);
    }
    return counts;
}

// find curriculum container
function findCurriculumContainer(): HTMLElement | null {
    const selector = '[data-testid="curriculum-stats"]';
    return document.querySelector(selector);
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

function injectItemCountPerYear(allCurriculumItems: CurriculumItem[]): void {
    const counts = countItemsByYear(allCurriculumItems);
    const container = findCurriculumContainer();
    if (!container) return;
    // skip if already injected
    const identifier = 'WSRD-lecture-counts';
    if (container.querySelector(`.${identifier}`)) return;

    const countEl = document.createElement('div');
    countEl.className = identifier;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .${identifier} {
            margin-top: 12px;
            margin-bottom: 12px;
            font-size: 13px;
            color: #333;
        }
        .${identifier}-title {
            font-weight: 600;
            margin-bottom: 8px;
            color: #444;
        }
        .${identifier}-chart {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .${identifier}-row {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .${identifier}-year {
            min-width: 50px;
            font-weight: 500;
            color: #555;
        }
        .${identifier}-bar-wrapper {
            flex: 1;
            height: 20px;
            background: #f0f0f0;
            border-radius: 3px;
            overflow: hidden;
        }
        .${identifier}-bar {
            height: 100%;
            background: linear-gradient(90deg, #0a84ff 0%, #0066cc 100%);
            border-radius: 3px;
            transition: width 0.3s ease;
        }
        .${identifier}-count {
            min-width: 30px;
            text-align: right;
            font-weight: 500;
            color: #666;
        }
    `;
    document.head.appendChild(style);

    // Create chart
    const title = document.createElement('div');
    title.className = `${identifier}-title`;
    title.textContent = 'Lectures by Year';
    countEl.appendChild(title);

    const chart = document.createElement('div');
    chart.className = `${identifier}-chart`;

    const sortedEntries = Array.from(counts.entries()).sort((a, b) => a[0] - b[0]);
    const maxCount = Math.max(...sortedEntries.map(([, count]) => count));

    for (const [year, count] of sortedEntries) {
        const barPercentage = (count / maxCount) * 100;

        const row = document.createElement('div');
        row.className = `${identifier}-row`;

        const yearLabel = document.createElement('div');
        yearLabel.className = `${identifier}-year`;
        yearLabel.textContent = String(year);

        const barWrapper = document.createElement('div');
        barWrapper.className = `${identifier}-bar-wrapper`;

        const bar = document.createElement('div');
        bar.className = `${identifier}-bar`;
        bar.style.width = `${barPercentage}%`;

        barWrapper.appendChild(bar);

        const countLabel = document.createElement('div');
        countLabel.className = `${identifier}-count`;
        countLabel.textContent = String(count);

        row.appendChild(yearLabel);
        row.appendChild(barWrapper);
        row.appendChild(countLabel);
        chart.appendChild(row);
    }

    countEl.appendChild(chart);
    container.appendChild(countEl);
    console.log('Lecture counts by year:', counts);
}
