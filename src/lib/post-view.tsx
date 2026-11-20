import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import {
  getProfile,
  IgramError,
  type MediaItem,
  type Post,
  type Profile,
} from "@/lib/igram";

type Loaded =
  | { ok: true; profile: Profile; post: Post | null }
  | { ok: false; status: number; message: string };

// cache() => një thirrje e vetme për kërkesë (metadata + faqja)
export const loadPost = cache(
  async (username: string, shortcode: string): Promise<Loaded> => {
    try {
      const profile = await getProfile(username);
      const post =
        profile.posts.find(
          (p) => p.shortcode === shortcode || p.id === shortcode
        ) ?? null;
      return { ok: true, profile, post };
    } catch (error) {
      if (error instanceof IgramError) {
        return { ok: false, status: error.status, message: error.message };
      }
      console.error("loadPost error:", error);
      return {
        ok: false,
        status: 500,
        message: "Gabim i papritur gjatë marrjes së postimit.",
      };
    }
  }
);

export async function postMetadata(
  username: string,
  shortcode: string
): Promise<Metadata> {
  const result = await loadPost(username, shortcode);

  const fallback: Metadata = {
    title: `@${username} - Instagram`,
    description: `Shiko postimin publik të @${username}.`,
  };

  if (!result.ok || !result.post) return fallback;

  const { profile, post } = result;

  const title = `${profile.fullName || profile.username} (@${profile.username}) - ${
    post.isVideo ? "Reel" : "Postim"
  }`;
  const description =
    post.caption?.slice(0, 160) ||
    `Shiko postimin publik të @${profile.username}.`;

  // Foto vjen nga domeni ynë (metadataBase e bën URL absolute)
  const cover = `/api/media/${encodeURIComponent(username)}/${encodeURIComponent(
    shortcode
  )}?kind=cover`;
   return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

function Shell({ username, children }: { username: string; children: ReactNode }) {
  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 py-10 text-neutral-900">
      <Link
        href={`/profile/${encodeURIComponent(username)}`}
        className="mb-6 inline-block text-sm text-neutral-500 hover:text-neutral-900"
      >
        ← Kthehu te @{username}
      </Link>
      {children}
    </main>
  );
}

const fmt = (n: number | null) =>
  n == null
    ? null
    : new Intl.NumberFormat("en", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(n);

export async function PostView({
  username,
  shortcode,
}: {
  username: string;
  shortcode: string;
}) {
  const result = await loadPost(username, shortcode);

  if (!result.ok && result.status === 404) notFound();

  if (!result.ok) {
    return (
      <Shell username={username}>
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        >
          {result.message}
        </p>
      </Shell>
    );
  }

  const { post } = result;

  if (!post) {
    return (
      <Shell username={username}>
        <p className="text-neutral-600">
          Ky postim nuk u gjet te postimet e fundit të profilit.
        </p>
      </Shell>
    );
  }

  const all: MediaItem[] = post.mediaItems.length
    ? post.mediaItems
    : [
        {
          url: post.mediaUrl,
          thumbnail: post.thumb,
          type: post.isVideo ? "video" : "image",
        },
      ];

  const indexed = all.map((item, i) => ({ item, i }));
  const videos = indexed.filter(({ item }) => item.type === "video").slice(0, 1);
  const list = post.isVideo && videos.length ? videos : indexed;

  const mediaBase = `/api/media/${encodeURIComponent(username)}/${encodeURIComponent(
    shortcode
  )}`;

  const likes = fmt(post.likes);
  const comments = fmt(post.comments);

  return (
    <Shell username={username}>
      <ul className="space-y-8">
        {list.map(({ item, i }) => (
          <li key={i}>
            {item.type === "video" ? (
              <video
                src={item.url}
                poster={post.thumb || undefined}
                controls
                playsInline
                preload="metadata"
                className="w-full rounded-lg bg-black"
              />
            ) : (
              <img
                src={item.url}
                alt={post.caption || "Postim në Instagram"}
                referrerPolicy="no-referrer"
                className="w-full rounded-lg bg-neutral-200"
              />
            )}

            <a
              href={`${mediaBase}?i=${i}&download=1`}
              className="mt-3 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
            >
              {item.type === "video" ? "Shkarko videon" : "Shkarko foton"}
            </a>
          </li>
        ))}
      </ul>

      {(likes || comments) && (
        <p className="mt-6 text-sm text-neutral-500">
          {[likes && `${likes} pëlqime`, comments && `${comments} komente`]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}

      {post.caption && (
        <p className="mt-3 whitespace-pre-line text-neutral-700">{post.caption}</p>
      )}
    </Shell>
  );
}
