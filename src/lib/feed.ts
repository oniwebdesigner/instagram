// Server-only. Faqe të tjera postimesh (cursor) nga igramapi.

import { CONFIG, IgramError, normalizePostList, type Post } from "@/lib/igram";

export type FeedKind = "posts" | "reels";

export type FeedPage = { posts: Post[]; nextCursor: string | null };

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

function readCursor(raw: unknown): string | null {
  const hasMore = get(
    raw,
    "has_more",
    "hasMore",
    "pagination.has_more",
    "paging.has_more",
    "meta.has_more",
    "page_info.has_next_page",
    "pageInfo.hasNextPage"
  );
  if (hasMore === false) return null;

  // Kërkon në objekte (jo në lista) çdo fushë që duket si cursor, deri 4 nivele
  const found = { score: 0, value: "" };

  const visit = (node: unknown, depth: number) => {
    if (!node || typeof node !== "object" || Array.isArray(node) || depth > 3) return;

    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      const k = key.toLowerCase();

      if (typeof value === "string" || typeof value === "number") {
        let text = String(value);
        if (text === "" || /^(has|is)/.test(k)) continue;

        // Nëse vjen si URL i plotë, marrim parametrin cursor
        if (text.startsWith("http")) {
          try {
            const c = new URL(text).searchParams.get("cursor");
            if (!c) continue;
            text = c;
          } catch {
            continue;
          }
        }

        let score = 0;
        if (k.includes("cursor")) score += 2;
        if (k.includes("next")) score += 2;
        if (k.includes("max_id") || k.includes("maxid")) score += 1;
        if (k.includes("token") || k === "after") score += 1;

        if (score > found.score) {
          found.score = score;
          found.value = text;
        }
      } else if (value && typeof value === "object") {
        visit(value, depth + 1);
      }
    }
  };

  visit(raw, 0);
  return found.score > 0 ? found.value : null;
}
async function fetchPage(
  username: string,
  kind: FeedKind,
  cursor?: string
): Promise<FeedPage> {
  const key = process.env.IGRAM_API_KEY;
  if (!key) throw new IgramError("Mungon IGRAM_API_KEY në konfigurimin e serverit.", 500);

  const path = kind === "posts" ? CONFIG.postsPath : CONFIG.reelsPath;
  const url = new URL(path.replace("{username}", encodeURIComponent(username)), CONFIG.base);
  if (cursor) url.searchParams.set("cursor", cursor);

  const res = await fetch(url, {
    headers: {
      [CONFIG.authHeader]: `${CONFIG.authPrefix}${key}`,
      Accept: "application/json",
    },
    next: { revalidate: 300 },
  });

  if (res.status === 404) return { posts: [], nextCursor: null };

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("igramapi feed error:", kind, res.status, body.slice(0, 300));

    if (body.includes("quota_exceeded")) {
      throw new IgramError("Kreditet e API-t kanë mbaruar.", 429);
    }
    if (res.status === 429) {
      throw new IgramError("U tejkalua limiti i kërkesave. Provo përsëri më vonë.", 429);
    }
    if (res.status === 401 || res.status === 403) {
      throw new IgramError("API key nuk pranohet.", 502);
    }
    throw new IgramError(`IGramAPI ktheu gabim (${res.status}).`, 502);
  }

  const raw = await res.json();
  const nextCursor = readCursor(raw);

  if (process.env.IGRAM_DEBUG === "1") {
    console.log(
      "igramapi feed response keys:",
      kind,
      raw && typeof raw === "object" ? Object.keys(raw) : typeof raw,
      "| nextCursor:",
      nextCursor
    );
  }

  return { posts: normalizePostList(raw, kind), nextCursor };
}

// Pa cursor: kalon faqen e parë (e ka tashmë faqja e profilit, vjen nga cache)
// dhe kthen të dytën.
export async function getFeedPage(
  username: string,
  kind: FeedKind,
  cursor?: string
): Promise<FeedPage> {
  if (cursor) return fetchPage(username, kind, cursor);

  const first = await fetchPage(username, kind);
  if (!first.nextCursor) return { posts: [], nextCursor: null };

  return fetchPage(username, kind, first.nextCursor);
}

// Gjen një postim që nuk është në faqen e parë (deri në 4 faqe për lloj).
export async function findPostDeep(
  username: string,
  shortcode: string,
  maxPages = 4
): Promise<Post | null> {
  try {
    for (const kind of ["posts", "reels"] as const) {
      let cursor: string | undefined;

      for (let i = 0; i < maxPages; i++) {
        const page = await fetchPage(username, kind, cursor);
        const hit = page.posts.find((p) => p.shortcode === shortcode || p.id === shortcode);
        if (hit) return hit;
        if (!page.nextCursor) break;
        cursor = page.nextCursor;
      }
    }
  } catch (e) {
    console.error("findPostDeep error:", e);
  }

  return null;
}


