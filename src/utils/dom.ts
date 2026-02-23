/**
 * Utility functions for creating and querying DOM elements
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DomItem {
    element: HTMLElement;
    title: string;
}

// ---------------------------------------------------------------------------
// DOM querying
// ---------------------------------------------------------------------------

/** Collect all visible curriculum-item rows from the current DOM snapshot */
export function getDomItems(): DomItem[] {
    // CSS-module class names contain "__course-lecture-title" as the BEM element suffix
    const titleElements = document.querySelectorAll('[class*="__course-lecture-title"]');
    return Array.from(titleElements)
        .map(titleEl => ({
            element: titleEl.closest('.ud-block-list-item') as HTMLElement,
            title: titleEl.textContent?.trim() ?? '',
        }))
        .filter(item => item.element !== null);
}

/** Find the curriculum stats container in the DOM */
export function findCurriculumContainer(): HTMLElement | null {
    return document.querySelector('[data-testid="curriculum-stats"]');
}

// ---------------------------------------------------------------------------
// Element builders
// ---------------------------------------------------------------------------

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

/**
 * Builds a "Lectures by Year" bar-chart widget and injects its scoped styles
 * into document.head. Idempotent per identifier — call site is responsible for
 * the duplicate-injection guard before calling this.
 *
 * @param counts     - Map of year → lecture count
 * @param identifier - CSS class prefix used to namespace all styles/elements
 * @returns The root element of the widget, ready to be appended to the DOM
 */
export function createYearCountWidget(counts: Map<number, number>, identifier: string): HTMLElement {
    // Inject scoped styles once
    const style = document.createElement('style');
    style.textContent = `
        .${identifier} {
            margin-top: 12px;
            margin-bottom: 12px;
            font-size: 13px;
            color: #333;
        }
        .${identifier}-title {
            font-weight: 600;
            margin-bottom: 8px;
            color: #444;
        }
        .${identifier}-chart {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .${identifier}-row {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .${identifier}-year {
            min-width: 50px;
            font-weight: 500;
            color: #555;
        }
        .${identifier}-bar-wrapper {
            flex: 1;
            height: 20px;
            background: #f0f0f0;
            border-radius: 3px;
            overflow: hidden;
        }
        .${identifier}-bar {
            height: 100%;
            background: linear-gradient(90deg, #0a84ff 0%, #0066cc 100%);
            border-radius: 3px;
            transition: width 0.3s ease;
        }
        .${identifier}-count {
            min-width: 30px;
            text-align: right;
            font-weight: 500;
            color: #666;
        }
    `;
    document.head.appendChild(style);

    // Root container
    const root = document.createElement('div');
    root.className = identifier;

    // Title
    const title = document.createElement('div');
    title.className = `${identifier}-title`;
    title.textContent = 'Lectures by Year';
    root.appendChild(title);

    // Chart
    const chart = document.createElement('div');
    chart.className = `${identifier}-chart`;

    const sortedEntries = Array.from(counts.entries()).sort(([a], [b]) => a - b);
    const maxCount = Math.max(...sortedEntries.map(([, count]) => count));

    for (const [year, count] of sortedEntries) {
        const barPercentage = (count / maxCount) * 100;

        const row = document.createElement('div');
        row.className = `${identifier}-row`;

        const yearLabel = document.createElement('div');
        yearLabel.className = `${identifier}-year`;
        yearLabel.textContent = String(year);

        const barWrapper = document.createElement('div');
        barWrapper.className = `${identifier}-bar-wrapper`;

        const bar = document.createElement('div');
        bar.className = `${identifier}-bar`;
        bar.style.width = `${barPercentage}%`;

        barWrapper.appendChild(bar);

        const countLabel = document.createElement('div');
        countLabel.className = `${identifier}-count`;
        countLabel.textContent = String(count);

        row.appendChild(yearLabel);
        row.appendChild(barWrapper);
        row.appendChild(countLabel);
        chart.appendChild(row);
    }

    root.appendChild(chart);
    return root;
}
