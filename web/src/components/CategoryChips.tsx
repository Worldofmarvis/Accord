type Props = {
  categories: readonly string[]
  /** Empty string means "All". */
  value: string
  onChange: (category: string) => void
}

// The one place to pick a category. Single choice, applies right away, "All" clears it.
export default function CategoryChips({ categories, value, onChange }: Props) {
  const options = [{ label: 'All', value: '' }, ...categories.map((c) => ({ label: c, value: c }))]
  return (
    <div className="search-quick" role="group" aria-label="Category">
      <span className="muted small" aria-hidden="true">
        Category
      </span>
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          className={`chip${value === o.value ? ' is-active' : ''}`}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
