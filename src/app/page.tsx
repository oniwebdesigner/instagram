import SearchBox from "@/components/SearchBox";

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-14 text-neutral-900">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Discover random videos and photos
      </h1>

      <p className="mt-3 max-w-prose text-neutral-600">
        Type a word like “cats” or “dogs” and see videos and photos for it.
        Download anything you like.
      </p>

      <div className="mt-8">
        <SearchBox />
      </div>
    </main>
  );
}
