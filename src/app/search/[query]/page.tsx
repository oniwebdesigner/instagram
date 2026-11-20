import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import Avatar from "@/components/Avatar";
import SearchBox from "@/components/SearchBox";
import { search, SearchError, type SearchUser } from "@/lib/search";

export const instant = false;

type Props = {
  params: Promise<{ query: string }>;
};

function cleanQuery(raw: string): string {
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // leave as is
  }
  return decoded.trim().slice(0, 50);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { query } = await params;
  const q = cleanQuery(query);

  return {
    title: `Profiles for “${q}”`,
    description: `Public profiles matching “${q}”.`,
  };
}

export default async function SearchPage({ params }: Props) {
  await connection();

  const { query } = await params;
  const q = cleanQuery(query);

  let users: SearchUser[] = [];
  let error: string | null = null;

  if ([...q].length >= 2) {
    try {
      users = (await search(q)).users;
    } catch (e) {
      error = e instanceof SearchError ? e.message : "Unexpected error while searching.";
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-12 text-neutral-900">
      <Link
        href="/"
        className="mb-8 inline-block text-sm text-neutral-500 hover:text-neutral-900"
      >
        ← Back to search
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">Results for “{q}”</h1>

      <div className="mb-6 mt-6">
        <SearchBox />
      </div>

      <Link
        href={`/explore/${encodeURIComponent(q.toLowerCase())}`}
        className="mb-6 inline-block rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-medium transition hover:border-neutral-900"
      >
        See videos and photos for “{q}”
      </Link>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        >
          {error}
        </p>
      ) : users.length === 0 ? (
        <p className="text-neutral-600">No profiles found for “{q}”.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-neutral-500">{users.length} profiles</p>

          <ul className="space-y-2">
            {users.map((u) => (
              <li key={u.username}>
                <Link
                  href={`/profile/${encodeURIComponent(u.username)}`}
                  className="flex items-center gap-4 rounded-lg border border-neutral-200 px-4 py-3 transition hover:border-neutral-900"
                >
                  <Avatar src={u.avatar} name={u.fullName || u.username} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {u.fullName || u.username}
                      {u.isVerified && <span className="ml-1 text-sky-600">✓</span>}
                    </span>
                    <span className="block truncate text-sm text-neutral-500">
                      @{u.username}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
