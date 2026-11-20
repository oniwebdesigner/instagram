import { renderPostOg } from "@/lib/post-og";

export const alt = "Foto e postimit";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ username: string; shortcode: string }>;
}) {
  const { username, shortcode } = await params;
  return renderPostOg(username, shortcode);
}
