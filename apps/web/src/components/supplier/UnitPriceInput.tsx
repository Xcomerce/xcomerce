import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { Pencil } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  currencyValueToDigits,
  digitsToCurrencyValue,
  formatCurrencyDigits,
  parseCurrencyToDigits,
} from '@/lib/currency-input'

type UnitPriceInputProps = {
  value: number
  onChange: (value: number) => void
  className?: string
}

function applyDigits(nextDigits: string, onChange: (value: number) => void): string {
  onChange(digitsToCurrencyValue(nextDigits))
  return nextDigits
}

export function UnitPriceInput({ value, onChange, className }: UnitPriceInputProps) {
  const [digits, setDigits] = useState(() => currencyValueToDigits(value))
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!focused) {
      setDigits(currencyValueToDigits(value))
    }
  }, [value, focused])

  useEffect(() => {
    if (!focused || !inputRef.current) return
    const input = inputRef.current
    const end = input.value.length
    input.setSelectionRange(end, end)
  }, [digits, focused])

  function updateDigits(nextDigits: string) {
    setDigits(applyDigits(nextDigits, onChange))
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.ctrlKey || event.metaKey || event.altKey) return

    if (/^\d$/.test(event.key)) {
      event.preventDefault()
      updateDigits(parseCurrencyToDigits(digits + event.key))
      return
    }

    if (event.key === 'Backspace') {
      event.preventDefault()
      updateDigits(digits.slice(0, -1))
      return
    }

    if (event.key === 'Delete') {
      event.preventDefault()
      updateDigits('')
      return
    }

    const allowed = ['Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
    if (allowed.includes(event.key)) return

    if (event.key.length === 1) {
      event.preventDefault()
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    updateDigits(parseCurrencyToDigits(event.clipboardData.getData('text/plain')))
  }

  return (
    <div className="flex max-w-[160px] items-center gap-2">
      <Input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        placeholder="0,00"
        aria-label="Preço unitário em reais"
        value={formatCurrencyDigits(digits)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          const parsed = digitsToCurrencyValue(digits)
          onChange(parsed)
          setDigits(currencyValueToDigits(parsed))
        }}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onChange={() => {
          /* Entrada controlada via teclado/cola — evita parsing do texto formatado. */
        }}
        className={className}
      />
      <Pencil className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
    </div>
  )
}
