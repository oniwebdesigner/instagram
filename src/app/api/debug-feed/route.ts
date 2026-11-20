import { NextRequest, NextResponse } from "next/server";
import { CONFIG } from "@/lib/igram";

// Tregon FORMËN e përgjigjes së igramapi (pa çelës), vetëm gjatë zhvillimit.

function skeleton(value: unknown, depth = 0): unknown {
  if (Array.isArray(value)) {
    return value.length === 0
      ? []
      : [skeleton(value[0], depth + 1), `(+${value.length - 1} të tjera)`];
  }
  if (value && typeof value === "object") {
    if (depth > 5) return "{...}";
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, skeleton(v, depth + 1)])
    );
  }
  if (typeof value === "string") {
    return value.length > 60 ? value.slice(0, 60) + "…" : value;
  }
  return value;
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Vetëm gjatë zhvillimit." }, { status: 404 });
  }

  const sp = req.nextUrl.searchParams;
  const username = (sp.get("username") ?? "").trim();
  const kind = sp.get("kind") === "reels" ? "reels" : "posts";
  const cursor = sp.get("cursor");
  const key = process.env.IGRAM_API_KEY;

  if (!/^[A-Za-z0-9._]{1,30}$/.test(username) || !key) {
    return NextResponse.json({ error: "Duhet username i vlefshëm dhe IGRAM_API_KEY." }, { status: 400 });
  }

  const path = kind === "posts" ? CONFIG.postsPath : CONFIG.reelsPath;
  const url = new URL(path.replace("{username}", encodeURIComponent(username)), CONFIG.base);
  if (cursor) url.searchParams.set("cursor", cursor);

  const res = await fetch(url, {
    headers: { [CONFIG.authHeader]: `${CONFIG.authPrefix}${key}`, Accept: "application/json" },
    cache: "no-store",
  });

  const body = await res.json().catch(() => null);

  return NextResponse.json({ status: res.status, structure: skeleton(body) });
}
