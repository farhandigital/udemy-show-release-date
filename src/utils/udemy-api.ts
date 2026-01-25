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
  console.log('Starting getCourseId search on:', window.location.href);
  console.log('Document title:', document.title);

  // Method 1: Try the legacy data-clp-course-id attribute
  const bodyAttribute = document.body.getAttribute('data-clp-course-id');
  console.log('Method 1 (body attribute):', bodyAttribute);
  if (bodyAttribute) {
    console.log('Found ID via Method 1:', bodyAttribute);
    return bodyAttribute;
  }

  // Method 2: Extract from meta tag image URL
  const metaImage = document.querySelector<HTMLMetaElement>('meta[name="image"]');
  console.log('Method 2 (meta image found):', !!metaImage);
  if (metaImage?.content) {
    console.log('Method 2 (meta image content):', metaImage.content);
    // Extract course ID from image URL pattern: /course/480x270/2015076_2944_8.jpg
    const match = metaImage.content.match(/\/course\/\d+x\d+\/(\d+)_/);
    console.log('Method 2 (image match):', match);
    if (match?.[1]) {
      console.log('Found ID via Method 2:', match[1]);
      return match[1];
    }
  }

  // Method 3: Extract from JSON-LD structured data
  const jsonLdScript = document.querySelector<HTMLScriptElement>(
    'script[type="application/ld+json"][data-purpose="safely-set-inner-html:course-landing-page/seo-info"]'
  );
  console.log('Method 3 (JSON-LD script found):', !!jsonLdScript);
  if (jsonLdScript?.textContent) {
    try {
      const data = JSON.parse(jsonLdScript.textContent);
      const courseGraph = data['@graph']?.find((item: any) => item['@type'] === 'Course');
      console.log('Method 3 (Course graph found):', !!courseGraph);
      if (courseGraph?.image) {
        // Extract course ID from image URL pattern: /course/480x270/2015076_2944_8.jpg
        console.log('Method 3 (Course image):', courseGraph.image);
        const match = courseGraph.image.match(/\/course\/\d+x\d+\/(\d+)_/);
        console.log('Method 3 (Image match):', match);
        if (match?.[1]) {
          console.log('Found ID via Method 3:', match[1]);
          return match[1];
        }
      }
    } catch (e) {
      // JSON parsing failed, continue to next method
      console.error('Method 3 (JSON parse error):', e);
    }
  }

  // Method 4: Extract from Open Graph meta tag
  const ogImage = document.querySelector<HTMLMetaElement>('meta[property="og:image"]');
  console.log('Method 4 (og:image found):', !!ogImage);
  if (ogImage?.content) {
    console.log('Method 4 (og:image content):', ogImage.content);
    const match = ogImage.content.match(/\/course\/\d+x\d+\/(\d+)_/);
    console.log('Method 4 (image match):', match);
    if (match?.[1]) {
      console.log('Found ID via Method 4:', match[1]);
      return match[1];
    }
  }
  
  console.warn('All methods failed to find course ID');
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
