import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Trap keyboard focus inside `ref` while `active`, move focus in on open,
 * restore it on close, keep Tab/Shift+Tab cycling, and lock body scroll.
 */
export function useFocusTrap(ref: RefObject<HTMLElement>, active: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null || n === document.activeElement,
      );

    const first = focusables()[0];
    (first ?? el).focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const nodes = focusables();
      if (nodes.length === 0) {
        e.preventDefault();
        return;
      }
      const firstN = nodes[0];
      const lastN = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === firstN) {
        e.preventDefault();
        lastN.focus();
      } else if (!e.shiftKey && document.activeElement === lastN) {
        e.preventDefault();
        firstN.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [ref, active]);
}
