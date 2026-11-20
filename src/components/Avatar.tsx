"use client";

import { useState } from "react";

export default function Avatar({
  src,
  name,
  small = false,
}: {
  src: string;
  name: string;
  small?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  const size = small ? "h-8 w-8 text-sm" : "h-12 w-12 text-lg";
  const letter = ([...name.trim()][0] ?? "?").toUpperCase();

  if (!src || failed) {
    return (
      <span
        aria-hidden="true"
        className={`flex shrink-0 items-center justify-center rounded-full bg-neutral-200 font-medium text-neutral-600 ${size}`}
      >
        {letter}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/avatar?u=${encodeURIComponent(src)}`}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full bg-neutral-200 object-cover ${size}`}
    />
  );
}
