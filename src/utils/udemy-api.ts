/**
 * Utility functions for interacting with Udemy API
 */

interface UdemyCourseData {
  created: string;
}

/**
 * Fetches the creation date of a Udemy course
 * @param courseId - The course ID from Udemy
 * @returns The course creation date string
 */
export async function fetchCourseCreationDate(courseId: string): Promise<string> {
  const response = await fetch(
    `https://www.udemy.com/api-2.0/courses/${courseId}/?fields[course]=created`,
    {
      headers: { Accept: 'application/json' },
    }
  );
  const data = (await response.json()) as UdemyCourseData;
  return data.created;
}

export interface CurriculumItem {
  _class: string;
  id: number;
  title: string;
  created?: string;
  sort_order: number;
}

interface CurriculumResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CurriculumItem[];
}

/**
 * Fetches the curriculum items for a course (lectures, quizzes, practice, etc.)
 * Sorted by sort_order descending (which appears to be the display order)
 * @param courseId - The course ID from Udemy
 * @returns A list of curriculum items
 */
export async function fetchCurriculumItems(courseId: string): Promise<CurriculumItem[]> {
  // We fetch all curriculum types to ensure we have the full sequence for matching
  // Request 'title,is_published,sort_order,created' for all relevant types
  const fields = 'title,is_published,sort_order,created';
  const types = 'chapter,lecture,quiz,practice,asset';

  let url: string | null = `https://www.udemy.com/api-2.0/courses/${courseId}/subscriber-curriculum-items/?curriculum_types=${types}&page_size=1000&fields[lecture]=${fields}&fields[quiz]=${fields}&fields[practice]=${fields}&fields[chapter]=${fields}&fields[asset]=${fields}`;
  const allResults: CurriculumItem[] = [];

  while (url) {
    const response: Response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    const data = (await response.json()) as CurriculumResponse;
    allResults.push(...data.results);
    url = data.next;
  }

  // Sort by sort_order descending to match the visual order (Top to Bottom)
  // Based on the user provided example where 'Introduction' (first) has sort_order 22
  // and 'Bonus' (last) has sort_order 0.
  return allResults.sort((a, b) => b.sort_order - a.sort_order);
}

/**
 * Gets the course ID from the page using multiple fallback methods
 * @returns The course ID or null if not found
 */
export function getCourseId(): string | null {
  // Method 1: Try the legacy data-clp-course-id attribute
  const bodyAttribute = document.body.getAttribute('data-clp-course-id');
  if (bodyAttribute) return bodyAttribute;

  // Method 2: Extract from report abuse link
  const reportLink = document.querySelector<HTMLAnchorElement>('a[data-purpose="report-abuse-link"]');
  if (reportLink?.href) {
    const url = new URL(reportLink.href, window.location.origin);
    const courseId = url.searchParams.get('related_object_id');
    if (courseId) return courseId;
  }

  // Method 3: Extract from JSON-LD structured data
  const jsonLdScript = document.querySelector<HTMLScriptElement>(
    'script[type="application/ld+json"][data-purpose="safely-set-inner-html:course-landing-page/seo-info"]'
  );
  if (jsonLdScript?.textContent) {
    try {
      const data = JSON.parse(jsonLdScript.textContent);
      const courseGraph = data['@graph']?.find((item: any) => item['@type'] === 'Course');
      if (courseGraph?.image) {
        // Extract course ID from image URL pattern: /course/480x270/2015076_2944_8.jpg
        const match = courseGraph.image.match(/\/course\/\d+x\d+\/(\d+)_/);
        if (match?.[1]) return match[1];
      }
    } catch {
      // JSON parsing failed, continue to next method
    }
  }

  // Method 4: Extract from URL path (less reliable as a last resort)
  // This won't give us the numeric ID, but could be useful for debugging
  // For now, we'll skip this as we need the numeric ID for the API

  return null;
}

/**
 * Formats a date string to a readable format
 * @param dateString - ISO date string (e.g., "2021-04-15T12:00:00Z")
 * @returns Formatted date string (e.g., "4/2021")
 */
export function formatDateString(dateString: string): string {
  const dateObj = new Date(dateString);
  return `${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
}
