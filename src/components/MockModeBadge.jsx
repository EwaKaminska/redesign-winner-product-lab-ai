import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { isMockMode } from '@/lib/supabase'

/** Small pill in the corner that says the app runs without Supabase. */
export function MockModeBadge() {
  if (!isMockMode) return null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="fixed bottom-4 left-4 z-50 inline-flex h-8 items-center gap-2 rounded-full bg-black px-3 text-xs leading-6 font-medium text-white shadow-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="size-2 rounded-full bg-amber-400" aria-hidden />
          Mock mode
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px]">
        No Supabase connected. Data is saved only in this browser. Add keys to
        .env.local and restart to use Supabase.
      </TooltipContent>
    </Tooltip>
  )
}
