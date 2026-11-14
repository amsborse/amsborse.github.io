/** Delegated print interactions; no timers, animation loops or content mutations. */
export function mount(): () => void {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const headingSelector =
    "main h2, .chapter-title, .project-section__title, .selected-work__intro h2";
  const seen = new WeakSet<Element>();
  const addedClasses = new Map<Element, Set<string>>();
  const origins = new Map<HTMLElement, { value: string; priority: string; hadStyle: boolean }>();
  let observer: IntersectionObserver | undefined;
  let disposed = false;

  function addClass(element: Element, name: string) {
    if (element.classList.contains(name)) return;
    element.classList.add(name);
    const names = addedClasses.get(element) ?? new Set<string>();
    names.add(name);
    addedClasses.set(element, names);
  }

  function setOrigin(element: HTMLElement, origin: string) {
    if (!origins.has(element)) {
      origins.set(element, {
        value: element.style.getPropertyValue("--broadsheet-origin"),
        priority: element.style.getPropertyPriority("--broadsheet-origin"),
        hadStyle: element.hasAttribute("style"),
      });
    }
    element.style.setProperty("--broadsheet-origin", origin);
  }

  function onPointerEnter(event: PointerEvent) {
    if (document.hidden || motion.matches || !finePointer.matches || event.pointerType === "touch")
      return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    // pointerenter is captured because it does not bubble. Only the actual entry is handled.
    if (!target.matches("a, .project-case__summary, .hub-card-enter")) return;
    const rect = target.getBoundingClientRect();
    const origin = event.clientX < rect.left + rect.width / 2 ? "left" : "right";
    setOrigin(target, origin);
    target
      .querySelectorAll<HTMLElement>("h3, .project-case__title")
      .forEach((title) => setOrigin(title, origin));
  }

  function onFocus(event: FocusEvent) {
    if (!(event.target instanceof HTMLElement)) return;
    setOrigin(event.target, "left");
    event.target
      .querySelectorAll<HTMLElement>("h3, .project-case__title")
      .forEach((title) => setOrigin(title, "left"));
  }

  function discover() {
    if (disposed || document.hidden) return;
    document.querySelectorAll(headingSelector).forEach((heading) => {
      if (seen.has(heading)) return;
      seen.add(heading);
      const rect = heading.getBoundingClientRect();
      // Already visible headings never wait for an asynchronous observer callback.
      if (motion.matches || !observer || (rect.top < window.innerHeight && rect.bottom >= 0))
        return;
      observer.observe(heading);
    });
  }

  function configure() {
    observer?.disconnect();
    observer = undefined;
    if (!motion.matches && !document.hidden && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          if (document.hidden || motion.matches) return;
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            addClass(entry.target, "broadsheet-revealed");
            observer?.unobserve(entry.target);
          });
        },
        { threshold: 0 }
      );
      // Reconnect headings that were awaiting entry when visibility or preferences changed.
      document.querySelectorAll(headingSelector).forEach((heading) => {
        if (heading.classList.contains("broadsheet-revealed")) return;
        const rect = heading.getBoundingClientRect();
        if (rect.top >= window.innerHeight) observer?.observe(heading);
      });
    }
    discover();
  }

  function onVisibility() {
    if (document.hidden) addClass(document.body, "broadsheet-paused");
    else if (addedClasses.get(document.body)?.delete("broadsheet-paused"))
      document.body.classList.remove("broadsheet-paused");
    configure();
  }

  // Routes are rendered asynchronously; a child-list observer handles new headings as well.
  const mutations = new MutationObserver(discover);
  mutations.observe(document.body, { childList: true, subtree: true });
  document.addEventListener("pointerenter", onPointerEnter, true);
  document.addEventListener("focusin", onFocus);
  document.addEventListener("visibilitychange", onVisibility);
  motion.addEventListener("change", configure);
  onVisibility();

  return () => {
    disposed = true;
    observer?.disconnect();
    mutations.disconnect();
    document.removeEventListener("pointerenter", onPointerEnter, true);
    document.removeEventListener("focusin", onFocus);
    document.removeEventListener("visibilitychange", onVisibility);
    motion.removeEventListener("change", configure);
    addedClasses.forEach((names, element) =>
      names.forEach((name) => element.classList.remove(name))
    );
    origins.forEach(({ value, priority, hadStyle }, element) => {
      if (value) element.style.setProperty("--broadsheet-origin", value, priority);
      else element.style.removeProperty("--broadsheet-origin");
      if (!hadStyle && element.getAttribute("style") === "") element.removeAttribute("style");
    });
  };
}
