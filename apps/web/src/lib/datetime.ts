export function formatDateTimeLocalInput(value: string | null | undefined): string {
  if (!value) return ''

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T00:00`
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const pad = (part: number) => String(part).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function parseDateTimeLocalInput(value: string): string {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toISOString()
}

export function formatDemandDateTime(value: string | null | undefined): string {
  if (!value) return 'Não informado'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Não informado'

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
