// Server-only. Autocomplete nga igramapi (GET /v1/search, 1 kredit).

export type SearchUser = {
  username: string;
  fullName: string;
  avatar: string;
  isVerified: boolean;
};

export type SearchTag = {
  name: string;
  count: number | null;
};

export type SearchResult = {
  users: SearchUser[];
  hashtags: SearchTag[];
};

export class SearchError extends Error {
  constructor(
    message: string,
    public status = 500
  ) {
    super(message);
    this.name = "SearchError";
  }
}

const BASE = process.env.IGRAM_API_BASE ?? "https://api.igramapi.com";
const PARAM = process.env.IGRAM_SEARCH_PARAM ?? "q";

function get(obj: unknown, ...paths: string[]): unknown {
  for (const path of paths) {
    let current: unknown = obj;
    for (const part of path.split(".")) {
      if (current === null || typeof current !== "object" || !(part in current)) {
        current = undefined;
        break;
      }
      current = (current as Record<string, unknown>)[part];
    }
    if (current !== undefined && current !== null && current !== "") return current;
  }
  return undefined;
}

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

export async function search(q: string): Promise<SearchResult> {
  const key = process.env.IGRAM_API_KEY;
  if (!key) throw new SearchError("Mungon IGRAM_API_KEY në konfigurimin e serverit.", 500);

  const url = new URL("/v1/search", BASE);
  url.searchParams.set(PARAM, q);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    next: { revalidate: 600 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("igramapi search error:", res.status, body.slice(0, 500));

    if (body.includes("quota_exceeded")) {
      throw new SearchError("Kreditet e API-t kanë mbaruar.", 429);
    }
    if (res.status === 429) throw new SearchError("Shumë kërkesa. Provo pas pak.", 429);
    if (res.status === 401 || res.status === 403) {
      throw new SearchError("API key nuk pranohet.", 502);
    }
    throw new SearchError(`Kërkimi dështoi (${res.status}).`, 502);
  }

  const raw = await res.json();

  if (process.env.IGRAM_DEBUG === "1") {
    console.log("igramapi search response:", JSON.stringify(raw, null, 2).slice(0, 3000));
  }

  // ---------- Profile ----------
  const list = get(
    raw,
    "users",
    "data.users",
    "results.users",
    "data.results.users",
    "items",
    "data.items",
    "results",
    "data"
  );

  const seenUsers = new Set<string>();

  const users = (Array.isArray(list) ? list : [])
    .map((item): SearchUser | null => {
      const node = get(item, "user") ?? item;
      const username = str(get(node, "username", "user_name"));
      if (!username) return null;

      return {
        username,
        fullName: str(get(node, "full_name", "fullName", "name")),
        avatar: str(
          get(node, "profile_picture_url", "profile_pic_url", "profile_pic_url_hd", "avatar", "picture")
        ),
        isVerified: get(node, "is_verified", "isVerified") === true,
      };
    })
    .filter((u): u is SearchUser => {
      if (!u || seenUsers.has(u.username)) return false;
      seenUsers.add(u.username);
      return true;
    })
    .slice(0, 8);

  // ---------- Hashtag-e ----------
  const rawTags = get(
    raw,
    "hashtags",
    "data.hashtags",
    "results.hashtags",
    "data.results.hashtags"
  );

  let tagItems: unknown[] = Array.isArray(rawTags) ? rawTags : [];

  if (tagItems.length === 0 && Array.isArray(list)) {
    tagItems = list.filter((item) => {
      const t = str(get(item, "type", "kind")).toLowerCase();
      return t.includes("hashtag") || get(item, "hashtag") !== undefined;
    });
  }

  const seenTags = new Set<string>();

  const hashtags = tagItems
    .map((item): SearchTag | null => {
      const inner = get(item, "hashtag");
      const node = inner && typeof inner === "object" ? inner : item;
      const name = (
        str(get(node, "name", "tag", "hashtag", "title")) ||
        (typeof inner === "string" ? inner : "")
      ).replace(/^#/, "");

      if (!name) return null;

      return {
        name,
        count: num(get(node, "media_count", "post_count", "posts_count", "count")),
      };
    })
    .filter((t): t is SearchTag => {
      if (!t || seenTags.has(t.name.toLowerCase())) return false;
      seenTags.add(t.name.toLowerCase());
      return true;
    })
    .slice(0, 8);

  return { users, hashtags };
}
