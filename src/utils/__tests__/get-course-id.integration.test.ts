import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { getCourseId } from '../udemy-api';

/**
 * Integration tests for getCourseId with real Udemy HTML
 * 
 * These tests fetch an actual Udemy course page and verify that 
 * getCourseId can extract the course ID from the real DOM structure.
 * 
 * This ensures our fallback extraction methods work with Udemy's 
 * current HTML structure and helps catch breaking changes early.
 */

const TEST_COURSE_URL = 'https://www.udemy.com/course/securityplus/';
const EXPECTED_COURSE_ID = '2015076';

describe('getCourseId Integration', () => {
  let dom: JSDOM;
  let originalDocument: Document;

  beforeAll(async () => {
    // Fetch real Udemy course page
    const response = await fetch(TEST_COURSE_URL);
    const html = await response.text();
    
    // Create JSDOM instance
    dom = new JSDOM(html, {
      url: TEST_COURSE_URL,
      contentType: 'text/html',
    });

    // Replace global document with JSDOM document
    originalDocument = global.document;
    global.document = dom.window.document as unknown as Document;
  }, 30000); // 30 second timeout for fetching

  afterAll(() => {
    // Restore original document
    global.document = originalDocument;
  });

  it('should extract course ID from real Udemy HTML', () => {
    const courseId = getCourseId();
    expect(courseId).toBe(EXPECTED_COURSE_ID);
  });

  it('should return a numeric string', () => {
    const courseId = getCourseId();
    expect(courseId).toMatch(/^\d+$/);
  });

  it('should work with one of the fallback methods', () => {
    const courseId = getCourseId();
    expect(courseId).not.toBeNull();
    expect(courseId).toBeTruthy();
  });
});
