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
