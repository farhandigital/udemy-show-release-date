import { describe, it, expect } from 'vitest';
import { fetchCourseCreationDate, formatDateString } from '../udemy-api';

/**
 * Integration tests for Udemy API utilities
 * 
 * These tests make actual API calls to Udemy's public API endpoints.
 * They use a real, hardcoded course ID to verify the integration works correctly.
 * 
 * Note: These tests require network access and may be slower than unit tests.
 * Run with: bunx vitest --run src/utils/__tests__/udemy-api.integration.test.ts
 * 
 * Note: subscriber-curriculum-items endpoint requires authentication,
 * so we only test the public course creation date API.
 */

// Using a popular, stable public Udemy course that's unlikely to be removed
// Course: "The Complete JavaScript Course 2024: From Zero to Expert!" by Jonas Schmedtmann
const REAL_COURSE_ID = '851712';

describe('Udemy API Integration Tests', () => {
  it('should fetch actual course creation date from Udemy API', async () => {
    const creationDate = await fetchCourseCreationDate(REAL_COURSE_ID);

    // Verify we got a valid ISO date string
    expect(creationDate).toBeDefined();
    expect(typeof creationDate).toBe('string');
    expect(creationDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/);

    // Verify the date is in the past
    const date = new Date(creationDate);
    expect(date.getTime()).toBeLessThan(Date.now());

    // Verify the date is not absurdly old (after 2000)
    expect(date.getFullYear()).toBeGreaterThan(2000);

    console.log(`✓ Course ${REAL_COURSE_ID} created on: ${creationDate}`);
  }, 10000); // 10s timeout for network request

  it('should format the fetched date correctly', async () => {
    const creationDate = await fetchCourseCreationDate(REAL_COURSE_ID);
    const formatted = formatDateString(creationDate);

    // Verify format is M/YYYY
    expect(formatted).toMatch(/^\d{1,2}\/\d{4}$/);

    // Extract month and year
    const [month, year] = formatted.split('/').map(Number);
    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);
    expect(year).toBeGreaterThan(2000);
    expect(year).toBeLessThanOrEqual(new Date().getFullYear());

    console.log(`✓ Formatted date: ${formatted}`);
  }, 10000);

  it('should handle different course IDs', async () => {
    // Another popular course: "100 Days of Code: The Complete Python Pro Bootcamp"
    const anotherCourseId = '2776760';
    
    const creationDate = await fetchCourseCreationDate(anotherCourseId);

    // Verify we got a valid response
    expect(creationDate).toBeDefined();
    expect(typeof creationDate).toBe('string');
    expect(creationDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/);

    const formatted = formatDateString(creationDate);
    expect(formatted).toMatch(/^\d{1,2}\/\d{4}$/);

    console.log(`✓ Course ${anotherCourseId} created on: ${formatted}`);
  }, 10000);

  it('should verify API response structure', async () => {
    const creationDate = await fetchCourseCreationDate(REAL_COURSE_ID);

    // Parse the date and verify it's valid
    const date = new Date(creationDate);
    expect(date.toString()).not.toBe('Invalid Date');

    // Verify we can format it to a readable string
    const formatted = formatDateString(creationDate);
    expect(formatted).toBeTruthy();

    // Verify the date components make sense
    expect(date.getFullYear()).toBeGreaterThanOrEqual(2000);
    expect(date.getFullYear()).toBeLessThanOrEqual(new Date().getFullYear());
    expect(date.getMonth()).toBeGreaterThanOrEqual(0);
    expect(date.getMonth()).toBeLessThanOrEqual(11);

    console.log(`✓ Successfully parsed and validated date structure`);
  }, 10000);
});
