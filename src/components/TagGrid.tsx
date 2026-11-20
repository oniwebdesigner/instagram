"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TagPost } from "@/lib/hashtag";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function TagGrid({ posts }: { posts: TagPost[] }) {
  const [items, setItems] = useState(posts);
  const [selected, setSelected] = useState<TagPost | null>(null);

  // Përzihet vetëm në browser, pas ngarkimit (pa mospërputhje me serverin)
  useEffect(() => {
    setItems(shuffle(posts));
  }, [posts]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-neutral-500">{items.length} postime</p>
        <button
          type="button"
          onClick={() => setItems((cur) => shuffle(cur))}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium transition hover:border-neutral-900"
        >
          Përziej
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
        {items.map((post) => (
          <button
            key={post.id}
            type="button"
            onClick={() => setSelected(post)}
            className="group relative aspect-square overflow-hidden rounded-sm bg-neutral-200"
          >
            <img
              src={post.thumb}
              alt={post.caption || "Postim në Instagram"}
              referrerPolicy="no-referrer"
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
            {post.isVideo && (
              <span className="absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                Video
              </span>
            )}
          </button>
        ))}
      </div>

      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-full w-full max-w-lg overflow-auto rounded-lg bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {selected.isVideo ? (
              <video
                src={selected.mediaUrl}
                poster={selected.thumb}
                controls
                autoPlay
                playsInline
                className="w-full rounded bg-black"
              />
            ) : (
              <img
                src={selected.mediaUrl}
                alt={selected.caption || "Postim në Instagram"}
                referrerPolicy="no-referrer"
                className="w-full rounded bg-neutral-200"
              />
            )}

            {selected.username && (
              <Link
                href={`/profile/${encodeURIComponent(selected.username)}`}
                className="mt-3 block font-medium hover:underline"
              >
                @{selected.username}
              </Link>
            )}

            {selected.caption && (
              <p className="mt-1 line-clamp-4 whitespace-pre-line text-sm text-neutral-700">
                {selected.caption}
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <a
                href={selected.mediaUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
              >
                {selected.isVideo ? "Shkarko videon" : "Shkarko foton"}
              </a>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium transition hover:border-neutral-900"
              >
                Mbyll
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
