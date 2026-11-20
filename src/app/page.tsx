import SearchBox from "@/components/SearchBox";
import TagChips from "@/components/TagChips";

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-14 text-neutral-900">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Zbulo postime e video në Instagram pa u kyçur
      </h1>

      <p className="mt-3 max-w-prose text-neutral-600">
        Shkruaj një hashtag si “cats” apo “dogs” për postime të rastësishme, ose
        @username për të parë një profil publik dhe për të shkarkuar.
      </p>

      <div className="mt-8">
        <SearchBox />
      </div>

      <TagChips />
    </main>
  );
}
