// Server-only. Autocomplete nga igramapi (GET /v1/search, 1 kredit).

export type SearchUser = {
  username: string;
  fullName: string;
  avatar: string;
  isVerified: boolean;
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

export async function searchUsers(q: string): Promise<SearchUser[]> {
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

  const seen = new Set<string>();

  return (Array.isArray(list) ? list : [])
    .map((item): SearchUser | null => {
      const node = get(item, "user") ?? item;
      const username = str(get(node, "username", "user_name"));
      if (!username) return null; // hashtag-et dhe vendet nuk kanë username

      return {
        username,
        fullName: str(get(node, "full_name", "fullName", "name")),
        avatar: str(
          get(
            node,
            "profile_picture_url",
            "profile_pic_url",
            "profile_pic_url_hd",
            "avatar",
            "picture"
          )
        ),
        isVerified: get(node, "is_verified", "isVerified") === true,
      };
    })
    .filter((u): u is SearchUser => {
      if (!u || seen.has(u.username)) return false;
      seen.add(u.username);
      return true;
    })
    .slice(0, 8);
}
