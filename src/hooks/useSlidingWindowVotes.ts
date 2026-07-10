import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "portfolio:sw-problem-votes";
const VOTED_KEY = "portfolio:sw-problem-voted";

function readVotes(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function readVotedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(VOTED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function persist(votes: Record<string, number>, voted: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
  localStorage.setItem(VOTED_KEY, JSON.stringify([...voted]));
}

export function useSlidingWindowVotes() {
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [voted, setVoted] = useState<Set<string>>(new Set());

  useEffect(() => {
    setVotes(readVotes());
    setVoted(readVotedSet());
  }, []);

  const toggleVote = useCallback((problemId: string) => {
    const currentVotes = readVotes();
    const currentVoted = readVotedSet();
    const nextVotes = { ...currentVotes };
    const nextVoted = new Set(currentVoted);

    if (currentVoted.has(problemId)) {
      nextVotes[problemId] = Math.max(0, (nextVotes[problemId] ?? 1) - 1);
      if (nextVotes[problemId] === 0) delete nextVotes[problemId];
      nextVoted.delete(problemId);
    } else {
      nextVotes[problemId] = (nextVotes[problemId] ?? 0) + 1;
      nextVoted.add(problemId);
    }

    persist(nextVotes, nextVoted);
    setVotes(nextVotes);
    setVoted(nextVoted);
  }, []);

  const getVoteCount = useCallback((problemId: string) => votes[problemId] ?? 0, [votes]);

  const hasVoted = useCallback((problemId: string) => voted.has(problemId), [voted]);

  const topVotedIds = useCallback(
    (limit = 10) =>
      Object.entries(votes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([id]) => id),
    [votes]
  );

  const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0);

  return { votes, toggleVote, getVoteCount, hasVoted, topVotedIds, totalVotes };
}
