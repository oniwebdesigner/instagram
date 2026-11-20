// Funksione të përbashkëta (punojnë në browser dhe në server)

export const POPULAR_TAGS = [
  "cats",
  "dogs",
  "funny",
  "travel",
  "food",
  "music",
  "fitness",
  "nature",
  "football",
  "cars",
  "fashion",
  "art",
];

// Kuptohen shkronja dhe numra të çdo gjuhe; emoji-t dhe simbolet hiqen.
const STRIP = new RegExp("[^\\p{L}\\p{N}_]", "gu");

// "🐈 Cats!" -> "cats"
export function toTag(input: string): string {
  const word = input
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(STRIP, ""))
    .find((w) => w.length > 0);

  return (word ?? "").slice(0, 50);
}
