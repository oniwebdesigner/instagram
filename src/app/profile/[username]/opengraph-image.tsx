import { ImageResponse } from "next/og";
import { getProfile } from "@/lib/igram";

export const alt = "Foto e profilit";

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

  let avatar: string | null = null;

  try {
    const profile = await getProfile(username);

    if (profile.avatar) {
      const r = await fetch(profile.avatar);
      if (r.ok) {
        const type = r.headers.get("content-type") ?? "image/jpeg";
        const b64 = Buffer.from(await r.arrayBuffer()).toString("base64");
        avatar = `data:${type};base64,${b64}`;
      }
    }
  } catch (e) {
    console.error("OG avatar error:", e);
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
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            width={460}
            height={460}
            alt=""
            style={{ borderRadius: 230, objectFit: "cover" }}
          />
        ) : null}
      </div>
    ),
    size
  );
}
