import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type ProductFormSectionProps = {
  step: number
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function ProductFormSection({
  step,
  title,
  description,
  children,
  className,
}: ProductFormSectionProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="space-y-1 border-b border-border/50 bg-muted/20 pb-4">
        <div className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
            {step}
          </span>
          <div className="min-w-0 space-y-0.5">
            <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>
            {description ? (
              <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">{children}</CardContent>
    </Card>
  )
}
