"use client";

import { useState } from "react";
import type { Profile } from "@/lib/igram";

const fmt = (n: number | null) =>
  n == null ? "–" : new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export default function Home() {
  const [username, setUsername] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setError(null);
    setProfile(null);
    try {
      const res = await fetch(`/api/profile?username=${encodeURIComponent(username.trim())}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gabim.");
      setProfile(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gabim i papritur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-14 text-neutral-900">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Shiko një profil Instagram pa u kyçur</h1>
      <p className="mt-3 max-w-prose text-neutral-600">
        Shkruaj username-in e një profili publik për të parë postimet dhe për t’i shkarkuar.
      </p>

      <form onSubmit={search} className="mt-8 flex gap-2">
        <div className="flex flex-1 items-center rounded-lg border border-neutral-300 bg-white px-3 focus-within:border-neutral-900 focus-within:ring-2 focus-within:ring-neutral-900/10">
          <span className="text-neutral-400">@</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            aria-label="Username i Instagramit"
            className="w-full bg-transparent px-2 py-3 outline-none"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>
        <button
          disabled={loading}
          className="rounded-lg bg-neutral-900 px-5 font-medium text-white transition hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:opacity-50"
        >
          {loading ? "Duke kërkuar…" : "Kërko"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </p>
      )}

      {profile && (
        <section className="mt-10">
          <header className="flex items-center gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {profile.avatar ? (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src={profile.avatar}
    alt={`Foto e @${profile.username}`}
    referrerPolicy="no-referrer"
    className="h-20 w-20 rounded-full bg-neutral-200 object-cover"
  />
) : (
  <div className="h-20 w-20 rounded-full bg-neutral-200" aria-hidden />
)}
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold">
                {profile.fullName || profile.username}
                {profile.isVerified && <span className="ml-1 text-sky-600" title="I verifikuar">✓</span>}
              </h2>
              <p className="text-neutral-500">@{profile.username}</p>
            </div>
          </header>

          {profile.bio && <p className="mt-4 whitespace-pre-line text-neutral-700">{profile.bio}</p>}

          <dl className="mt-5 grid grid-cols-3 divide-x divide-neutral-200 rounded-lg border border-neutral-200 text-center">
            {[
              ["Postime", profile.postsCount],
              ["Ndjekës", profile.followers],
              ["Ndjek", profile.following],
            ].map(([label, value]) => (
              <div key={label as string} className="py-3">
                <dd className="text-lg font-semibold">{fmt(value as number | null)}</dd>
                <dt className="text-sm text-neutral-500">{label}</dt>
              </div>
            ))}
          </dl>

          {profile.isPrivate ? (
            <p className="mt-8 text-neutral-600">Ky profil është privat. Mund të shihen vetëm profilet publike.</p>
          ) : profile.posts.length === 0 ? (
            <p className="mt-8 text-neutral-600">Ky profil nuk ka postime për t’u shfaqur.</p>
          ) : (
            <ul className="mt-8 grid grid-cols-3 gap-1.5">
              {profile.posts.map((p) => (
                <li key={p.id} className="group relative aspect-square overflow-hidden bg-neutral-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.thumb}
                    alt={p.caption || "Postim"}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  {p.isVideo && (
                    <span className="absolute right-1.5 top-1.5 rounded bg-black/65 px-1.5 py-0.5 text-xs text-white">
                      Video
                    </span>
                  )}
                  <a
                    href={p.mediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute inset-x-0 bottom-0 bg-black/70 py-2 text-center text-sm font-medium text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    Shkarko
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
