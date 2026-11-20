import SearchBox from "@/components/SearchBox";

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-14 text-neutral-900">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Shiko një profil Instagram pa u kyçur
      </h1>

      <p className="mt-3 max-w-prose text-neutral-600">
        Shkruaj username-in e një profili publik, ose një fjalë çelës si
        “cats” apo “dogs”, për të parë profilet e sugjeruara, postimet dhe për
        t’i shkarkuar.
      </p>

      <div className="mt-8">
        <SearchBox />
      </div>
    </main>
  );
}
