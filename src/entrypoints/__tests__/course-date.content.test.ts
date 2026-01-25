import { describe, it, expect, beforeEach, vi } from 'vitest';
import courseDate from '../course-date.content';
import type { ContentScriptContext } from '#imports';

// Mock the WXT utilities
vi.mock('wxt/utils/content-script-ui/integrated', () => ({
  createIntegratedUi: vi.fn(),
}));

// Mock the utility functions
vi.mock('../../utils/udemy-api', () => ({
  getCourseId: vi.fn(),
  fetchCourseCreationDate: vi.fn(),
  formatDateString: vi.fn(),
}));

vi.mock('../../utils/dom', () => ({
  createDateElement: vi.fn(),
}));

import { createIntegratedUi } from 'wxt/utils/content-script-ui/integrated';
import {
  getCourseId,
  fetchCourseCreationDate,
  formatDateString,
} from '../../utils/udemy-api';
import { createDateElement } from '../../utils/dom';

describe('course-date content script', () => {
  let mockAutoMount: ReturnType<typeof vi.fn>;
  let mockOnMount: ((container: HTMLElement) => void) | undefined;
  let mockContext: ContentScriptContext;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock context with required properties
    mockContext = {
      contentScriptName: 'course-date',
      isTopFrame: true,
      abortController: new AbortController(),
      locationWatcher: null,
    } as unknown as ContentScriptContext;

    // Setup mock autoMount with correct signature
    mockAutoMount = vi.fn(() => {});

    // Setup mock createIntegratedUi to capture onMount callback
    vi.mocked(createIntegratedUi).mockImplementation((ctx, options) => {
      mockOnMount = options.onMount;
      return {
        autoMount: mockAutoMount as any,
        wrapper: document.createElement('div'),
        mounted: false,
        mount: vi.fn(),
        remove: vi.fn(),
      } as any;
    });

    // Setup default mock implementations
    vi.mocked(getCourseId).mockReturnValue(null);
    vi.mocked(fetchCourseCreationDate).mockResolvedValue('2021-04-15T12:00:00Z');
    vi.mocked(formatDateString).mockReturnValue('4/2021');
    vi.mocked(createDateElement).mockReturnValue(document.createElement('div'));
  });

  describe('edge cases and error handling', () => {
    it('should do nothing when no course ID is found', async () => {
      vi.mocked(getCourseId).mockReturnValue(null);

      await courseDate.main(mockContext);

      // No UI should be created when course ID is missing
      expect(createIntegratedUi).not.toHaveBeenCalled();
      expect(fetchCourseCreationDate).not.toHaveBeenCalled();
    });

    it('should propagate API errors (no try-catch in implementation)', async () => {
      vi.mocked(getCourseId).mockReturnValue('12345');
      vi.mocked(fetchCourseCreationDate).mockRejectedValue(new Error('API Error'));

      // The current implementation doesn't catch this error - it propagates up
      // This documents current behavior; consider adding graceful error handling
      await expect(courseDate.main(mockContext)).rejects.toThrow('API Error');
    });
  });

  describe('successful date display flow', () => {
    it('should successfully create and mount date element with correct data', async () => {
      const courseId = '99999';
      const rawDate = '2023-06-20T14:30:00Z';
      const formattedDate = '6/2023';

      vi.mocked(getCourseId).mockReturnValue(courseId);
      vi.mocked(fetchCourseCreationDate).mockResolvedValue(rawDate);
      vi.mocked(formatDateString).mockReturnValue(formattedDate);

      const mockDateElement = document.createElement('div');
      mockDateElement.textContent = `Created ${formattedDate}`;
      vi.mocked(createDateElement).mockReturnValue(mockDateElement);

      await courseDate.main(mockContext);

      // Verify UI was configured correctly
      expect(createIntegratedUi).toHaveBeenCalledWith(
        mockContext,
        expect.objectContaining({
          position: 'inline',
          anchor: '[class*="last-updated-languages-container"]',
          append: 'first',
        })
      );

      // Verify UI mounting was triggered
      expect(mockAutoMount).toHaveBeenCalled();

      // Simulate the onMount callback being called
      const mockContainer = document.createElement('div');
      mockOnMount?.(mockContainer);

      // Verify the date element was created with correct date
      expect(createDateElement).toHaveBeenCalledWith(formattedDate);
      
      // Verify container has correct styling and contains date element
      expect(mockContainer.style.display).toBe('contents');
      expect(mockContainer.contains(mockDateElement)).toBe(true);
      
      // Verify the actual content is what we expect
      expect(mockContainer.textContent).toContain(formattedDate);
    });

    it('should properly integrate the date element into the UI anchor point', async () => {
      vi.mocked(getCourseId).mockReturnValue('12345');
      
      await courseDate.main(mockContext);

      // Verify it's configured to inject at the correct location
      const createUiCall = vi.mocked(createIntegratedUi).mock.calls[0];
      expect(createUiCall[1].anchor).toBe('[class*="last-updated-languages-container"]');
      expect(createUiCall[1].append).toBe('first'); // Should appear first in the meta section
      expect(createUiCall[1].position).toBe('inline'); // Should be inline with existing elements
    });
  });
});
