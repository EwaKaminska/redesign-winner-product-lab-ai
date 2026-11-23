import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { isAiAvailable } from '@/lib/ai'
import { cn } from '@/lib/utils'

/**
 * Button for AI actions (Proofread, Generate, Regenerate description).
 *
 * loading: shows a spinner and loadingLabel, and blocks clicks.
 * disabled + hint: the hint shows in a tooltip, so the user knows why.
 * In mock mode the button is always disabled (there is no AI server).
 */
export function AiButton({
  children,
  variant = 'secondary',
  className,
  onClick,
  loading = false,
  loadingLabel,
  disabled = false,
  hint,
}) {
  const tip = !isAiAvailable
    ? 'AI needs Supabase. It does not work in mock mode.'
    : disabled && !loading
      ? hint
      : null

  const button = (
    <Button
      type="button"
      variant={variant}
      disabled={!isAiAvailable || disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
      className="w-full disabled:opacity-60"
    >
      {loading && <Loader2 className="animate-spin" aria-hidden />}
      {loading && loadingLabel ? loadingLabel : children}
    </Button>
  )

  // The same element tree in every state, so the button keeps focus
  // when it starts loading.
  return (
    <Tooltip open={tip ? undefined : false}>
      <TooltipTrigger asChild>
        {/* The span keeps the tooltip working on a disabled button. */}
        <span
          tabIndex={tip ? 0 : undefined}
          className={cn('block w-full rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50', className)}
        >
          {button}
        </span>
      </TooltipTrigger>
      {tip && <TooltipContent>{tip}</TooltipContent>}
    </Tooltip>
  )
}
