import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getProfile, IgramError, type Profile } from "@/lib/igram";

export const instant = false;

type Props = {
  params: Promise<{ username: string }>;
};

type Result =
  | { ok: true; profile: Profile }
  | { ok: false; status: number; message: string };

// cache() e bën thirrjen vetëm një herë për kërkesë (faqja + metadata)
const loadProfile = cache(async (username: string): Promise<Result> => {
  try {
    return { ok: true, profile: await getProfile(username) };
  } catch (error) {
    if (error instanceof IgramError) {
      return { ok: false, status: error.status, message: error.message };
    }
    console.error("loadProfile error:", error);
    return {
      ok: false,
      status: 500,
      message: "Gabim i papritur gjatë marrjes së profilit.",
    };
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const result = await loadProfile(username);

  if (!result.ok) {
    return {
      title: `Instagram Profile - @${username}`,
      description: `Shiko profilin publik të @${username}.`,
    };
  }

  const { profile } = result;
  const title = `${profile.fullName || profile.username} (@${profile.username}) - Instagram Profile`;
  const description =
    profile.bio?.slice(0, 160) ||
    `Shiko postimet publike të @${profile.username}.`;
  const path = `/profile/${encodeURIComponent(profile.username)}`;

  // Pa "images": imazhin e merr nga opengraph-image.tsx
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, type: "profile", url: path },
    twitter: { card: "summary_large_image", title, description },
  };
}

const fmt = (n: number | null) =>
  n == null
    ? "–"
    : new Intl.NumberFormat("en", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(n);

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const result = await loadProfile(username);

  if (!result.ok && result.status === 404) notFound();

  if (!result.ok) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-5 py-12 text-neutral-900">
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-neutral-500 hover:text-neutral-900"
        >
          ← Kthehu te kërkimi
        </Link>
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        >
          {result.message}
        </p>
      </main>
    );
  }

  const { profile } = result;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-12 text-neutral-900">
      <Link
        href="/"
        className="mb-8 inline-block text-sm text-neutral-500 hover:text-neutral-900"
      >
        ← Kthehu te kërkimi
      </Link>

      <section>
        <header className="flex items-center gap-5">
          {profile.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar}
              alt={`Foto e @${profile.username}`}
              referrerPolicy="no-referrer"
              className="h-20 w-20 rounded-full bg-neutral-200 object-cover"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-neutral-200" />
          )}

          <div className="min-w-0">
            <h1 className="text-xl font-semibold">
              {profile.fullName || profile.username}
              {profile.isVerified && (
                <span className="ml-1 text-sky-600">✓</span>
              )}
            </h1>
            <p className="text-neutral-500">@{profile.username}</p>
          </div>
        </header>

        {profile.bio && (
          <p className="mt-4 whitespace-pre-line text-neutral-700">
            {profile.bio}
          </p>
        )}

        <dl className="mt-5 grid grid-cols-3 divide-x divide-neutral-200 rounded-lg border border-neutral-200 text-center">
          {[
            ["Postime", profile.postsCount],
            ["Ndjekës", profile.followers],
            ["Ndjek", profile.following],
          ].map(([label, value]) => (
            <div key={label as string} className="py-3">
              <dd className="text-lg font-semibold">
                {fmt(value as number | null)}
              </dd>
              <dt className="text-sm text-neutral-500">{label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {profile.isPrivate ? (
        <p className="mt-10 text-neutral-600">
          Ky profil është privat. Mund të shihen vetëm profilet publike.
        </p>
      ) : profile.posts.length === 0 ? (
        <p className="mt-10 text-neutral-600">
          Nuk u gjetën postime për këtë profil.
        </p>
      ) : (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold">Postimet</h2>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
            {profile.posts.map((post) => {
              const href = post.isVideo
                ? `/reel/${encodeURIComponent(profile.username)}/${post.shortcode}`
                : `/p/${encodeURIComponent(profile.username)}/${post.shortcode}`;

              return (
                <Link
                  key={post.id}
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
        </section>
      )}
    </main>
  );
}