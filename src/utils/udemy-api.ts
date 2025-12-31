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
  // We fetch chapter,lecture,quiz,practice to ensure we have the full sequence for matching
  // But we might only care about lectures for dates.
  let url: string | null = `https://www.udemy.com/api-2.0/courses/${courseId}/subscriber-curriculum-items/?curriculum_types=lecture,quiz,practice,chapter&page_size=1000&fields[lecture]=title,created,sort_order,type&fields[quiz]=title,sort_order,type&fields[practice]=title,sort_order&fields[chapter]=title,sort_order`;
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
 * Gets the course ID from the page
 * @returns The course ID or null if not found
 */
export function getCourseId(): string | null {
  return document.body.getAttribute('data-clp-course-id');
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
