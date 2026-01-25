import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchCourseCreationDate, formatDateString, fetchCurriculumItems, getCourseId } from '../udemy-api';

describe('Udemy API utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    document.body.removeAttribute('data-clp-course-id');
  });

  describe('getCourseId', () => {
    it('should return null when no extraction method succeeds', () => {
      // Empty DOM with no course ID markers
      expect(getCourseId()).toBeNull();
    });

    it('should extract from data-clp-course-id attribute (Method 1)', () => {
      document.body.setAttribute('data-clp-course-id', '12345');
      expect(getCourseId()).toBe('12345');
    });

    it('should extract from report-abuse link (Method 2)', () => {
      const link = document.createElement('a');
      link.setAttribute('data-purpose', 'report-abuse-link');
      link.href = 'https://example.com/report?related_object_id=67890';
      document.body.appendChild(link);
      
      expect(getCourseId()).toBe('67890');
    });

    it('should extract from JSON-LD structured data (Method 3)', () => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-purpose', 'safely-set-inner-html:course-landing-page/seo-info');
      script.textContent = JSON.stringify({
        '@graph': [{
          '@type': 'Course',
          image: 'https://img-c.udemycdn.com/course/480x270/2015076_2944_8.jpg'
        }]
      });
      document.body.appendChild(script);
      
      expect(getCourseId()).toBe('2015076');
    });

    it('should return null when JSON-LD is malformed', () => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-purpose', 'safely-set-inner-html:course-landing-page/seo-info');
      script.textContent = 'not valid json';
      document.body.appendChild(script);
      
      expect(getCourseId()).toBeNull();
    });

    it('should prioritize methods in order (Method 1 before Method 2)', () => {
      // Set up both methods
      document.body.setAttribute('data-clp-course-id', '11111');
      const link = document.createElement('a');
      link.setAttribute('data-purpose', 'report-abuse-link');
      link.href = 'https://example.com/report?related_object_id=22222';
      document.body.appendChild(link);
      
      // Method 1 should win
      expect(getCourseId()).toBe('11111');
    });
  });

  describe('formatDateString', () => {
    it('should handle month edge cases correctly', () => {
      // January (month 0 in JS)
      expect(formatDateString('2020-01-01T00:00:00Z')).toBe('1/2020');
      
      // December (month 11 in JS)
      expect(formatDateString('2023-12-15T12:00:00Z')).toBe('12/2023');
    });

    it('should handle dates without explicit timezone', () => {
      // This may vary by system timezone, so we check it's reasonable
      const result = formatDateString('2021-04-15');
      expect(result).toMatch(/^(3|4)\/2021$/); // Could be March or April depending on timezone
    });

    it('should handle edge case years', () => {
      expect(formatDateString('1970-06-15T00:00:00Z')).toBe('6/1970');
      expect(formatDateString('2099-06-15T23:59:59Z')).toBe('6/2099');
    });
  });

  describe('fetchCourseCreationDate', () => {
    it('should handle successful API response', async () => {
      const mockResponse = { created: '2021-04-15T12:00:00Z' };
      global.fetch = vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve(mockResponse),
        } as Response)
      );

      const result = await fetchCourseCreationDate('12345');
      expect(result).toBe('2021-04-15T12:00:00Z');
    });

    it('should throw on network error', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

      await expect(fetchCourseCreationDate('12345')).rejects.toThrow('Network error');
    });

    it('should handle malformed JSON response', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          json: () => Promise.reject(new Error('Invalid JSON')),
        } as Response)
      );

      await expect(fetchCourseCreationDate('12345')).rejects.toThrow('Invalid JSON');
    });

    it('should handle response missing created field', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({}), // Missing 'created' field
        } as Response)
      );

      const result = await fetchCourseCreationDate('12345');
      expect(result).toBeUndefined();
    });

    it('should construct correct API URL with course ID', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ created: '2021-04-15T12:00:00Z' }),
        } as Response)
      );

      await fetchCourseCreationDate('99999');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.udemy.com/api-2.0/courses/99999/?fields[course]=created',
        expect.objectContaining({
          headers: { Accept: 'application/json' },
        })
      );
    });
  });

  describe('fetchCurriculumItems', () => {
    it('should handle pagination correctly', async () => {
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
          { _class: 'lecture', id: 2, title: 'L2', created: '2023-01-02', sort_order: 20 },
          { _class: 'quiz', id: 3, title: 'Q1', sort_order: 5 },
        ],
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve(page1Response),
        } as Response)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(page2Response),
        } as Response);

      const results = await fetchCurriculumItems(courseId);

      // Should have made 2 requests (pagination)
      expect(global.fetch).toHaveBeenCalledTimes(2);
      
      // Should follow the 'next' URL
      expect(global.fetch).toHaveBeenNthCalledWith(2,
        'https://www.udemy.com/api-2.0/test-next',
        expect.any(Object)
      );

      // Should sort by sort_order descending: 20 -> 10 -> 5
      expect(results).toHaveLength(3);
      expect(results[0].id).toBe(2); // sort_order 20
      expect(results[1].id).toBe(1); // sort_order 10
      expect(results[2].id).toBe(3); // sort_order 5
    });

    it('should handle empty results', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({
          count: 0,
          next: null,
          previous: null,
          results: []
        })
      } as Response);

      const results = await fetchCurriculumItems('12345');
      expect(results).toEqual([]);
    });

    it('should throw on network error', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network failure')));

      await expect(fetchCurriculumItems('12345')).rejects.toThrow('Network failure');
    });

    it('should request all curriculum types in the API call', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({
          next: null,
          results: []
        })
      } as Response);

      await fetchCurriculumItems('100');

      // Verify the URL includes curriculum_types parameter
      const callUrl = (global.fetch as any).mock.calls[0][0];
      expect(callUrl).toContain('curriculum_types=chapter,lecture,quiz,practice,asset');
    });

    it('should handle sorting with mixed sort_order values', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({
          next: null,
          results: [
            { _class: 'lecture', id: 1, title: 'First', sort_order: 100 },
            { _class: 'lecture', id: 2, title: 'Second', sort_order: 50 },
            { _class: 'lecture', id: 3, title: 'Third', sort_order: 75 },
            { _class: 'lecture', id: 4, title: 'Fourth', sort_order: 0 },
          ]
        })
      } as Response);

      const results = await fetchCurriculumItems('12345');
      
      // Should be sorted descending: 100 -> 75 -> 50 -> 0
      expect(results.map(r => r.sort_order)).toEqual([100, 75, 50, 0]);
    });
  });
});
