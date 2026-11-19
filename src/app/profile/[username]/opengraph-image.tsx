
import { ImageResponse } from "next/og";

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
        <div style={{ fontSize: 32, color: "#3fa2f6" }}>
          INSTAGRAM PROFILE VIEWER
        </div>

        <div style={{ fontSize: 68, fontWeight: 700, marginTop: 30 }}>
          @{username}
        </div>

        <div style={{ fontSize: 28, marginTop: 25, color: "#d1d5db" }}>
          View public Instagram profile
        </div>
      </div>
    ),
    size
  );
}
