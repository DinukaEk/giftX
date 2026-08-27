import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-[500px] px-6 py-24 text-center">
      <h1 className="mb-2 font-display text-3xl font-semibold text-ink">Page not found</h1>
      <p className="mb-6 text-sm font-medium text-ink-soft">
        That page doesn&rsquo;t exist, or may have moved.
      </p>
      <Link
        to="/"
        className="rounded-full bg-plum px-5 py-2.5 text-sm font-bold text-white hover:bg-plum-deep"
      >
        Back to marketplace
      </Link>
    </div>
  );
}
