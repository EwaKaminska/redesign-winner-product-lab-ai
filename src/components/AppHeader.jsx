import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/Icon'
import { Logo } from '@/components/Logo'
import { UserMenu } from '@/components/UserMenu'

export const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'images', label: 'Images' },
  { value: 'notes', label: 'Notes' },
]

function SearchBox({ value, onChange }) {
  const inputRef = useRef(null)

  // ⌘+K / Ctrl+K focuses the search.
  useEffect(() => {
    function onKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <label className="group flex h-10 w-[158px] items-center gap-2 rounded-full bg-surface px-4 transition-[width] duration-200 focus-within:w-[260px] has-[input:not(:placeholder-shown)]:w-[260px]">
      <Icon name="search" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onChange('')
            e.currentTarget.blur()
          }
        }}
        placeholder="Search"
        aria-label="Search inspirations"
        className="min-w-0 flex-1 bg-transparent text-sm leading-6 font-medium tracking-[-0.14px] outline-none placeholder:text-black/40 [&::-webkit-search-cancel-button]:hidden"
      />
      <kbd className="hidden font-sans text-sm leading-6 tracking-[-0.28px] text-black/40 group-focus-within:hidden sm:inline">
        ⌘+K
      </kbd>
    </label>
  )
}

export function AppHeader({ filter, onFilterChange, search, onSearchChange }) {
  return (
    <header className="grid grid-cols-[1fr_auto] items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
      <nav className="flex items-center gap-4 sm:gap-12" aria-label="Main">
        <Logo />
        <div className="flex items-center gap-1" role="tablist" aria-label="Filter">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              variant="ghost"
              role="tab"
              aria-selected={filter === f.value}
              data-active={filter === f.value}
              onClick={() => onFilterChange(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </nav>

      <div className="order-last col-span-2 flex justify-center lg:order-none lg:col-span-1">
        <SearchBox value={search} onChange={onSearchChange} />
      </div>

      <div className="flex items-center justify-end gap-2 sm:gap-4">
        <UserMenu />
        <Button asChild className="pl-4">
          <Link to="/new">
            <Icon name="plus" />
            <span className="hidden sm:inline">Add inspiration</span>
            <span className="sr-only sm:hidden">Add inspiration</span>
          </Link>
        </Button>
      </div>
    </header>
  )
}
