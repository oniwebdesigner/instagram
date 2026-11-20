"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { toTag } from "@/lib/tag";

type UserSuggestion = {
  username: string;
  fullName: string;
  avatar: string;
  isVerified: boolean;
};

type TagSuggestion = { name: string; count: number | null };

const VALID_USER = /^[A-Za-z0-9._]{1,30}$/;

const fmt = (n: number | null) =>
  n == null
    ? ""
    : new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export default function SearchBox() {
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);

  const [q, setQ] = useState("");
  const [users, setUsers] = useState<UserSuggestion[]>([]);
  const [tags, setTags] = useState<TagSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  // "@username" kërkon profile; çdo gjë tjetër kërkon hashtag-e
  const isUser = q.trimStart().startsWith("@");
  const items = isUser ? users : tags;

  useEffect(() => {
    const raw = q.trim();
    const term = raw.startsWith("@") ? raw.slice(1).trim() : toTag(raw);

    if ([...term].length < 2) {
      setUsers([]);
      setTags([]);
      setError(null);
      return;
    }

    const ctrl = new AbortController();

    // Presim 400 ms pasi ndalon së shkruari (kursen kreditet)
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: ctrl.signal,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Gabim.");

        setUsers(json.users ?? []);
        setTags(json.hashtags ?? []);
        setActive(-1);
        setOpen(true);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setUsers([]);
        setTags([]);
        setError(e instanceof Error ? e.message : "Gabim.");
        setOpen(true);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function goUser(username: string) {
    setOpen(false);
    router.push(`/profile/${encodeURIComponent(username)}`);
  }

  function goTag(name: string) {
    setOpen(false);
    router.push(`/tag/${encodeURIComponent(name.toLowerCase())}`);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const raw = q.trim();

    if (raw.startsWith("@")) {
      const name = raw.slice(1).trim();
      if (active >= 0 && users[active]) return goUser(users[active].username);
      if (VALID_USER.test(name)) return goUser(name);
      if (users[0]) return goUser(users[0].username);
      return;
    }

    if (active >= 0 && tags[active]) return goTag(tags[active].name);

    const tag = toTag(raw);
    if (tag) goTag(tag);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && (items.length > 0 || error || loading);

  return (
    <div ref={boxRef} className="relative">
      <form onSubmit={submit} className="flex gap-2">
        <div className="flex flex-1 items-center rounded-lg border border-neutral-300 bg-white px-3 focus-within:border-neutral-900 focus-within:ring-2 focus-within:ring-neutral-900/10">
          <span className="text-neutral-400">{isUser ? "@" : "#"}</span>
          <input
            value={isUser ? q.trimStart().slice(1) : q.replace(/^#/, "")}
            onChange={(e) => {
              const v = e.target.value;
              setQ(isUser ? "@" + v : v);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={isUser ? "username" : "cats, dogs, travel… (ose shkruaj @ për profile)"}
            aria-label="Kërko hashtag ose profil"
            role="combobox"
            aria-expanded={Boolean(showList)}
            aria-controls="search-suggestions"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            className="w-full bg-transparent px-2 py-3 outline-none"
          />
        </div>
        <button className="rounded-lg bg-neutral-900 px-5 font-medium text-white transition hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900">
          Kërko
        </button>
      </form>

      {showList && (
        <ul
          id="search-suggestions"
          role="listbox"
          className="absolute z-10 mt-2 max-h-96 w-full overflow-auto rounded-lg border border-neutral-200 bg-white shadow-lg"
        >
          {loading && items.length === 0 && (
            <li className="px-4 py-3 text-sm text-neutral-500">Duke kërkuar…</li>
          )}

          {error && (
            <li role="alert" className="px-4 py-3 text-sm text-red-700">
              {error}
            </li>
          )}

          {!loading && !error && items.length === 0 && (
            <li className="px-4 py-3 text-sm text-neutral-500">
              {isUser
                ? "Nuk u gjet asnjë profil."
                : "Asnjë sugjerim. Shtyp Enter për të kërkuar postime me këtë hashtag."}
            </li>
          )}

          {isUser
            ? users.map((u, i) => (
                <li key={u.username} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onClick={() => goUser(u.username)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${
                      i === active ? "bg-neutral-100" : ""
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        @{u.username}
                        {u.isVerified && <span className="ml-1 text-sky-600">✓</span>}
                      </span>
                      {u.fullName && (
                        <span className="block truncate text-sm text-neutral-500">
                          {u.fullName}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))
            : tags.map((t, i) => (
                <li key={t.name} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onClick={() => goTag(t.name)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left ${
                      i === active ? "bg-neutral-100" : ""
                    }`}
                  >
                    <span className="truncate font-medium">#{t.name}</span>
                    {t.count != null && (
                      <span className="shrink-0 text-sm text-neutral-500">
                        {fmt(t.count)} postime
                      </span>
                    )}
                  </button>
                </li>
              ))}
        </ul>
      )}
    </div>
  );
}
