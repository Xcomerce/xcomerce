import { Headset } from 'lucide-react'
import { usePageTitle } from '@/hooks/use-page-title'

export function SupportPage() {
  usePageTitle()

  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
        <Headset className="h-9 w-9" />
      </div>

      <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
        Suporte
      </h1>

      <p className="mt-3 max-w-sm text-sm text-muted-foreground leading-relaxed">
        Nossa central de suporte está sendo preparada com todo cuidado para oferecer a melhor experiência de atendimento.
      </p>

      <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2">
        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        <span className="text-sm font-semibold text-primary">Em breve</span>
      </div>
    </div>
  )
}
