"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

type Suggestion = {
  username: string;
  fullName: string;
  avatar: string;
  isVerified: boolean;
};

const VALID = /^[A-Za-z0-9._]{1,30}$/;

export default function SearchBox() {
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);

  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  // Sugjerimet: presim 400 ms pasi ndalon së shkruari (kursen kreditet)
  useEffect(() => {
    const term = q.trim().replace(/^@/, "");

    if ([...term].length < 2) {
      setItems([]);
      setError(null);
      return;
    }

    const ctrl = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: ctrl.signal,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Gabim.");

        setItems(json.users ?? []);
        setActive(-1);
        setOpen(true);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setItems([]);
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

  // Mbyll listën kur klikon jashtë
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function go(username: string) {
    setOpen(false);
    router.push(`/profile/${encodeURIComponent(username)}`);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const term = q.trim().replace(/^@/, "");

    if (active >= 0 && items[active]) return go(items[active].username);
    if (VALID.test(term)) return go(term);
    if (items[0]) return go(items[0].username);
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
          <span className="text-neutral-400">@</span>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="username ose fjalë çelës (p.sh. cats 🐈)"
            aria-label="Kërko profile në Instagram"
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
            <li className="px-4 py-3 text-sm text-neutral-500">Nuk u gjet asnjë profil.</li>
          )}

          {items.map((u, i) => (
            <li key={u.username} role="option" aria-selected={i === active}>
              <button
                type="button"
                onClick={() => go(u.username)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${
                  i === active ? "bg-neutral-100" : ""
                }`}
              >
                {u.avatar ? (
                  <img
                    src={u.avatar}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 shrink-0 rounded-full bg-neutral-200 object-cover"
                  />
                ) : (
                  <span className="h-10 w-10 shrink-0 rounded-full bg-neutral-200" />
                )}
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {u.username}
                    {u.isVerified && <span className="ml-1 text-sky-600">✓</span>}
                  </span>
                  {u.fullName && (
                    <span className="block truncate text-sm text-neutral-500">{u.fullName}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
