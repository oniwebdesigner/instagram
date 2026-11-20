"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Post } from "@/lib/igram";

type Kind = "posts" | "reels";
// undefined = ende pa filluar, null = mbaroi, string = cursor për faqen tjetër
type Cursors = Record<Kind, string | null | undefined>;

export default function ProfileFeed({
  username,
  initialPosts,
  total,
}: {
  username: string;
  initialPosts: Post[];
  total: number | null;
}) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [cursors, setCursors] = useState<Cursors>({ posts: undefined, reels: undefined });
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const loadRef = useRef<() => void>(() => {});

  const reachedTotal = total != null && posts.length >= total;
  const hasMore =
    !finished &&
    !reachedTotal &&
    (cursors.posts !== null || cursors.reels !== null);

  async function loadMore() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const kinds = (["posts", "reels"] as const).filter((k) => cursors[k] !== null);

      const results = await Promise.all(
        kinds.map(async (kind) => {
          const qs = new URLSearchParams({ username, kind });
          const cursor = cursors[kind];
          if (cursor) qs.set("cursor", cursor);

          const res = await fetch(`/api/feed?${qs.toString()}`);
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Gabim.");

          return {
            kind,
            posts: (json.posts ?? []) as Post[],
            nextCursor: (json.nextCursor ?? null) as string | null,
          };
        })
      );

      const seen = new Set(posts.map((p) => p.shortcode || p.id));
      const added: Post[] = [];
      const next: Cursors = { ...cursors };

      for (const r of results) {
        next[r.kind] = r.nextCursor;
        for (const p of r.posts) {
          const key = p.shortcode || p.id;
          if (!seen.has(key)) {
            seen.add(key);
            added.push(p);
          }
        }
      }

      setPosts((prev) => [...prev, ...added]);
      setCursors(next);
      if (added.length === 0) setFinished(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gabim i papritur.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRef.current = loadMore;
  });

  // Kur fundi i gridit afrohet te ekrani, ngarkohet faqja tjetër vetë
  useEffect(() => {
    if (!hasMore || error) return;

    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadRef.current();
      },
      { rootMargin: "600px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, error, posts.length]);

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Postimet</h2>
        <p className="text-sm text-neutral-500">
          {posts.length}
          {total != null ? ` nga ${total}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
        {posts.map((post) => {
          const href = post.isVideo
            ? `/reel/${encodeURIComponent(username)}/${post.shortcode}`
            : `/p/${encodeURIComponent(username)}/${post.shortcode}`;

          return (
            <Link
              key={post.shortcode || post.id}
              href={href}
              className="group relative aspect-square overflow-hidden rounded-sm bg-neutral-200"
            >
              {post.thumb && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.thumb}
                  alt={post.caption || "Postim në Instagram"}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              )}

              {post.isVideo && (
                <span className="absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                  Reel / Video
                </span>
              )}

              <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-medium text-white opacity-0 transition group-hover:opacity-100">
                Shiko postimin
              </span>
            </Link>
          );
        })}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={loadMore}
            className="mt-2 rounded-lg border border-red-300 px-3 py-1 text-sm font-medium hover:border-red-800"
          >
            Provo përsëri
          </button>
        </div>
      )}

      {hasMore && !error && (
        <div ref={sentinelRef} className="mt-6 py-4 text-center text-sm text-neutral-500">
          {loading ? "Duke ngarkuar postime të tjera…" : ""}
        </div>
      )}

      {finished && total != null && posts.length < total && (
        <p className="mt-6 text-center text-sm text-neutral-500">
          U ngarkuan {posts.length} postime. API-ja nuk ktheu më shumë për këtë profil.
        </p>
      )}
    </section>
  );
}
