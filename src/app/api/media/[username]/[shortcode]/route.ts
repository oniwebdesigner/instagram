import { NextRequest } from "next/server";
import { getProfile } from "@/lib/igram";

// Shërben median e një postimi nga domeni ynë.
// ?kind=cover  -> foto për preview-n e linkut (për Reels: kopertina)
// ?i=0         -> cili element i postimit (carousel)
// ?download=1  -> e shkarkon si skedar
//
// URL-ja e Instagramit nuk vjen kurrë nga përdoruesi: e gjejmë vetë nga
// të dhënat e API-t, kështu nuk ka rrezik që kjo rrugë të përdoret si proxy i hapur.

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; shortcode: string }> }
) {
  const { username, shortcode } = await params;
  const sp = req.nextUrl.searchParams;

  const kind = sp.get("kind") === "cover" ? "cover" : "media";
  const index = Math.max(0, Number(sp.get("i") ?? 0) || 0);
  const download = sp.get("download") === "1";

  let url = "";

  try {
    const profile = await getProfile(username);
    const post = profile.posts.find(
      (p) => p.shortcode === shortcode || p.id === shortcode
    );

    if (!post) return new Response("Postimi nuk u gjet.", { status: 404 });

    if (kind === "cover") {
      url = post.isVideo
        ? post.thumb
        : post.mediaItems.find((m) => m.type === "image")?.url ||
          post.mediaUrl ||
          post.thumb;
    } else {
      url = post.mediaItems[index]?.url || post.mediaUrl;
    }
  } catch (e) {
    console.error("media route error:", e);
    return new Response("Gabim gjatë marrjes së postimit.", { status: 502 });
  }

  if (!url) return new Response("Nuk ka media.", { status: 404 });

  const upstream = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("Media nuk u ngarkua.", { status: 502 });
  }

  const type = upstream.headers.get("content-type") ?? "application/octet-stream";
  const ext = type.includes("video")
    ? "mp4"
    : type.includes("png")
      ? "png"
      : type.includes("webp")
        ? "webp"
        : "jpg";

  const headers = new Headers({
    "Content-Type": type,
    "Cache-Control": "public, max-age=3600, s-maxage=3600",
  });

  if (download) {
    headers.set(
      "Content-Disposition",
      `attachment; filename="${username}-${shortcode}.${ext}"`
    );
  }

  return new Response(upstream.body, { headers });
}
