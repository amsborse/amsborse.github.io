import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { PageStage } from "@/components/stage/PageStage";
import { WritingPublication } from "@/components/writing/WritingPublication";
import { getArticleSummaries, type ArticleSummary } from "@/utils/loadArticles";
import "@/components/writing/writing-publication.css";

export default function WritingPage() {
  const [posts, setPosts] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getArticleSummaries().then((allPosts) => {
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
        description="Essays on consciousness, emotions, self-awareness, growth and philosophy, alongside notes on building reliable systems."
        path="/arsenal/writing"
      />

      <div className="writing-index writing-index--editorial article-shell max-w-6xl page-top pb-16 sm:pb-20 lg:pb-24">
        <PageStage
          motif="writing"
          eyebrow="Mind & craft"
          title="Essays"
          lede="Essays on consciousness, emotions, self-awareness, growth and philosophy. Notes on building systems that hold up."
        />
        {loading ? (
          <div className="reading-loading" role="status">
            <p>Opening the reading room…</p>
            <div aria-hidden="true" />
          </div>
        ) : (
          <WritingPublication posts={posts} />
        )}
      </div>
    </>
  );
}
