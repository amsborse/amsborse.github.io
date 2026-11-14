import { useSyncExternalStore } from "react";
import { isSiteDesign, type SiteDesign } from "./design";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-design"],
  });
  return () => observer.disconnect();
}

function read(): SiteDesign {
  const value = document.documentElement.getAttribute("data-design");
  return isSiteDesign(value) ? value : "editorial";
}

/** The active site design, read from the document so it also works outside the theme provider. */
export function useDocumentDesign(): SiteDesign {
  return useSyncExternalStore(subscribe, read, () => "editorial");
}
