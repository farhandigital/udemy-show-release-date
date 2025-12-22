import { defineContentScript, createIntegratedUi } from '#imports';

export default defineContentScript({
  matches: ['*://www.udemy.com/course/*'],

  async main(ctx) {
    // 1. Get Course ID from the DOM
    const courseId = document.body.getAttribute('data-clp-course-id');
    if (!courseId) return;

    // 2. Fetch Creation Date
    // We fetch this early so it's ready when the UI mounts
    const response = await fetch(`https://www.udemy.com/api-2.0/courses/${courseId}/?fields[course]=created`, {
      headers: { 'Accept': 'application/json' }
    });
    const data = await response.json();
    
    // Format the date (e.g., "4/2021")
    const dateObj = new Date(data.created);
    const dateString = `${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;

    // 3. Create the UI
    const ui = createIntegratedUi(ctx, {
      position: 'inline',
      // Target the container that holds "Last updated", "English", etc.
      anchor: '.clp-lead__element-meta', 
      // Insert our new element at the very beginning of this list
      append: 'first',

      onMount: (container) => {
        // Create the wrapper div with Udemy's existing class for meta items
        const wrapper = document.createElement('div');
        wrapper.className = 'clp-lead__element-item';

        // Create the inner content container
        const innerContent = document.createElement('div');
        // Re-use the class used for the "Last updated" date for consistent spacing/icon styling
        innerContent.className = 'last-update-date'; 

        // Create the "New" icon (svg)
        // We reuse the existing "new" icon ID (#icon-new) visible in your HTML snippet
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
        // These classes ensure the icon size and color match the neighbors
        svg.setAttribute('class', 'ud-icon ud-icon-xsmall ud-icon-color-neutral last-update-date__icon'); 
        
        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#icon-new');
        svg.appendChild(use);

        // Create the text span
        const textSpan = document.createElement('span');
        textSpan.textContent = `Created ${dateString}`;

        // Assemble the element
        innerContent.appendChild(svg);
        innerContent.appendChild(textSpan);
        wrapper.appendChild(innerContent);
        
        // Add to the WXT container
        // We use display: contents to let the wrapper div sit directly in the flex/grid layout
        container.style.display = 'contents';
        container.appendChild(wrapper);
      },
    });

    // 4. Mount the UI
    ui.autoMount();
  },
});