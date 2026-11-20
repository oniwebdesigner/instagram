import { NextRequest } from "next/server";

// Shërben foto profili nga CDN-i i Instagramit përmes serverit tonë.
// Lejohen vetëm domenet e tyre, që kjo rrugë të mos përdoret si proxy i hapur.
const ALLOWED = [/\.cdninstagram\.com$/i, /\.fbcdn\.net$/i];

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("u") ?? "";

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return new Response("Bad request.", { status: 400 });
  }

  if (url.protocol !== "https:" || !ALLOWED.some((re) => re.test(url.hostname))) {
    return new Response("Domain not allowed.", { status: 400 });
  }

  const upstream = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("Not found.", { status: 404 });
  }

  const type = upstream.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) {
    return new Response("Not an image.", { status: 415 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
