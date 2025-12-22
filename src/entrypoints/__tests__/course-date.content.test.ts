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
    document.body.innerHTML = '';

    // Setup mock context with required properties
    mockContext = {
      contentScriptName: 'course-date',
      isTopFrame: true,
      abortController: new AbortController(),
      locationWatcher: null,
    } as unknown as ContentScriptContext;

    // Setup mock autoMount
    mockAutoMount = vi.fn();

    // Setup mock createIntegratedUi to capture onMount callback
    vi.mocked(createIntegratedUi).mockImplementation((ctx, options) => {
      mockOnMount = options.onMount;
      return {
        autoMount: mockAutoMount,
        wrapper: document.createElement('div'),
        mounted: false,
        mount: vi.fn(),
        remove: vi.fn(),
      };
    });

    // Setup default mock implementations
    vi.mocked(getCourseId).mockReturnValue(null);
    vi.mocked(fetchCourseCreationDate).mockResolvedValue('2021-04-15T12:00:00Z');
    vi.mocked(formatDateString).mockReturnValue('4/2021');
    vi.mocked(createDateElement).mockReturnValue(document.createElement('div'));
  });

  it('should return early if no course ID is found', async () => {
    vi.mocked(getCourseId).mockReturnValue(null);

    await courseDate.main(mockContext);

    expect(createIntegratedUi).not.toHaveBeenCalled();
  });

  it('should fetch course creation date when course ID exists', async () => {
    const courseId = '12345';
    vi.mocked(getCourseId).mockReturnValue(courseId);

    await courseDate.main(mockContext);

    expect(fetchCourseCreationDate).toHaveBeenCalledWith(courseId);
  });

  it('should format the date string', async () => {
    const courseId = '12345';
    const rawDate = '2021-04-15T12:00:00Z';
    vi.mocked(getCourseId).mockReturnValue(courseId);
    vi.mocked(fetchCourseCreationDate).mockResolvedValue(rawDate);

    await courseDate.main(mockContext);

    expect(formatDateString).toHaveBeenCalledWith(rawDate);
  });

  it('should create integrated UI with correct options', async () => {
    vi.mocked(getCourseId).mockReturnValue('12345');

    await courseDate.main(mockContext);

    expect(createIntegratedUi).toHaveBeenCalledWith(
      mockContext,
      expect.objectContaining({
        position: 'inline',
        anchor: '.clp-lead__element-meta',
        append: 'first',
      })
    );
  });

  it('should call autoMount on the UI', async () => {
    vi.mocked(getCourseId).mockReturnValue('12345');

    await courseDate.main(mockContext);

    expect(mockAutoMount).toHaveBeenCalled();
  });

  it('should call onMount with correct container setup', async () => {
    vi.mocked(getCourseId).mockReturnValue('12345');
    const mockDateElement = document.createElement('div');
    vi.mocked(createDateElement).mockReturnValue(mockDateElement);

    await courseDate.main(mockContext);

    // Trigger the onMount callback
    const mockContainer = document.createElement('div');
    mockOnMount?.(mockContainer);

    expect(mockContainer.style.display).toBe('contents');
    expect(mockContainer.contains(mockDateElement)).toBe(true);
  });

  it('should create date element with formatted date', async () => {
    const courseId = '12345';
    const formattedDate = '4/2021';
    vi.mocked(getCourseId).mockReturnValue(courseId);
    vi.mocked(formatDateString).mockReturnValue(formattedDate);

    await courseDate.main(mockContext);

    // Trigger the onMount callback to test date element creation
    const mockContainer = document.createElement('div');
    mockOnMount?.(mockContainer);

    expect(createDateElement).toHaveBeenCalledWith(formattedDate);
  });

  it('should handle the full flow correctly', async () => {
    const courseId = '99999';
    const rawDate = '2023-06-20T14:30:00Z';
    const formattedDate = '6/2023';

    vi.mocked(getCourseId).mockReturnValue(courseId);
    vi.mocked(fetchCourseCreationDate).mockResolvedValue(rawDate);
    vi.mocked(formatDateString).mockReturnValue(formattedDate);

    const mockDateElement = document.createElement('div');
    vi.mocked(createDateElement).mockReturnValue(mockDateElement);

    await courseDate.main(mockContext);

    // Verify the sequence of calls
    expect(getCourseId).toHaveBeenCalled();
    expect(fetchCourseCreationDate).toHaveBeenCalledWith(courseId);
    expect(formatDateString).toHaveBeenCalledWith(rawDate);
    expect(createIntegratedUi).toHaveBeenCalled();
    expect(mockAutoMount).toHaveBeenCalled();

    // Trigger onMount and verify container setup and date element creation
    const mockContainer = document.createElement('div');
    mockOnMount?.(mockContainer);
    
    expect(createDateElement).toHaveBeenCalledWith(formattedDate);
    expect(mockContainer.style.display).toBe('contents');
    expect(mockContainer.contains(mockDateElement)).toBe(true);
  });
});
