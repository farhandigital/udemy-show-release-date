import { defineContentScript } from '#imports';
import { getCourseId, fetchCourseCreationDate, formatDateString } from '../utils/udemy-api';
import { createDateElement } from '../utils/dom';

const ANCHOR_SELECTOR = '[class*="last-updated-languages-container"]';
const DATE_ELEMENT_ID = 'udemy-course-creation-date';

export default defineContentScript({
  matches: ['*://www.udemy.com/course/*'],

  async main(ctx) {
    const courseId = getCourseId();
    if (!courseId) return;

    const createdDateString = await fetchCourseCreationDate(courseId);
    const dateString = formatDateString(createdDateString);

    function inject() {
      // Don't double-inject
      if (document.getElementById(DATE_ELEMENT_ID)) return;

      const anchor = document.querySelector(ANCHOR_SELECTOR);
      const parent = anchor?.parentElement;
      if (!anchor || !parent) return;

      const dateElement = createDateElement(dateString);
      dateElement.id = DATE_ELEMENT_ID;
      console.log('Injecting course creation date:', dateString);
      anchor.insertAdjacentElement('afterbegin', dateElement);
      console.log('Course creation date injected successfully');
    }

    // Watch for the anchor to appear (initial load) and for our element to be removed
    const observer = new MutationObserver(() => {
      inject();
    });

    ctx.addEventListener(window, 'beforeunload', () => observer.disconnect());

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Try immediately in case the anchor is already there
    inject();
  },
});