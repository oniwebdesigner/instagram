// Server-only. Postime për një fjalë çelës.
// 1) Provon hashtag-un (GET /v1/hashtags/{tag}, plan i paguar).
// 2) Nëse nuk lejohet, merr postime/Reels nga profilet që gjen kërkimi.

import { search, SearchError, type SearchUser } from "@/lib/search";

export type TagPost = {
  id: string;
  shortcode: string;
  username: string;
  thumb: string;
  mediaUrl: string;
  isVideo: boolean;
  caption: string;
  likes: number | null;
  comments: number | null;
};

export class HashtagError extends Error {
  constructor(
    message: string,
    public status = 500
  ) {
    super(message);
    this.name = "HashtagError";
  }
}

const BASE = process.env.IGRAM_API_BASE ?? "https://api.igramapi.com";
const CACHE_SECONDS = 3600;

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
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

const LIST_KEYS = [
  "posts",
  "top_posts",
  "popular_posts",
  "popular",
  "reels",
  "top_reels",
  "recent_posts",
  "items",
  "media",
];

function shortcodeFrom(node: unknown): string {
  const direct = str(get(node, "shortcode", "code"));
  if (direct) return direct;

  const link = str(get(node, "url", "permalink", "link", "post_url"));
  const m = link.match(/\/(?:p|reel|reels|tv)\/([^/?#]+)/);
  return m ? m[1] : "";
}

function normalize(
  item: unknown,
  index: number,
  fallbackUsername = "",
  forceVideo = false
): TagPost | null {
  const node = get(item, "node") ?? item;

  const downloads = asArray(get(node, "downloads", "resources", "media_items"));
  const typeOf = (d: unknown) => str(get(d, "type", "media_type")).toLowerCase();

  const dlVideo = downloads.find((d) => typeOf(d).includes("video"));
  const dlImage = downloads.find((d) => {
    const t = typeOf(d);
    return t.includes("image") || t.includes("photo");
  });

  const rawType = str(get(node, "type", "media_type", "product_type")).toLowerCase();
  const videoUrl =
    str(get(node, "video_url", "videoUrl", "play_url")) || str(get(dlVideo, "url", "src"));

  const isVideo =
    forceVideo ||
    get(node, "is_video", "isVideo") === true ||
    rawType.includes("video") ||
    rawType.includes("reel") ||
    rawType.includes("clip") ||
    Boolean(videoUrl);

  const thumb =
    str(get(node, "thumbnail_url", "thumbnail", "display_url", "image_url", "thumb", "cover")) ||
    str(get(dlVideo, "thumbnail", "thumbnail_url")) ||
    str(get(dlImage, "thumbnail", "url"));

  const imageUrl =
    str(get(dlImage, "url", "src")) || str(get(node, "display_url", "image_url"));

  const mediaUrl = isVideo ? videoUrl || thumb : imageUrl || thumb;

  if (!thumb && !mediaUrl) return null;

  const shortcode = shortcodeFrom(node);

  return {
    id: str(get(node, "media_id", "id", "pk")) || shortcode || `${fallbackUsername}-${index}`,
    shortcode,
    username:
      str(get(node, "owner.username", "user.username", "author.username", "username")) ||
      fallbackUsername,
    thumb: thumb || mediaUrl,
    mediaUrl,
    isVideo,
    caption: str(get(node, "caption.text", "caption", "text")),
    likes: num(get(node, "like_count", "likes", "edge_liked_by.count")),
    comments: num(get(node, "comment_count", "comments", "edge_media_to_comment.count")),
  };
}

function dedupe(posts: (TagPost | null)[]): TagPost[] {
  const seen = new Set<string>();
  return posts.filter((p): p is TagPost => {
    if (!p) return false;
    const k = p.shortcode || p.id;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ---------- Rruga 2: postime nga profilet që gjen kërkimi ----------

async function fetchList(path: string, key: string): Promise<unknown[]> {
  try {
    const res = await fetch(new URL(path, BASE), {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      next: { revalidate: CACHE_SECONDS },
    });

    if (!res.ok) {
      console.error("igramapi list error:", path, res.status);
      return [];
    }

    const raw = await res.json();
    return asArray(
      get(raw, "items", "data.items", "posts", "data.posts", "reels", "data.reels")
    );
  } catch (e) {
    console.error("igramapi list failed:", path, e);
    return [];
  }
}

const MAX_PROFILES = 5; // 2 kredite për profil, vetëm një herë në orë

async function viaProfiles(tag: string, key: string): Promise<TagPost[]> {
  let users: SearchUser[] = [];

  try {
    users = (await search(tag)).users;
  } catch (e) {
    if (e instanceof SearchError) throw new HashtagError(e.message, e.status);
    throw e;
  }

  const needle = tag.toLowerCase();
  const matches = (u: SearchUser) =>
    `${u.username} ${u.fullName}`.toLowerCase().includes(needle);

  const relevant = users.filter(matches);
  const others = users.filter((u) => !matches(u));

  // Profilet që e kanë fjalën në emër kanë përparësi;
  // të tjerët plotësojnë vetëm kur ka shumë pak
  const candidates = (
    relevant.length >= 2 ? relevant : [...relevant, ...others]
  ).slice(0, MAX_PROFILES);

  if (candidates.length === 0) {
    throw new HashtagError(`Nuk u gjet asnjë përmbajtje për “${tag}”.`, 404);
  }

  const relevantNames = new Set(relevant.map((u) => u.username));

  const batches = await Promise.all(
    candidates.map(async (u) => {
      const name = encodeURIComponent(u.username);

      const [posts, reels] = await Promise.all([
        fetchList(`/v1/profiles/${name}/posts`, key),
        fetchList(`/v1/profiles/${name}/reels`, key),
      ]);

      return [
        ...posts.map((p, i) => normalize(p, i, u.username, false)),
        ...reels.map((p, i) => normalize(p, i, u.username, true)),
      ];
    })
  );

  const all = dedupe(batches.flat());

  const isRelevant = (p: TagPost) =>
    relevantNames.has(p.username) || p.caption.toLowerCase().includes(needle);

  const good = all.filter(isRelevant);
  const rest = all.filter((p) => !isRelevant(p));

  // Nëse ka mjaft postime të lidhura, i hedhim të tjerat
  const result = (good.length >= 6 ? good : [...good, ...rest]).slice(0, 60);

  if (result.length === 0) {
    throw new HashtagError(`Nuk u gjetën postime publike për “${tag}”.`, 404);
  }

  return result;
}
// ---------- Funksioni kryesor ----------

export async function getHashtagPosts(tag: string): Promise<TagPost[]> {
  const key = process.env.IGRAM_API_KEY;
  if (!key) throw new HashtagError("Mungon IGRAM_API_KEY në konfigurimin e serverit.", 500);

  const res = await fetch(new URL(`/v1/hashtags/${encodeURIComponent(tag)}`, BASE), {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    next: { revalidate: CACHE_SECONDS },
  });

  if (res.ok) {
    const raw = await res.json();

    if (process.env.IGRAM_DEBUG === "1") {
      console.log("igramapi hashtag response:", JSON.stringify(raw, null, 2).slice(0, 4000));
    }

    const found: unknown[] = Array.isArray(raw)
      ? raw
      : LIST_KEYS.flatMap((k) => asArray(get(raw, k, `data.${k}`, `hashtag.${k}`)));

    const posts = dedupe(found.map((item, i) => normalize(item, i))).slice(0, 60);
    if (posts.length > 0) return posts;

    return viaProfiles(tag, key);
  }

  const body = await res.text().catch(() => "");
  if (res.status !== 402 && res.status !== 403 && res.status !== 404) {
    console.error("igramapi hashtag error:", res.status, body.slice(0, 500));
  }

  if (body.includes("quota_exceeded")) {
    throw new HashtagError("Kreditet e API-t kanë mbaruar.", 429);
  }
  if (res.status === 429) throw new HashtagError("Shumë kërkesa. Provo pas pak.", 429);

  // Plan i paguar i kërkuar, ose hashtag pa rezultate: përdorim profilet
  if (res.status === 402 || res.status === 403 || res.status === 404) {
    return viaProfiles(tag, key);
  }

  throw new HashtagError(`Kërkimi dështoi (${res.status}).`, 502);
}

