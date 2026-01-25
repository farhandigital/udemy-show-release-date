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
 * 
 * NOTE: Udemy serves different HTML versions (A/B testing or gradual rollout):
 * - Legacy: Server-rendered with data-clp-course-id attribute on <body>
 * - New: Next.js/React app without legacy attribute, relies on JSON-LD/image URLs
 * 
 * Set DEBUG_HTML=1 env var to save the fetched HTML for inspection.
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
    
    // Save the fetched HTML for debugging (optional - helps verify what HTML JSDOM sees)
    if (process.env.DEBUG_HTML) {
      const fs = await import('fs');
      fs.writeFileSync('test-fetched.html', html, 'utf8');
    }
    
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

  it('should extract a known course ID from a real Udemy HTML', () => {
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
