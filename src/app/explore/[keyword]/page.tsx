import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { connection } from "next/server";
import SearchBox from "@/components/SearchBox";
import TagGrid from "@/components/TagGrid";
import { getHashtagPosts, HashtagError, type TagPost } from "@/lib/hashtag";
import { toTag } from "@/lib/tag";

export const instant = false;

type Props = {
  params: Promise<{ keyword: string }>;
};

type Result =
  | { ok: true; posts: TagPost[] }
  | { ok: false; message: string };

function cleanKeyword(raw: string): string {
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // lëre siç është
  }
  return toTag(decoded);
}

const load = cache(async (keyword: string): Promise<Result> => {
  try {
    const posts = await getHashtagPosts(keyword);
    if (posts.length === 0) {
      return { ok: false, message: `Nuk u gjet asnjë video apo foto për “${keyword}”.` };
    }
    return { ok: true, posts };
  } catch (error) {
    if (error instanceof HashtagError) return { ok: false, message: error.message };
    console.error("explore page error:", error);
    return { ok: false, message: "Gabim i papritur gjatë marrjes së përmbajtjes." };
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { keyword } = await params;
  const clean = cleanKeyword(keyword);

  return {
    title: `${clean} - Video dhe foto`,
    description: `Video dhe foto të rastësishme për “${clean}”.`,
  };
}

export default async function ExplorePage({ params }: Props) {
  const { keyword } = await params;
  const clean = cleanKeyword(keyword);
  await connection();
  const result = clean ? await load(clean) : null;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-12 text-neutral-900">
      <Link
        href="/"
        className="mb-8 inline-block text-sm text-neutral-500 hover:text-neutral-900"
      >
        ← Kthehu te kërkimi
      </Link>

      <h1 className="text-3xl font-semibold tracking-tight">{clean || "Kërko"}</h1>
      <p className="mt-2 text-neutral-600">
        Video dhe foto të rastësishme. Shtyp “Përziej” për të parë të tjera.
      </p>

      <div className="mt-6 mb-8">
        <SearchBox />
      </div>

      {!result || !result.ok ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        >
          {result ? result.message : "Shkruaj një fjalë për të kërkuar."}
        </p>
      ) : (
        <TagGrid posts={result.posts} />
      )}
    </main>
  );
}

