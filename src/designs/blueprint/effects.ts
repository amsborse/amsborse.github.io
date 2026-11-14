/**
 * Interactions that only exist in the blueprint design. Called when the design becomes active;
 * return a cleanup that removes every listener and element it added.
 */
export function mount(): () => void {
  return () => {};
}
