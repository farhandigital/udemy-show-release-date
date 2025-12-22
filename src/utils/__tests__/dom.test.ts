import { describe, it, expect, beforeEach } from 'vitest';
import { createDateIcon, createDateElement } from './dom';

describe('dom utilities', () => {
  beforeEach(() => {
    // Clear the DOM before each test
    document.body.innerHTML = '';
  });

  describe('createDateIcon', () => {
    it('should create an SVG element with correct attributes', () => {
      const svg = createDateIcon();

      expect(svg).toBeInstanceOf(SVGSVGElement);
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.getAttribute('class')).toContain('ud-icon');
      expect(svg.getAttribute('class')).toContain('ud-icon-xsmall');
      expect(svg.getAttribute('class')).toContain('ud-icon-color-neutral');
      expect(svg.getAttribute('class')).toContain('last-update-date__icon');
    });

    it('should contain a use element with correct xlink:href', () => {
      const svg = createDateIcon();
      const useElement = svg.querySelector('use');

      expect(useElement).toBeTruthy();
      expect(useElement?.getAttributeNS('http://www.w3.org/1999/xlink', 'href')).toBe(
        '#icon-new'
      );
    });

    it('should have the use element as a child of the SVG', () => {
      const svg = createDateIcon();
      expect(svg.children.length).toBe(1);
      expect(svg.children[0].tagName.toLowerCase()).toBe('use');
    });
  });

  describe('createDateElement', () => {
    it('should create a wrapper div with correct class', () => {
      const element = createDateElement('4/2021');

      expect(element).toBeInstanceOf(HTMLDivElement);
      expect(element.className).toBe('clp-lead__element-item');
    });

    it('should contain an inner content div with correct class', () => {
      const element = createDateElement('4/2021');
      const innerContent = element.querySelector('.last-update-date');

      expect(innerContent).toBeTruthy();
      expect(innerContent?.tagName.toLowerCase()).toBe('div');
    });

    it('should contain an SVG icon', () => {
      const element = createDateElement('4/2021');
      const svg = element.querySelector('svg');

      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
    });

    it('should contain a span with formatted text', () => {
      const dateString = '4/2021';
      const element = createDateElement(dateString);
      const span = element.querySelector('span');

      expect(span).toBeTruthy();
      expect(span?.textContent).toBe(`Created ${dateString}`);
    });

    it('should have icon before text in the correct order', () => {
      const element = createDateElement('4/2021');
      const innerContent = element.querySelector('.last-update-date');
      const children = innerContent?.children;

      expect(children?.length).toBe(2);
      expect(children?.[0].tagName.toLowerCase()).toBe('svg');
      expect(children?.[1].tagName.toLowerCase()).toBe('span');
    });

    it('should handle different date formats', () => {
      const testDates = ['1/2020', '12/2023', '6/2021'];

      testDates.forEach((date) => {
        const element = createDateElement(date);
        const span = element.querySelector('span');
        expect(span?.textContent).toBe(`Created ${date}`);
      });
    });
  });
});
