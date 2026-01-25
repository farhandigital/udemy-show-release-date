import { describe, it, expect } from 'vitest';
import { fetchCourseCreationDate } from '../udemy-api';

/**
 * Integration tests for Udemy API
 * 
 * These tests verify that the API returns data in the format our code expects.
 * Uses a real, hardcoded course ID to make actual API calls.
 * 
 * Note: subscriber-curriculum-items endpoint requires authentication,
 * so we only test the public course creation date API.
 */

// Using a popular, stable public Udemy course
const REAL_COURSE_ID = '851712';

describe('Udemy API Integration', () => {
    it('Should return course creation date in a valid date format', async () => {
      const creationDate = await fetchCourseCreationDate(REAL_COURSE_ID);
      const date = new Date(creationDate);
      expect(date.getTime()).not.toBeNaN();
    }, 10000);

    it('should return course creation date in ISO format', async () => {
    const creationDate = await fetchCourseCreationDate(REAL_COURSE_ID);
    expect(typeof creationDate).toBe('string');
    expect(creationDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  }, 10000);
});
