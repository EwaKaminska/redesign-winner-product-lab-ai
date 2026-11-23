import { useId, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { TagChip } from '@/components/TagChip'

/**
 * "Add tags or select": type a tag and press Enter (or comma),
 * or pick one of your existing tags from the list.
 */
export function TagInput({ id, value, onChange, suggestions = [] }) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const listId = useId()

  const selectedKeys = useMemo(
    () => new Set(value.map((t) => t.toLowerCase())),
    [value],
  )

  // Options: "Create “…”" first (when the text is new), then existing tags.
  const options = useMemo(() => {
    const query = text.trim()
    const lower = query.toLowerCase()
    const matches = suggestions
      .filter((t) => !selectedKeys.has(t.name.toLowerCase()))
      .filter((t) => !lower || t.name.toLowerCase().includes(lower))
      .slice(0, 8)
      .map((t) => ({ key: t.id, name: t.name, create: false }))
    const isKnown =
      selectedKeys.has(lower) || suggestions.some((t) => t.name.toLowerCase() === lower)
    return query && !isKnown
      ? [{ key: '__create', name: query, create: true }, ...matches]
      : matches
  }, [suggestions, selectedKeys, text])

  function addTag(name) {
    const clean = name.trim().replace(/,+$/, '').slice(0, 50)
    if (clean && !selectedKeys.has(clean.toLowerCase())) {
      onChange([...value, clean])
    }
    setText('')
    setHighlight(0)
    setOpen(false)
  }

  function removeTag(name) {
    onChange(value.filter((t) => t !== name))
  }

  function handleKeyDown(event) {
    const showList = open && options.length > 0
    if (event.key === 'ArrowDown' && showList) {
      event.preventDefault()
      setHighlight((h) => (h + 1) % options.length)
    } else if (event.key === 'ArrowUp' && showList) {
      event.preventDefault()
      setHighlight((h) => (h - 1 + options.length) % options.length)
    } else if (event.key === 'Enter' && showList) {
      // Enter picks the highlighted option and must not submit the form.
      event.preventDefault()
      addTag(options[Math.min(highlight, options.length - 1)].name)
    } else if (event.key === ',' && text.trim()) {
      event.preventDefault()
      addTag(text)
    } else if (event.key === 'Backspace' && !text && value.length > 0) {
      removeTag(value[value.length - 1])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const showList = open && options.length > 0

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="relative">
        <Input
          id={id}
          value={text}
          placeholder="Add tags or select"
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          onChange={(e) => {
            setText(e.target.value)
            setOpen(true)
            setHighlight(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            if (text.trim()) addTag(text)
            setOpen(false)
          }}
          onKeyDown={handleKeyDown}
        />
        {showList && (
          <ul
            id={listId}
            role="listbox"
            className="absolute top-[calc(100%+8px)] z-20 flex w-full flex-col gap-1 rounded-card bg-white p-2 shadow-lg ring-1 ring-black/5"
          >
            {options.map((option, index) => (
              <li
                key={option.key}
                role="option"
                aria-selected={index === highlight}
                // mousedown runs before the input blur, so the click is not lost.
                onMouseDown={(e) => {
                  e.preventDefault()
                  addTag(option.name)
                }}
                onMouseEnter={() => setHighlight(index)}
                className="cursor-pointer rounded-full px-4 py-2 text-sm leading-6 font-medium aria-selected:bg-surface"
              >
                {option.create ? `Create “${option.name}”` : option.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((name) => (
            <TagChip key={name} name={name} onRemove={() => removeTag(name)} />
          ))}
        </div>
      )}
    </div>
  )
}
