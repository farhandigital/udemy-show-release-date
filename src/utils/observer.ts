interface DefensiveObserverOptions {
    /** Milliseconds to debounce the callback. Defaults to 0 (no debounce). */
    debounceMs?: number;
    /** Element to observe. Defaults to `document.body`. */
    target?: Element;
    /** MutationObserver init config. Defaults to `{ childList: true, subtree: true }`. */
    config?: MutationObserverInit;
}

/**
 * Creates a `MutationObserver` that:
 * - Fires `callback` on every relevant DOM mutation (optionally debounced)
 * - Runs `callback` once immediately on creation
 *
 * Returns the observer so the caller can disconnect it when needed.
 */
export function createDefensiveObserver(
    callback: () => void,
    options?: DefensiveObserverOptions,
): MutationObserver {
    const {
        debounceMs = 0,
        target = document.body,
        config = { childList: true, subtree: true },
    } = options ?? {};

    let timeout: ReturnType<typeof setTimeout>;

    const run =
        debounceMs > 0
            ? () => {
                  clearTimeout(timeout);
                  timeout = setTimeout(callback, debounceMs);
              }
            : callback;

    const observer = new MutationObserver(run);
    observer.observe(target, config);

    // Initial run in case the target element is already in the DOM
    run();

    return observer;
}
