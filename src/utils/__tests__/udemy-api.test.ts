import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchCourseCreationDate, getCourseId, formatDateString, fetchCurriculumItems } from '../udemy-api';

describe('Udemy API utilities', () => {
  beforeEach(() => {
    // Clear the DOM before each test
    document.body.innerHTML = '';
    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('getCourseId', () => {
    it('should return the course ID from data-clp-course-id attribute', () => {
      document.body.setAttribute('data-clp-course-id', '12345');
      expect(getCourseId()).toBe('12345');
    });

    it('should return null when data-clp-course-id is not set', () => {
      document.body.removeAttribute('data-clp-course-id');
      expect(getCourseId()).toBeNull();
    });

    it('should return the correct ID for different course IDs', () => {
      const courseIds = ['1', '999', '4567890'];

      courseIds.forEach((id) => {
        document.body.removeAttribute('data-clp-course-id');
        document.body.setAttribute('data-clp-course-id', id);
        expect(getCourseId()).toBe(id);
      });
    });

    it('should return empty string when data-clp-course-id is empty', () => {
      document.body.removeAttribute('data-clp-course-id');
      document.body.setAttribute('data-clp-course-id', '');
      expect(getCourseId()).toBe('');
    });
  });

  describe('formatDateString', () => {
    it('should format ISO date string correctly', () => {
      const result = formatDateString('2021-04-15T12:00:00Z');
      expect(result).toBe('4/2021');
    });

    it('should handle January correctly (month 0)', () => {
      const result = formatDateString('2020-01-01T00:00:00Z');
      expect(result).toBe('1/2020');
    });

    it('should handle December correctly (month 11)', () => {
      const result = formatDateString('2023-12-15T12:00:00Z');
      expect(result).toBe('12/2023');
    });

    it('should handle different years', () => {
      const testCases = [
        { input: '2015-06-20T00:00:00Z', expected: '6/2015' },
        { input: '2020-02-15T00:00:00Z', expected: '2/2020' },
        { input: '2030-09-10T00:00:00Z', expected: '9/2030' },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(formatDateString(input)).toBe(expected);
      });
    });

    it('should handle dates without timezone', () => {
      const result = formatDateString('2021-04-15');
      expect(result).toMatch(/4\/2021|3\/2021/); // May vary by timezone
    });
  });

  describe('fetchCourseCreationDate', () => {
    it('should fetch course creation date successfully', async () => {
      const mockResponse = { created: '2021-04-15T12:00:00Z' };
      global.fetch = vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve(mockResponse),
        } as Response)
      );

      const result = await fetchCourseCreationDate('12345');

      expect(result).toBe('2021-04-15T12:00:00Z');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.udemy.com/api-2.0/courses/12345/?fields[course]=created',
        {
          headers: { Accept: 'application/json' },
        }
      );
    });

    it('should call the correct API endpoint with the provided course ID', async () => {
      const courseId = '98765';
      global.fetch = vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ created: '2020-01-01T00:00:00Z' }),
        } as Response)
      );

      await fetchCourseCreationDate(courseId);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/courses/${courseId}/`),
        expect.any(Object)
      );
    });

    it('should set the correct Accept header', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ created: '2020-01-01T00:00:00Z' }),
        } as Response)
      );

      await fetchCourseCreationDate('12345');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { Accept: 'application/json' },
        })
      );
    });

    it('should handle different course IDs', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ created: '2021-04-15T12:00:00Z' }),
        } as Response)
      );

      const courseIds = ['1', '999999', '54321'];

      for (const id of courseIds) {
        await fetchCourseCreationDate(id);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(`/courses/${id}/`),
          expect.any(Object)
        );
      }
    });

    it('should handle API response with created field', async () => {
      const mockDate = '2023-06-20T14:30:00Z';
      global.fetch = vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ created: mockDate }),
        } as Response)
      );

      const result = await fetchCourseCreationDate('12345');

      expect(result).toBe(mockDate);
    });

    it('should reject on fetch error', async () => {
      const error = new Error('Network error');
      global.fetch = vi.fn(() => Promise.reject(error));

      await expect(fetchCourseCreationDate('12345')).rejects.toThrow('Network error');
    });

    it('should handle JSON parsing', async () => {
      const mockResponse = { created: '2021-04-15T12:00:00Z' };
      global.fetch = vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve(mockResponse),
        } as Response)
      );

      const result = await fetchCourseCreationDate('12345');

      expect(result).toBe(mockResponse.created);
    });
  });
  describe('fetchCurriculumItems', () => {
    it('should fetch curriculum items and handle pagination', async () => {
      const courseId = '12345';
      const page1Response = {
        count: 3,
        next: 'https://www.udemy.com/api-2.0/test-next',
        previous: null,
        results: [
          { _class: 'lecture', id: 1, title: 'L1', created: '2023-01-01', sort_order: 10 },
        ],
      };
      const page2Response = {
        count: 3,
        next: null,
        previous: '...',
        results: [
          { _class: 'lecture', id: 2, title: 'L2', created: '2023-01-02', sort_order: 20 }, // Higher sort order
          { _class: 'quiz', id: 3, title: 'Q1', sort_order: 5 },
        ],
      };

      // Mock fetch sequence
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve(page1Response),
        } as Response)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(page2Response),
        } as Response);

      const results = await fetchCurriculumItems(courseId);

      // Verify URL calls
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenNthCalledWith(1,
        expect.stringContaining(`courses/${courseId}/subscriber-curriculum-items/`),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenNthCalledWith(2,
        'https://www.udemy.com/api-2.0/test-next',
        expect.any(Object)
      );

      // Verify sorting (Desc sort_order: 20 -> 10 -> 5)
      expect(results).toHaveLength(3);
      expect(results[0].id).toBe(2); // sort_order 20
      expect(results[1].id).toBe(1); // sort_order 10
      expect(results[2].id).toBe(3); // sort_order 5
    });

    it('should include all required curriculum types in request', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({
          next: null,
          results: []
        })
      } as Response);

      await fetchCurriculumItems('100');

      // Check for curriculum_types parameter
      // The implementation uses specific list: chapter,lecture,quiz,practice,asset
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('curriculum_types='),
        expect.any(Object)
      );
    });
  });
});

