// Server-only. Postime sipas hashtag-ut (GET /v1/hashtags/{tag}, 2 kredite).

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

function normalize(item: unknown, index: number): TagPost | null {
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
    id: str(get(node, "media_id", "id", "pk")) || shortcode || String(index),
    shortcode,
    username: str(get(node, "owner.username", "user.username", "author.username", "username")),
    thumb: thumb || mediaUrl,
    mediaUrl,
    isVideo,
    caption: str(get(node, "caption.text", "caption", "text")),
    likes: num(get(node, "like_count", "likes", "edge_liked_by.count")),
    comments: num(get(node, "comment_count", "comments", "edge_media_to_comment.count")),
  };
}

export async function getHashtagPosts(tag: string): Promise<TagPost[]> {
  const key = process.env.IGRAM_API_KEY;
  if (!key) throw new HashtagError("Mungon IGRAM_API_KEY në konfigurimin e serverit.", 500);

  const url = new URL(`/v1/hashtags/${encodeURIComponent(tag)}`, BASE);

  // Cache 1 orë: çdo hashtag kushton 2 kredite vetëm një herë në orë
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("igramapi hashtag error:", res.status, body.slice(0, 500));

    if (body.includes("quota_exceeded")) {
      throw new HashtagError("Kreditet e API-t kanë mbaruar.", 429);
    }
    if (res.status === 402 || res.status === 403) {
      throw new HashtagError(
        "Hashtag-et kërkojnë plan të paguar te igramapi, ose çelësi nuk e lejon këtë endpoint.",
        402
      );
    }
    if (res.status === 404) {
      throw new HashtagError(`Nuk u gjetën postime për #${tag}.`, 404);
    }
    if (res.status === 429) throw new HashtagError("Shumë kërkesa. Provo pas pak.", 429);
    throw new HashtagError(`Kërkimi dështoi (${res.status}).`, 502);
  }

  const raw = await res.json();

  if (process.env.IGRAM_DEBUG === "1") {
    console.log("igramapi hashtag response:", JSON.stringify(raw, null, 2).slice(0, 4000));
  }

  const found: unknown[] = Array.isArray(raw)
    ? raw
    : LIST_KEYS.flatMap((k) => asArray(get(raw, k, `data.${k}`, `hashtag.${k}`)));

  const seen = new Set<string>();

  return found
    .map(normalize)
    .filter((p): p is TagPost => {
      if (!p) return false;
      const k = p.shortcode || p.id;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 60);
}
