import { retrieveMemory } from "./memory/retrieve.ts";
import type { MemoryQuery, RetrievedMemory } from "./memory/types.ts";

/** Bounded repository-memory load for a coding-agent task. */
export function loadMemoryContext(query: MemoryQuery): RetrievedMemory {
  return retrieveMemory(query);
}

export { retrieveMemory };
