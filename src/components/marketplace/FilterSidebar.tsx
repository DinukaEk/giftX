import { CATEGORIES, CATEGORY_ICONS } from "@/lib/constants";

function FilterChip({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-[9px] border-l-[3px] px-2.5 py-2 text-left text-[13px] font-semibold transition-colors ${
        active
          ? "border-plum bg-plum-tint text-plum"
          : "border-transparent text-ink-soft hover:border-line hover:bg-plum-tint/40 hover:text-ink"
      }`}
    >
      {icon ? <span className="text-[13px] leading-none">{icon}</span> : null}
      {children}
    </button>
  );
}

export function FilterSidebar({
  availableCategories,
  activeCategories,
  onToggleCategory,
  activeAvailability,
  onToggleAvailability,
}: {
  availableCategories: string[];
  activeCategories: Set<string>;
  onToggleCategory: (category: string) => void;
  activeAvailability: Set<string>;
  onToggleAvailability: (availability: string) => void;
}) {
  return (
    <aside className="sticky top-[90px] rounded-2xl bg-white p-4.5 shadow-card ring-1 ring-black/[0.03]">
      <h4 className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Category</h4>
      <div className="flex flex-col gap-0.5">
        {availableCategories.length === 0 ? (
          <p className="px-2.5 py-1 text-[12.5px] text-ink-soft">No listings yet</p>
        ) : (
          availableCategories.map((cat) => (
            <FilterChip
              key={cat}
              active={activeCategories.has(cat)}
              onClick={() => onToggleCategory(cat)}
              icon={CATEGORY_ICONS[cat]}
            >
              {CATEGORIES[cat] ?? cat}
            </FilterChip>
          ))
        )}
      </div>

      <h4 className="mb-2.5 mt-4 text-[11px] font-bold uppercase tracking-wide text-ink-soft">
        Availability
      </h4>
      <div className="flex flex-col gap-0.5">
        <FilterChip
          active={activeAvailability.has("in_stock")}
          onClick={() => onToggleAvailability("in_stock")}
          icon="⚡"
        >
          In stock
        </FilterChip>
        <FilterChip
          active={activeAvailability.has("pre_order")}
          onClick={() => onToggleAvailability("pre_order")}
          icon="🕐"
        >
          Pre-order
        </FilterChip>
      </div>
    </aside>
  );
}