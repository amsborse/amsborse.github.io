import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { PageStage } from "@/components/stage/PageStage";
import { WritingPublication } from "@/components/writing/WritingPublication";
import { getAllPosts } from "@/utils/loadArticles";
import type { ParsedPost } from "@/utils/markdown";
import "@/components/writing/writing-publication.css";

export default function WritingPage() {
  const [posts, setPosts] = useState<ParsedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getAllPosts().then((allPosts) => {
      if (!cancelled) {
        setPosts(allPosts);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Seo
        title="Writing"
        description="Essays on systems, APIs, reliability, and engineering practice by Akshay Borse."
        path="/arsenal/writing"
      />

      <div className="writing-index writing-index--editorial article-shell max-w-3xl page-top pb-16 sm:pb-20 lg:pb-24">
        <PageStage
          motif="writing"
          eyebrow="Writing"
          title="Essays"
          lede="Notes on building systems that hold up — reliability, API design, observability, and why writing things down is part of the engineering."
        />
        {loading ? (
          <p className="mt-16 min-h-[100svh] text-base text-[var(--color-body)]">Loading essays…</p>
        ) : (
          <WritingPublication posts={posts} />
        )}
      </div>
    </>
  );
}
