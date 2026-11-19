import { ImageResponse } from "next/og";
import { getProfile } from "@/lib/igram";

export const alt = "Instagram Profile Preview";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  let name = "";
  let bio = "";
  let followers = "";
  let avatar: string | null = null;

  try {
    const p = await getProfile(username);
    name = p.fullName;
    bio = (p.bio.split("\n")[0] ?? "").slice(0, 90);
    followers =
      p.followers != null
        ? `${new Intl.NumberFormat("en").format(p.followers)} followers`
        : "";

    if (p.avatar) {
      const r = await fetch(p.avatar);
      if (r.ok) {
        const type = r.headers.get("content-type") ?? "image/jpeg";
        const b64 = Buffer.from(await r.arrayBuffer()).toString("base64");
        avatar = `data:${type};base64,${b64}`;
      }
    }
  } catch {
    // nëse API-ja ose fotoja dështon, del version pa të dhëna shtesë
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#021644",
          color: "white",
        }}
      >
        <div style={{ display: "flex", fontSize: 32, color: "#3fa2f6" }}>
          INSTAGRAM PROFILE VIEWER
        </div>

        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            width={200}
            height={200}
            alt=""
            style={{ borderRadius: 100, marginTop: 36, border: "6px solid #3fa2f6" }}
          />
        ) : null}

        {name ? (
          <div style={{ display: "flex", fontSize: 60, fontWeight: 700, marginTop: 28 }}>
            {name}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            fontSize: name ? 36 : 68,
            fontWeight: name ? 400 : 700,
            marginTop: name ? 8 : 30,
            color: name ? "#93c5fd" : "white",
          }}
        >
          @{username}
        </div>

        {followers ? (
          <div style={{ display: "flex", fontSize: 32, marginTop: 20 }}>{followers}</div>
        ) : null}

        <div
          style={{
            display: "flex",
            fontSize: 26,
            marginTop: 18,
            color: "#d1d5db",
            maxWidth: 900,
            textAlign: "center",
          }}
        >
          {bio || "View public Instagram profile"}
        </div>
      </div>
    ),
    size
  );
}