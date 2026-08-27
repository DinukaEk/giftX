export function ComingSoon({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mx-auto max-w-[600px] px-6 py-24 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-plum-tint text-2xl">
        🎁
      </div>
      <h1 className="mb-2 font-display text-2xl font-semibold text-ink">{title}</h1>
      <p className="text-sm font-medium text-ink-soft">
        {note ?? "This page is being built next — check back soon."}
      </p>
    </div>
  );
}
