
import { ImageResponse } from "next/og";
import { getProfile } from "@/lib/igram";

export const alt = "Instagram profile preview";

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

  let profile = null;

  try {
    profile = await getProfile(username);
  } catch {
    // Shfaqim një imazh rezervë nëse API dështon.
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
          background: "#021644",
          color: "white",
          fontFamily: "Arial",
        }}
      >
        <div
          style={{
            fontSize: 32,
            color: "#3fa2f6",
            marginBottom: 25,
          }}
        >
          INSTAGRAM PROFILE VIEWER
        </div>

        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
          }}
        >
          {profile?.fullName || `@${username}`}
        </div>

        <div
          style={{
            fontSize: 34,
            marginTop: 20,
            color: "#d1d5db",
          }}
        >
          @{profile?.username || username}
        </div>

        <div
          style={{
            fontSize: 25,
            marginTop: 45,
            color: "#3fa2f6",
          }}
        >
          View public Instagram profile
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
