import { defineContentScript, createIntegratedUi, ContentScriptContext } from '#imports';
import { getCourseId, fetchCourseCreationDate, formatDateString } from '../utils/udemy-api';
import { createDateElement } from '../utils/dom';

export default defineContentScript({
  matches: ['*://www.udemy.com/course/*'],

  async main(ctx: ContentScriptContext) {
    // 1. Get Course ID from the DOM
    const courseId = getCourseId();
    if (!courseId) return;

    // 2. Fetch Creation Date
    const createdDateString = await fetchCourseCreationDate(courseId);
    const dateString = formatDateString(createdDateString);

    // 3. Create the UI
    const ui = createIntegratedUi(ctx, {
      position: 'inline',
      anchor: '.clp-lead__element-meta',
      append: 'first',

      onMount: (container: HTMLElement) => {
        // Create the date element
        const dateElement = createDateElement(dateString);

        // Add to the WXT container
        // We use display: contents to let the wrapper div sit directly in the flex/grid layout
        container.style.display = 'contents';
        container.appendChild(dateElement);
      },
    });

    // 4. Mount the UI
    ui.autoMount();
  },
});