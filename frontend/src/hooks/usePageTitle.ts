import { useEffect } from "react";

/** Set `document.title` for the current page, prefixed with the app name. */
export function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `DarijaStock — ${title}` : "DarijaStock";
    return () => {
      document.title = prev;
    };
  }, [title]);
}
