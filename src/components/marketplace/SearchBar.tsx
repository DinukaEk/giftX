import { OCCASION_CHIPS } from "@/lib/search";

export function SearchBar({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div>
      <div className="mt-5 flex max-w-[600px] items-center gap-1.5 rounded-[20px] bg-white p-1.5 shadow-card ring-1 ring-black/[0.03] transition-shadow duration-300 focus-within:shadow-card-lg focus-within:ring-2 focus-within:ring-plum/25">
        <span className="pl-3 text-[15px] text-ink-soft" aria-hidden>
          🔍
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
          }}
          placeholder={`e.g. "something for my sister's graduation"`}
          className="flex-1 rounded-none border-none bg-transparent px-2 py-3 text-[15px] outline-none"
        />
        <button
          type="button"
          onClick={onSubmit}
          className="rounded-[14px] bg-plum px-5.5 py-3.5 text-[13.5px] font-bold text-white transition-colors hover:bg-plum-deep"
        >
          Find gifts
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {OCCASION_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => {
              onChange(chip);
              onSubmit();
            }}
            className="rounded-full border border-line bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-ink-soft transition-colors hover:border-plum hover:text-plum"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}