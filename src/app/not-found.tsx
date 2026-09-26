import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-8 text-center">
      <div>
        <h1 className="t-display">We couldn’t find that part of the government.</h1>
        <p className="t-body mt-2 text-ink-3">It may have been renamed, merged or removed. Search from the map instead.</p>
        <Link href="/" className="t-ui mt-5 inline-flex h-10 items-center rounded-xl bg-ink-1 px-4 text-card">
          Back to the map
        </Link>
      </div>
    </main>
  );
}
