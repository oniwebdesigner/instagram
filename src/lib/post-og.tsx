import { ImageResponse } from "next/og";
import { getProfile } from "@/lib/igram";

export async function renderPostOg(username: string, shortcode: string) {
  let photo: string | null = null;

  try {
    const profile = await getProfile(username);
    const post = profile.posts.find(
      (p) => p.shortcode === shortcode || p.id === shortcode
    );

    if (post) {
      const url = post.isVideo
        ? post.thumb
        : post.mediaItems.find((m) => m.type === "image")?.url ||
          post.mediaUrl ||
          post.thumb;

      if (url) {
        const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (r.ok) {
          const type = r.headers.get("content-type") ?? "image/jpeg";
          const b64 = Buffer.from(await r.arrayBuffer()).toString("base64");
          photo = `data:${type};base64,${b64}`;
        }
      }
    }
  } catch (e) {
    console.error("OG post error:", e);
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#021644",
        }}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            width={1200}
            height={630}
            alt=""
            style={{ objectFit: "contain" }}
          />
        ) : null}
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
