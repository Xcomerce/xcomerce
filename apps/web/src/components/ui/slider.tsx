import * as React from 'react'
import { cn } from '@/lib/utils'

type SliderProps = {
  min?: number
  max?: number
  step?: number
  value: number
  onValueChange?: (value: number) => void
  onValueCommit?: (value: number) => void
  disabled?: boolean
  className?: string
  id?: string
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      min = 0,
      max = 100,
      step = 0.1,
      value,
      onValueChange,
      onValueCommit,
      disabled,
      className,
      id,
    },
    ref,
  ) => {
    const [localValue, setLocalValue] = React.useState(value)
    const draggingRef = React.useRef(false)

    React.useEffect(() => {
      if (!draggingRef.current) {
        setLocalValue(value)
      }
    }, [value])

    const percent = max > min ? ((localValue - min) / (max - min)) * 100 : 0

    function commitValue(next: number) {
      if (onValueCommit) {
        onValueCommit(next)
        return
      }
      onValueChange?.(next)
    }

    return (
      <input
        ref={ref}
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={localValue}
        disabled={disabled}
        onPointerDown={() => {
          draggingRef.current = true
        }}
        onPointerUp={() => {
          draggingRef.current = false
          commitValue(localValue)
        }}
        onPointerCancel={() => {
          draggingRef.current = false
          commitValue(localValue)
        }}
        onKeyUp={() => {
          commitValue(localValue)
        }}
        onInput={(e) => {
          const next = Number(e.currentTarget.value)
          setLocalValue(next)
          onValueChange?.(next)
        }}
        className={cn(
          'h-2 w-full cursor-pointer touch-none appearance-none rounded-full bg-secondary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          '[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full',
          '[&::-webkit-slider-thumb]:mt-[-6px] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5',
          '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary',
          '[&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow-sm',
          '[&::-webkit-slider-thumb]:transition-none',
          '[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full',
          '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full',
          '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-background',
          className,
        )}
        style={{
          background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${percent}%, hsl(var(--secondary)) ${percent}%, hsl(var(--secondary)) 100%)`,
        }}
      />
    )
  },
)
Slider.displayName = 'Slider'

export { Slider }
