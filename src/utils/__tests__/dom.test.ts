import { describe, it, expect } from 'vitest';
import { createDateIcon, createDateElement, createLectureDateElement } from '../dom';

describe('dom utilities', () => {
  describe('createDateIcon', () => {
    it('should create a properly structured SVG icon', () => {
      const svg = createDateIcon();

      // Verify it's a valid SVG with accessibility attributes
      expect(svg).toBeInstanceOf(SVGSVGElement);
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      
      // Verify icon reference (the actual valuable assertion)
      const useElement = svg.querySelector('use');
      expect(useElement?.getAttributeNS('http://www.w3.org/1999/xlink', 'href')).toBe('#icon-new');
    });

    it('should apply Udemy design system classes', () => {
      const svg = createDateIcon();
      const classes = svg.getAttribute('class') ?? '';
      
      // These classes are critical for visual integration with Udemy's UI
      expect(classes).toContain('ud-icon');
      expect(classes).toContain('ud-icon-xsmall');
      expect(classes).toContain('ud-icon-color-neutral');
      expect(classes).toContain('last-update-date__icon');
    });
  });

  describe('createDateElement', () => {
    it('should create a properly structured date element with correct content', () => {
      const dateString = '4/2021';
      const element = createDateElement(dateString);

      // Verify structure
      expect(element.className).toBe('clp-lead__element-item');
      const innerContent = element.querySelector('.last-update-date');
      expect(innerContent).toBeTruthy();

      // Verify content order: icon first, then text
      const children = innerContent?.children;
      expect(children?.length).toBe(2);
      expect(children?.[0].tagName.toLowerCase()).toBe('svg');
      expect(children?.[1].tagName.toLowerCase()).toBe('span');

      // Verify text formatting (the main behavior)
      const span = element.querySelector('span');
      expect(span?.textContent).toBe(`Created ${dateString}`);
    });

    it('should properly format various date strings', () => {
      const testCases = [
        { input: '1/2020', expected: 'Created 1/2020' },
        { input: '12/2023', expected: 'Created 12/2023' },
        { input: '6/2021', expected: 'Created 6/2021' },
      ];

      testCases.forEach(({ input, expected }) => {
        const element = createDateElement(input);
        const span = element.querySelector('span');
        expect(span?.textContent).toBe(expected);
      });
    });
  });

  describe('createLectureDateElement', () => {
    it('should create a properly styled and formatted lecture date element', () => {
      const el = createLectureDateElement('7/2022');

      // Verify it's the right type with right styling
      expect(el.tagName.toLowerCase()).toBe('span');
      expect(el.className).toBe('ud-text-xs ud-text-neutral');
      expect(el.style.marginRight).toBe('1rem');

      // Verify text formatting (wrapped in parentheses)
      expect(el.textContent).toBe('(7/2022)');
    });
  });
});
