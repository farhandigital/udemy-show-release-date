/**
 * Utility functions for creating DOM elements
 */

/**
 * Creates an SVG icon element for the course creation date
 * @returns The SVG element
 */
export function createDateIcon(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute(
    'class',
    'ud-icon ud-icon-xsmall ud-icon-color-neutral last-update-date__icon'
  );

  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#icon-new');
  svg.appendChild(use);

  return svg;
}

/**
 * Creates the date display element (wrapper + content)
 * @param dateString - The formatted date string (e.g., "4/2021")
 * @returns The wrapper div containing the date element
 */
export function createDateElement(dateString: string): HTMLDivElement {
  // Create the wrapper div with Udemy's existing class for meta items
  const wrapper = document.createElement('div');
  wrapper.className = 'clp-lead__element-item';

  // Create the inner content container
  const innerContent = document.createElement('div');
  innerContent.className = 'last-update-date';

  // Create and add the icon
  const svg = createDateIcon();

  // Create the text span
  const textSpan = document.createElement('span');
  textSpan.textContent = `Created ${dateString}`;

  // Assemble the element
  innerContent.appendChild(svg);
  innerContent.appendChild(textSpan);
  wrapper.appendChild(innerContent);
  return wrapper;
}

/**
 * Creates the date element for a lecture item
 * @param dateString - The formatted date string
 * @returns The span element containing the date
 */
export function createLectureDateElement(dateString: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = 'ud-text-xs ud-text-neutral';
  span.style.marginRight = '1rem';
  span.textContent = `(${dateString})`;
  return span;
}
