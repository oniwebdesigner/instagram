"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { toTag } from "@/lib/tag";

type UserSuggestion = {
  username: string;
  fullName: string;
  avatar: string;
  isVerified: boolean;
};

type KeywordSuggestion = { name: string; count: number | null };

type SearchResponse = {
  users?: UserSuggestion[];
  hashtags?: KeywordSuggestion[];
  error?: string;
};

type Row =
  | { kind: "search"; group: string; name: string; label: string }
  | { kind: "keyword"; group: string; name: string; label: string; count: number | null }
  | {
      kind: "user";
      group: string;
      username: string;
      fullName: string;
      avatar: string;
      isVerified: boolean;
    };

const VALID_USER = /^[A-Za-z0-9._]{1,30}$/;
const UNAVAILABLE = "Search is unavailable right now. Try again in a moment.";
const norm = (s: string) => s.toLowerCase().replace(/[._]/g, "");

const fmt = (n: number | null) =>
  n == null
    ? ""
    : new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export default function SearchBox() {
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);

  const [q, setQ] = useState("");
  const [users, setUsers] = useState<UserSuggestion[]>([]);
  const [keywords, setKeywords] = useState<KeywordSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const raw = q.trim();
  const profileOnly = raw.startsWith("@");
  const term = raw.replace(/^[@#]/, "").trim();
  const typedKeyword = profileOnly ? "" : toTag(term);

  const rows: Row[] = [];

  if (typedKeyword) {
    rows.push({
      kind: "search",
      group: "Search",
      name: typedKeyword,
      label: `Profiles for “${typedKeyword}”`,
    });
    rows.push({
      kind: "keyword",
      group: "Search",
      name: typedKeyword,
      label: `Videos and photos for “${typedKeyword}”`,
      count: null,
    });
  }

  if (!profileOnly) {
    keywords
      .filter((k) => k.name.toLowerCase() !== typedKeyword)
      .slice(0, 4)
      .forEach((k) =>
        rows.push({
          kind: "keyword",
          group: "Videos and photos",
          name: k.name,
          label: k.name,
          count: k.count,
        })
      );
  }

  users.slice(0, 5).forEach((u) =>
    rows.push({
      kind: "user",
      group: "Profiles",
      username: u.username,
      fullName: u.fullName,
      avatar: u.avatar,
      isVerified: u.isVerified,
    })
  );

  useEffect(() => {
    if ([...term].length < 2) {
      setUsers([]);
      setKeywords([]);
      setError(null);
      return;
    }

    const ctrl = new AbortController();

    // Wait 400 ms after typing stops (saves API credits)
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: ctrl.signal,
        });

        // The response can be empty if the server restarted or crashed
        const text = await res.text();
        let json: SearchResponse = {};
        try {
          json = text ? (JSON.parse(text) as SearchResponse) : {};
        } catch {
          json = {};
        }

        if (!res.ok || !text) throw new Error(json.error ?? UNAVAILABLE);

        setUsers(json.users ?? []);
        setKeywords(json.hashtags ?? []);
        setActive(-1);
        setOpen(true);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setUsers([]);
        setKeywords([]);
        setError(e instanceof Error && e.message ? e.message : UNAVAILABLE);
        setOpen(true);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [term]);

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

  function goKeyword(name: string) {
    setOpen(false);
    router.push(`/explore/${encodeURIComponent(name.toLowerCase())}`);
  }

  function goSearch(name: string) {
    setOpen(false);
    router.push(`/search/${encodeURIComponent(name.toLowerCase())}`);
  }

  function pick(row: Row) {
    if (row.kind === "user") goUser(row.username);
    else if (row.kind === "search") goSearch(row.name);
    else goKeyword(row.name);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!raw) return;

    if (active >= 0 && rows[active]) return pick(rows[active]);

    if (profileOnly) {
      if (VALID_USER.test(term)) return goUser(term);
      if (users[0]) goUser(users[0].username);
      return;
    }

    // A username with a dot, or an exact match with a profile: open the profile
    const exact = users.find((u) => norm(u.username) === norm(term));
    if (exact) return goUser(exact.username);
    if (term.includes(".") && VALID_USER.test(term)) return goUser(term);

    // Anything else: the list of matching profiles, like Imginn
    if (typedKeyword) goSearch(typedKeyword);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && (rows.length > 0 || error || loading);

  return (
    <div ref={boxRef} className="relative">
      <form onSubmit={submit} className="flex gap-2">
        <div className="flex flex-1 items-center rounded-lg border border-neutral-300 bg-white px-3 focus-within:border-neutral-900 focus-within:ring-2 focus-within:ring-neutral-900/10">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5 shrink-0 text-neutral-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search profiles, videos or photos: cats, travel, tiranaweb.tech…"
            aria-label="Search profiles, videos or photos"
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
          Search
        </button>
      </form>

      {showList && (
        <ul
          id="search-suggestions"
          role="listbox"
          className="absolute z-10 mt-2 max-h-96 w-full overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {loading && rows.length === 0 && (
            <li className="px-4 py-3 text-sm text-neutral-500">Searching…</li>
          )}

          {error && (
            <li role="alert" className="px-4 py-3 text-sm text-red-700">
              {error}
            </li>
          )}

          {rows.map((row, i) => (
            <li key={`${row.kind}-${i}`} role="presentation">
              {(i === 0 || rows[i - 1].group !== row.group) && (
                <p className="px-4 pb-1 pt-2 text-xs font-medium text-neutral-500">
                  {row.group}
                </p>
              )}

              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onClick={() => pick(row)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left ${
                  i === active ? "bg-neutral-100" : ""
                }`}
              >
                {row.kind === "user" ? (
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar src={row.avatar} name={row.fullName || row.username} small />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        @{row.username}
                        {row.isVerified && <span className="ml-1 text-sky-600">✓</span>}
                      </span>
                      {row.fullName && (
                        <span className="block truncate text-sm text-neutral-500">
                          {row.fullName}
                        </span>
                      )}
                    </span>
                  </span>
                ) : (
                  <>
                    <span className="truncate font-medium">{row.label}</span>
                    {row.kind === "keyword" && row.count != null && (
                      <span className="shrink-0 text-sm text-neutral-500">{fmt(row.count)}</span>
                    )}
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
