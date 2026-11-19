
// lib/igramapi.ts
// Server-only: mos e importo këtë file në Client Components.

export type MediaItem = {
  url: string;
  thumbnail: string;
  type: "image" | "video" | "unknown";
  quality?: string;
};

export type Post = {
  id: string;
  shortcode: string;
  thumb: string;
  mediaUrl: string;
  mediaItems: MediaItem[];
  isVideo: boolean;
  isCarousel: boolean;
  caption: string;
  likes: number | null;
  comments: number | null;
  takenAt: number | null;
};

export type Profile = {
  username: string;
  fullName: string;
  avatar: string;
  bio: string;
  externalUrl: string;
  followers: number | null;
  following: number | null;
  postsCount: number | null;
  isPrivate: boolean;
  isVerified: boolean;
  posts: Post[];
};

const CONFIG = {
  base: process.env.IGRAM_API_BASE ?? "https://api.igramapi.com",
  profilePath:
    process.env.IGRAM_PROFILE_PATH ?? "/v1/profiles/{username}",
  postsPath:
    process.env.IGRAM_POSTS_PATH ?? "/v1/profiles/{username}/posts",
  reelsPath:
    process.env.IGRAM_REELS_PATH ?? "/v1/profiles/{username}/reels",
  authHeader: process.env.IGRAM_AUTH_HEADER ?? "Authorization",
  authPrefix: process.env.IGRAM_AUTH_PREFIX ?? "Bearer ",
};

export class IgramError extends Error {
  constructor(
    message: string,
    public status = 500
  ) {
    super(message);
    this.name = "IgramError";
  }
}

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function get(obj: unknown, ...paths: string[]): unknown {
  for (const path of paths) {
    let current: unknown = obj;

    for (const part of path.split(".")) {
      if (
        current === null ||
        typeof current !== "object" ||
        !(part in current)
      ) {
        current = undefined;
        break;
      }

      current = (current as Record<string, unknown>)[part];
    }

    if (
      current !== undefined &&
      current !== null &&
      current !== ""
    ) {
      return current;
    }
  }

  return undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function str(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim() !== "" &&
    Number.isFinite(Number(value))
  ) {
    return Number(value);
  }

  return null;
}

function bool(value: unknown): boolean {
  return value === true || value === "true" || value === 1;
}

function buildUrl(path: string, username: string): URL {
  return new URL(
    path.replace("{username}", encodeURIComponent(username)),
    CONFIG.base
  );
}

// --------------------------------------------------
// API request
// --------------------------------------------------

