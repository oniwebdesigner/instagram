
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function search(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const cleanUsername = username.trim().replace(/^@/, "");

    if (!cleanUsername) {
      setError("Shkruaj username-in e Instagramit.");
      return;
    }

    if (!/^[A-Za-z0-9._]{1,30}$/.test(cleanUsername)) {
      setError("Username nuk është i vlefshëm.");
      return;
    }

    setError(null);
    setLoading(true);

    router.push(`/profile/${encodeURIComponent(cleanUsername)}`);
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-14 text-neutral-900">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Shiko një profil Instagram pa u kyçur
      </h1>

      <p className="mt-3 max-w-prose text-neutral-600">
        Shkruaj username-in e një profili publik për të parë postimet dhe për
        t’i shkarkuar.
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
        <p
          role="alert"
          className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        >
          {error}
        </p>
      )}
    </main>
  );
}
