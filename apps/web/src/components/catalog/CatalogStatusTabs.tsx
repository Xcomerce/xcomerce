import { cn } from '@/lib/utils'

export type CatalogStatusTab = 'active' | 'paused' | 'draft'

type Props = {
  activeTab: CatalogStatusTab
  onChange: (tab: CatalogStatusTab) => void
  counts: Record<CatalogStatusTab, number>
}

const TABS: { id: CatalogStatusTab; label: string }[] = [
  { id: 'active', label: 'Ativos' },
  { id: 'paused', label: 'Pausados' },
  { id: 'draft', label: 'Rascunhos' },
]

export function CatalogStatusTabs({ activeTab, onChange, counts }: Props) {
  return (
    <div className="border-b border-border/60">
      <div className="flex gap-6 overflow-x-auto scroll-smooth no-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative shrink-0 pb-3 text-sm font-semibold transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
            <span
              className={cn(
                'ml-1.5 text-xs font-bold',
                activeTab === tab.id ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {counts[tab.id]}
            </span>
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
