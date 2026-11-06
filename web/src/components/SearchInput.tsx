import { CloseIcon, SearchIcon } from './icons'

type Props = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}

// Free-text search box with a clear button. The label stays visible for screen readers and clarity.
export default function SearchInput({ id, label, value, onChange, placeholder }: Props) {
  return (
    <div className="field search-kw">
      <label htmlFor={id}>{label}</label>
      <div className="search-input">
        <span className="search-input-icon">
          <SearchIcon size={18} />
        </span>
        <input
          id={id}
          className="input"
          type="search"
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button type="button" className="search-input-clear" aria-label="Clear search" onClick={() => onChange('')}>
            <CloseIcon size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
