"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { POPULAR_TAGS } from "@/lib/tag";

export default function TagChips() {
  const router = useRouter();

  function surprise() {
    const tag = POPULAR_TAGS[Math.floor(Math.random() * POPULAR_TAGS.length)];
    router.push(`/tag/${tag}`);
  }

  return (
    <div className="mt-8 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={surprise}
        className="rounded-full bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-700"
      >
        Video të rastësishme
      </button>

      {POPULAR_TAGS.map((tag) => (
        <Link
          key={tag}
          href={`/tag/${tag}`}
          className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm transition hover:border-neutral-900"
        >
          #{tag}
        </Link>
      ))}
    </div>
  );
}
