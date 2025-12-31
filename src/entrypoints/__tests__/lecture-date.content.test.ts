import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import lectureDateContent from '../lecture-date.content';
import type { ContentScriptContext } from '#imports';
import { createLectureDateElement } from '../../utils/dom';
import { getCourseId, fetchCurriculumItems, formatDateString } from '../../utils/udemy-api';

// Mock the WXT utilities
vi.mock('wxt/utils/content-script-ui/integrated', () => ({
    createIntegratedUi: vi.fn(),
}));

// Mock the utility functions
vi.mock('../../utils/udemy-api', () => ({
    getCourseId: vi.fn(),
    fetchCurriculumItems: vi.fn(),
    formatDateString: vi.fn(),
}));

vi.mock('../../utils/dom', () => ({
    createLectureDateElement: vi.fn(),
}));

describe('lecture-date content script', () => {
    let mockContext: ContentScriptContext;

    beforeEach(() => {
        vi.clearAllMocks();
        document.body.innerHTML = '';
        vi.useFakeTimers();

        // Setup mock context
        mockContext = {
            contentScriptName: 'lecture-date',
            isTopFrame: true,
            abortController: new AbortController(),
            locationWatcher: null,
        } as unknown as ContentScriptContext;

        // Default mocks
        vi.mocked(getCourseId).mockReturnValue('12345');
        vi.mocked(createLectureDateElement).mockImplementation((dateString) => {
            const span = document.createElement('span');
            span.textContent = `(${dateString})`;
            span.className = 'mock-date-element';
            return span;
        });
        vi.mocked(formatDateString).mockImplementation((date) => {
            const d = new Date(date);
            return `${d.getMonth() + 1}/${d.getFullYear()}`;
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const createMockDomItem = (title: string, alreadyInjected = false) => {
        const itemContainer = document.createElement('div');
        itemContainer.className = 'ud-block-list-item';
        if (alreadyInjected) {
            itemContainer.dataset.wxtDateInjected = 'true';
        }

        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'ud-block-list-item-content';

        const innerDiv = document.createElement('div');

        const rowDiv = document.createElement('div');
        rowDiv.className = 'section--row--mock'; // contains "section--row"

        const titleWrapper = document.createElement('span');
        titleWrapper.className = 'section--item-title--mock';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'section--course-lecture-title--mock';
        titleSpan.setAttribute('data-testid', 'course-lecture-title');
        titleSpan.textContent = title;

        titleWrapper.appendChild(titleSpan);
        rowDiv.appendChild(titleWrapper);
        innerDiv.appendChild(rowDiv);
        contentWrapper.appendChild(innerDiv);
        itemContainer.appendChild(contentWrapper);

        return itemContainer;
    };

    it('should inject dates for matching items', async () => {
        // Setup DOM
        const item1 = createMockDomItem('Introduction');
        const item2 = createMockDomItem('Model Measurements');
        document.body.appendChild(item1);
        document.body.appendChild(item2);

        // Setup API response
        const mockItems = [
            { _class: 'lecture', id: 1, title: 'Introduction', created: '2023-01-01T00:00:00Z', sort_order: 10 },
            { _class: 'lecture', id: 2, title: 'Model Measurements', created: '2023-02-01T00:00:00Z', sort_order: 5 }
        ];
        vi.mocked(fetchCurriculumItems).mockResolvedValue(mockItems);

        // Run script
        await lectureDateContent.main(mockContext);

        // Fast-forward timers for debounce
        vi.advanceTimersByTime(150);

        // Assertions
        expect(createLectureDateElement).toHaveBeenCalledTimes(2);
        expect(createLectureDateElement).toHaveBeenCalledWith('1/2023');
        expect(createLectureDateElement).toHaveBeenCalledWith('2/2023');

        expect(item1.querySelector('.mock-date-element')).not.toBeNull();
        expect(item2.querySelector('.mock-date-element')).not.toBeNull();
        expect(item1.dataset.wxtDateInjected).toBe('true');
        expect(item2.dataset.wxtDateInjected).toBe('true');
    });

    it('should skip non-matching DOM items and recover', async () => {
        // Setup DOM with an extra item properly simulates "Mismatch" scenario
        // DOM: [Introduction, Extra DOM Item, Model Measurements]
        // API: [Introduction, Model Measurements]

        const item1 = createMockDomItem('Introduction');
        const itemExtra = createMockDomItem('Extra DOM Item');
        const item2 = createMockDomItem('Model Measurements');

        document.body.appendChild(item1);
        document.body.appendChild(itemExtra);
        document.body.appendChild(item2);

        const mockItems = [
            { _class: 'lecture', id: 1, title: 'Introduction', created: '2023-01-01T00:00:00Z', sort_order: 10 },
            { _class: 'lecture', id: 2, title: 'Model Measurements', created: '2023-02-01T00:00:00Z', sort_order: 5 }
        ];
        vi.mocked(fetchCurriculumItems).mockResolvedValue(mockItems);

        await lectureDateContent.main(mockContext);
        vi.advanceTimersByTime(150);

        // item1 match -> inject (API index 0 -> 1)
        // itemExtra mismatch -> lookahead -> fail? 
        // Wait, logic says: 
        // 1. Match "Introduction" (DOM) vs "Introduction" (API). Matched. Index++
        // 2. Mismatch "Extra DOM Item" (DOM) vs "Model Measurements" (API).
        //    Lookahead: Does "Extra DOM Item" match any future API item? NO.
        //    Result: Skip DOM item. API index remains at "Model Measurements".
        // 3. Match "Model Measurements" (DOM) vs "Model Measurements" (API). Matched.

        // So itemExtra should NOT be injected.
        // item2 SHOULD be injected.

        expect(item1.querySelector('.mock-date-element')).not.toBeNull();
        expect(itemExtra.querySelector('.mock-date-element')).toBeNull();
        expect(item2.querySelector('.mock-date-element')).not.toBeNull();

        expect(item1.dataset.wxtDateInjected).toBe('true');
        expect(itemExtra.dataset.wxtDateInjected).toBeUndefined(); // Should be undefined or falsy
        expect(item2.dataset.wxtDateInjected).toBe('true');
    });

    it('should skip API items (hidden in DOM) and recover', async () => {
        // DOM: [Introduction, Model Measurements]
        // API: [Introduction, Hidden Quiz, Model Measurements]

        const item1 = createMockDomItem('Introduction');
        const item2 = createMockDomItem('Model Measurements');

        document.body.appendChild(item1);
        document.body.appendChild(item2);

        const mockItems = [
            { _class: 'lecture', id: 1, title: 'Introduction', created: '2023-01-01T00:00:00Z', sort_order: 10 },
            { _class: 'quiz', id: 99, title: 'Hidden Quiz', created: '2023-01-15T00:00:00Z', sort_order: 8 },
            { _class: 'lecture', id: 2, title: 'Model Measurements', created: '2023-02-01T00:00:00Z', sort_order: 5 }
        ];
        vi.mocked(fetchCurriculumItems).mockResolvedValue(mockItems);

        await lectureDateContent.main(mockContext);
        vi.advanceTimersByTime(150);

        // 1. "Introduction" == "Introduction". Match. API index 0 -> 1.
        // 2. "Model Measurements" (DOM) vs "Hidden Quiz" (API). Mismatch.
        //    Lookahead: Does "Model Measurements" match API[index+1] ("Model Measurements")? YES.
        //    Found at offset 1. 
        //    Skip API item "Hidden Quiz". API index becomes 2.
        //    Process "Model Measurements". Match. Inject.

        expect(item1.querySelector('.mock-date-element')).not.toBeNull();
        expect(item2.querySelector('.mock-date-element')).not.toBeNull();
    });

    it('should ignoring chapters in API list', async () => {
        // API returns chapters, they should be filtered out before matching
        // DOM: [Lecture 1]
        // API: [Chapter 1, Lecture 1]

        const item1 = createMockDomItem('Lecture 1');
        document.body.appendChild(item1);

        const mockItems = [
            { _class: 'chapter', id: 100, title: 'Chapter 1', sort_order: 20 },
            { _class: 'lecture', id: 1, title: 'Lecture 1', created: '2023-01-01T00:00:00Z', sort_order: 10 }
        ];
        vi.mocked(fetchCurriculumItems).mockResolvedValue(mockItems);

        await lectureDateContent.main(mockContext);
        vi.advanceTimersByTime(150);

        // Implementation essentially performs `apiItems = allItems.filter(i => i._class !== 'chapter')`
        // So API list seen by loop is [Lecture 1]
        // Match "Lecture 1" == "Lecture 1".

        expect(item1.querySelector('.mock-date-element')).not.toBeNull();
    });

    it('should not inject if already injected', async () => {
        const item1 = createMockDomItem('Introduction', true); // already injected
        document.body.appendChild(item1);

        const mockItems = [
            { _class: 'lecture', id: 1, title: 'Introduction', created: '2023-01-01T00:00:00Z', sort_order: 10 }
        ];
        vi.mocked(fetchCurriculumItems).mockResolvedValue(mockItems);

        await lectureDateContent.main(mockContext);
        vi.advanceTimersByTime(150);

        expect(createLectureDateElement).not.toHaveBeenCalled();
        // Should still match and advance API index, but no DOM manipulation
    });

    it('should handle sorting order (implementation relies on API sort)', async () => {
        // The test ensures we are passing the items in the order `fetchCurriculumItems` returns them.
        // If `fetchCurriculumItems` returns them sorted, the content script iterates them in that order.
        // Let's verify that if the API returns them in a specific order, we match respecting that order.

        const item1 = createMockDomItem('First');
        const item2 = createMockDomItem('Second');
        document.body.appendChild(item1);
        document.body.appendChild(item2);

        const mockItems = [
            { _class: 'lecture', id: 1, title: 'First', created: '2023-01-01T00:00:00Z', sort_order: 20 },
            { _class: 'lecture', id: 2, title: 'Second', created: '2023-02-01T00:00:00Z', sort_order: 10 }
        ];
        // mockResolvedValue returns them as is. The content script filters them then iterates.
        vi.mocked(fetchCurriculumItems).mockResolvedValue(mockItems);

        await lectureDateContent.main(mockContext);
        vi.advanceTimersByTime(150);

        expect(item1.querySelector('.mock-date-element')).not.toBeNull();
        expect(item2.querySelector('.mock-date-element')).not.toBeNull();
    });
});
