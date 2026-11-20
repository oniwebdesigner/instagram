import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import SearchBox from "@/components/SearchBox";
import TagGrid from "@/components/TagGrid";
import { getHashtagPosts, HashtagError, type TagPost } from "@/lib/hashtag";
import { toTag } from "@/lib/tag";

export const instant = false;

type Props = {
  params: Promise<{ tag: string }>;
};

type Result =
  | { ok: true; posts: TagPost[] }
  | { ok: false; message: string };

function cleanTag(raw: string): string {
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // lëre siç është
  }
  return toTag(decoded);
}

const load = cache(async (tag: string): Promise<Result> => {
  try {
    const posts = await getHashtagPosts(tag);
    if (posts.length === 0) {
      return { ok: false, message: `Nuk u gjetën postime për #${tag}.` };
    }
    return { ok: true, posts };
  } catch (error) {
    if (error instanceof HashtagError) return { ok: false, message: error.message };
    console.error("tag page error:", error);
    return { ok: false, message: "Gabim i papritur gjatë marrjes së postimeve." };
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  const clean = cleanTag(tag);

  return {
    title: `#${clean} - Postime në Instagram`,
    description: `Postime dhe video të popullarizuara me #${clean}.`,
  };
}

export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  const clean = cleanTag(tag);
  const result = clean ? await load(clean) : null;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-12 text-neutral-900">
      <Link
        href="/"
        className="mb-8 inline-block text-sm text-neutral-500 hover:text-neutral-900"
      >
        ← Kthehu te kërkimi
      </Link>

      <h1 className="text-3xl font-semibold tracking-tight">#{clean || "hashtag"}</h1>
      <p className="mt-2 text-neutral-600">
        Postime dhe video të popullarizuara. Shtyp “Përziej” për një rend tjetër.
      </p>

      <div className="mt-6 mb-8">
        <SearchBox />
      </div>

      {!result || !result.ok ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        >
          {result ? result.message : "Shkruaj një hashtag të vlefshëm."}
        </p>
      ) : (
        <TagGrid posts={result.posts} />
      )}
    </main>
  );
}
