import { cn } from '@/lib/utils'

/**
 * Two faces on one card that turn around the vertical axis (CSS 3D).
 * The hidden face is `inert`, so keyboard and screen readers skip it.
 * With "reduce motion" on, the faces swap with no animation.
 */
export function FlipCard({ flipped, front, back, className }) {
  const face =
    'absolute inset-0 flex items-center justify-center [backface-visibility:hidden] [-webkit-backface-visibility:hidden]'

  return (
    <div className={cn('relative [perspective:2000px]', className)}>
      <div
        className={cn(
          'relative size-full transition-transform duration-[650ms] ease-[cubic-bezier(0.65,0,0.35,1)] [transform-style:preserve-3d] motion-reduce:transition-none',
          flipped && '[transform:rotateY(180deg)]',
        )}
      >
        <div className={face} inert={flipped} aria-hidden={flipped}>
          {front}
        </div>
        <div className={cn(face, '[transform:rotateY(180deg)]')} inert={!flipped} aria-hidden={!flipped}>
          {back}
        </div>
      </div>
    </div>
  )
}