async function requestApi(
  path: string,
  username: string,
  key: string,
  optional = false
): Promise<unknown> {
  const url = buildUrl(path, username);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      [CONFIG.authHeader]: `${CONFIG.authPrefix}${key}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (response.status === 404 && optional) {
    return null;
  }

  if (response.status === 404) {
    throw new IgramError("Profili nuk u gjet.", 404);
  }

  if (response.status === 401 || response.status === 403) {
    throw new IgramError("API key nuk pranohet.", 502);
  }

  if (response.status === 429) {
    throw new IgramError(
      "U tejkalua limiti i kërkesave. Provo përsëri më vonë.",
      429
    );
  }

  if (!response.ok) {
    throw new IgramError(
      `IGramAPI ktheu gabim (${response.status}).`,
      502
    );
  }

  try {
    return await response.json();
  } catch {
    throw new IgramError("API ktheu një përgjigje JSON të pavlefshme.", 502);
  }
}

// --------------------------------------------------
// Normalize media
// --------------------------------------------------

function normalizeMediaItem(item: unknown): MediaItem | null {
  const url = str(get(item, "url", "src", "video_url", "image_url"));

  if (!url) return null;

  const rawType = str(get(item, "type", "media_type")).toLowerCase();

  let type: MediaItem["type"] = "unknown";

  if (rawType.includes("video")) {
    type = "video";
  } else if (rawType.includes("image") || rawType.includes("photo")) {
    type = "image";
  }

  return {
    url,
    thumbnail: str(get(item, "thumbnail", "thumbnail_url"), url),
    type,
    quality: str(get(item, "quality")) || undefined,
  };
}

// --------------------------------------------------
// Normalize one post
// --------------------------------------------------

function normalizePost(
  original: unknown,
  index: number,
  source: "posts" | "reels"
): Post {
  const node = get(original, "node") ?? original;

  const rawDownloads = asArray(
    get(node, "downloads", "media", "resources")
  );

  const mediaItems = rawDownloads
    .map(normalizeMediaItem)
    .filter((item): item is MediaItem => item !== null);

  const rawType = str(
    get(node, "type", "media_type")
  ).toLowerCase();

  const videoFromField = str(
    get(node, "video_url", "videoUrl", "play_url")
  );

  const isVideo =
    source === "reels" ||
    rawType.includes("video") ||
    mediaItems.some((item) => item.type === "video") ||
    Boolean(videoFromField);

  const isCarousel =
    rawType.includes("carousel") ||
    rawType.includes("sidecar") ||
    mediaItems.filter((item) => item.type === "image").length > 1;

  const videoItem = mediaItems.find(
    (item) => item.type === "video"
  );

  const imageItem = mediaItems.find(
    (item) => item.type === "image"
  );

  const thumb = str(
    get(
      node,
      "thumbnail",
      "thumbnail_url",
      "display_url",
      "image_url",
      "thumb"
    ),
    mediaItems[0]?.thumbnail ?? mediaItems[0]?.url ?? ""
  );

  const mediaUrl = isVideo
    ? videoItem?.url ?? videoFromField ?? thumb
    : imageItem?.url ?? mediaItems[0]?.url ?? thumb;

  const shortcode = str(
    get(node, "shortcode", "code")
  );

  const id = str(
    get(node, "media_id", "id", "pk"),
    shortcode || String(index)
  );

  return {
    id,
    shortcode,
    thumb,
    mediaUrl,
    mediaItems:
      mediaItems.length > 0
        ? mediaItems
        : thumb
          ? [
              {
                url: mediaUrl || thumb,
                thumbnail: thumb,
                type: isVideo ? "video" : "image",
              },
            ]
          : [],
    isVideo,
    isCarousel,
    caption: str(
      get(node, "caption.text", "caption", "text")
    ),
    likes: num(
      get(node, "like_count", "likes", "edge_liked_by.count")
    ),
    comments: num(
      get(node, "comment_count", "comments", "edge_media_to_comment.count")
    ),
    takenAt: num(
      get(node, "taken_at", "takenAt", "timestamp")
    ),
  };
}

// --------------------------------------------------
// Normalize list of posts / reels
// --------------------------------------------------

function normalizePostList(
  response: unknown,
  source: "posts" | "reels"
): Post[] {
  if (!response) return [];

  const rawItems = asArray(
    get(
      response,
      "items",
      "data.items",
      "posts",
      "data.posts",
      "reels",
      "data.reels"
    )
  );

  return rawItems.map((item, index) =>
    normalizePost(item, index, source)
  );
}

// --------------------------------------------------
// Normalize profile
// --------------------------------------------------

function normalizeProfile(
  raw: unknown,
  fallbackUsername: string,
  postsResponse: unknown,
  reelsResponse: unknown
): Profile {
  const user =
    get(raw, "profile", "data.user", "user", "data", "result") ?? raw;

  const regularPosts = normalizePostList(postsResponse, "posts");
  const reels = normalizePostList(reelsResponse, "reels");

  // Bashkojmë postimet dhe Reels pa përsëritur të njëjtin postim.
  const combined = [...regularPosts, ...reels];

  const seen = new Set<string>();

  const posts = combined.filter((post) => {
    const uniqueKey = post.shortcode || post.id;

    if (!uniqueKey || seen.has(uniqueKey)) {
      return false;
    }

    seen.add(uniqueKey);
    return true;
  });

  return {
    username: str(
      get(user, "username", "user_name"),
      fallbackUsername
    ),
    fullName: str(
      get(user, "full_name", "fullName", "name")
    ),
    avatar: str(
      get(
        user,
        "profile_picture_url",
        "profile_pic_url_hd",
        "profile_pic_url",
        "avatar",
        "profile_picture",
        "profilePic"
      )
    ),
    bio: str(
      get(user, "biography", "bio", "description")
    ),
    externalUrl: str(
      get(user, "external_url", "externalUrl", "website")
    ),
    followers: num(
      get(
        user,
        "followers",
        "follower_count",
        "edge_followed_by.count"
      )
    ),
    following: num(
      get(
        user,
        "following",
        "following_count",
        "edge_follow.count"
      )
    ),
    postsCount:
      num(
        get(
          user,
          "posts_count",
          "media_count",
          "postsCount",
          "edge_owner_to_timeline_media.count"
        )
      ) ?? posts.length,
    isPrivate: bool(
      get(user, "is_private", "isPrivate")
    ),
    isVerified: bool(
      get(user, "is_verified", "isVerified")
    ),
    posts,
  };
}

// --------------------------------------------------
// Main function
// --------------------------------------------------

export async function getProfile(
  username: string
): Promise<Profile> {
  const cleanUsername = username
    .trim()
    .replace(/^@/, "");

  if (!cleanUsername) {
    throw new IgramError("Shkruaj një username të vlefshëm.", 400);
  }

  // Mock aktivizohet vetëm kur kërkohet shprehimisht.
  if (process.env.IGRAM_MOCK === "1") {
    return mockProfile(cleanUsername);
  }

  const key = process.env.IGRAM_API_KEY;

  if (!key) {
    throw new IgramError(
      "Mungon IGRAM_API_KEY në konfigurimin e serverit.",
      500
    );
  }

  // Marrim profilin, postimet dhe Reels paralelisht.
  const [profileResponse, postsResponse, reelsResponse] =
    await Promise.all([
      requestApi(
        CONFIG.profilePath,
        cleanUsername,
        key
      ),
      requestApi(
        CONFIG.postsPath,
        cleanUsername,
        key,
        true
      ),
      requestApi(
        CONFIG.reelsPath,
        cleanUsername,
        key,
        true
      ),
    ]);

  return normalizeProfile(
    profileResponse,
    cleanUsername,
    postsResponse,
    reelsResponse
  );
}

// --------------------------------------------------
// Mock data për testim lokal
// --------------------------------------------------

function mockProfile(username: string): Profile {
  const posts: Post[] = Array.from({ length: 9 }, (_, index) => {
    const image = `https://picsum.photos/seed/${username}-${index}/600/600`;

    return {
      id: String(index),
      shortcode: "",
      thumb: image,
      mediaUrl: image,
      mediaItems: [
        {
          url: image,
          thumbnail: image,
          type: "image",
        },
      ],
      isVideo: false,
      isCarousel: false,
      caption: `Postimi ${index + 1}`,
      likes: 120 + index * 37,
      comments: 4 + index * 3,
      takenAt: null,
    };
  });

  return {
    username,
    fullName: "Profil demo",
    avatar: `https://picsum.photos/seed/${username}-avatar/200`,
    bio: "Të dhëna shembull për testim.",
    externalUrl: "",
    followers: 12840,
    following: 312,
    postsCount: 9,
    isPrivate: false,
    isVerified: false,
    posts,
  };
}
